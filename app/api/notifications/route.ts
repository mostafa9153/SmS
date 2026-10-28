import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/api/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { NOTIFICATION_LIMITS, type AppNotification } from "@/lib/notifications/types";

const PAGE_SIZE = 50;
const MISSING_TABLE = "42P01";

// GET /api/notifications — latest notifications for the signed-in user (own + role-wide)
export async function GET() {
  const gate = await requireRole();
  if (!gate.ok) return gate.response;
  const userId: string = gate.auth.user.id;

  try {
    const admin = createAdminClient();
    const { data: rows, error } = await admin
      .from("app_notifications")
      .select("id, category, severity, title, message, link, created_at")
      .or(`recipient_user_id.eq.${userId},recipient_role.eq.${gate.auth.role}`)
      .order("created_at", { ascending: false })
      .limit(PAGE_SIZE);

    if (error) {
      if (error.code === MISSING_TABLE) return NextResponse.json({ success: true, data: [], unavailable: true });
      throw error;
    }

    const ids = (rows ?? []).map((r) => r.id);
    const { data: receipts } = ids.length
      ? await admin.from("app_notification_receipts").select("notification_id, read_at, cleared_at").eq("user_id", userId).in("notification_id", ids)
      : { data: [] };
    const byId = new Map((receipts ?? []).map((r) => [r.notification_id, r]));

    const data: AppNotification[] = (rows ?? [])
      .filter((r) => !byId.get(r.id)?.cleared_at)
      .map((r) => ({
        id: r.id,
        type: r.category,
        severity: r.severity,
        title: r.title,
        message: r.message,
        link: r.link,
        time: new Date(r.created_at).getTime(),
        isRead: Boolean(byId.get(r.id)?.read_at),
      }));

    return NextResponse.json({ success: true, data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load notifications";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

const actionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("read"), ids: z.array(z.uuid()).min(1).max(PAGE_SIZE) }),
  z.object({ action: z.literal("read_all") }),
  z.object({ action: z.literal("clear_all") }),
  z.object({
    // Client-side problems (failed requests, crashes) recorded for the reporting user only.
    action: z.literal("report"),
    title: z.string().trim().min(1).max(NOTIFICATION_LIMITS.title),
    message: z.string().max(NOTIFICATION_LIMITS.message).default(""),
    severity: z.enum(["info", "success", "warning", "error"]).default("error"),
    category: z.enum(["activity", "system"]).default("system"),
    link: z.string().max(300).startsWith("/").optional(),
  }),
]);

// POST /api/notifications — mark read, mark all read, clear, or report a client-side event
export async function POST(req: Request) {
  const gate = await requireRole();
  if (!gate.ok) return gate.response;
  const userId: string = gate.auth.user.id;

  const parsed = actionSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.issues[0]?.message ?? "Invalid request" }, { status: 400 });
  }
  const body = parsed.data;

  try {
    const admin = createAdminClient();

    if (body.action === "report") {
      const { data, error } = await admin
        .from("app_notifications")
        .insert({
          recipient_user_id: userId,
          category: body.category,
          severity: body.severity,
          title: body.title,
          message: body.message,
          link: body.link ?? null,
          source: "client",
          created_by: userId,
        })
        .select("id")
        .single();
      if (error) throw error;
      return NextResponse.json({ success: true, data: { id: data.id } });
    }

    let ids: string[];
    if (body.action === "read") {
      ids = body.ids;
    } else {
      const { data: rows, error } = await admin
        .from("app_notifications")
        .select("id")
        .or(`recipient_user_id.eq.${userId},recipient_role.eq.${gate.auth.role}`)
        .order("created_at", { ascending: false })
        .limit(PAGE_SIZE);
      if (error) throw error;
      ids = (rows ?? []).map((r) => r.id);
    }
    if (!ids.length) return NextResponse.json({ success: true });

    const now = new Date().toISOString();
    const patch = body.action === "clear_all" ? { read_at: now, cleared_at: now } : { read_at: now };
    const { error } = await admin
      .from("app_notification_receipts")
      .upsert(ids.map((id) => ({ notification_id: id, user_id: userId, ...patch })), { onConflict: "notification_id,user_id" });
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update notifications";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
