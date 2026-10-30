import { NextResponse } from "next/server";
import { getAuthenticatedUserRole, type AuthContext } from "@/lib/supabase/auth-helper";
import { DEFAULT_TEACHER_PERMISSIONS, type TeacherPermissions } from "@/lib/types/teacher";

type Role = Exclude<AuthContext["role"], "Guest">;
type TeacherPermission = Exclude<keyof TeacherPermissions, "allowed_classes">;

const SIGNED_IN: Role[] = ["Admin", "Staff", "Teacher"];

type GuardResult =
  | { ok: true; auth: AuthContext }
  | { ok: false; response: NextResponse };

function deny(status: 401 | 403): GuardResult {
  return {
    ok: false,
    response: NextResponse.json({ success: false, error: status === 401 ? "Unauthorized" : "Forbidden" }, { status }),
  };
}

/** Effective teacher permissions: stored flags over the defaults. */
export function teacherPermissions(auth: AuthContext): TeacherPermissions {
  return { ...DEFAULT_TEACHER_PERMISSIONS, ...(auth.permissions ?? {}) };
}

/**
 * API-route auth gate. `proxy.ts` does not redirect /api requests, so every
 * route must call this (or an equivalent) before touching data.
 *
 *   const gate = await requireRole();
 *   if (!gate.ok) return gate.response;
 */
export async function requireRole(allowed: Role[] = SIGNED_IN): Promise<GuardResult> {
  const auth = await getAuthenticatedUserRole();
  if (auth.role === "Guest") return deny(401);
  if (!allowed.includes(auth.role)) return deny(403);
  return { ok: true, auth };
}

/**
 * Admin and Staff always pass; a Teacher passes only when granted at least one
 * of `permissions` (the same flags the Teacher Management screen edits).
 */
export async function requireStaff(...permissions: TeacherPermission[]): Promise<GuardResult> {
  const auth = await getAuthenticatedUserRole();
  if (auth.role === "Guest") return deny(401);
  if (auth.role === "Admin" || auth.role === "Staff") return { ok: true, auth };
  const granted = teacherPermissions(auth);
  if (auth.role === "Teacher" && permissions.some((p) => granted[p] === true)) return { ok: true, auth };
  return deny(403);
}

/**
 * Class scope for Teachers: an empty `allowed_classes` means every class.
 * Admin and Staff are never scoped. Returns a 403 response when out of scope.
 */
export function denyOutsideClasses(auth: AuthContext, className: string | null | undefined): NextResponse | null {
  if (auth.role !== "Teacher") return null;
  const allowed = teacherPermissions(auth).allowed_classes;
  if (!allowed?.length || (className && allowed.includes(className))) return null;
  return NextResponse.json(
    { success: false, error: `Forbidden: no permission for Class ${className ?? "?"}` },
    { status: 403 },
  );
}

/** True when the request carries `Authorization: Bearer $CRON_SECRET`. */
export function hasCronSecret(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  return Boolean(secret) && req.headers.get("authorization") === `Bearer ${secret}`;
}
