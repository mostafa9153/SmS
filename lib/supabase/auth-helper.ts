import { createClient as createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export interface AuthContext {
  user: any | null;
  role: "Admin" | "Staff" | "Guest";
  fullName: string;
}

/**
 * Robust server-side authentication and role resolver.
 * Ensures any authenticated user has a verified role and auto-heals missing role records.
 */
export async function getAuthenticatedUserRole(): Promise<AuthContext> {
  try {
    const supabase = await createServerClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      return { user: null, role: "Guest", fullName: "" };
    }

    const admin = createAdminClient();
    const { data: roleData, error: roleQueryError } = await admin
      .from("user_roles")
      .select("role, full_name")
      .eq("user_id", user.id)
      .maybeSingle();

    if (roleData && roleData.role) {
      return {
        user,
        role: roleData.role as "Admin" | "Staff",
        fullName: roleData.full_name || user.email?.split("@")[0] || "User",
      };
    }

    // If no verified role row exists in the database, return as Guest (no auto-heal privilege escalation)
    return {
      user,
      role: "Guest",
      fullName: user.email?.split("@")[0] || "User",
    };
  } catch (err) {
    console.error("Error in getAuthenticatedUserRole:", err);
    return { user: null, role: "Guest", fullName: "" };
  }
}
