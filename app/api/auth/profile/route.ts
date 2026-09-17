import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { clearUserRoleCache } from "@/lib/supabase/auth-helper";

// GET /api/auth/profile - Fetch current user's profile
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authUserError } = await supabase.auth.getUser();

    if (authUserError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const adminClient = createAdminClient();

    // 1. Fetch user role
    const { data: roleRow, error: roleError } = await adminClient
      .from("user_roles")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (roleError || !roleRow) {
      return NextResponse.json({
        id: user.id,
        email: user.email,
        fullName: user.user_metadata?.full_name || user.email?.split("@")[0] || "User",
        role: "Staff",
      });
    }

    const isAdmin = roleRow.role === "Admin";
    let staffData: any = null;
    let assignments: any[] = [];
    let stats: any = null;

    if (roleRow.staff_id) {
      // Fetch teacher staff profile
      const { data: staff } = await adminClient
        .from("staff_profiles")
        .select("*")
        .eq("id", roleRow.staff_id)
        .maybeSingle();

      staffData = staff;

      // Fetch teacher class assignments
      const currentYear = new Date().getFullYear();
      const { data: assigns } = await adminClient
        .from("teacher_class_assignments")
        .select("*")
        .eq("teacher_id", roleRow.staff_id)
        .eq("academic_year", currentYear);

      assignments = assigns || [];

      // Fetch personal performance stats
      const { data: rpcStats } = await adminClient.rpc("get_teacher_portal_stats", {
        p_user_id: user.id,
        p_year: currentYear,
      });

      stats = rpcStats;
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        fullName: roleRow.full_name || user.user_metadata?.full_name || user.email?.split("@")[0] || "User",
        role: roleRow.role,
        permissions: roleRow.permissions,
        createdAt: user.created_at,
        lastSignIn: user.last_sign_in_at,
      },
      staff: staffData,
      assignments,
      stats,
      isAdmin,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

// PATCH /api/auth/profile - Update current user's profile (name or password)
export async function PATCH(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authUserError } = await supabase.auth.getUser();

    if (authUserError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { fullName, password } = body;

    const adminClient = createAdminClient();

    // 1. If updating password
    if (password) {
      if (password.length < 6) {
        return NextResponse.json({ error: "Password must be at least 6 characters long." }, { status: 400 });
      }

      const { error: pwError } = await adminClient.auth.admin.updateUserById(user.id, { password });
      if (pwError) {
        return NextResponse.json({ error: pwError.message }, { status: 500 });
      }
    }

    // 2. If updating name
    if (fullName && fullName.trim()) {
      const cleanName = fullName.trim();
      await adminClient
        .from("user_roles")
        .update({ full_name: cleanName })
        .eq("user_id", user.id);

      await adminClient.auth.admin.updateUserById(user.id, {
        user_metadata: { ...user.user_metadata, full_name: cleanName },
      });

      clearUserRoleCache(user.id);
    }

    return NextResponse.json({ success: true, message: "Profile updated successfully." });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
