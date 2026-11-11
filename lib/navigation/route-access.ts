import {
  DEFAULT_TEACHER_PERMISSIONS, OPEN_ROUTES, PERMISSION_ITEMS, STAFF_ONLY_ROUTES,
  type PermissionKey, type TeacherPermissions,
} from "@/lib/permissions/registry";

export interface AccessProfile {
  role: string | null;
  permissions?: Partial<TeacherPermissions> | null;
}

export type RouteRule =
  | { kind: "open" }
  | { kind: "staff" }
  | { kind: "any"; keys: PermissionKey[] }
  | { kind: "unmapped" };

const segs = (p: string) => p.split("/").filter(Boolean);

/** Specificity of `pattern` as a prefix of `path`, or -1 when it does not match. */
function matchScore(pattern: string, path: string[]): number {
  const pat = segs(pattern);
  if (pat.length > path.length) return -1;
  let literals = 0;
  for (let i = 0; i < pat.length; i++) {
    if (pat[i] === "*") continue;
    if (pat[i] !== path[i]) return -1;
    literals++;
  }
  return pat.length * 2 + literals;
}

/** The rule that governs a page for Teachers: the most specific pattern wins. */
export function routeRule(rawPath: string): RouteRule {
  const path = segs(rawPath.split(/[?#]/)[0]);
  if (!path.length) return { kind: "open" };

  let best = -1;
  const found: { kind: RouteRule["kind"]; keys: PermissionKey[] } = { kind: "unmapped", keys: [] };
  const consider = (score: number, next: "open" | "staff" | "any", key?: PermissionKey) => {
    if (score < 0 || score < best) return;
    if (score > best) {
      best = score;
      found.kind = next;
      found.keys = [];
    }
    // Same specificity: the stricter kind wins, permissions for the same page add up.
    if (next === "staff") found.kind = "staff";
    if (key && found.kind === "any") found.keys.push(key);
  };

  for (const p of OPEN_ROUTES) if (p !== "/") consider(matchScore(p, path), "open");
  for (const item of PERMISSION_ITEMS) {
    for (const p of item.routes ?? []) consider(matchScore(p, path), "any", item.key);
  }
  for (const p of STAFF_ONLY_ROUTES) consider(matchScore(p, path), "staff");

  if (found.kind === "open" || found.kind === "staff") return { kind: found.kind };
  if (found.kind === "any") return { kind: "any", keys: found.keys };

  // A hub page (e.g. /generate, /admission) opens when any page under it does.
  const prefix = "/" + path.join("/") + "/";
  const under = PERMISSION_ITEMS.filter((i) => (i.routes ?? []).some((r) => r.startsWith(prefix))).map((i) => i.key);
  return under.length ? { kind: "any", keys: under } : { kind: "unmapped" };
}

export function hasPermission(profile: AccessProfile, ...keys: PermissionKey[]): boolean {
  if (profile.role !== "Teacher") return true;
  const granted = { ...DEFAULT_TEACHER_PERMISSIONS, ...(profile.permissions ?? {}) };
  return keys.some((k) => granted[k] === true);
}

/**
 * Admin/Staff (and a role not yet loaded on the client; the proxy has already
 * decided on the server) are never restricted here. A Teacher needs a matching
 * permission, and a page with no rule is closed.
 */
export function canAccessPath(path: string, profile: AccessProfile): boolean {
  if (profile.role !== "Teacher") return true;
  const rule = routeRule(path);
  if (rule.kind === "open") return true;
  if (rule.kind === "any") return hasPermission(profile, ...rule.keys);
  return false;
}
