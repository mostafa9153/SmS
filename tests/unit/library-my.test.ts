import { beforeEach, describe, expect, it, vi } from "vitest";

// ---- the routes with their dependencies replaced, to prove who can see and renew what ----
let session: { ok: true; auth: Record<string, unknown> } | { ok: false; response: Response } = { ok: false, response: new Response(null, { status: 401 }) };
const getMyBooks = vi.fn();
const getLoan = vi.fn();
const renewLoan = vi.fn();

vi.mock("@/lib/api/guard", () => ({
  requireRole: async () => session,
  teacherPermissions: () => ({}),
}));
vi.mock("@/lib/notifications/notify", () => ({ notifyAdminsOfError: vi.fn() }));
vi.mock("@/lib/library/db-library-my", () => ({ getMyBooks: (...a: unknown[]) => getMyBooks(...a) }));
vi.mock("@/lib/library/db-library", () => ({ getLoan: (...a: unknown[]) => getLoan(...a) }));
vi.mock("@/lib/library/db-library-actions", () => ({ renewLoan: (...a: unknown[]) => renewLoan(...a) }));

const { GET } = await import("@/app/api/library/my/route");
const { POST } = await import("@/app/api/library/my/renew/route");
const { dueStatus, daysUntil, summarizeMine, ownsLoan } = await import("@/lib/library/my-books");

const ME = "11111111-1111-4111-8111-111111111111";
const OTHER = "22222222-2222-4222-8222-222222222222";
const LOAN = "33333333-3333-4333-8333-333333333333";
const REQ = "44444444-4444-4444-8444-444444444444";

const signedIn = (staffId: string | null, role = "Teacher") => {
  session = { ok: true, auth: { role, staffId, user: { id: "user-1" }, fullName: "T", permissions: {} } };
};
const renew = (body: unknown) =>
  POST(new Request("http://x/api/library/my/renew", { method: "POST", body: JSON.stringify(body), headers: { "Content-Type": "application/json" } }));

beforeEach(() => {
  session = { ok: false, response: new Response(null, { status: 401 }) };
  getMyBooks.mockReset().mockResolvedValue({ linked: true, loans: [] });
  getLoan.mockReset();
  renewLoan.mockReset().mockResolvedValue({ data: { loanId: LOAN, dueOn: "2026-11-20", fine: 0, eventId: "e", replayed: false }, undoId: "u1" });
});

describe("GET /api/library/my", () => {
  it("refuses a signed-out caller", async () => {
    expect((await GET()).status).toBe(401);
    expect(getMyBooks).not.toHaveBeenCalled();
  });

  it("reads only the session's staff id, whatever the role", async () => {
    for (const role of ["Teacher", "Staff", "Admin"]) {
      getMyBooks.mockClear();
      signedIn(ME, role);
      expect((await GET()).status).toBe(200);
      expect(getMyBooks).toHaveBeenCalledExactlyOnceWith(ME);
    }
  });

  it("passes null when the account has no staff profile, so the answer is empty not another person's", async () => {
    signedIn(null);
    await GET();
    expect(getMyBooks).toHaveBeenCalledExactlyOnceWith(null);
  });
});

describe("POST /api/library/my/renew", () => {
  it("refuses a signed-out caller", async () => {
    expect((await renew({ requestId: REQ, loanId: LOAN })).status).toBe(401);
    expect(renewLoan).not.toHaveBeenCalled();
  });

  it("renews the caller's own loan and returns the undo id", async () => {
    signedIn(ME);
    getLoan.mockResolvedValue({ id: LOAN, staff_id: ME });
    const res = await renew({ requestId: REQ, loanId: LOAN });
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ success: true, undoId: "u1" });
    expect(renewLoan).toHaveBeenCalledWith(expect.objectContaining({ loanId: LOAN, actor: { id: "user-1" } }));
  });

  it("answers not found for someone else's loan, same as a missing one, and never renews it", async () => {
    signedIn(ME);
    getLoan.mockResolvedValue({ id: LOAN, staff_id: OTHER });
    const res = await renew({ requestId: REQ, loanId: LOAN });
    expect(res.status).toBe(404);
    expect(renewLoan).not.toHaveBeenCalled();
  });

  it("answers not found for a student's loan", async () => {
    signedIn(ME);
    getLoan.mockResolvedValue({ id: LOAN, staff_id: null, student_id: "s1" });
    expect((await renew({ requestId: REQ, loanId: LOAN })).status).toBe(404);
    expect(renewLoan).not.toHaveBeenCalled();
  });

  it("never matches when the caller has no staff id, even for a loan with none", async () => {
    signedIn(null);
    getLoan.mockResolvedValue({ id: LOAN, staff_id: null });
    expect((await renew({ requestId: REQ, loanId: LOAN })).status).toBe(404);
    expect(renewLoan).not.toHaveBeenCalled();
  });

  it("rejects a malformed body before touching data", async () => {
    signedIn(ME);
    expect((await renew({ loanId: "nope" })).status).toBe(400);
    expect(getLoan).not.toHaveBeenCalled();
  });
});

describe("ownsLoan", () => {
  it("needs a real match", () => {
    expect(ownsLoan({ staff_id: ME }, ME)).toBe(true);
    expect(ownsLoan({ staff_id: OTHER }, ME)).toBe(false);
    expect(ownsLoan({ staff_id: null }, null)).toBe(false);
    expect(ownsLoan({ staff_id: ME }, undefined)).toBe(false);
  });
});

describe("due status", () => {
  const today = "2026-11-06";

  it("counts days to the due date", () => {
    expect(daysUntil("2026-11-09", today)).toBe(3);
    expect(daysUntil("2026-11-04", today)).toBe(-2);
  });

  it("is overdue only after the due day, soon within 2 days", () => {
    expect(dueStatus("2026-11-05", today)).toBe("overdue");
    expect(dueStatus("2026-11-06", today)).toBe("soon");
    expect(dueStatus("2026-11-08", today)).toBe("soon");
    expect(dueStatus("2026-11-09", today)).toBe("ok");
  });

  it("summarises for the portal banner", () => {
    expect(summarizeMine([{ dueOn: "2026-11-01" }, { dueOn: "2026-11-07" }, { dueOn: "2026-12-01" }], today)).toEqual({
      overdue: 1,
      dueSoon: 1,
      needsAttention: true,
    });
    expect(summarizeMine([{ dueOn: "2026-12-01" }], today).needsAttention).toBe(false);
    expect(summarizeMine([], today).needsAttention).toBe(false);
  });
});
