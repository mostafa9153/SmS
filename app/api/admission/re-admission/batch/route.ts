import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthenticatedUserRole } from "@/lib/supabase/auth-helper";
import { parseSchoolId, buildSchoolId } from "@/lib/utils/school-id";

export async function POST(req: Request) {
  try {
    const auth = await getAuthenticatedUserRole();
    if (auth.role === "Guest") {
      return NextResponse.json({ error: "Unauthorized: Please log in." }, { status: 401 });
    }

    const body = await req.json();
    const {
      studentIds,
      targetClass,
      targetSection = "A",
      targetAcademicYear,
      rollStrategy = "rank",
      isInvoiceQueued = true,
      feePaid = true,
      feeAmount = 0,
    } = body;

    if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
      return NextResponse.json({ error: "studentIds array is required" }, { status: 400 });
    }

    if (!targetClass) {
      return NextResponse.json({ error: "targetClass is required" }, { status: 400 });
    }

    // Role check for teacher permissions
    if (auth.role === "Teacher") {
      const perms = auth.permissions;
      if (perms && perms.can_handle_readmission === false) {
        return NextResponse.json(
          { error: "Forbidden: You do not have permission to process re-admissions." },
          { status: 403 }
        );
      }
      if (perms?.allowed_classes && perms.allowed_classes.length > 0 && !perms.allowed_classes.includes(targetClass)) {
        return NextResponse.json(
          { error: `Forbidden: You are not assigned to handle re-admissions for Class ${targetClass}.` },
          { status: 403 }
        );
      }
    }

    const supabase = createAdminClient();
    const currentYear = new Date().getFullYear();
    const sessionYear = targetAcademicYear ? Number(targetAcademicYear) : currentYear;

    // 1. Fetch target students
    const { data: students, error: fetchErr } = await supabase
      .from("students")
      .select("*")
      .in("id", studentIds);

    if (fetchErr) {
      return NextResponse.json({ error: fetchErr.message }, { status: 500 });
    }

    if (!students || students.length === 0) {
      return NextResponse.json({ error: "No matching students found" }, { status: 404 });
    }

    // 2. Fetch marks if rank strategy
    let marksMap = new Map<string, number>();
    if (rollStrategy === "rank") {
      const { data: results } = await supabase
        .from("results")
        .select("student_id, marks_obtained, academic_year")
        .in("student_id", studentIds);

      if (results) {
        for (const r of results) {
          const m = Number(r.marks_obtained) || 0;
          if (!marksMap.has(r.student_id) || marksMap.get(r.student_id)! < m) {
            marksMap.set(r.student_id, m);
          }
        }
      }
    }

    // 3. Sort students according to roll assignment strategy
    const sortedStudents = [...students];
    if (rollStrategy === "rank") {
      sortedStudents.sort((a, b) => {
        const marksA = marksMap.get(a.id) || 0;
        const marksB = marksMap.get(b.id) || 0;
        if (marksB !== marksA) return marksB - marksA;
        const nameCmp = (a.name || "").localeCompare(b.name || "");
        if (nameCmp !== 0) return nameCmp;
        const rollA = Number(a.present_roll) || 0;
        const rollB = Number(b.present_roll) || 0;
        if (rollA !== rollB) return rollA - rollB;
        return a.id.localeCompare(b.id);
      });
    } else if (rollStrategy === "alphabetical") {
      sortedStudents.sort((a, b) => {
        const nameCmp = (a.name || "").localeCompare(b.name || "");
        if (nameCmp !== 0) return nameCmp;
        return (Number(a.present_roll) || 0) - (Number(b.present_roll) || 0);
      });
    } else {
      // preserve roll
      sortedStudents.sort((a, b) => (Number(a.present_roll) || 0) - (Number(b.present_roll) || 0));
    }

    const todayDateStr = new Date().toISOString().split("T")[0];
    const nowIso = new Date().toISOString();

    const updatedStudentsList: any[] = [];
    const historyInserts: any[] = [];

    // 4. Process each student
    for (let i = 0; i < sortedStudents.length; i++) {
      const student = sortedStudents[i];
      const assignedRoll = rollStrategy === "preserve" ? (Number(student.present_roll) || i + 1) : i + 1;

      let updatedSchoolId = student.school_id;
      if (student.school_id) {
        const parsed = parseSchoolId(student.school_id);
        if (!parsed.isLegacyFormat) {
          updatedSchoolId = buildSchoolId(
            targetClass,
            parsed.year || student.admission_year || currentYear,
            parsed.registerNo || student.admission_no || "01",
            parsed.prefix
          );
        }
      }

      const updateFields: Record<string, any> = {
        present_class: targetClass,
        present_section: targetSection,
        present_roll: assignedRoll,
        school_id: updatedSchoolId,
        present_class_admission_date: todayDateStr,
        current_status: "Continuing",
        re_admission_status: "admitted",
        re_admitted_at: nowIso,
        re_admitted_session: String(sessionYear),
        academic_year: String(sessionYear),
        is_invoice_queued: isInvoiceQueued !== false,
        previous_status: student.current_status,
        updated_at: nowIso,
      };

      if (targetClass !== student.present_class) {
        updateFields.previous_class = student.present_class;
        updateFields.previous_section = student.present_section;
        updateFields.previous_roll_no = student.present_roll;
      }

      const { data: updatedStudent, error: updErr } = await supabase
        .from("students")
        .update(updateFields)
        .eq("id", student.id)
        .select()
        .single();

      if (!updErr && updatedStudent) {
        updatedStudentsList.push(updatedStudent);
      }

      // Prepare academic history
      historyInserts.push({
        student_id: student.id,
        year: sessionYear,
        class: targetClass,
        section: targetSection,
        roll: assignedRoll,
        status: "Continuing",
      });
    }

    // 5. Batch update / upsert academic history
    if (historyInserts.length > 0) {
      try {
        for (const hist of historyInserts) {
          const { data: existing } = await supabase
            .from("academic_history")
            .select("id")
            .eq("student_id", hist.student_id)
            .eq("year", hist.year)
            .maybeSingle();

          if (existing) {
            await supabase
              .from("academic_history")
              .update({
                class: hist.class,
                section: hist.section,
                roll: hist.roll,
                status: hist.status,
              })
              .eq("id", existing.id);
          } else {
            await supabase.from("academic_history").insert(hist);
          }
        }
      } catch (hErr) {
        console.warn("Error updating batch academic history:", hErr);
      }
    }

    // 6. Log teacher activity
    try {
      await supabase.from("teacher_activity_logs").insert({
        user_id: auth.user?.id || null,
        teacher_id: auth.staffId || null,
        teacher_name: auth.fullName || "Staff",
        action_type: "BATCH_RE_ADMISSION",
        student_class: targetClass,
        section: targetSection,
        amount_collected: Number(feeAmount) * updatedStudentsList.length,
        metadata: {
          count: updatedStudentsList.length,
          roll_strategy: rollStrategy,
          session_year: sessionYear,
        },
      });
    } catch (logErr) {
      console.warn("Could not log batch teacher activity:", logErr);
    }

    return NextResponse.json({
      success: true,
      count: updatedStudentsList.length,
      targetClass,
      targetSection,
      sessionYear,
      rollStrategy,
      students: updatedStudentsList,
      message: `Successfully re-admitted ${updatedStudentsList.length} student(s) to Class ${targetClass} (${targetSection})!`,
    });
  } catch (err: any) {
    console.error("Error in batch re-admission:", err);
    return NextResponse.json({ error: err.message || "Failed to execute batch re-admission" }, { status: 500 });
  }
}
