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
    const selectedClass = searchParams.get("class");
    const selectedSection = searchParams.get("section");
    const yearParam = searchParams.get("year");
    const currentYear = yearParam ? parseInt(yearParam, 10) : new Date().getFullYear();
    const prevYear = currentYear - 1;

    if (!selectedClass) {
      return NextResponse.json({ error: "Class parameter is required" }, { status: 400 });
    }

    if (auth.role === "Teacher" && auth.permissions?.allowed_classes?.length) {
      if (!auth.permissions.allowed_classes.includes(selectedClass)) {
        return NextResponse.json(
          { error: `Forbidden: You are not assigned to handle Class ${selectedClass}.` },
          { status: 403 }
        );
      }
    }

    const supabase = createAdminClient();

    // 1. Fetch re-admission candidate students for selected class and section
    let studentsQuery = supabase
      .from("students")
      .select(`
        id,
        name,
        school_id,
        pen,
        present_class,
        present_section,
        present_roll,
        student_contact,
        alt_mobile,
        re_admission_status,
        re_admitted_session,
        photo_url,
        father_name,
        guardian_name,
        gender,
        current_status,
        is_invoice_queued,
        re_admitted_at,
        created_at
      `)
      .in("current_status", [
        "Promoted But Not Admitted",
        "Continuing",
        "Supplementary",
        "Compartmental",
        "Detained",
        "Not Admitted",
        "Sent Up M.P.",
        "10th test fail",
        "exam fail - C.C",
        "C.C.H.S.",
      ])
      .eq("present_class", selectedClass);

    if (selectedSection && selectedSection !== "all") {
      studentsQuery = studentsQuery.eq("present_section", selectedSection);
    }

    studentsQuery = studentsQuery.order("present_roll", { ascending: true });

    // 2. Fetch online re-admission applications for selected class
    let onlineAppsQuery = supabase
      .from("admission_applications")
      .select("id, application_no, target_class, target_section, student_name, status, form_method, admitted_student_id, created_at")
      .eq("admission_type", "re")
      .eq("target_class", selectedClass);

    if (selectedSection && selectedSection !== "all") {
      onlineAppsQuery = onlineAppsQuery.eq("target_section", selectedSection);
    }

    // 3. Fetch previous year academic history count for comparison
    let prevHistoryQuery = supabase
      .from("academic_history")
      .select("id, class, section, status", { count: "exact", head: false })
      .eq("year", prevYear)
      .eq("class", selectedClass);

    if (selectedSection && selectedSection !== "all") {
      prevHistoryQuery = prevHistoryQuery.eq("section", selectedSection);
    }

    // Execute queries in parallel
    const [studentsRes, onlineAppsRes, prevHistRes] = await Promise.all([
      studentsQuery,
      onlineAppsQuery,
      prevHistoryQuery,
    ]);

    if (studentsRes.error) throw new Error(studentsRes.error.message);

    const students = studentsRes.data || [];
    const onlineApps = onlineAppsRes.data || [];
    const prevHistory = prevHistRes.data || [];

    // Aggregate statistics
    const totalStudents = students.length;
    const admittedStudents = students.filter((s) => s.re_admission_status === "admitted");
    const notAdmittedStudents = students.filter(
      (s) => s.re_admission_status === "not_admitted" || s.current_status === "Not Admitted"
    );
    const pendingStudents = students.filter(
      (s) => (!s.re_admission_status || s.re_admission_status === "pending") && s.current_status !== "Not Admitted"
    );

    // Online vs Offline breakdown
    const onlineSubmittedCount = onlineApps.length;
    const onlineAdmittedCount = onlineApps.filter((a) => a.status === "admitted").length;
    const onlinePendingCount = onlineApps.filter((a) => a.status === "pending").length;

    const offlineAdmittedCount = admittedStudents.length - onlineAdmittedCount > 0
      ? admittedStudents.length - onlineAdmittedCount
      : admittedStudents.length;

    const rate = totalStudents > 0 ? Math.round((admittedStudents.length / totalStudents) * 100) : 0;

    return NextResponse.json({
      success: true,
      stats: {
        class: selectedClass,
        section: selectedSection || "all",
        currentYear,
        previousYear: prevYear,
        totalEligible: totalStudents,
        admittedCount: admittedStudents.length,
        pendingCount: pendingStudents.length,
        notAdmittedCount: notAdmittedStudents.length,
        reAdmissionRate: rate,
        online: {
          totalSubmitted: onlineSubmittedCount,
          admitted: onlineAdmittedCount,
          pending: onlinePendingCount,
        },
        offline: {
          admitted: offlineAdmittedCount,
          pending: pendingStudents.length,
        },
        previousYearHistory: {
          year: prevYear,
          totalCount: prevHistory.length,
        },
      },
      students,
      onlineApplications: onlineApps,
    });
  } catch (err: any) {
    console.error("Error fetching re-admission dashboard stats:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
