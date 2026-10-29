import webpush from "web-push";
import { createAdminClient } from "@/lib/supabase/admin";
import { softWrite } from "@/lib/supabase/write";

// Keys come only from env (generate with `npx web-push generate-vapid-keys`).
// Without them push is disabled; the in-app bell still works.
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || process.env.VAPID_PUBLIC_KEY || "";
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || "";
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || "mailto:admin@school.internal";

export const pushConfigured = Boolean(VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY);

if (pushConfigured) {
  try {
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  } catch (e) {
    console.warn("Could not set VAPID details for web-push:", e);
  }
}

export interface SendPushOptions {
  userIds?: string[];
  role?: string; // e.g. "admin", "teacher"
  title: string;
  body: string;
  url?: string;
  icon?: string;
}

/**
 * Dispatch web push notifications to specific users or roles.
 * Safely ignores inactive/expired endpoints and cleans them up.
 */
export async function sendWebPushNotification(options: SendPushOptions): Promise<{
  success: boolean;
  sent: number;
  failed: number;
}> {
  if (!pushConfigured) return { success: false, sent: 0, failed: 0 };
  try {
    const admin = createAdminClient();
    let targetUserIds: string[] = options.userIds || [];

    if (options.role) {
      const { data: roleUsers } = await admin
        .from("user_roles")
        .select("user_id")
        .ilike("role", `%${options.role}%`);
      const rIds = (roleUsers || []).map((r) => r.user_id).filter(Boolean);
      targetUserIds = Array.from(new Set([...targetUserIds, ...rIds]));
    }

    // A targeted send that resolved to nobody must not fall through to a broadcast.
    const isTargeted = Boolean(options.role) || (options.userIds?.length ?? 0) > 0;
    if (isTargeted && targetUserIds.length === 0) {
      return { success: true, sent: 0, failed: 0 };
    }

    let query = admin.from("teacher_push_subscriptions").select("*");
    if (targetUserIds.length > 0) {
      query = query.in("user_id", targetUserIds);
    }

    const { data: subscriptions, error: subError } = await query;
    if (subError || !subscriptions || subscriptions.length === 0) {
      return { success: true, sent: 0, failed: 0 };
    }

    const payload = JSON.stringify({
      title: options.title || "School Workspace Alert",
      body: options.body || "You have a new workspace update.",
      url: options.url || "/teacher",
      icon: options.icon || "/icon-192.png",
    });

    const results = await Promise.allSettled(
      subscriptions.map(async (sub) => {
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: sub.keys,
        };
        try {
          await webpush.sendNotification(pushSubscription, payload);
          return { endpoint: sub.endpoint, success: true };
        } catch (err: any) {
          if (err.statusCode === 410 || err.statusCode === 404) {
            await softWrite(admin.from("teacher_push_subscriptions").delete().eq("id", sub.id), "teacher_push_subscriptions delete");
          }
          throw err;
        }
      })
    );

    const sent = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected").length;

    return { success: true, sent, failed };
  } catch (err) {
    console.warn("Error sending web push notification:", err);
    return { success: false, sent: 0, failed: 0 };
  }
}
