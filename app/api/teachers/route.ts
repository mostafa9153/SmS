import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { clearUserRoleCache } from "@/lib/supabase/auth-helper";
import { DEFAULT_TEACHER_PERMISSIONS } from "@/lib/types/teacher";

// GET /api/teachers - List all teaching staff with their account, permissions, and assigned classes
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authUserError } = await supabase.auth.getUser();
    if (authUserError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const adminClient = createAdminClient();

    // 1. Fetch all teaching staff from staff_profiles
    const { data: staffList, error: staffError } = await adminClient
      .from("staff_profiles")
      .select("id, unique_id, full_name, designation, email, mobile, status, profile_picture_url")
      .eq("employee_type", "TEACHING")
      .order("full_name");

    if (staffError) {
      return NextResponse.json({ error: staffError.message }, { status: 500 });
    }

    // 2. Fetch all user_roles linked to staff
    const { data: userRoles, error: rolesError } = await adminClient
      .from("user_roles")
      .select("user_id, staff_id, role, full_name, permissions");

    if (rolesError) {
      return NextResponse.json({ error: rolesError.message }, { status: 500 });
    }

    // 3. Fetch all active class assignments
    const currentYear = new Date().getFullYear();
    const { data: classAssignments } = await adminClient
      .from("teacher_class_assignments")
      .select("*")
      .eq("academic_year", currentYear);

    // 4. Map everything together cleanly
    const staffMap = (staffList || []).map((staff) => {
      const linkedRole = userRoles?.find((r) => r.staff_id === staff.id);
      const assignments = (classAssignments || []).filter((a) => a.teacher_id === staff.id);

      return {
        id: staff.id,
        uniqueId: staff.unique_id,
        fullName: staff.full_name,
        designation: staff.designation,
        email: staff.email,
        mobile: staff.mobile,
        status: staff.status,
        profilePictureUrl: staff.profile_picture_url,
        hasLogin: !!linkedRole,
        userId: linkedRole?.user_id || null,
        role: linkedRole?.role || null,
        permissions: linkedRole?.permissions || DEFAULT_TEACHER_PERMISSIONS,
        assignments,
      };
    });

    return NextResponse.json({ success: true, teachers: staffMap });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

// POST /api/teachers - Create or link login credentials for a teaching staff member
export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authUserError } = await supabase.auth.getUser();
    if (authUserError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if current user is Admin
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
    const { staffId, email, password, fullName, permissions } = body;

    if (!staffId || !email || !password) {
      return NextResponse.json(
        { error: "Staff ID, Email, and Password are required." },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters long." },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanName = fullName ? fullName.trim() : "Teacher";

    let targetAuthUserId: string | null = null;

    // 1. Create or lookup auth user
    const { data: newAuthUser, error: createError } = await adminClient.auth.admin.createUser({
      email: cleanEmail,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: cleanName,
        role: "Teacher",
        staff_id: staffId,
      },
    });

    if (newAuthUser?.user) {
      targetAuthUserId = newAuthUser.user.id;
    } else if (createError) {
      // If user already exists in Supabase auth with this email, fetch and update their password & metadata
      const errLower = (createError.message || "").toLowerCase();
      if (errLower.includes("already registered") || errLower.includes("already exists") || errLower.includes("unique")) {
        const { data: listData } = await adminClient.auth.admin.listUsers();
        const existingUser = listData?.users?.find((u) => u.email?.toLowerCase() === cleanEmail);
        if (existingUser) {
          await adminClient.auth.admin.updateUserById(existingUser.id, {
            password,
            email_confirm: true,
            user_metadata: {
              full_name: cleanName,
              role: "Teacher",
              staff_id: staffId,
            },
          });
          targetAuthUserId = existingUser.id;
        } else {
          return NextResponse.json({ error: createError.message }, { status: 400 });
        }
      } else {
        return NextResponse.json({ error: createError.message }, { status: 400 });
      }
    }

    if (!targetAuthUserId) {
      return NextResponse.json({ error: "Failed to create or link auth user." }, { status: 500 });
    }

    // 2. Insert or update user_roles
    const { error: insertRoleError } = await adminClient
      .from("user_roles")
      .upsert(
        {
          user_id: targetAuthUserId,
          staff_id: staffId,
          role: "Teacher",
          full_name: cleanName,
          permissions: permissions || DEFAULT_TEACHER_PERMISSIONS,
        },
        { onConflict: "user_id" }
      );

    if (insertRoleError) {
      const isColError = insertRoleError.message.includes("staff_id") || insertRoleError.message.includes("permissions");
      const userMessage = isColError
        ? "Database migration missing: Please run 20260916_teacher_management_system.sql in Supabase SQL editor to add staff_id and permissions columns."
        : insertRoleError.message;
      return NextResponse.json({ error: userMessage }, { status: 500 });
    }

    // 3. Update staff_profiles with the official email
    await adminClient
      .from("staff_profiles")
      .update({ email: cleanEmail })
      .eq("id", staffId);

    clearUserRoleCache(targetAuthUserId);

    return NextResponse.json({
      success: true,
      user: {
        id: targetAuthUserId,
        email: cleanEmail,
        fullName: cleanName,
        role: "Teacher",
        staffId,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

// PATCH /api/teachers - Update permissions or reset teacher password
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

    if (currentRole?.role !== "Admin") {
      return NextResponse.json({ error: "Forbidden: Admins only" }, { status: 403 });
    }

    const body = await req.json();
    const { userId, staffId, teacherId, permissions, password } = body;

    let targetUserId = userId;
    if (!targetUserId && (staffId || teacherId)) {
      const { data: foundRole } = await adminClient
        .from("user_roles")
        .select("user_id")
        .eq("staff_id", staffId || teacherId)
        .single();
      targetUserId = foundRole?.user_id;
    }

    if (!targetUserId) {
      return NextResponse.json({ error: "Target userId or staffId is required." }, { status: 400 });
    }

    // 1. If password reset requested
    if (password) {
      if (password.length < 6) {
        return NextResponse.json({ error: "Password must be at least 6 characters." }, { status: 400 });
      }
      const { error: pwError } = await adminClient.auth.admin.updateUserById(targetUserId, { password });
      if (pwError) {
        return NextResponse.json({ error: pwError.message }, { status: 500 });
      }
    }

    // 2. If permissions updated
    if (permissions) {
      const { error: permError } = await adminClient
        .from("user_roles")
        .update({ permissions })
        .eq("user_id", targetUserId);

      if (permError) {
        return NextResponse.json({ error: permError.message }, { status: 500 });
      }
      clearUserRoleCache(targetUserId);
    }

    return NextResponse.json({ success: true, message: "Teacher account updated successfully" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
