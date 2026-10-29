import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { notify } from "@/lib/notifications/notify";

const QUIET_HOURS = 20;

/**
 * Tell admins when Vercel's scheduler was refused (missing or wrong CRON_SECRET),
 * which otherwise only shows in the Vercel logs. Only for requests that claim to be
 * Vercel cron, and at most once per QUIET_HOURS per source, so a spoofed caller
 * cannot flood the bell.
 */
export async function notifyCronRefused(req: Request, source: string, job: string): Promise<void> {
  if (!req.headers.get("user-agent")?.startsWith("vercel-cron")) return;
  try {
    const since = new Date(Date.now() - QUIET_HOURS * 3600_000).toISOString();
    const { count, error } = await createAdminClient()
      .from("app_notifications")
      .select("id", { count: "exact", head: true })
      .eq("source", source)
      .gte("created_at", since);
    if (error || (count ?? 0) > 0) return;
  } catch {
    return;
  }
  await notify({
    roles: ["Admin"],
    severity: "error",
    title: `${job} did not run`,
    message: process.env.CRON_SECRET
      ? "The scheduler's CRON_SECRET does not match. Check the Vercel environment variable."
      : "CRON_SECRET is not set in Vercel, so the scheduler is refused.",
    source,
    push: true,
  });
}
