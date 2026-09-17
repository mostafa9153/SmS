import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { dispatchTeacherNotification } from "@/lib/supabase/db-teachers";

// GET /api/teachers/tasks - List tasks
export async function GET(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authUserError } = await supabase.auth.getUser();
    if (authUserError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const adminClient = createAdminClient();
    const { data: currentRole } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    const isAdmin = currentRole?.role === "Admin";

    if (isAdmin) {
      // Admin gets all tasks with all assignees
      const { data: tasks, error: tasksError } = await adminClient
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

      if (tasksError) {
        return NextResponse.json({ error: tasksError.message }, { status: 500 });
      }

      // Format assignees to flatten teacher name
      const formatted = (tasks || []).map((t: any) => ({
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

      return NextResponse.json({ success: true, tasks: formatted });
    } else {
      // Teacher gets only their assigned tasks
      const { data: assignees, error: assignError } = await adminClient
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

      if (assignError) {
        return NextResponse.json({ error: assignError.message }, { status: 500 });
      }

      const formatted = (assignees || []).map((a: any) => ({
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

      return NextResponse.json({ success: true, tasks: formatted });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

// POST /api/teachers/tasks - Admin creates and assigns a task to 1 or more teachers
export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authUserError } = await supabase.auth.getUser();
    if (authUserError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const adminClient = createAdminClient();
    const { data: currentRole } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (currentRole?.role !== "Admin") {
      return NextResponse.json({ error: "Forbidden: Admins only" }, { status: 403 });
    }

    const body = await req.json();
    const {
      title,
      description,
      taskType = "GENERAL",
      targetClass,
      targetSection,
      dueDate,
      teacherIds, // Array of staff_profiles.id
    } = body;

    if (!title || !teacherIds || !Array.isArray(teacherIds) || teacherIds.length === 0) {
      return NextResponse.json(
        { error: "Title and at least one assigned teacher are required." },
        { status: 400 }
      );
    }

    // 1. Create task entry
    const { data: task, error: taskError } = await adminClient
      .from("teacher_tasks")
      .insert({
        title: title.trim(),
        description: description?.trim() || null,
        task_type: taskType,
        target_class: targetClass || null,
        target_section: targetSection || null,
        due_date: dueDate || null,
        status: "PENDING",
        created_by: user.id,
      })
      .select()
      .single();

    if (taskError || !task) {
      return NextResponse.json({ error: taskError?.message || "Failed to create task" }, { status: 500 });
    }

    // 2. Fetch linked user_id for each teacher
    const { data: linkedRoles } = await adminClient
      .from("user_roles")
      .select("user_id, staff_id")
      .in("staff_id", teacherIds);

    const assigneesToInsert = teacherIds.map((tid) => {
      const linked = linkedRoles?.find((r) => r.staff_id === tid);
      return {
        task_id: task.id,
        teacher_id: tid,
        user_id: linked?.user_id || null,
        status: "ASSIGNED",
      };
    });

    const { error: assignError } = await adminClient
      .from("teacher_task_assignees")
      .insert(assigneesToInsert);

    if (assignError) {
      return NextResponse.json({ error: assignError.message }, { status: 500 });
    }

    // 3. Dispatch notifications to all assignees who have user accounts
    for (const assignee of assigneesToInsert) {
      if (assignee.user_id) {
        await dispatchTeacherNotification({
          userId: assignee.user_id,
          title: `New Task Assigned: ${task.title}`,
          message: `You have been assigned to: ${task.title}. ${task.description || ""}`,
          link: "/teacher",
        });
      }
    }

    return NextResponse.json({ success: true, task });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

// PATCH /api/teachers/tasks - Update task status or submit completion report
export async function PATCH(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authUserError } = await supabase.auth.getUser();
    if (authUserError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const adminClient = createAdminClient();
    const { data: currentRole } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    const isAdmin = currentRole?.role === "Admin";
    const body = await req.json();
    const { taskId, assigneeId, status, completionReport } = body;

    if (!taskId && !assigneeId) {
      return NextResponse.json({ error: "Task ID or Assignee ID is required." }, { status: 400 });
    }

    // If teacher is submitting their report or starting work
    if (!isAdmin) {
      const updateData: any = {};
      if (status) updateData.status = status;
      if (completionReport) {
        updateData.completion_report = {
          ...completionReport,
          submitted_at: new Date().toISOString(),
        };
        updateData.status = "SUBMITTED";
        updateData.completed_at = new Date().toISOString();
      }

      let query = adminClient.from("teacher_task_assignees").update(updateData);
      if (assigneeId) {
        query = query.eq("id", assigneeId).eq("user_id", user.id);
      } else {
        query = query.eq("task_id", taskId).eq("user_id", user.id);
      }

      const { error: updateErr } = await query;
      if (updateErr) {
        return NextResponse.json({ error: updateErr.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, message: "Task progress updated successfully." });
    }

    // If Admin is approving or updating overall task
    if (isAdmin) {
      if (taskId && status) {
        await adminClient
          .from("teacher_tasks")
          .update({ status, updated_at: new Date().toISOString() })
          .eq("id", taskId);
      }

      if (assigneeId && status) {
        await adminClient
          .from("teacher_task_assignees")
          .update({ status })
          .eq("id", assigneeId);
      }

      return NextResponse.json({ success: true, message: "Task status updated by admin." });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
