import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { clearUserRoleCache } from "@/lib/supabase/auth-helper";
import { dispatchTeacherNotification } from "@/lib/supabase/db-teachers";

export async function GET(req: Request) {
  try {
    const admin = createAdminClient();
    const nowIso = new Date().toISOString();

    // 1. Fetch expired active grants
    const { data: expiredGrants, error: fetchError } = await admin
      .from("teacher_permission_grants")
      .select("*")
      .eq("is_active", true)
      .lte("expires_at", nowIso);

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    if (!expiredGrants || expiredGrants.length === 0) {
      return NextResponse.json({ success: true, message: "No expired permissions to process", expiredCount: 0 });
    }

    let revokedCount = 0;

    for (const grant of expiredGrants) {
      // Mark grant as inactive
      await admin
        .from("teacher_permission_grants")
        .update({ is_active: false })
        .eq("id", grant.id);

      // Check if user still has other active grants for the same permission
      const { data: otherActive } = await admin
        .from("teacher_permission_grants")
        .select("id")
        .eq("user_id", grant.user_id)
        .eq("permission_key", grant.permission_key)
        .eq("is_active", true)
        .gt("expires_at", nowIso);

      if (!otherActive || otherActive.length === 0) {
        // Fetch current user_roles permissions
        const { data: userRole } = await admin
          .from("user_roles")
          .select("permissions")
          .eq("user_id", grant.user_id)
          .single();

        if (userRole?.permissions) {
          const updatedPerms = {
            ...userRole.permissions,
            [grant.permission_key]: false,
          };

          await admin
            .from("user_roles")
            .update({ permissions: updatedPerms })
            .eq("user_id", grant.user_id);

          clearUserRoleCache(grant.user_id);
          revokedCount++;

          await dispatchTeacherNotification({
            userId: grant.user_id,
            title: "Temporary Access Expired",
            message: `Your temporary access grant for "${grant.permission_key.replace(/_/g, " ")}" has reached its expiration date and has been deactivated.`,
            link: "/teacher",
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      expiredCount: expiredGrants.length,
      revokedCount,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to process permission expiry" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  return GET(req);
}
