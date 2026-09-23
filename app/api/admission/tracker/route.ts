import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthenticatedUserRole } from "@/lib/supabase/auth-helper";

export async function GET(req: Request) {
  try {
    const auth = await getAuthenticatedUserRole();
    if (auth.role === "Guest") {
      return NextResponse.json({ error: "Unauthorized: Please log in." }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const academicYear = searchParams.get("academicYear") || "2026";
    const fromDate = searchParams.get("fromDate"); // YYYY-MM-DD
    const toDate = searchParams.get("toDate");     // YYYY-MM-DD
    const targetClass = searchParams.get("targetClass"); // "all" or specific class
    const admissionType = searchParams.get("admissionType"); // "all", "new", "re"
    const channel = searchParams.get("channel"); // "all", "online", "offline"

    const supabase = createAdminClient();

    // 1. Fetch all distinct academic years for history selector
    const { data: yearRows } = await supabase
      .from("admission_applications")
      .select("academic_year")
      .order("academic_year", { ascending: false });

    const availableYearsSet = new Set<string>();
    availableYearsSet.add(new Date().getFullYear().toString());
    availableYearsSet.add("2026");
    availableYearsSet.add("2025");
    yearRows?.forEach((r) => {
      if (r.academic_year) availableYearsSet.add(String(r.academic_year));
    });
    const availableYears = Array.from(availableYearsSet).sort((a, b) => b.localeCompare(a));

    // 2. Query admission_applications
    // Online applications must ONLY be counted if status = 'admitted'
    // Offline forms are counted if form_method = 'offline'
    let query = supabase
      .from("admission_applications")
      .select(
        "id, application_no, academic_year, admission_type, form_method, target_class, target_section, status, student_name, created_at, admitted_at, payment_receipt_no, fee_paid, fee_amount"
      )
      .or("form_method.eq.offline,and(form_method.neq.offline,status.eq.admitted)");

    if (academicYear && academicYear !== "all") {
      query = query.eq("academic_year", academicYear);
    }

    if (targetClass && targetClass !== "all") {
      query = query.ilike("target_class", targetClass);
    }

    if (admissionType && admissionType !== "all") {
      query = query.eq("admission_type", admissionType);
    }

    if (channel && channel !== "all") {
      if (channel === "online") {
        query = query.neq("form_method", "offline").eq("status", "admitted");
      } else if (channel === "offline") {
        query = query.eq("form_method", "offline");
      }
    }

    query = query.order("created_at", { ascending: false });

    const { data: rawRows, error } = await query;
    if (error) {
      console.error("Error fetching admission tracker records:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // 3. Filter by Date range if provided
    let records = (rawRows || []).filter((item) => {
      const itemDate = (item.admitted_at || item.created_at || "").slice(0, 10);
      if (fromDate && itemDate < fromDate) return false;
      if (toDate && itemDate > toDate) return false;
      return true;
    });

    // 4. Compute comprehensive summary metrics
    let totalGlobalCount = 0;
    let newOnline = 0;
    let newOffline = 0;
    let reOnline = 0;
    let reOffline = 0;
    const classCounts: Record<string, number> = {};

    const normalizedItems = records.map((row) => {
      const isOffline = (row.form_method || "").toLowerCase() === "offline";
      const isRe = (row.admission_type || "").toLowerCase() === "re";
      const receipt = row.payment_receipt_no || row.application_no;
      const c = (row.target_class || "N/A").toUpperCase().trim();

      totalGlobalCount++;

      if (isRe) {
        if (isOffline) reOffline++;
        else reOnline++;
      } else {
        if (isOffline) newOffline++;
        else newOnline++;
      }

      classCounts[c] = (classCounts[c] || 0) + 1;

      return {
        id: row.id,
        receiptNo: receipt,
        applicationNo: row.application_no,
        date: (row.admitted_at || row.created_at || "").slice(0, 10),
        dateTime: row.admitted_at || row.created_at,
        admissionType: isRe ? "re" : "new",
        channel: isOffline ? "offline" : "online",
        targetClass: c,
        targetSection: row.target_section || "",
        studentName: row.student_name && row.student_name.trim() ? row.student_name : "Blank Form / Unassigned",
        status: row.status,
        feeAmount: Number(row.fee_amount) || 0,
        feePaid: Boolean(row.fee_paid),
        academicYear: row.academic_year,
      };
    });

    return NextResponse.json({
      success: true,
      stats: {
        totalGlobalCount,
        newAdmission: {
          total: newOnline + newOffline,
          online: newOnline,
          offline: newOffline,
        },
        reAdmission: {
          total: reOnline + reOffline,
          online: reOnline,
          offline: reOffline,
        },
        classBreakdown: classCounts,
      },
      availableYears,
      records: normalizedItems,
    });
  } catch (err: any) {
    console.error("GET /api/admission/tracker error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
