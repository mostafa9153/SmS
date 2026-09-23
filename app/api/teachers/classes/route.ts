import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// GET /api/teachers/classes - Get all class & subject teacher assignments
export async function GET(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authUserError } = await supabase.auth.getUser();
    if (authUserError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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

// POST /api/teachers/classes - Assign a teacher to a class/subject
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
      .maybeSingle();

    const roleName = (currentRole?.role || "").toLowerCase();
    const isAdmin = roleName === "admin" || roleName === "super admin" || roleName === "super_admin";

    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden: Admins only" }, { status: 403 });
    }

    const body = await req.json();
    const { teacherId, className, section = "ALL", roleType, subject, academicYear } = body;

    if (!teacherId || !className || !roleType) {
      return NextResponse.json(
        { error: "Teacher ID, Class Name, and Role Type are required." },
        { status: 400 }
      );
    }

    const targetYear = Number(academicYear) || new Date().getFullYear();

    // Check constraint: A class-section can have at most 2 class teachers
    if (roleType === "CLASS_TEACHER") {
      const { count } = await adminClient
        .from("teacher_class_assignments")
        .select("*", { count: "exact", head: true })
        .eq("academic_year", targetYear)
        .eq("class_name", className)
        .eq("section", section)
        .eq("role_type", "CLASS_TEACHER");

      if (count && count >= 2) {
        return NextResponse.json(
          { error: `Class ${className} (${section}) already has 2 assigned Class Teachers. Maximum limit reached.` },
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
        subject: roleType === "SUBJECT_TEACHER" ? subject || "General" : null,
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, assignment: inserted });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/teachers/classes - Remove an assignment
export async function DELETE(req: Request) {
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
      .maybeSingle();

    const roleName = (currentRole?.role || "").toLowerCase();
    const isAdmin = roleName === "admin" || roleName === "super admin" || roleName === "super_admin";

    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden: Admins only" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Assignment ID is required." }, { status: 400 });
    }

    const { error: deleteError } = await adminClient
      .from("teacher_class_assignments")
      .delete()
      .eq("id", id);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "Assignment removed." });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
