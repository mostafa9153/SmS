import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  try {
    const supabase = createAdminClient();

    // 1. Re-admission collection from admission_invoices
    const { data: readmitInvoices, error: readmitErr } = await supabase
      .from("admission_invoices")
      .select("total_amount, payment_status")
      .ilike("remarks", "%Re-admission%")
      .eq("payment_status", "Paid");

    if (readmitErr) {
      console.warn("Error fetching re-admission invoices:", readmitErr);
    }

    const reAdmissionVasul = (readmitInvoices || []).reduce(
      (sum, row) => sum + (Number(row.total_amount) || 0),
      0
    );

    // 2. New admission collection from admission_invoices
    const { data: newInvoices, error: newErr } = await supabase
      .from("admission_invoices")
      .select("total_amount, payment_status")
      .not("remarks", "ilike", "%Re-admission%")
      .eq("payment_status", "Paid")
      .eq("is_blank", false);

    if (newErr) {
      console.warn("Error fetching new admission invoices:", newErr);
    }

    const newAdmissionVasul = (newInvoices || []).reduce(
      (sum, row) => sum + (Number(row.total_amount) || 0),
      0
    );

    return NextResponse.json({
      success: true,
      reAdmissionVasul,
      newAdmissionVasul,
    });
  } catch (err: any) {
    console.error("Error in /api/admission/stats:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to fetch admission stats" },
      { status: 500 }
    );
  }
}
