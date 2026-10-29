import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchTeacherPortalStats } from "@/lib/supabase/db-teachers";
import { fetchTeacherRoutineData } from "@/lib/supabase/teacher-routine";

// guard: custom — supabase.auth.getUser(); data scoped to the caller's own staff_id
export async function GET(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authUserError,
    } = await supabase.auth.getUser();

    if (authUserError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const adminClient = createAdminClient();

    // 1. Fetch user role & profile
    const { data: roleRow } = await adminClient
      .from("user_roles")
      .select("role, full_name, permissions, staff_id")
      .eq("user_id", user.id)
      .maybeSingle();

    const roleLower = (roleRow?.role || "").toLowerCase();
    const isAdmin =
      roleLower === "admin" ||
      roleLower === "super admin" ||
      roleLower === "super_admin";

    const effectiveStaffId = roleRow?.staff_id;

    const currentYear = new Date().getFullYear();
    const todayStr = new Date().toISOString().split("T")[0];

    // 2. Fetch staff profile, stats, tasks, classes, activities, notifications, absences, routine concurrently
    const [
      staffRes,
      statsRes,
      tasksRes,
      classesRes,
      activitiesRes,
      notificationsRes,
      absencesRes,
      routineRes,
    ] = await Promise.allSettled([
      // Staff Profile
      effectiveStaffId
        ? adminClient
            .from("staff_profiles")
            .select("id, full_name, profile_picture_url, designation, unique_id")
            .eq("id", effectiveStaffId)
            .maybeSingle()
        : Promise.resolve({ data: null }),

      // Stats
      fetchTeacherPortalStats(user.id),

      // Tasks
      (async () => {
        if (isAdmin) {
          const { data: tasks } = await adminClient
            .from("teacher_tasks")
            .select(`
              *,
              assignees:teacher_task_assignees (
                id,
                task_id,
                teacher_id,
                user_id,
                status,
                completion_report,
                assigned_at,
                completed_at,
                staff_profiles (
                  full_name,
                  designation
                )
              )
            `)
            .order("created_at", { ascending: false });

          return (tasks || []).map((t: any) => ({
            ...t,
            assignees: (t.assignees || []).map((a: any) => ({
              id: a.id,
              taskId: a.task_id,
              teacherId: a.teacher_id,
              teacherName: a.staff_profiles?.full_name || "Unknown Teacher",
              designation: a.staff_profiles?.designation,
              userId: a.user_id,
              status: a.status,
              completionReport: a.completion_report,
              assignedAt: a.assigned_at,
              completedAt: a.completed_at,
            })),
          }));
        } else {
          const { data: assignees } = await adminClient
            .from("teacher_task_assignees")
            .select(`
              id,
              task_id,
              teacher_id,
              user_id,
              status,
              completion_report,
              assigned_at,
              completed_at,
              teacher_tasks (
                id,
                title,
                description,
                task_type,
                target_class,
                target_section,
                due_date,
                status,
                created_at
              )
            `)
            .eq("user_id", user.id)
            .order("assigned_at", { ascending: false });

          return (assignees || []).map((a: any) => ({
            id: a.teacher_tasks?.id || a.task_id,
            assigneeRecordId: a.id,
            title: a.teacher_tasks?.title,
            description: a.teacher_tasks?.description,
            taskType: a.teacher_tasks?.task_type,
            targetClass: a.teacher_tasks?.target_class,
            targetSection: a.teacher_tasks?.target_section,
            dueDate: a.teacher_tasks?.due_date,
            overallStatus: a.teacher_tasks?.status,
            myStatus: a.status,
            completionReport: a.completion_report,
            assignedAt: a.assigned_at,
            completedAt: a.completed_at,
          }));
        }
      })(),

      // Classes
      (async () => {
        let query = adminClient
          .from("teacher_class_assignments")
          .select(`
            *,
            staff_profiles!inner (
              id,
              full_name,
              designation
            )
          `)
          .eq("academic_year", currentYear);

        if (!isAdmin && effectiveStaffId) {
          query = query.eq("teacher_id", effectiveStaffId);
        }

        const { data: assignments } = await query.order("class_name");

        return (assignments || []).map((a: any) => ({
          id: a.id,
          teacherId: a.teacher_id,
          teacherName: a.staff_profiles?.full_name || "Unknown Teacher",
          designation: a.staff_profiles?.designation,
          academicYear: a.academic_year,
          className: a.class_name,
          section: a.section,
          roleType: a.role_type,
          subject: a.subject,
          createdAt: a.created_at,
        }));
      })(),

      // Activities
      (async () => {
        let query = adminClient
          .from("teacher_activity_logs")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(15);

        if (!isAdmin) {
          query = query.eq("user_id", user.id);
        }

        const { data: logs } = await query;
        return logs || [];
      })(),

      // Notifications
      (async () => {
        const { data: notifications } = await adminClient
          .from("teacher_notifications")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(20);

        return notifications || [];
      })(),

      // Absences
      (async () => {
        let query = adminClient
          .from("teacher_absences")
          .select("*")
          .order("created_at", { ascending: false });

        if (!isAdmin) {
          if (effectiveStaffId) {
            query = query.or(`user_id.eq.${user.id},teacher_id.eq.${effectiveStaffId}`);
          } else {
            query = query.eq("user_id", user.id);
          }
        }

        const { data: absences } = await query;
        return absences || [];
      })(),

      // Routine Data
      effectiveStaffId
        ? fetchTeacherRoutineData(adminClient, effectiveStaffId, roleRow?.full_name)
        : Promise.resolve(null),
    ]);

    const staff =
      staffRes.status === "fulfilled" && (staffRes.value as any)?.data
        ? (staffRes.value as any).data
        : null;

    const stats =
      statsRes.status === "fulfilled"
        ? statsRes.value
        : {
            readmissionsCount: 0,
            totalCollected: 0,
            tasksPending: 0,
            tasksCompleted: 0,
            marksheetsCount: 0,
          };

    const tasks = tasksRes.status === "fulfilled" ? tasksRes.value : [];
    const classes = classesRes.status === "fulfilled" ? classesRes.value : [];
    const activities = activitiesRes.status === "fulfilled" ? activitiesRes.value : [];
    const notifications = notificationsRes.status === "fulfilled" ? notificationsRes.value : [];
    const absences = absencesRes.status === "fulfilled" ? absencesRes.value : [];
    const routine = routineRes.status === "fulfilled" ? routineRes.value : null;

    // Merge routine duties with class assignments if available
    if (routine?.assignedDuties && routine.assignedDuties.length > 0) {
      const existingKeys = new Set(
        classes.map((c: any) => `${c.className}__${c.section}__${c.subject || c.roleType}`)
      );
      routine.assignedDuties.forEach((d: any) => {
        const key = `${d.className}__${d.section}__${d.subject || d.roleType}`;
        if (!existingKeys.has(key)) {
          existingKeys.add(key);
          classes.push(d);
        }
      });
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
      },
      profile: roleRow || null,
      staff,
      stats,
      tasks,
      classes,
      activities,
      notifications,
      unreadNotifsCount: notifications.filter((n: any) => !n.is_read).length,
      absences,
      routine: routine || {
        activeRoutine: null,
        periodsByDay: {},
        todaySlots: [],
        totalWeeklyPeriods: 0,
        assignedDuties: [],
      },
    });
  } catch (error: any) {
    console.error("Workspace init failed:", error);
    return NextResponse.json(
      { error: error.message || "Failed to initialize workspace" },
      { status: 500 }
    );
  }
}
