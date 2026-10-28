import { NextResponse } from "next/server";
import { getAuthenticatedUserRole, type AuthContext } from "@/lib/supabase/auth-helper";

type Role = Exclude<AuthContext["role"], "Guest">;

const SIGNED_IN: Role[] = ["Admin", "Staff", "Teacher"];

export type GuardResult =
  | { ok: true; auth: AuthContext }
  | { ok: false; response: NextResponse };

/**
 * API-route auth gate. `proxy.ts` does not redirect /api requests, so every
 * route must call this (or an equivalent) before touching data.
 *
 *   const gate = await requireRole();
 *   if (!gate.ok) return gate.response;
 */
export async function requireRole(allowed: Role[] = SIGNED_IN): Promise<GuardResult> {
  const auth = await getAuthenticatedUserRole();
  if (auth.role === "Guest") {
    return { ok: false, response: NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 }) };
  }
  if (!allowed.includes(auth.role)) {
    return { ok: false, response: NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 }) };
  }
  return { ok: true, auth };
}

/** True when the request carries `Authorization: Bearer $CRON_SECRET`. */
export function hasCronSecret(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  return Boolean(secret) && req.headers.get("authorization") === `Bearer ${secret}`;
}
