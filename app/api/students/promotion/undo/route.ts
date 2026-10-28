import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { notify, notifyAdminsOfError } from "@/lib/notifications/notify";

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Role check: Staff or Admin can execute undo
    const { data: roleData, error: roleError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (roleError || !roleData || (roleData.role !== "Admin" && roleData.role !== "Staff")) {
      return NextResponse.json({ error: "Forbidden: Access denied" }, { status: 403 });
    }

    const body = await req.json();
    const {
      sourceClass,
      academicYear,
      studentIds = [],
      resetToContinuing = false,
    } = body;

    const adminClient = createAdminClient();

    // Query students to restore
    let studentsQuery = adminClient
      .from("students")
      .select("id, name, present_class, present_section, present_roll, previous_class, previous_section, previous_roll_no, current_status, detention_count");

    if (studentIds.length > 0) {
      studentsQuery = studentsQuery.in("id", studentIds);
    } else if (sourceClass) {
      studentsQuery = studentsQuery.eq("present_class", sourceClass);
    } else {
      return NextResponse.json(
        { error: "Must specify studentIds or sourceClass for promotion rollback." },
        { status: 400 }
      );
    }

    const { data: targetStudents, error: fetchErr } = await studentsQuery;

    if (fetchErr) {
      return NextResponse.json({ error: fetchErr.message }, { status: 500 });
    }

    if (!targetStudents || targetStudents.length === 0) {
      return NextResponse.json({ success: true, count: 0, message: "No matching students found." });
    }

    const BATCH_SIZE = 25;
    let restoredCount = 0;

    for (let i = 0; i < targetStudents.length; i += BATCH_SIZE) {
      const batch = targetStudents.slice(i, i + BATCH_SIZE);
      await Promise.all(
        batch.map(async (s) => {
          const updates: any = {
            current_status: "Continuing",
            re_admission_status: "pending",
          };

          if (s.previous_class) {
            updates.present_class = s.previous_class;
            updates.previous_class = null;
          }
          if (s.previous_section) {
            updates.present_section = s.previous_section;
            updates.previous_section = null;
          }
          if (s.previous_roll_no) {
            updates.present_roll = s.previous_roll_no;
            updates.previous_roll_no = null;
          }
          if (s.detention_count && s.detention_count > 0) {
            updates.detention_count = Math.max(0, s.detention_count - 1);
          } else if (resetToContinuing) {
            updates.detention_count = 0;
          }

          const { error: updErr } = await adminClient
            .from("students")
            .update(updates)
            .eq("id", s.id);

          if (!updErr) {
            restoredCount++;
          }
        })
      );
    }

    // Delete corresponding academic history if academicYear is provided
    if (academicYear) {
      const ids = targetStudents.map((s) => s.id);
      for (let i = 0; i < ids.length; i += 100) {
        const chunk = ids.slice(i, i + 100);
        await adminClient
          .from("academic_history")
          .delete()
          .in("student_id", chunk)
          .eq("year", academicYear);
      }
    }

    // Audit log
    await adminClient.from("audit_log").insert({
      performed_by: user.id,
      action: "PROMOTION_UNDO",
      table_name: "students",
      metadata: {
        sourceClass: sourceClass || "multiple",
        academicYear: academicYear || new Date().getFullYear(),
        totalRestored: restoredCount,
        resetToContinuing,
      },
    });

    await notify({ roles: ["Admin", "Staff"], severity: "warning", title: "Promotion rolled back", message: `${restoredCount} student(s) restored to Continuing status.`, link: "/promotion", source: "students.promotion.undo" });

    return NextResponse.json({
      success: true,
      count: restoredCount,
      message: `Successfully rolled back and restored ${restoredCount} student(s) to active Continuing status.`,
    });
  } catch (err: any) {
    console.error("Promotion undo error:", err);
    await notifyAdminsOfError("students.promotion.undo", "Promotion rollback failed", err, "/promotion");
    return NextResponse.json(
      { error: err.message || "Failed to rollback promotion" },
      { status: 500 }
    );
  }
}
