import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/api/guard";

const subscriptionSchema = z.object({
  endpoint: z.string().url().max(2048).startsWith("https://"),
  keys: z.object({ p256dh: z.string().min(1).max(256), auth: z.string().min(1).max(256) }),
});

// POST /api/push/subscribe - save this browser's push subscription for the signed-in user
export async function POST(req: Request) {
  const gate = await requireRole();
  if (!gate.ok) return gate.response;

  try {
    const body = await req.json().catch(() => null);
    const parsed = subscriptionSchema.safeParse(body?.subscription);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: "Invalid subscription object" }, { status: 400 });
    }

    const admin = createAdminClient();
    const { error } = await admin.from("teacher_push_subscriptions").upsert(
      {
        user_id: gate.auth.user.id,
        endpoint: parsed.data.endpoint,
        keys: parsed.data.keys,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "endpoint" }
    );
    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });

    return NextResponse.json({ success: true, message: "Push subscription saved" });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || "Failed to save subscription" }, { status: 500 });
  }
}

// undo: n/a — the browser re-subscribes from the bell toggle.
// DELETE /api/push/subscribe - remove one endpoint (or all of this user's) subscriptions
export async function DELETE(req: Request) {
  const gate = await requireRole();
  if (!gate.ok) return gate.response;

  try {
    const body = await req.json().catch(() => ({}));
    const endpoint = typeof body?.endpoint === "string" ? body.endpoint : null;

    const admin = createAdminClient();
    let query = admin.from("teacher_push_subscriptions").delete().eq("user_id", gate.auth.user.id);
    if (endpoint) query = query.eq("endpoint", endpoint);

    const { error } = await query;
    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });

    return NextResponse.json({ success: true, message: "Subscription removed" });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || "Failed to remove subscription" }, { status: 500 });
  }
}
