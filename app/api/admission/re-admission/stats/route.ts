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
    const cls = selectedClass.trim();
    let classVariations = [cls];
    if (cls === "V" || cls === "5") {
      classVariations = ["V", "5", "Class V", "Class 5"];
    } else if (cls === "VI" || cls === "6") {
      classVariations = ["VI", "6", "Class VI", "Class 6"];
    } else if (cls === "VII" || cls === "7") {
      classVariations = ["VII", "7", "Class VII", "Class 7"];
    } else if (cls === "VIII" || cls === "8") {
      classVariations = ["VIII", "8", "Class VIII", "Class 8"];
    } else if (cls === "IX" || cls === "9") {
      classVariations = ["IX", "9", "Class IX", "Class 9"];
    } else if (cls === "X" || cls === "10") {
      classVariations = ["X", "10", "Class X", "Class 10"];
    } else if (cls === "XI" || cls === "11") {
      classVariations = ["XI", "11", "Class XI", "Class 11"];
    } else if (cls === "XII" || cls === "12") {
      classVariations = ["XII", "12", "Class XII", "Class 12"];
    }

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
      .in("present_class", classVariations);

    if (selectedSection && selectedSection !== "all") {
      studentsQuery = studentsQuery.ilike("present_section", selectedSection);
    }

    studentsQuery = studentsQuery.order("present_roll", { ascending: true });

    // 2. Fetch online re-admission applications for selected class
    let onlineAppsQuery = supabase
      .from("admission_applications")
      .select("id, application_no, target_class, target_section, student_name, status, form_method, admitted_student_id, created_at")
      .eq("admission_type", "re")
      .in("target_class", classVariations);

    if (selectedSection && selectedSection !== "all") {
      onlineAppsQuery = onlineAppsQuery.ilike("target_section", selectedSection);
    }

    // 3. Fetch previous year academic history count for comparison
    let prevHistoryQuery = supabase
      .from("academic_history")
      .select("id, class, section, status", { count: "exact", head: false })
      .eq("year", prevYear)
      .in("class", classVariations);

    if (selectedSection && selectedSection !== "all") {
      prevHistoryQuery = prevHistoryQuery.ilike("section", selectedSection);
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
    const admittedStudents = students.filter(
      (s) => s.re_admission_status === "admitted" && s.current_status === "Continuing"
    );
    const notAdmittedStudents = students.filter(
      (s) => s.re_admission_status === "not_admitted" || s.current_status === "Not Admitted"
    );
    const pendingStudents = students.filter(
      (s) => s.current_status !== "Continuing" && s.current_status !== "Not Admitted"
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
