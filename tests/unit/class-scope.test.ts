import { describe, expect, it, vi } from "vitest";
import type { AuthContext } from "@/lib/supabase/auth-helper";

const students: Record<string, string> = { s9: "IX", s10: "X" };
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: () => ({
      select: () => ({
        in: async (_c: string, ids: string[]) => ({
          data: ids.filter((id) => students[id]).map((id) => ({ id, present_class: students[id] })),
          error: null,
        }),
      }),
    }),
  }),
}));

const { denyStudentsOutsideClasses } = await import("@/lib/api/class-scope");
const teacher = (allowed: string[]): AuthContext => ({ user: { id: "u" }, role: "Teacher", fullName: "t", permissions: { allowed_classes: allowed } });

describe("denyStudentsOutsideClasses", () => {
  it("allows a scoped Teacher for their own students", async () => {
    expect(await denyStudentsOutsideClasses(teacher(["IX"]), "IX", ["s9"])).toBeNull();
  });

  it("blocks a correct class label carrying another class's student", async () => {
    expect((await denyStudentsOutsideClasses(teacher(["IX"]), "IX", ["s9", "s10"]))?.status).toBe(403);
  });

  it("blocks unknown student ids", async () => {
    expect((await denyStudentsOutsideClasses(teacher(["IX"]), "IX", ["ghost"]))?.status).toBe(403);
  });

  it("does not scope Admin or an unscoped Teacher", async () => {
    expect(await denyStudentsOutsideClasses({ ...teacher(["IX"]), role: "Admin" }, "X", ["s10"])).toBeNull();
    expect(await denyStudentsOutsideClasses(teacher([]), "X", ["s10"])).toBeNull();
  });
});
