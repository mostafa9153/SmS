import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// GET /api/admin/users - List all users with their roles
export async function GET() {
  try {
    const supabase = await createClient();
    
    // Get current logged-in user
    const { data: { user }, error: authUserError } = await supabase.auth.getUser();
    if (authUserError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Use admin client to verify role and manage users
    const adminClient = createAdminClient();
    const { data: roleData } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    // Check if role is admin or if no roles exist yet (first admin setup)
    const isAdmin = roleData?.role === "Admin";
    if (!isAdmin) {
      const { count } = await adminClient.from("user_roles").select("*", { count: "exact", head: true });
      if (count && count > 0) {
        return NextResponse.json({ error: "Forbidden: Admins only" }, { status: 403 });
      }
    }

    const { data: authData, error: listError } = await adminClient.auth.admin.listUsers();
    
    if (listError || !authData) {
      return NextResponse.json({ error: listError?.message || "Failed to list users" }, { status: 500 });
    }

    // Fetch user profiles/roles
    const { data: profiles, error: profilesError } = await adminClient
      .from("user_roles")
      .select("*");

    if (profilesError) {
      return NextResponse.json({ error: "Failed to fetch user profiles" }, { status: 500 });
    }

    // Combine Auth and Profile data
    const combinedUsers = (profiles || []).map((profile) => {
      const authUser = authData.users.find((u) => u.id === profile.user_id);
      return {
        id: profile.user_id,
        fullName: profile.full_name,
        role: profile.role,
        email: authUser?.email || "Unknown Email",
        createdAt: profile.created_at,
      };
    });

    return NextResponse.json({ users: combinedUsers });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

// POST /api/admin/users - Create a new user (Staff or Admin)
export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    
    // Get current logged-in user
    const { data: { user }, error: authUserError } = await supabase.auth.getUser();
    if (authUserError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const adminClient = createAdminClient();
    const { data: roleData } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    const isAdmin = roleData?.role === "Admin";
    if (!isAdmin) {
      const { count } = await adminClient.from("user_roles").select("*", { count: "exact", head: true });
      if (count && count > 0) {
        return NextResponse.json({ error: "Forbidden: Admins only" }, { status: 403 });
      }
    }

    // Parse input body
    const body = await req.json();
    const { email, password, fullName, role } = body;

    if (!email || !password || !fullName || !role) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (role !== "Admin" && role !== "Staff") {
      return NextResponse.json({ error: "Invalid role specified" }, { status: 400 });
    }

    // 1. Create the user in Supabase Auth
    const { data: newAuthUser, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // auto-confirm the email
    });

    if (createError || !newAuthUser.user) {
      return NextResponse.json({ error: createError?.message || "Failed to create user in Auth" }, { status: 400 });
    }

    // 2. Insert the user role in public.user_roles
    const { error: insertRoleError } = await adminClient
      .from("user_roles")
      .insert({
        user_id: newAuthUser.user.id,
        role,
        full_name: fullName,
      });

    if (insertRoleError) {
      // Cleanup: if profile insertion fails, delete the created auth user
      await adminClient.auth.admin.deleteUser(newAuthUser.user.id);
      return NextResponse.json({ error: insertRoleError.message || "Failed to assign role" }, { status: 500 });
    }

    return NextResponse.json({ success: true, user: { id: newAuthUser.user.id, email, fullName, role } });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/admin/users - Delete a user
export async function DELETE(req: Request) {
  try {
    const supabase = await createClient();
    
    // Get current logged-in user
    const { data: { user }, error: authUserError } = await supabase.auth.getUser();
    if (authUserError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const adminClient = createAdminClient();
    const { data: roleData } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    const isAdmin = roleData?.role === "Admin";
    if (!isAdmin) {
      const { count } = await adminClient.from("user_roles").select("*", { count: "exact", head: true });
      if (count && count > 0) {
        return NextResponse.json({ error: "Forbidden: Admins only" }, { status: 403 });
      }
    }

    // Parse user ID to delete
    const { searchParams } = new URL(req.url);
    const targetUserId = searchParams.get("id");

    if (!targetUserId) {
      return NextResponse.json({ error: "Missing user ID parameter" }, { status: 400 });
    }

    if (targetUserId === user.id) {
      return NextResponse.json({ error: "You cannot delete your own account" }, { status: 400 });
    }

    // Delete the user from Auth (cascades to public.user_roles)
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(targetUserId);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
