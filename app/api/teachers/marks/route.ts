import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

function calculateGrade(marks: number, fullMarks: number = 100): string {
  if (marks === null || marks === undefined || isNaN(marks)) return "";
  const pct = (marks / fullMarks) * 100;
  if (pct >= 90) return "AA";
  if (pct >= 80) return "A+";
  if (pct >= 65) return "A";
  if (pct >= 50) return "B+";
  if (pct >= 40) return "B";
  if (pct >= 30) return "C";
  if (pct >= 25) return "D";
  return "Needs Improvement";
}

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
    const subject = searchParams.get("subject") || "";
    const examType = searchParams.get("examType") || searchParams.get("exam_type") || "S1";
    const academicYear = parseInt(
      searchParams.get("academicYear") || searchParams.get("academic_year") || `${new Date().getFullYear()}`,
      10
    );

    if (!className) {
      return NextResponse.json({ error: "Class name is required" }, { status: 400 });
    }

    const adminClient = createAdminClient();

    // 1. Fetch Students in that class & section
    let studentQuery = adminClient
      .from("students")
      .select("id, name, present_class, present_section, present_roll, student_unique_code, school_id")
      .eq("present_class", className)
      .order("present_roll", { ascending: true, nullsFirst: false });

    if (section && section !== "ALL") {
      studentQuery = studentQuery.eq("present_section", section);
    }

    const { data: students, error: studError } = await studentQuery;
    if (studError) {
      return NextResponse.json({ error: studError.message }, { status: 500 });
    }

    // 2. Fetch existing marks from student_marks
    let marksQuery = adminClient
      .from("student_marks")
      .select("*")
      .eq("academic_year", academicYear)
      .eq("class_name", className)
      .eq("exam_type", examType);

    if (subject) {
      marksQuery = marksQuery.eq("subject", subject);
    }

    if (section && section !== "ALL") {
      marksQuery = marksQuery.eq("section", section);
    }

    const { data: existingMarks, error: marksError } = await marksQuery;
    if (marksError) {
      return NextResponse.json({ error: marksError.message }, { status: 500 });
    }

    // Map student records with any existing mark
    const roster = (students || []).map((st) => {
      const markRow = existingMarks?.find(
        (m) => m.student_id === st.id && (!subject || m.subject === subject)
      );

      return {
        studentId: st.id,
        studentName: st.name,
        rollNo: st.present_roll || "",
        className: st.present_class,
        section: st.present_section || "A",
        uniqueCode: st.student_unique_code || "",
        schoolId: st.school_id || "",
        marksObtained: markRow?.marks_obtained !== undefined ? markRow.marks_obtained : null,
        fullMarks: markRow?.full_marks || 100,
        grade: markRow?.grade || (markRow?.marks_obtained !== null && markRow?.marks_obtained !== undefined ? calculateGrade(markRow.marks_obtained, markRow.full_marks || 100) : ""),
        remarks: markRow?.remarks || "",
        updatedAt: markRow?.updated_at || null,
      };
    });

    return NextResponse.json({
      success: true,
      className,
      section,
      subject,
      examType,
      academicYear,
      roster,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to fetch marks" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const adminClient = createAdminClient();

    // Check user permissions
    const { data: currentRole } = await adminClient
      .from("user_roles")
      .select("role, permissions, staff_id, full_name")
      .eq("user_id", user.id)
      .maybeSingle();

    const roleLower = (currentRole?.role || "").toLowerCase();
    const isAdmin = roleLower === "admin" || roleLower === "super admin" || roleLower === "super_admin";
    const hasPerm = currentRole?.permissions?.can_enter_results;

    // Check if user has active temporary permission grant
    let hasGrant = false;
    if (!isAdmin && !hasPerm) {
      const { data: grant } = await adminClient
        .from("teacher_permission_grants")
        .select("id")
        .eq("user_id", user.id)
        .eq("permission_key", "can_enter_results")
        .eq("is_active", true)
        .gte("expires_at", new Date().toISOString())
        .maybeSingle();
      if (grant) hasGrant = true;
    }

    if (!isAdmin && !hasPerm && !hasGrant) {
      return NextResponse.json(
        { error: "Permission denied: Result / Marks Entry permission is required." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const {
      className,
      section = "ALL",
      subject,
      examType = "S1",
      academicYear = new Date().getFullYear(),
      marks = [], // Array of { studentId, studentName, rollNo, marksObtained, fullMarks, remarks }
    } = body;

    if (!className || !subject || !marks || !Array.isArray(marks) || marks.length === 0) {
      return NextResponse.json(
        { error: "Class, subject, and marks list are required." },
        { status: 400 }
      );
    }

    // Verify allowed classes restriction if configured on teacher
    const allowedClasses = currentRole?.permissions?.allowed_classes;
    if (!isAdmin && allowedClasses && Array.isArray(allowedClasses) && allowedClasses.length > 0) {
      if (!allowedClasses.includes(className)) {
        return NextResponse.json(
          { error: `Permission denied: You do not have permission to enter marks for Class ${className}.` },
          { status: 403 }
        );
      }
    }

    // Prepare batch upsert records
    const recordsToUpsert = marks
      .filter((m: any) => m.studentId)
      .map((m: any) => {
        const fullMarks = Number(m.fullMarks) || 100;
        const marksObtained = m.marksObtained === "" || m.marksObtained === null || m.marksObtained === undefined
          ? null
          : Number(m.marksObtained);
        const grade = marksObtained !== null ? calculateGrade(marksObtained, fullMarks) : null;

        return {
          academic_year: Number(academicYear),
          student_id: m.studentId,
          student_name: m.studentName || null,
          roll_no: m.rollNo ? String(m.rollNo) : null,
          class_name: className,
          section: section || "ALL",
          subject: subject,
          exam_type: examType,
          full_marks: fullMarks,
          marks_obtained: marksObtained,
          grade: grade,
          remarks: m.remarks || null,
          entered_by: user.id,
          teacher_id: currentRole?.staff_id || null,
          updated_at: new Date().toISOString(),
        };
      });

    const { error: upsertError } = await adminClient
      .from("student_marks")
      .upsert(recordsToUpsert, {
        onConflict: "student_id,academic_year,class_name,subject,exam_type",
      });

    if (upsertError) {
      return NextResponse.json({ error: upsertError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `Successfully saved marks for ${recordsToUpsert.length} students.`,
      count: recordsToUpsert.length,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to save marks" }, { status: 500 });
  }
}
