import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/api/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPublicLinkConfig, newPublicLinkToken } from "@/lib/admission/public-link";
import { turnstileConfigured } from "@/lib/security/turnstile";

// Admin-only management of the public admission link.

async function respond(supabase: ReturnType<typeof createAdminClient>) {
  const config = await getPublicLinkConfig(supabase);
  const hourAgo = new Date(Date.now() - 3600_000).toISOString();
  const { data: recent } = await supabase
    .from("public_admission_attempts")
    .select("outcome")
    .gte("created_at", new Date(Date.now() - 86_400_000).toISOString());
  const { count: lastHour } = await supabase
    .from("public_admission_attempts")
    .select("id", { count: "exact", head: true })
    .gte("created_at", hourAgo);
  const stats = (recent ?? []).reduce<Record<string, number>>((acc, r) => ({ ...acc, [r.outcome]: (acc[r.outcome] ?? 0) + 1 }), {});

  return NextResponse.json({
    success: true,
    data: {
      enabled: config?.enabled ?? false,
      token: config?.token ?? null,
      expiresAt: config?.expiresAt ?? null,
      captchaConfigured: turnstileConfigured(),
      stats24h: stats,
      attemptsLastHour: lastHour ?? 0,
      available: config !== null,
    },
  });
}

export async function GET() {
  const gate = await requireRole(["Admin"]);
  if (!gate.ok) return gate.response;
  try {
    return await respond(createAdminClient());
  } catch (err) {
    return NextResponse.json({ success: false, error: err instanceof Error ? err.message : "Failed to load link settings" }, { status: 500 });
  }
}

const patchSchema = z.object({
  enabled: z.boolean().optional(),
  rotate: z.boolean().optional(),
  expiresAt: z.iso.datetime({ offset: true }).nullable().optional(),
});

export async function PATCH(req: Request) {
  const gate = await requireRole(["Admin"]);
  if (!gate.ok) return gate.response;

  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ success: false, error: parsed.error.issues[0]?.message ?? "Invalid request" }, { status: 400 });
  const body = parsed.data;

  try {
    const supabase = createAdminClient();
    const current = await getPublicLinkConfig(supabase);
    if (!current) {
      return NextResponse.json({ success: false, error: "Admission settings table is missing the public link columns. Run the 20261028_public_admission_link migration." }, { status: 409 });
    }
    if (body.enabled && process.env.NODE_ENV === "production" && !turnstileConfigured()) {
      return NextResponse.json({ success: false, error: "Set TURNSTILE_SECRET_KEY and NEXT_PUBLIC_TURNSTILE_SITE_KEY before enabling the public link." }, { status: 409 });
    }

    const update: Record<string, unknown> = {};
    if (body.enabled !== undefined) update.public_link_enabled = body.enabled;
    if (body.expiresAt !== undefined) update.public_link_expires_at = body.expiresAt;
    if (body.rotate || (body.enabled && !current.token)) update.public_link_token = newPublicLinkToken();

    const { data: row } = await supabase.from("admission_settings").select("id").limit(1).maybeSingle();
    const { error } = row
      ? await supabase.from("admission_settings").update(update).eq("id", row.id)
      : await supabase.from("admission_settings").insert(update);
    if (error) throw error;

    return await respond(supabase);
  } catch (err) {
    return NextResponse.json({ success: false, error: err instanceof Error ? err.message : "Failed to update link settings" }, { status: 500 });
  }
}
