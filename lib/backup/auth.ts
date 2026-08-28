// ============================================================
//  lib/backup/auth.ts
//  Admin verification helper for backup API routes
// ============================================================

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export interface AdminAuthResult {
  isAdmin: boolean;
  user?: {
    id: string;
    email: string;
  };
  error?: string;
  statusCode?: number;
}

export async function verifyAdminUser(): Promise<AdminAuthResult> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user || !user.email) {
      return { isAdmin: false, error: "Unauthorized: Please log in as an administrator.", statusCode: 401 };
    }

    const adminClient = createAdminClient();
    const { data: roleData } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!roleData || roleData.role !== "Admin") {
      return { isAdmin: false, error: "Forbidden: Only Admin accounts can perform backup operations.", statusCode: 403 };
    }

    return {
      isAdmin: true,
      user: {
        id: user.id,
        email: user.email,
      },
    };
  } catch (err: any) {
    return { isAdmin: false, error: err.message || "Auth verification failed", statusCode: 500 };
  }
}
