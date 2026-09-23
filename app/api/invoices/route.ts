import { NextResponse } from "next/server";
import {
  dbSaveInvoices,
  dbSearchInvoices,
  dbGetInvoicesByStudentIds,
  type DBInvoiceInsert,
} from "@/lib/supabase/db-invoices";
import { getAuthenticatedUserRole } from "@/lib/supabase/auth-helper";
import { logTeacherActivity } from "@/lib/supabase/db-teachers";

export async function POST(req: Request) {
  try {
    const auth = await getAuthenticatedUserRole();
    if (auth.role === "Guest") {
      return NextResponse.json({ error: "Unauthorized: Please log in." }, { status: 401 });
    }

    const body = await req.json();

    let invoicesToSave: DBInvoiceInsert[] = [];
    if (Array.isArray(body.invoices)) {
      invoicesToSave = body.invoices;
    } else if (body.invoice) {
      invoicesToSave = [body.invoice];
    } else if (body.invoice_number) {
      invoicesToSave = [body];
    }

    if (invoicesToSave.length === 0) {
      return NextResponse.json({ error: "No invoice data provided" }, { status: 400 });
    }

    if (auth.role === "Teacher" && auth.permissions?.can_generate_invoices === false) {
      return NextResponse.json(
        { error: "Forbidden: You do not have permission to generate fee invoices." },
        { status: 403 }
      );
    }

    // Attach current user name/email if available
    const printedBy = auth?.fullName || auth?.user?.email || null;
    invoicesToSave = invoicesToSave.map((item) => ({
      ...item,
      printed_by: item.printed_by || printedBy,
      collected_by: auth.user?.id || null,
      collector_name: auth.fullName || "Staff",
    }));

    const result = await dbSaveInvoices(invoicesToSave);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to save invoices" },
        { status: 500 }
      );
    }

    // Log teacher activity for each generated invoice
    if (auth.user) {
      for (const inv of invoicesToSave) {
        try {
          await logTeacherActivity({
            userId: auth.user.id,
            teacherId: auth.staffId,
            teacherName: auth.fullName || "Staff",
            actionType: "INVOICE_GENERATED",
            targetStudentId: inv.student_id || null,
            targetStudentName: inv.student_name || null,
            studentClass: inv.student_class || null,
            section: inv.section || null,
            amountCollected: Number(inv.total_amount) || 0,
            metadata: { invoice_number: inv.invoice_number },
          });
        } catch (logErr) {
          console.warn("Could not log invoice teacher activity:", logErr);
        }
      }
    }

    return NextResponse.json({
      success: true,
      savedCount: result.savedCount,
      message: `Successfully recorded ${result.savedCount} invoice(s) in database`,
    });
  } catch (err: any) {
    console.error("Error in POST /api/invoices:", err);
    return NextResponse.json(
      { error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  try {
    const auth = await getAuthenticatedUserRole();
    if (auth.role === "Guest") {
      return NextResponse.json({ error: "Unauthorized: Please log in." }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const studentIdsParam = searchParams.get("studentIds");
    const singleStudentId = searchParams.get("studentId");

    if (studentIdsParam || singleStudentId) {
      const ids = studentIdsParam
        ? studentIdsParam.split(",").map((s) => s.trim()).filter(Boolean)
        : [singleStudentId!.trim()];
      const result = await dbGetInvoicesByStudentIds(ids);
      return NextResponse.json({
        data: result.data,
        total: result.data.length,
        error: result.error,
      });
    }

    const query = searchParams.get("q") || undefined;
    const isBlankParam = searchParams.get("isBlank");
    const isBlank =
      isBlankParam === "true" ? true : isBlankParam === "false" ? false : null;
    const generatorMode = (searchParams.get("generatorMode") as "single" | "bulk") || null;
    const studentClass = searchParams.get("class") || null;
    const academicSession = searchParams.get("session") || searchParams.get("academicSession") || null;
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    const result = await dbSearchInvoices({
      query,
      isBlank,
      generatorMode,
      studentClass,
      academicSession,
      limit,
      offset,
    });

    return NextResponse.json({
      data: result.data,
      total: result.total,
      error: result.error,
    });
  } catch (err: any) {
    console.error("Error in GET /api/invoices:", err);
    return NextResponse.json(
      { error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
