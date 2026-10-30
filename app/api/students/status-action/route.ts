import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { denyOutsideClasses, requireStaff } from "@/lib/api/guard";
import type { AuthContext } from "@/lib/supabase/auth-helper";
import { recordUndo } from "@/lib/undo/journal";
import { todayIST } from "@/lib/utils/date";
import { mustWrite } from "@/lib/supabase/write";
import { notifyAdminsOfError } from "@/lib/notifications/notify";
import { getAcademicYear } from "@/lib/academic/current-year";

const PENDING_STATUSES = [
  "Promoted But Not Admitted",
  "Detained",
  "Supplementary",
  "Compartmental",
  "Not Admitted",
  "Sent Up M.P.",
  "10th test fail",
  "exam fail - C.C",
  "C.C.H.S.",
];

type HistoryStudent = { id: string; present_class: string | null; present_section: string | null; present_roll: number | null };

/**
 * Write this year's academic_history status for each student. The student row is already
 * updated, so a failure here does not fail the request; it is collected and sent to admins.
 */
async function recordHistoryStatus(
  supabase: ReturnType<typeof createAdminClient>,
  students: HistoryStudent[],
  year: number,
  status: string,
) {
  const failed: string[] = [];
  for (const s of students) {
    try {
      const { data: exist, error } = await supabase
        .from("academic_history")
        .select("id")
        .eq("student_id", s.id)
        .eq("year", year)
        .maybeSingle();
      if (error) throw error;

      if (exist) {
        await mustWrite(supabase.from("academic_history").update({ status }).eq("id", exist.id), "academic_history update");
      } else {
        await mustWrite(supabase.from("academic_history").insert({
          student_id: s.id,
          year,
          class: s.present_class,
          section: s.present_section,
          roll: s.present_roll,
          status,
        }), "academic_history insert");
      }
    } catch (err) {
      failed.push(`${s.id}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  if (failed.length > 0) {
    await notifyAdminsOfError("students.status-action", `Academic history not saved for ${failed.length} student(s) marked ${status}`, failed.join("; "));
  }
}

type Admin = ReturnType<typeof createAdminClient>;
type Snapshot = { students: Record<string, unknown>[]; history: { id: string }[] };

/** Student rows and this year's history rows before a status change. */
async function snapshot(supabase: Admin, ids: string[], year: number): Promise<Snapshot> {
  const [students, history] = await Promise.all([
    supabase.from("students").select("*").in("id", ids),
    supabase.from("academic_history").select("*").in("student_id", ids).eq("year", year),
  ]);
  if (students.error || history.error) throw new Error(`Snapshot failed: ${(students.error ?? history.error)!.message}`);
  return { students: students.data ?? [], history: history.data ?? [] };
}

/** Undo puts the students and their history back and removes history rows the action created. */
async function recordStatusUndo(supabase: Admin, auth: AuthContext, label: string, ids: string[], year: number, before: Snapshot) {
  const { data: after } = await supabase.from("academic_history").select("id").in("student_id", ids).eq("year", year);
  const existed = new Set(before.history.map((h) => h.id));
  const created = (after ?? []).map((h) => h.id).filter((id) => !existed.has(id));
  return recordUndo({
    actorId: auth.user?.id,
    action: "students.status",
    label,
    entity: "students",
    steps: [
      { table: "students", op: "upsert", rows: before.students },
      { table: "academic_history", op: "upsert", rows: before.history },
      { table: "academic_history", op: "delete", column: "id", values: created },
    ],
    ttlHours: 72,
  });
}

export async function POST(req: Request) {
  try {
    const gate = await requireStaff("can_edit_student_profile");
    if (!gate.ok) return gate.response;
    const auth = gate.auth;

    const body = await req.json();
    const {
      action,
      studentIds = [],
      tcDate,
      tcReason,
      tcNo,
      reason,
    } = body;

    const supabase = createAdminClient();
    const currentYear = await getAcademicYear();
    const nowIso = new Date().toISOString();
    const todayStr = todayIST();

    // Teachers act only on students of their own classes, and never school-wide.
    if (auth.role === "Teacher") {
      if (action === "archive_stale") {
        return NextResponse.json({ error: "Forbidden: only Admin or Staff can archive stale students" }, { status: 403 });
      }
      if (studentIds.length) {
        const { data: rows, error } = await supabase.from("students").select("present_class").in("id", studentIds);
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        for (const r of rows ?? []) {
          const denied = denyOutsideClasses(auth, r.present_class);
          if (denied) return denied;
        }
      }
    }

    // ACTION 1: Issue Transfer Certificate (TC Out)
    if (action === "tc_out") {
      if (!studentIds || studentIds.length === 0) {
        return NextResponse.json({ error: "studentIds array is required for TC Out" }, { status: 400 });
      }

      const issueDate = tcDate || todayStr;
      const departureReason = tcReason || "Transfer Certificate Issued";
      const before = await snapshot(supabase, studentIds, currentYear);

      const { data: updatedStudents, error: updErr } = await supabase
        .from("students")
        .update({
          current_status: "TC Out",
          tc_issued: true,
          tc_date: issueDate,
          tc_reason: departureReason,
          is_invoice_queued: false,
          previous_status: "TC Out",
          updated_at: nowIso,
        })
        .in("id", studentIds)
        .select();

      if (updErr) {
        return NextResponse.json({ error: updErr.message }, { status: 500 });
      }

      await recordHistoryStatus(supabase, updatedStudents || [], currentYear, "TC Out");
      const undoId = await recordStatusUndo(supabase, auth, `TC Out for ${updatedStudents?.length || 0} student(s)`, studentIds, currentYear, before);

      // Log teacher activity
      try {
        await mustWrite(supabase.from("teacher_activity_logs").insert({
          user_id: auth.user?.id || null,
          teacher_id: auth.staffId || null,
          teacher_name: auth.fullName || "Staff",
          action_type: "TC_ISSUED",
          amount_collected: 0,
          metadata: {
            count: updatedStudents?.length || 0,
            tc_date: issueDate,
            reason: departureReason,
            tc_no: tcNo,
          },
        }), "teacher_activity_logs insert");
      } catch (lErr) {
        console.warn("Could not log TC activity:", lErr);
      }

      return NextResponse.json({
        success: true,
        action: "tc_out",
        count: updatedStudents?.length || 0,
        message: `Successfully issued Transfer Certificate for ${updatedStudents?.length || 0} student(s). Moved to Old Register.`,
        students: updatedStudents,
        undoId,
      });
    }

    // ACTION 2: Mark Drop Out
    if (action === "drop_out") {
      if (!studentIds || studentIds.length === 0) {
        return NextResponse.json({ error: "studentIds array is required for Drop Out" }, { status: 400 });
      }

      const dropReason = reason || "Drop Out";
      const before = await snapshot(supabase, studentIds, currentYear);

      const { data: updatedStudents, error: updErr } = await supabase
        .from("students")
        .update({
          current_status: "Drop Out",
          tc_reason: dropReason,
          is_invoice_queued: false,
          updated_at: nowIso,
        })
        .in("id", studentIds)
        .select();

      if (updErr) {
        return NextResponse.json({ error: updErr.message }, { status: 500 });
      }

      await recordHistoryStatus(supabase, updatedStudents || [], currentYear, "Drop Out");
      const undoId = await recordStatusUndo(supabase, auth, `Drop Out for ${updatedStudents?.length || 0} student(s)`, studentIds, currentYear, before);

      return NextResponse.json({
        success: true,
        action: "drop_out",
        count: updatedStudents?.length || 0,
        message: `Marked ${updatedStudents?.length || 0} student(s) as Drop Out. Moved to Old Register.`,
        students: updatedStudents,
        undoId,
      });
    }

    // ACTION 3: Archive Stale Pending Students (> 1 year unattended)
    if (action === "archive_stale") {
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      const oneYearAgoIso = oneYearAgo.toISOString();

      // Find pending students older than 1 year or with academic_year < currentYear
      const { data: staleStudents, error: fetchErr } = await supabase
        .from("students")
        .select("id, name, present_class, present_section, present_roll")
        .in("current_status", PENDING_STATUSES)
        .or(`updated_at.lt.${oneYearAgoIso},admission_year.lt.${currentYear - 1}`);

      if (fetchErr) {
        return NextResponse.json({ error: fetchErr.message }, { status: 500 });
      }

      if (!staleStudents || staleStudents.length === 0) {
        return NextResponse.json({
          success: true,
          action: "archive_stale",
          count: 0,
          message: "No stale pending students (> 1 year) found.",
        });
      }

      const staleIds = staleStudents.map((s) => s.id);
      const before = await snapshot(supabase, staleIds, currentYear);
      const { data: updatedStudents, error: updErr } = await supabase
        .from("students")
        .update({
          current_status: "Drop Out",
          tc_reason: "Unattended / Auto-archived after 1+ year pending",
          is_invoice_queued: false,
          updated_at: nowIso,
        })
        .in("id", staleIds)
        .select();

      if (updErr) {
        return NextResponse.json({ error: updErr.message }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        action: "archive_stale",
        count: updatedStudents?.length || 0,
        message: `Successfully archived ${updatedStudents?.length || 0} unattended pending student(s) to Drop Out.`,
        students: updatedStudents,
        undoId: await recordStatusUndo(supabase, auth, `Archive ${updatedStudents?.length || 0} stale student(s)`, staleIds, currentYear, before),
      });
    }

    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (err: any) {
    console.error("Error in student status-action:", err);
    return NextResponse.json({ error: err.message || "Failed to execute status action" }, { status: 500 });
  }
}
