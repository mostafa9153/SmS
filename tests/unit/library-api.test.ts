import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

// ---- a minimal admin client: undoable_actions rows in memory, rpc calls recorded ----
type Row = Record<string, unknown>;
let entries: Row[] = [];
let rpcCalls: { fn: string; args: Record<string, unknown> }[] = [];
let rpcReply: { error: { message: string } | null } = { error: null };

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    rpc: async (fn: string, args: Record<string, unknown>) => {
      rpcCalls.push({ fn, args });
      return { data: null, ...rpcReply };
    },
    from: (table: string) => {
      const filters: [string, string, unknown][] = [];
      let patch: Row | null = null;
      const match = (r: Row) =>
        filters.every(([op, col, v]) => (op === "eq" ? r[col] === v : op === "is" ? (r[col] ?? null) === v : true));
      const builder: Record<string, unknown> = {
        select: () => builder,
        eq: (col: string, v: unknown) => (filters.push(["eq", col, v]), builder),
        is: (col: string, v: unknown) => (filters.push(["is", col, v]), builder),
        update: (p: Row) => ((patch = p), builder),
        maybeSingle: async () => ({ data: table === "undoable_actions" ? (entries.find(match) ?? null) : null, error: null }),
        then: (resolve: (r: unknown) => unknown) => {
          const hit = entries.filter(match);
          if (patch) hit.forEach((r) => Object.assign(r, patch));
          return Promise.resolve(resolve({ data: hit.map((r) => ({ id: r.id })), error: null }));
        },
      };
      return builder;
    },
  }),
}));

const { performUndo } = await import("@/lib/undo/journal");
const { LIBRARY_ERRORS, LibraryError, libraryError } = await import("@/lib/library/errors");
const { DEFAULT_LIBRARY_SETTINGS, loanRulesFor, parseLibrarySettings } = await import("@/lib/library/settings");
const { denyWaive } = await import("@/lib/library/api");
const { cleanBookInput } = await import("@/lib/library/db-library-actions");

const ENTRY_ID = "11111111-1111-1111-1111-111111111111";
const auth = (role: "Admin" | "Staff" | "Teacher", permissions: Record<string, boolean> = {}) => ({
  user: { id: "actor-1" },
  role,
  fullName: "X",
  permissions,
});

beforeEach(() => {
  rpcCalls = [];
  rpcReply = { error: null };
  entries = [
    {
      id: ENTRY_ID,
      actor_id: "actor-1",
      label: "issue",
      undone_at: null,
      expires_at: new Date(Date.now() + 3600_000).toISOString(),
      guard: null,
      restore_steps: [{ op: "rpc", fn: "library_undo", args: { p_event_id: "ev-1" }, actorArgs: true }],
    },
  ];
});

