import "server-only";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { softWrite } from "@/lib/supabase/write";

export const PUBLIC_LIMITS = {
  /** Max request body for a public submission. */
  bodyBytes: 64 * 1024,
  /** Longest single text value accepted from the public form. */
  fieldChars: 1000,
  perIpPerHour: 5,
  perContactPerDay: 3,
  globalPerHour: 300,
} as const;

export interface PublicLinkConfig {
  enabled: boolean;
  token: string | null;
  expiresAt: string | null;
  /** School-wide switch for new admissions; closes the link too. */
  admissionsOpen: boolean;
}

export function newPublicLinkToken(): string {
  return randomBytes(24).toString("base64url");
}

export async function getPublicLinkConfig(supabase: SupabaseClient): Promise<PublicLinkConfig | null> {
  const { data, error } = await supabase
    .from("admission_settings")
    .select("public_link_enabled, public_link_token, public_link_expires_at, new_admission_active")
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;
  return {
    enabled: Boolean(data.public_link_enabled),
    token: data.public_link_token,
    expiresAt: data.public_link_expires_at,
    admissionsOpen: data.new_admission_active !== false,
  };
}

/** Constant-time token check that also enforces enabled + expiry. */
export function isLinkOpen(config: PublicLinkConfig | null, token: string): boolean {
  if (!config?.enabled || !config.admissionsOpen || !config.token) return false;
  if (config.expiresAt && new Date(config.expiresAt).getTime() < Date.now()) return false;
  const a = Buffer.from(config.token);
  const b = Buffer.from(token);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Salted hash so the attempt log never stores raw IPs or phone numbers. */
export function privacyHash(value: string): string {
  const salt = process.env.PUBLIC_FORM_SALT || process.env.SUPABASE_SERVICE_ROLE_KEY || "sms-public-form";
  return createHash("sha256").update(`${salt}:${value}`).digest("hex").slice(0, 32);
}

export function clientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || req.headers.get("x-real-ip") || "unknown";
}

export type AttemptOutcome = "accepted" | "rate_limited" | "captcha_failed" | "invalid" | "honeypot" | "duplicate" | "error";

export async function logAttempt(
  supabase: SupabaseClient,
  entry: { ipHash: string; contactHash?: string | null; outcome: AttemptOutcome; applicationId?: string | null },
) {
  await softWrite(supabase.from("public_admission_attempts").insert({
    ip_hash: entry.ipHash,
    contact_hash: entry.contactHash ?? null,
    outcome: entry.outcome,
    application_id: entry.applicationId ?? null,
  }), "public_admission_attempts insert");
}

/** Returns the reason a submission must be throttled, or null when it may proceed. */
export async function checkRateLimit(
  supabase: SupabaseClient,
  ipHash: string,
  contactHash: string | null,
): Promise<"ip" | "contact" | "global" | null> {
  const hourAgo = new Date(Date.now() - 3600_000).toISOString();
  const dayAgo = new Date(Date.now() - 86_400_000).toISOString();
  const count = async (column: string | null, value: string | null, since: string, acceptedOnly = false) => {
    let q = supabase.from("public_admission_attempts").select("id", { count: "exact", head: true }).gte("created_at", since);
    if (column && value) q = q.eq(column, value);
    if (acceptedOnly) q = q.eq("outcome", "accepted");
    const { count: n } = await q;
    return n ?? 0;
  };

  if ((await count("ip_hash", ipHash, hourAgo)) >= PUBLIC_LIMITS.perIpPerHour) return "ip";
  if (contactHash && (await count("contact_hash", contactHash, dayAgo, true)) >= PUBLIC_LIMITS.perContactPerDay) return "contact";
  if ((await count(null, null, hourAgo)) >= PUBLIC_LIMITS.globalPerHour) return "global";
  return null;
}
