import { NextResponse } from "next/server";
import { dbSaveInvoices, dbSearchInvoices, type DBInvoiceInsert } from "@/lib/supabase/db-invoices";
import { getAuthenticatedUserRole } from "@/lib/supabase/auth-helper";

export async function POST(req: Request) {
  try {
    const auth = await getAuthenticatedUserRole();
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

    // Attach current user name/email if available
    const printedBy = auth?.user?.email || auth?.fullName || null;
    invoicesToSave = invoicesToSave.map((item) => ({
      ...item,
      printed_by: item.printed_by || printedBy,
    }));

    const result = await dbSaveInvoices(invoicesToSave);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to save invoices" },
        { status: 500 }
      );
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
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q") || undefined;
    const isBlankParam = searchParams.get("isBlank");
    const isBlank =
      isBlankParam === "true" ? true : isBlankParam === "false" ? false : null;
    const generatorMode = (searchParams.get("generatorMode") as "single" | "bulk") || null;
    const studentClass = searchParams.get("class") || null;
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    const result = await dbSearchInvoices({
      query,
      isBlank,
      generatorMode,
      studentClass,
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
