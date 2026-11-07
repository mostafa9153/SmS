import { beforeEach, describe, expect, it, vi } from "vitest";

// status-action tc_out with its dependencies replaced (plan T12).
let session: { ok: true; auth: Record<string, unknown> } | { ok: false; response: Response } = { ok: false, response: new Response(null, { status: 401 }) };
let tcMode: "warn" | "block" | "off" = "block";
const dues = vi.fn();
const recordTcOverride = vi.fn();
const studentsUpdate = vi.fn();

// Minimal chainable Supabase stand-in: every call returns itself; awaiting gives { data, error }.
function chain(result: () => { data: unknown; error: null }) {
  const c: Record<string, unknown> = {};
  for (const m of ["select", "eq", "in", "is", "or", "maybeSingle", "insert", "upsert", "delete", "order"]) c[m] = () => c;
  c.update = (v: unknown) => {
    studentsUpdate(v);
    return c;
  };
  c.then = (res: (v: unknown) => unknown) => Promise.resolve(result()).then(res);
  return c;
}

vi.mock("@/lib/api/guard", () => ({ requireStaff: async () => session, denyOutsideClasses: () => null }));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: () => chain(() => ({ data: [{ id: "s1", present_class: "IX" }], error: null })) }),
}));
vi.mock("@/lib/undo/journal", () => ({ recordUndo: async () => "undo-1" }));
vi.mock("@/lib/supabase/write", () => ({ mustWrite: async () => undefined }));
vi.mock("@/lib/notifications/notify", () => ({ notifyAdminsOfError: vi.fn() }));
vi.mock("@/lib/academic/current-year", () => ({ getAcademicYear: async () => 2026 }));
vi.mock("@/lib/library/db-library", () => ({ getLibrarySettings: async () => ({ tcMode }) }));
vi.mock("@/lib/library/db-library-tc", () => ({
  libraryDuesForStudents: (...a: unknown[]) => dues(...a),
  recordTcOverride: (...a: unknown[]) => recordTcOverride(...a),
}));

const { POST } = await import("@/app/api/students/status-action/route");
const { tcGate, cleanOverrideReason } = await import("@/lib/library/tc");

const OWES = [{ studentId: "s1", name: "Rina", openBooks: 2, balance: 15 }];
const as = (role: string) => {
  session = { ok: true, auth: { role, user: { id: "user-1" }, staffId: null, fullName: "X", permissions: {} } };
};
const tcOut = (extra: Record<string, unknown> = {}) =>
  POST(new Request("http://x/api/students/status-action", { method: "POST", body: JSON.stringify({ action: "tc_out", studentIds: ["s1"], ...extra }) }));

beforeEach(() => {
  tcMode = "block";
  dues.mockReset().mockResolvedValue(OWES);
  recordTcOverride.mockReset().mockResolvedValue(undefined);
  studentsUpdate.mockReset();
});

describe("tc_out library check", () => {
  it("refuses with 409 and the per-student list when dues are outstanding", async () => {
    as("Staff");
    const res = await tcOut();
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.code).toBe("library_dues");
    expect(body.libraryDues).toEqual(OWES);
    expect(studentsUpdate).not.toHaveBeenCalled();
  });

  it("lets an Admin override with a reason and logs the event", async () => {
    as("Admin");
    const res = await tcOut({ libraryOverrideReason: "Parent paid in cash at office" });
    expect(res.status).toBe(200);
    expect(studentsUpdate.mock.calls[0][0]).toMatchObject({ current_status: "TC Out" });
    expect(recordTcOverride).toHaveBeenCalledExactlyOnceWith("user-1", "Parent paid in cash at office", OWES);
  });

  it("refuses a Staff override with 403", async () => {
    as("Staff");
    const res = await tcOut({ libraryOverrideReason: "Parent paid in cash at office" });
    expect(res.status).toBe(403);
    expect(studentsUpdate).not.toHaveBeenCalled();
    expect(recordTcOverride).not.toHaveBeenCalled();
  });

  it("refuses an Admin override with a too-short reason", async () => {
    as("Admin");
    expect((await tcOut({ libraryOverrideReason: "ok" })).status).toBe(400);
    expect(studentsUpdate).not.toHaveBeenCalled();
  });

  it("passes a student with no dues without any override", async () => {
    as("Staff");
    dues.mockResolvedValue([{ studentId: "s1", name: "Rina", openBooks: 0, balance: 0 }]);
    expect((await tcOut()).status).toBe(200);
    expect(recordTcOverride).not.toHaveBeenCalled();
  });

  it("warn mode issues the TC and returns the dues", async () => {
    as("Staff");
    tcMode = "warn";
    const res = await tcOut();
    expect(res.status).toBe(200);
    expect((await res.json()).libraryDues).toEqual(OWES);
  });

  it("off mode skips the lookup", async () => {
    as("Staff");
    tcMode = "off";
    expect((await tcOut()).status).toBe(200);
    expect(dues).not.toHaveBeenCalled();
  });
});

describe("tcGate", () => {
  it("covers each mode", () => {
    expect(tcGate({ mode: "block", dues: OWES, role: "Teacher", overrideReason: "long enough" }).kind).toBe("forbidden");
    expect(tcGate({ mode: "block", dues: OWES, role: "Admin" }).kind).toBe("blocked");
    expect(tcGate({ mode: "off", dues: OWES, role: "Staff" })).toEqual({ kind: "allow", dues: [], override: false });
  });

  it("cleans override reasons", () => {
    expect(cleanOverrideReason("  fine reason ")).toBe("fine reason");
    expect(cleanOverrideReason("abc")).toBeNull();
    expect(cleanOverrideReason(5)).toBeNull();
    expect(cleanOverrideReason("x".repeat(301))).toBeNull();
  });
});
