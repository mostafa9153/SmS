import { createClient } from "@/lib/supabase/client";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  TeacherActionType,
  TeacherPermissions,
  DEFAULT_TEACHER_PERMISSIONS,
  TeacherPortalStats,
} from "@/lib/types/teacher";

/**
 * Robustly log a teacher's activity (re-admission, invoice, marksheet, etc.)
 * Safely handles errors so user operations are never blocked if logging fails.
 */
export async function logTeacherActivity(params: {
  userId?: string | null;
  teacherId?: string | null;
  teacherName: string;
  actionType: TeacherActionType;
  targetStudentId?: string | null;
  targetStudentName?: string | null;
  studentClass?: string | null;
  section?: string | null;
  amountCollected?: number;
  metadata?: Record<string, any>;
}): Promise<boolean> {
  try {
    const admin = createAdminClient();
    const { error } = await admin.from("teacher_activity_logs").insert({
      user_id: params.userId || null,
      teacher_id: params.teacherId || null,
      teacher_name: params.teacherName,
      action_type: params.actionType,
      target_student_id: params.targetStudentId || null,
      target_student_name: params.targetStudentName || null,
      student_class: params.studentClass || null,
      section: params.section || null,
      amount_collected: params.amountCollected || 0,
      metadata: params.metadata || {},
    });

    if (error) {
      console.warn("Could not insert teacher_activity_logs record:", error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn("Unexpected error in logTeacherActivity:", err);
    return false;
  }
}

/**
 * Dispatch an in-app notification to a teacher
 */
export async function dispatchTeacherNotification(params: {
  userId: string;
  title: string;
  message: string;
  link?: string;
}): Promise<boolean> {
  try {
    const admin = createAdminClient();
    const { error } = await admin.from("teacher_notifications").insert({
      user_id: params.userId,
      title: params.title,
      message: params.message,
      link: params.link || null,
      is_read: false,
    });

    if (error) {
      console.warn("Could not create teacher_notifications record:", error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn("Unexpected error in dispatchTeacherNotification:", err);
    return false;
  }
}

/**
 * Fetch teacher portal real-time statistics
 */
export async function fetchTeacherPortalStats(userId: string): Promise<TeacherPortalStats> {
  const currentYear = new Date().getFullYear();
  try {
    const supabase = createClient();
    const { data, error } = await supabase.rpc("get_teacher_portal_stats", {
      p_user_id: userId,
      p_year: currentYear,
    });

    if (!error && data) {
      return {
        readmissionsCount: Number(data.readmissionsCount) || 0,
        totalCollected: Number(data.totalCollected) || 0,
        tasksPending: Number(data.tasksPending) || 0,
        tasksCompleted: Number(data.tasksCompleted) || 0,
        marksheetsCount: Number(data.marksheetsCount) || 0,
      };
    }
  } catch (err) {
    console.warn("RPC get_teacher_portal_stats failed, using fallback:", err);
  }

  // Graceful fallback query
  try {
    const supabase = createClient();
    const { data: logs } = await supabase
      .from("teacher_activity_logs")
      .select("action_type, amount_collected")
      .eq("user_id", userId);

    const { data: assignees } = await supabase
      .from("teacher_task_assignees")
      .select("status")
      .eq("user_id", userId);

    let readmissions = 0;
    let totalColl = 0;
    let marksheets = 0;

    (logs || []).forEach((l: any) => {
      if (l.action_type === "RE_ADMISSION") readmissions++;
      if (l.action_type === "MARKSHEET_GENERATED") marksheets++;
      totalColl += Number(l.amount_collected) || 0;
    });

    let pending = 0;
    let completed = 0;
    (assignees || []).forEach((a: any) => {
      if (a.status === "ASSIGNED" || a.status === "IN_PROGRESS") pending++;
      if (a.status === "SUBMITTED" || a.status === "APPROVED") completed++;
    });

    return {
      readmissionsCount: readmissions,
      totalCollected: totalColl,
      tasksPending: pending,
      tasksCompleted: completed,
      marksheetsCount: marksheets,
    };
  } catch {
    return {
      readmissionsCount: 0,
      totalCollected: 0,
      tasksPending: 0,
      tasksCompleted: 0,
      marksheetsCount: 0,
    };
  }
}
