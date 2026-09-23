import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// GET /api/teachers/attendance - Fetch student attendance for a class/section/date
export async function GET(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const className = searchParams.get("className") || searchParams.get("class_name");
    const section = searchParams.get("section") || "ALL";
    const date = searchParams.get("date") || new Date().toISOString().split("T")[0];

    if (!className) {
      return NextResponse.json({ error: "Class name is required" }, { status: 400 });
    }

    const adminClient = createAdminClient();

    // 1. Fetch Students in that class & section (include mobile)
    let studentQuery = adminClient
      .from("students")
      .select("id, name, present_class, present_section, present_roll, student_unique_code, school_id, mobile, alt_mobile")
      .eq("present_class", className)
      .order("present_roll", { ascending: true, nullsFirst: false });

    if (section && section !== "ALL") {
      studentQuery = studentQuery.eq("present_section", section);
    }

    const { data: students, error: studError } = await studentQuery;
    if (studError) {
      return NextResponse.json({ error: studError.message }, { status: 500 });
    }

    // 2. Fetch last 30 days attendance records
    const [yearStr, monthStr] = date.split("-");
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);
    
    const reqDate = new Date(`${date}T00:00:00Z`);
    const date30DaysAgo = new Date(reqDate);
    date30DaysAgo.setUTCDate(reqDate.getUTCDate() - 30);
    const thirtyDaysAgoStr = date30DaysAgo.toISOString().split("T")[0];
    
    // Bounds for current month (same month as 'date')
    const startOfMonth = `${yearStr}-${monthStr}-01`;
    const endOfMonthDate = new Date(Date.UTC(year, month, 0));
    const endOfMonth = endOfMonthDate.toISOString().split("T")[0];

    let attendanceQuery = adminClient
      .from("student_attendance")
      .select("student_id, attendance_date, status, remarks, created_at")
      .eq("class_name", className)
      .gte("attendance_date", thirtyDaysAgoStr)
      .lte("attendance_date", endOfMonth)
      .order("attendance_date", { ascending: false });

    if (section && section !== "ALL") {
      attendanceQuery = attendanceQuery.eq("section", section);
    }

    const { data: allAttendance } = await attendanceQuery;
    
    // 3. Build Roster and Calculate stats
    const roster = (students || []).map((s: any) => {
      const studentRecords = (allAttendance || []).filter((a: any) => a.student_id === s.id);
      
      // Today's record
      const todayRecord = studentRecords.find((a: any) => a.attendance_date === date);
      
      // Month % calculation
      const monthRecords = studentRecords.filter((a: any) => a.attendance_date >= startOfMonth && a.attendance_date <= endOfMonth);
      const totalMonthDays = monthRecords.length;
      const presentMonthDays = monthRecords.filter((a: any) => a.status === "PRESENT").length;
      const monthPercentage = totalMonthDays > 0 ? Math.round((presentMonthDays / totalMonthDays) * 100) : 100;
      
      // Consecutive absences (going backward from 'date' or yesterday if today is not marked yet)
      let consecutiveAbsences = 0;
      let checkDate = new Date(date);
      // Sort records descending by date
      const pastRecords = studentRecords
        .filter((a: any) => a.attendance_date <= date)
        .sort((a: any, b: any) => new Date(b.attendance_date).getTime() - new Date(a.attendance_date).getTime());
      
      for (const rec of pastRecords) {
        if (rec.status === "ABSENT") {
          consecutiveAbsences++;
        } else if (rec.status === "PRESENT") {
          break; // Streak broken
        }
      }

      return {
        studentId: s.id,
        studentName: s.name,
        rollNo: s.present_roll,
        uniqueCode: s.student_unique_code || s.school_id,
        className: s.present_class,
        section: s.present_section,
        contactNumber: s.mobile || s.alt_mobile || "",
        status: todayRecord?.status || "PRESENT",
        remarks: todayRecord?.remarks || "",
        recordedAt: todayRecord?.created_at || null,
        monthPercentage,
        consecutiveAbsences
      };
    });

    return NextResponse.json({
      success: true,
      className,
      section,
      date,
      totalStudents: roster.length,
      presentCount: roster.filter((r) => r.status === "PRESENT").length,
      absentCount: roster.filter((r) => r.status === "ABSENT").length,
      lateCount: roster.filter((r) => r.status === "LATE").length,
      roster,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to load student attendance" }, { status: 500 });
  }
}

// POST /api/teachers/attendance - Bulk save student attendance records
export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { className, section = "ALL", date, records = [] } = body;

    if (!className || !date || !Array.isArray(records) || records.length === 0) {
      return NextResponse.json({ error: "Class name, date, and attendance records are required." }, { status: 400 });
    }

    const adminClient = createAdminClient();

    // Get current staff ID
    const { data: currentRole } = await adminClient
      .from("user_roles")
      .select("staff_id, full_name")
      .eq("user_id", user.id)
      .maybeSingle();

    const academicYear = new Date(date).getFullYear();

    const rowsToUpsert = records.map((r: any) => ({
      academic_year: academicYear,
      student_id: r.studentId,
      student_name: r.studentName,
      roll_no: r.rollNo || null,
      class_name: className,
      section: r.section || section,
      attendance_date: date,
      status: r.status || "PRESENT",
      remarks: r.remarks || null,
      marked_by: user.id,
      teacher_id: currentRole?.staff_id || null,
      updated_at: new Date().toISOString(),
    }));

    const { error: upsertError } = await adminClient
      .from("student_attendance")
      .upsert(rowsToUpsert, {
        onConflict: "student_id,attendance_date",
      });

    if (upsertError) {
      return NextResponse.json({ error: upsertError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `Recorded attendance for ${records.length} students on ${date}.`,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to save student attendance" }, { status: 500 });
  }
}
