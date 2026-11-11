import { describe, it, expect } from "vitest";
import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { canAccessPath, routeRule } from "@/lib/navigation/route-access";
import { DEFAULT_TEACHER_PERMISSIONS, PERMISSION_ITEMS, normalizePermissions } from "@/lib/permissions/registry";

const none = Object.fromEntries(PERMISSION_ITEMS.map((i) => [i.key, false]));
const teacher = (permissions: Record<string, boolean> = {}) => ({ role: "Teacher", permissions: { ...none, ...permissions } });

function pages(dir: string, base = ""): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return pages(full, `${base}/${name.startsWith("[") ? "x" : name}`);
    return name === "page.tsx" ? [base || "/"] : [];
  });
}

describe("route access", () => {
  it("maps every dashboard page (add new sections to lib/permissions/registry.ts)", () => {
    const unmapped = pages(join(process.cwd(), "app", "(dashboard)")).filter((p) => routeRule(p).kind === "unmapped");
    expect(unmapped).toEqual([]);
  });

  it("never restricts Admin/Staff", () => {
    expect(canAccessPath("/sports", { role: "Admin" })).toBe(true);
    expect(canAccessPath("/settings", { role: "Staff" })).toBe(true);
  });

  it("closes every permission page to a teacher with no permissions", () => {
    for (const item of PERMISSION_ITEMS) {
      for (const route of item.routes ?? []) {
        expect(canAccessPath(route.replace("*", "x"), teacher()), route).toBe(false);
      }
    }
    expect(canAccessPath("/generate", teacher())).toBe(false);
    expect(canAccessPath("/some-future-page", teacher())).toBe(false);
  });

  it("opens exactly the page a permission covers", () => {
    const t = teacher({ can_enter_results: true });
    expect(canAccessPath("/results?class=IX", t)).toBe(true);
    expect(canAccessPath("/sports", t)).toBe(false);
    expect(canAccessPath("/generate/bonafide", t)).toBe(false);
    expect(canAccessPath("/generate/bonafide", teacher({ can_generate_bonafide: true }))).toBe(true);
    expect(canAccessPath("/generate", teacher({ can_generate_bonafide: true }))).toBe(true);
    expect(canAccessPath("/generate/certificate-tracker", teacher({ can_generate_certificates: true }))).toBe(false);
  });

  it("picks the most specific rule", () => {
    const viewer = teacher({ can_view_students: true, can_view_student_profile: true });
    expect(canAccessPath("/students", viewer)).toBe(true);
    expect(canAccessPath("/students/abc", viewer)).toBe(true);
    expect(canAccessPath("/students/abc/edit", viewer)).toBe(false);
    expect(canAccessPath("/students/add", viewer)).toBe(false);
    expect(canAccessPath("/students/promotion", viewer)).toBe(false);
    expect(canAccessPath("/routine/viewer", teacher({ can_view_routine: true }))).toBe(true);
    expect(canAccessPath("/routine/generate", teacher({ can_view_routine: true }))).toBe(false);
    expect(canAccessPath("/ems", teacher({ can_view_seating_plan: true }))).toBe(true);
  });

  it("keeps staff-only pages closed and own pages open", () => {
    const all = { role: "Teacher", permissions: Object.fromEntries(PERMISSION_ITEMS.map((i) => [i.key, true])) };
    expect(canAccessPath("/settings/users", all)).toBe(false);
    expect(canAccessPath("/teacher-management", all)).toBe(false);
    expect(canAccessPath("/employees/x/edit", all)).toBe(false);
    expect(canAccessPath("/teacher/library", teacher())).toBe(true);
    expect(canAccessPath("/profile/edit", teacher())).toBe(true);
    expect(canAccessPath("/", teacher())).toBe(true);
  });

  it("normalizes stored permissions", () => {
    const p = normalizePermissions({ can_enter_results: true, bogus: true, can_manage_sports: "yes" });
    expect(p.can_enter_results).toBe(true);
    expect(p.can_manage_sports).toBe(DEFAULT_TEACHER_PERMISSIONS.can_manage_sports);
    expect("bogus" in p).toBe(false);
    expect(p.allowed_classes).toEqual([]);
  });
});
