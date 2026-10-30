import { NextResponse } from "next/server";
import { hasCronSecret, requireRole } from "@/lib/api/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { clearUserRoleCache } from "@/lib/supabase/auth-helper";
import { dispatchTeacherNotification } from "@/lib/supabase/db-teachers";
import { notify, notifyAdminsOfError } from "@/lib/notifications/notify";
import { notifyCronRefused } from "@/lib/api/cron";

// undo: n/a — scheduled system job; expiry is the grant's own end date
export async function GET(req: Request) {
  if (!hasCronSecret(req)) {
    const gate = await requireRole(["Admin"]);
    if (!gate.ok) {
      await notifyCronRefused(req, "cron.refused.permissions", "Permission expiry job");
      return gate.response;
    }
  }

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
    const failures: string[] = [];

    // Revoke first and deactivate the grant last: a failed step leaves the grant
    // active, so the next run retries it instead of leaving the permission on.
    for (const grant of expiredGrants) {
      // Check if user still has other active grants for the same permission
      const { data: otherActive, error: otherError } = await admin
        .from("teacher_permission_grants")
        .select("id")
        .eq("user_id", grant.user_id)
        .eq("permission_key", grant.permission_key)
        .eq("is_active", true)
        .gt("expires_at", nowIso);
      if (otherError) {
        failures.push(`${grant.permission_key}: ${otherError.message}`);
        continue;
      }

      if (!otherActive || otherActive.length === 0) {
        // Fetch current user_roles permissions
        const { data: userRole, error: roleError } = await admin
          .from("user_roles")
          .select("permissions")
          .eq("user_id", grant.user_id)
          .maybeSingle();
        if (roleError) {
          failures.push(`${grant.permission_key}: ${roleError.message}`);
          continue;
        }

        if (userRole?.permissions) {
          const updatedPerms = {
            ...userRole.permissions,
            [grant.permission_key]: false,
          };

          const { error: revokeError } = await admin
            .from("user_roles")
            .update({ permissions: updatedPerms })
            .eq("user_id", grant.user_id);
          if (revokeError) {
            failures.push(`${grant.permission_key}: ${revokeError.message}`);
            continue;
          }

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

      // Mark grant as inactive
      const { error: deactivateError } = await admin
        .from("teacher_permission_grants")
        .update({ is_active: false })
        .eq("id", grant.id);
      if (deactivateError) failures.push(`${grant.permission_key}: ${deactivateError.message}`);
    }

    if (revokedCount > 0) {
      await notify({ roles: ["Admin"], title: "Temporary permissions expired", message: `${revokedCount} teacher permission grant(s) reached their end date and were revoked.`, link: "/teacher-management", source: "cron.permissions" });
    }
    if (failures.length > 0) {
      await notifyAdminsOfError("cron.permissions", `${failures.length} expired permission(s) could not be revoked`, failures.join("; "), "/teacher-management");
    }

    return NextResponse.json({
      success: failures.length === 0,
      failedCount: failures.length,
      expiredCount: expiredGrants.length,
      revokedCount,
    });
  } catch (err: any) {
    await notifyAdminsOfError("cron.permissions", "Permission expiry job failed", err, "/teacher-management");
    return NextResponse.json({ error: err.message || "Failed to process permission expiry" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  return GET(req);
}
