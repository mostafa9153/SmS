import { createClient as createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export interface AuthContext {
  user: any | null;
  role: "Admin" | "Staff" | "Teacher" | "Guest";
  fullName: string;
  staffId?: string | null;
  permissions?: any;
}

// In-memory cache for user role lookups to eliminate repeated user_roles queries
interface CachedRole {
  role: "Admin" | "Staff" | "Teacher" | "Guest";
  fullName: string;
  staffId?: string | null;
  permissions?: any;
  cachedAt: number;
}

const roleCache = new Map<string, CachedRole>();
const ROLE_CACHE_TTL_MS = 60 * 1000; // 60 seconds

export function clearUserRoleCache(userId?: string) {
  if (userId) {
    roleCache.delete(userId);
  } else {
    roleCache.clear();
  }
}

/**
 * Robust server-side authentication and role resolver.
 * Ensures any authenticated user has a verified role.
 */
export async function getAuthenticatedUserRole(): Promise<AuthContext> {
  try {
    const supabase = await createServerClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      return { user: null, role: "Guest", fullName: "" };
    }

    // Check in-memory role cache
    const cached = roleCache.get(user.id);
    if (cached && Date.now() - cached.cachedAt < ROLE_CACHE_TTL_MS) {
      return {
        user,
        role: cached.role,
        fullName: cached.fullName,
        staffId: cached.staffId,
        permissions: cached.permissions,
      };
    }

    const admin = createAdminClient();
    const { data: roleData, error: roleQueryError } = await admin
      .from("user_roles")
      .select("role, full_name, staff_id, permissions")
      .eq("user_id", user.id)
      .maybeSingle();

    if (roleData && roleData.role) {
      const resolvedRole = roleData.role as "Admin" | "Staff" | "Teacher";
      const resolvedName = roleData.full_name || user.email?.split("@")[0] || "User";

      roleCache.set(user.id, {
        role: resolvedRole,
        fullName: resolvedName,
        staffId: roleData.staff_id || null,
        permissions: roleData.permissions || null,
        cachedAt: Date.now(),
      });

      return {
        user,
        role: resolvedRole,
        fullName: resolvedName,
        staffId: roleData.staff_id || null,
        permissions: roleData.permissions || null,
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
