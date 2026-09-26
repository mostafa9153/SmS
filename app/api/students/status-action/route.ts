import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthenticatedUserRole } from "@/lib/supabase/auth-helper";

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

export async function POST(req: Request) {
  try {
    const auth = await getAuthenticatedUserRole();
    if (auth.role === "Guest") {
      return NextResponse.json({ error: "Unauthorized: Please log in." }, { status: 401 });
    }

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
    const currentYear = new Date().getFullYear();
    const nowIso = new Date().toISOString();
    const todayStr = new Date().toISOString().split("T")[0];

    // ACTION 1: Issue Transfer Certificate (TC Out)
    if (action === "tc_out") {
      if (!studentIds || studentIds.length === 0) {
        return NextResponse.json({ error: "studentIds array is required for TC Out" }, { status: 400 });
      }

      const issueDate = tcDate || todayStr;
      const departureReason = tcReason || "Transfer Certificate Issued";

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

      // Record in academic history
      try {
        for (const s of updatedStudents || []) {
          const { data: exist } = await supabase
            .from("academic_history")
            .select("id")
            .eq("student_id", s.id)
            .eq("year", currentYear)
            .maybeSingle();

          if (exist) {
            await supabase
              .from("academic_history")
              .update({ status: "TC Out" })
              .eq("id", exist.id);
          } else {
            await supabase.from("academic_history").insert({
              student_id: s.id,
              year: currentYear,
              class: s.present_class,
              section: s.present_section,
              roll: s.present_roll,
              status: "TC Out",
            });
          }
        }
      } catch (hErr) {
        console.warn("Could not record academic_history for TC Out:", hErr);
      }

      // Log teacher activity
      try {
        await supabase.from("teacher_activity_logs").insert({
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
        });
      } catch (lErr) {
        console.warn("Could not log TC activity:", lErr);
      }

      return NextResponse.json({
        success: true,
        action: "tc_out",
        count: updatedStudents?.length || 0,
        message: `Successfully issued Transfer Certificate for ${updatedStudents?.length || 0} student(s). Moved to Old Register.`,
        students: updatedStudents,
      });
    }

    // ACTION 2: Mark Drop Out
    if (action === "drop_out") {
      if (!studentIds || studentIds.length === 0) {
        return NextResponse.json({ error: "studentIds array is required for Drop Out" }, { status: 400 });
      }

      const dropReason = reason || "Drop Out";

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

      // Record in academic history
      try {
        for (const s of updatedStudents || []) {
          const { data: exist } = await supabase
            .from("academic_history")
            .select("id")
            .eq("student_id", s.id)
            .eq("year", currentYear)
            .maybeSingle();

          if (exist) {
            await supabase
              .from("academic_history")
              .update({ status: "Drop Out" })
              .eq("id", exist.id);
          } else {
            await supabase.from("academic_history").insert({
              student_id: s.id,
              year: currentYear,
              class: s.present_class,
              section: s.present_section,
              roll: s.present_roll,
              status: "Drop Out",
            });
          }
        }
      } catch (hErr) {
        console.warn("Could not record academic_history for Drop Out:", hErr);
      }

      return NextResponse.json({
        success: true,
        action: "drop_out",
        count: updatedStudents?.length || 0,
        message: `Marked ${updatedStudents?.length || 0} student(s) as Drop Out. Moved to Old Register.`,
        students: updatedStudents,
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
      });
    }

    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (err: any) {
    console.error("Error in student status-action:", err);
    return NextResponse.json({ error: err.message || "Failed to execute status action" }, { status: 500 });
  }
}
