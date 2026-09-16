import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthenticatedUserRole } from "@/lib/supabase/auth-helper";

export async function GET() {
  try {
    const auth = await getAuthenticatedUserRole();
    if (auth.role === "Guest") {
      return NextResponse.json({ error: "Unauthorized: Please log in." }, { status: 401 });
    }

    const supabase = createAdminClient();

    // Fetch paid invoices once in a single database query
    const { data: paidInvoices, error: invoicesErr } = await supabase
      .from("admission_invoices")
      .select("total_amount, remarks, is_blank")
      .eq("payment_status", "Paid");

    if (invoicesErr) {
      console.warn("Error fetching paid admission invoices:", invoicesErr);
    }

    let reAdmissionVasul = 0;
    let newAdmissionVasul = 0;

    for (const row of paidInvoices || []) {
      const amount = Number(row.total_amount) || 0;
      const isReAdmit = (row.remarks || "").toLowerCase().includes("re-admission");
      if (isReAdmit) {
        reAdmissionVasul += amount;
      } else if (!row.is_blank) {
        newAdmissionVasul += amount;
      }
    }

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
