import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendWebPushNotification } from "@/lib/push-notifications";
import {
  NOTIFICATION_LIMITS,
  type NotificationCategory,
  type NotificationRole,
  type NotificationSeverity,
} from "@/lib/notifications/types";

interface NotifyInput {
  /** A single user, one or more roles, or both. */
  userId?: string;
  roles?: NotificationRole[];
  category?: NotificationCategory;
  severity?: NotificationSeverity;
  title: string;
  message?: string;
  link?: string;
  /** Short machine tag, e.g. "backup.cron", for filtering and debugging. */
  source?: string;
  createdBy?: string | null;
  /** Also send a web push to the recipients' registered devices. */
  push?: boolean;
}

/**
 * Record a bell notification. Never throws: a failed notification must not
 * break the operation that triggered it.
 */
export async function notify(input: NotifyInput): Promise<void> {
  const recipients: { recipient_user_id: string | null; recipient_role: NotificationRole | null }[] = [
    ...(input.userId ? [{ recipient_user_id: input.userId, recipient_role: null }] : []),
    ...(input.roles ?? []).map((role) => ({ recipient_user_id: null, recipient_role: role })),
  ];
  if (!recipients.length) return;

  const title = input.title.slice(0, NOTIFICATION_LIMITS.title);
  const message = (input.message ?? "").slice(0, NOTIFICATION_LIMITS.message);

  try {
    const { error } = await createAdminClient()
      .from("app_notifications")
      .insert(
        recipients.map((r) => ({
          ...r,
          category: input.category ?? (input.severity === "error" || input.severity === "warning" ? "system" : "activity"),
          severity: input.severity ?? "info",
          title,
          message,
          link: input.link ?? null,
          source: input.source ?? null,
          created_by: input.createdBy ?? null,
        })),
      );
    if (error) console.error("[notify] insert failed:", error.message);
  } catch (err) {
    console.error("[notify] failed:", err);
  }

  if (input.push) {
    const pushes = [
      ...(input.userId ? [sendWebPushNotification({ userIds: [input.userId], title, body: message, url: input.link })] : []),
      ...(input.roles ?? []).map((role) => sendWebPushNotification({ role, title, body: message, url: input.link })),
    ];
    await Promise.allSettled(pushes);
  }
}

/** Convenience for failures that admins must see. */
export function notifyAdminsOfError(source: string, title: string, err: unknown, link?: string) {
  const message = err instanceof Error ? err.message : String(err ?? "Unknown error");
  return notify({ roles: ["Admin"], category: "system", severity: "error", title, message, link, source, push: true });
}
