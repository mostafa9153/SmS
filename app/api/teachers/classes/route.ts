import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/api/guard";
import { recordUndo, snapshotRows } from "@/lib/undo/journal";

const MAX_CLASS_TEACHERS = 2;

const assignSchema = z.object({
  teacherId: z.string().uuid(),
  className: z.string().trim().min(1).max(20),
  section: z.string().trim().min(1).max(20).default("ALL"),
  roleType: z.enum(["CLASS_TEACHER", "SUBJECT_TEACHER"]),
  subject: z.string().trim().max(80).optional(),
  academicYear: z.coerce.number().int().min(2000).max(2100).optional(),
});

// GET /api/teachers/classes - Get all class & subject teacher assignments
export async function GET(req: Request) {
  const gate = await requireRole();
  if (!gate.ok) return gate.response;

  try {
    const { searchParams } = new URL(req.url);
    const year = Number(searchParams.get("year")) || new Date().getFullYear();

    const adminClient = createAdminClient();
    const { data: assignments, error } = await adminClient
      .from("teacher_class_assignments")
      .select(`
        *,
        staff_profiles!inner (
          id,
          full_name,
          designation
        )
      `)
      .eq("academic_year", year)
      .order("class_name");

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const formatted = (assignments || []).map((a: any) => ({
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

    return NextResponse.json({ success: true, assignments: formatted });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

// POST /api/teachers/classes - Assign a teacher to a class/subject (undoable)
export async function POST(req: Request) {
  const gate = await requireRole(["Admin"]);
  if (!gate.ok) return gate.response;

  try {
    const parsed = assignSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Teacher, class and role type are required." },
        { status: 400 }
      );
    }
    const { teacherId, className, section, roleType, subject } = parsed.data;
    const targetYear = parsed.data.academicYear ?? new Date().getFullYear();
    const adminClient = createAdminClient();

    const subjectName = roleType === "SUBJECT_TEACHER" ? subject || "General" : null;
    let duplicateQuery = adminClient
      .from("teacher_class_assignments")
      .select("id")
      .eq("teacher_id", teacherId)
      .eq("academic_year", targetYear)
      .eq("class_name", className)
      .eq("section", section)
      .eq("role_type", roleType);
    if (subjectName) duplicateQuery = duplicateQuery.eq("subject", subjectName);
    const { data: duplicate } = await duplicateQuery.limit(1);
    if (duplicate?.length) {
      return NextResponse.json({ success: false, error: "Already assigned." }, { status: 409 });
    }

    if (roleType === "CLASS_TEACHER") {
      const { count } = await adminClient
        .from("teacher_class_assignments")
        .select("*", { count: "exact", head: true })
        .eq("academic_year", targetYear)
        .eq("class_name", className)
        .eq("section", section)
        .eq("role_type", "CLASS_TEACHER");

      if (count && count >= MAX_CLASS_TEACHERS) {
        return NextResponse.json(
          { success: false, error: `Class ${className} (${section}) already has ${MAX_CLASS_TEACHERS} class teachers.` },
          { status: 400 }
        );
      }
    }

    // Find linked user_id for this teacher if any
    const { data: roleRow } = await adminClient
      .from("user_roles")
      .select("user_id")
      .eq("staff_id", teacherId)
      .maybeSingle();

    const { data: inserted, error: insertError } = await adminClient
      .from("teacher_class_assignments")
      .insert({
        teacher_id: teacherId,
        user_id: roleRow?.user_id || null,
        academic_year: targetYear,
        class_name: className,
        section,
        role_type: roleType,
        subject: subjectName,
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json({ success: false, error: insertError.message }, { status: 500 });
    }

    const undoId = await recordUndo({
      actorId: gate.auth.user.id,
      action: "teacher.class.assign",
      label: `Assign Class ${className} (${section})`,
      entity: "teacher_class_assignments",
      entityId: inserted.id,
      steps: [{ table: "teacher_class_assignments", op: "delete", column: "id", values: [inserted.id] }],
    });

    return NextResponse.json({ success: true, assignment: inserted, undoId });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/teachers/classes?id= - Remove an assignment (undoable)
export async function DELETE(req: Request) {
  const gate = await requireRole(["Admin"]);
  if (!gate.ok) return gate.response;

  try {
    const id = new URL(req.url).searchParams.get("id");
    if (!id || !z.string().uuid().safeParse(id).success) {
      return NextResponse.json({ success: false, error: "Assignment ID is required." }, { status: 400 });
    }

    const adminClient = createAdminClient();
    const before = await snapshotRows(adminClient, "teacher_class_assignments", "id", id);
    const { error: deleteError } = await adminClient
      .from("teacher_class_assignments")
      .delete()
      .eq("id", id);

    if (deleteError) {
      return NextResponse.json({ success: false, error: deleteError.message }, { status: 500 });
    }

    const undoId = await recordUndo({
      actorId: gate.auth.user.id,
      action: "teacher.class.remove",
      label: `Remove Class ${before[0]?.class_name ?? ""} (${before[0]?.section ?? ""})`,
      entity: "teacher_class_assignments",
      entityId: id,
      steps: [{ table: "teacher_class_assignments", op: "upsert", rows: before }],
    });

    return NextResponse.json({ success: true, message: "Assignment removed.", undoId });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || "Internal server error" }, { status: 500 });
  }
}
