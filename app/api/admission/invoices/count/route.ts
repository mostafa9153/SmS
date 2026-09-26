import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedUserRole } from "@/lib/supabase/auth-helper";

export async function GET() {
  try {
    const auth = await getAuthenticatedUserRole();
    if (auth.role === "Guest") {
      return NextResponse.json({ error: "Unauthorized: Please log in." }, { status: 401 });
    }

    const supabase = await createClient();
    
    // We only select the minimal columns needed to calculate the count
    const { data: students, error } = await supabase
      .from("students")
      .select("current_status, is_invoice_queued, re_admission_status, admission_year, invoice_printed_at")
      .in("current_status", ["Continuing", "New Admission", "Detained"]);

    if (error) {
      console.error("Error fetching students for invoice count:", error);
      return NextResponse.json({ count: 0 });
    }

    // Get current year logic similar to front-end
    const date = new Date();
    const month = date.getMonth() + 1;
    const currentYear = month >= 11 ? date.getFullYear() + 1 : date.getFullYear();
    const currentYearStr = currentYear.toString();

    const count = students.filter((s: any) => {
      if (s.invoice_printed_at) return false;
      const queued = Boolean(s.is_invoice_queued);
      const admittedPending =
        s.re_admission_status === "admitted" && s.is_invoice_queued !== false;
      const newAdmitQueued = s.admission_year === currentYearStr && queued;
      return queued || admittedPending || newAdmitQueued;
    }).length;

    return NextResponse.json({ count });
  } catch (error) {
    console.error("Error in invoice count route:", error);
    return NextResponse.json({ count: 0 }, { status: 500 });
  }
}
