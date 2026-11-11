import { describe, it, expect } from "vitest";
import { canAccessPath } from "@/lib/navigation/route-access";

const teacher = (permissions: Record<string, boolean> = {}) => ({ role: "Teacher", permissions });

describe("canAccessPath", () => {
  it("never restricts Admin/Staff", () => {
    expect(canAccessPath("/sports", { role: "Admin" })).toBe(true);
    expect(canAccessPath("/settings", { role: "Staff" })).toBe(true);
  });
  it("blocks teacher without permission", () => {
    expect(canAccessPath("/sports", teacher())).toBe(false);
    expect(canAccessPath("/library/books", teacher())).toBe(false);
    expect(canAccessPath("/results", teacher())).toBe(false);
  });
  it("allows with permission", () => {
    expect(canAccessPath("/results", teacher({ can_enter_results: true }))).toBe(true);
    expect(canAccessPath("/sports", teacher({ can_manage_sports: true }))).toBe(true);
  });
  it("uses defaults and most specific rule", () => {
    expect(canAccessPath("/admission/re?class=IX", teacher())).toBe(true);
    expect(canAccessPath("/admission/new", teacher())).toBe(false);
    expect(canAccessPath("/generate/invoice", teacher())).toBe(true);
    expect(canAccessPath("/generate/id-card", teacher())).toBe(false);
  });
  it("keeps staff-only pages closed to teachers", () => {
    expect(canAccessPath("/settings/users", teacher())).toBe(false);
    expect(canAccessPath("/students/promotion", teacher())).toBe(false);
  });
  it("leaves unmapped pages open", () => {
    expect(canAccessPath("/teacher", teacher())).toBe(true);
    expect(canAccessPath("/", teacher())).toBe(true);
  });
});
