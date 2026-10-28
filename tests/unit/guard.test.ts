import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthContext } from "@/lib/supabase/auth-helper";

const current: { auth: AuthContext } = { auth: { user: null, role: "Guest", fullName: "" } };
vi.mock("@/lib/supabase/auth-helper", () => ({ getAuthenticatedUserRole: async () => current.auth }));

const { requireRole, requireStaff } = await import("@/lib/api/guard");

function as(role: AuthContext["role"], permissions?: Record<string, unknown>) {
  current.auth = { user: role === "Guest" ? null : { id: "u" }, role, fullName: "x", permissions };
}

async function status(p: Promise<{ ok: boolean; response?: Response }>) {
  const r = await p;
  return r.ok ? 200 : r.response!.status;
}

describe("requireRole", () => {
  beforeEach(() => as("Guest"));
  it("rejects guests and wrong roles", async () => {
    expect(await status(requireRole())).toBe(401);
    as("Teacher");
    expect(await status(requireRole())).toBe(200);
    expect(await status(requireRole(["Admin"]))).toBe(403);
  });
});

describe("requireStaff", () => {
  it("always allows Admin and Staff", async () => {
    as("Admin");
    expect(await status(requireStaff("can_enter_results"))).toBe(200);
    as("Staff");
    expect(await status(requireStaff())).toBe(200);
  });

  it("allows a Teacher only with a granted permission", async () => {
    as("Teacher", {});
    expect(await status(requireStaff("can_enter_results"))).toBe(403); // default false
    expect(await status(requireStaff("can_generate_invoices"))).toBe(200); // default true
    as("Teacher", { can_enter_results: true });
    expect(await status(requireStaff("can_enter_results"))).toBe(200);
    as("Teacher", { can_generate_invoices: false });
    expect(await status(requireStaff("can_generate_invoices"))).toBe(403);
    expect(await status(requireStaff())).toBe(403);
  });

  it("rejects guests", async () => {
    as("Guest");
    expect(await status(requireStaff("can_view_students"))).toBe(401);
  });
});
