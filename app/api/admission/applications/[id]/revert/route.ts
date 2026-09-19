import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthenticatedUserRole } from "@/lib/supabase/auth-helper";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthenticatedUserRole();
    if (auth.role === "Guest") {
      return NextResponse.json({ error: "Unauthorized: Please log in." }, { status: 401 });
    }

    const { id } = await params;
    const supabase = createAdminClient();

    // 1. Fetch application details
    const { data: app, error: appError } = await supabase
      .from("admission_applications")
      .select("*")
      .eq("id", id)
      .single();

    if (appError || !app) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

    if (app.is_transferred_to_active) {
      return NextResponse.json(
        {
          error: "Cannot revert an admission that has already been transferred to the Active Students directory.",
        },
        { status: 400 }
      );
    }

    // 2. Void or cancel associated invoice
    if (app.payment_receipt_no) {
      try {
        await supabase
          .from("admission_invoices")
          .update({
            invoice_status: "cancelled",
            payment_status: "Voided",
            remarks: `Admission reverted back to pending on ${new Date().toLocaleDateString()}`,
            updated_at: new Date().toISOString(),
          })
          .eq("invoice_number", app.payment_receipt_no);
      } catch (invErr) {
        console.warn("Could not void invoice during admission revert:", invErr);
      }
    }

    // 3. Reset application back to pending
    const { data: updatedApp, error: updateError } = await supabase
      .from("admission_applications")
      .update({
        status: "pending",
        fee_paid: false,
        admitted_at: null,
        admitted_by: null,
        admitted_class: null,
        admitted_section: null,
        admitted_roll: null,
        is_transferred_to_active: false,
        transferred_to_active_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `Admission reverted back to Pending for ${app.student_name}. Generated invoice has been cancelled.`,
      application: updatedApp,
    });
  } catch (err: any) {
    console.error("Error in revert admission route:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