describe("undo journal rpc step", () => {
  it("calls the function with the undoer as actor and a request id stable per entry and person", async () => {
    expect(await performUndo(ENTRY_ID, auth("Staff") as never)).toEqual({ ok: true, label: "issue" });
    expect(rpcCalls).toHaveLength(1);
    const { p_request_id, ...rest } = rpcCalls[0].args;
    expect(rest).toEqual({ p_event_id: "ev-1", p_actor: "actor-1" });
    expect(p_request_id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-8[0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(entries[0].undone_at).not.toBeNull();

    // the same person again → same id (the database replays); an Admin → a different id
    entries[0].undone_at = null;
    await performUndo(ENTRY_ID, auth("Staff") as never);
    entries[0].undone_at = null;
    await performUndo(ENTRY_ID, { ...auth("Admin"), user: { id: "admin-9" } } as never);
    expect(rpcCalls[1].args.p_request_id).toBe(p_request_id);
    expect(rpcCalls[2].args.p_request_id).not.toBe(p_request_id);
  });

  it("treats an already-undone event as done (an earlier answer was lost)", async () => {
    rpcReply = { error: { message: "LIB:already_undone" } };
    expect(await performUndo(ENTRY_ID, auth("Staff") as never)).toEqual({ ok: true, label: "issue" });
  });

  it("turns a LIB refusal into a 409 with the Bengali reason and releases the claim", async () => {
    rpcReply = { error: { message: "LIB:newer_action" } };
    const result = await performUndo(ENTRY_ID, auth("Staff") as never);
    expect(result).toEqual({ ok: false, status: 409, error: LIBRARY_ERRORS.newer_action[1] });
    expect(entries[0].undone_at).toBeNull();
  });

  it("refuses to undo an edit of a record deleted since (it would come back half-empty)", async () => {
    entries[0].guard = { table: "library_books", id: "gone", updated_at: "2026-11-06T00:00:00Z" };
    const result = await performUndo(ENTRY_ID, auth("Staff") as never);
    expect(result).toMatchObject({ ok: false, status: 409 });
    expect(rpcCalls).toEqual([]);
  });

  it("refuses a function name that is not a plain identifier", async () => {
    (entries[0].restore_steps as Row[])[0].fn = "library_undo; drop";
    const result = await performUndo(ENTRY_ID, auth("Staff") as never);
    expect(result.ok).toBe(false);
    expect(rpcCalls).toEqual([]);
  });
});

describe("library errors", () => {
  it("has a message for every code the migration raises", () => {
    const sql = readFileSync(join(process.cwd(), "supabase/migrations/20261106_library_module.sql"), "utf8");
    const codes = new Set([...sql.matchAll(/library_fail\('([a-z_]+)'|'LIB:([a-z_]+)'/g)].map((m) => m[1] ?? m[2]));
    expect(codes.size).toBeGreaterThan(30);
    expect([...codes].filter((c) => !(c in LIBRARY_ERRORS))).toEqual([]);
  });

  it("reads a database message and keeps status and code", () => {
    const e = libraryError('LIB:limit (SQLSTATE P0001) DETAIL: "2/2"');
    expect(e).toBeInstanceOf(LibraryError);
    expect(e).toMatchObject({ code: "limit", status: 409 });
    expect(libraryError("duplicate key value")).toBeNull();
    expect(libraryError("LIB:not_a_code")).toBeNull();
  });
});

describe("library settings", () => {
  it("fills every missing key with its default", () => {
    expect(parseLibrarySettings(null)).toEqual(DEFAULT_LIBRARY_SETTINGS);
    expect(parseLibrarySettings({ finePerDay: 2 }).finePerDay).toBe(2);
  });

  it("drops an invalid value back to the default instead of failing", () => {
    const s = parseLibrarySettings({ finePerDay: -5, codePrefix: "b1/", fineCap: null, holidays: [{ from: "x", to: "y" }] });
    expect(s.finePerDay).toBe(DEFAULT_LIBRARY_SETTINGS.finePerDay);
    expect(s.codePrefix).toBe("B");
    expect(s.fineCap).toBeNull();
    expect(s.holidays).toEqual([]);
  });

  it("upper-cases a valid prefix", () => {
    expect(parseLibrarySettings({ codePrefix: " lib " }).codePrefix).toBe("LIB");
  });

  it("snapshots the borrower type's own terms onto a loan", () => {
    const s = parseLibrarySettings({ staff: { maxBooks: 9, loanDays: 60, renewDays: 30, maxRenews: 1, renewWindowDays: 7 } });
    expect(loanRulesFor(s, "staff")).toMatchObject({ loanDays: 60, renewDays: 30, maxRenews: 1, renewWindowDays: 7 });
    expect(loanRulesFor(s, "student")).toMatchObject({ loanDays: 14, finePerDay: 1, defaultLostAmount: 150 });
  });
});

describe("waive permission (plan S2)", () => {
  it("allows Admin and a flagged Teacher, never Staff", () => {
    expect(denyWaive(auth("Admin") as never)).toBeNull();
    expect(denyWaive(auth("Teacher", { can_waive_library_fines: true }) as never)).toBeNull();
    expect(denyWaive(auth("Teacher", { can_manage_library: true }) as never)?.status).toBe(403);
    expect(denyWaive(auth("Staff") as never)?.status).toBe(403);
  });
});

describe("cleanBookInput (K1)", () => {
  it("normalises to NFC, squeezes spaces and drops empty fields", () => {
    const decomposed = "পথের  পাঁচালী".normalize("NFD");
    expect(cleanBookInput({ title: `  ${decomposed} `, author: "  ", isbn: undefined })).toEqual({
      title: "পথের পাঁচালী".normalize("NFC"),
      author: null,
      isbn: null,
    });
  });
});

describe("grace after an overdue renew (R10)", async () => {
  const { accruedOverdue } = await import("@/lib/library/db-library");
  const rules = loanRulesFor(DEFAULT_LIBRARY_SETTINGS, "student"); // grace 2, ₹1/day
  it("forgives grace days only until the loan is renewed after its due date", () => {
    const loan = { due_on: "2026-11-25", rules, overdue_renewed: false };
    expect(accruedOverdue(loan, "2026-11-27", [], 0)).toBe(0);
    expect(accruedOverdue({ ...loan, overdue_renewed: true }, "2026-11-27", [], 0)).toBe(2);
  });
});
