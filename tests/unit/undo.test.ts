import { beforeEach, describe, expect, it, vi } from "vitest";

type Row = Record<string, unknown>;
const db: { entry: Row | null; current: Row | null; ops: string[]; claimFails: boolean } = { entry: null, current: null, ops: [], claimFails: false };

function q(table: string) {
  let mode = "select";
  const chain: Record<string, unknown> = {
    select: () => chain,
    eq: () => chain,
    is: () => chain,
    in: (_c: string, v: unknown[]) => { db.ops.push(`${mode}:${table}:${v.join(",")}`); return chain; },
    update: (patch: Row) => { mode = "update"; if (table === "undoable_actions" && "undone_at" in patch && patch.undone_at) db.ops.push("claim"); return chain; },
    upsert: async (rows: Row[]) => { db.ops.push(`upsert:${table}:${rows.length}`); return { error: null }; },
    delete: () => { mode = "delete"; return chain; },
    maybeSingle: async () => ({ data: table === "undoable_actions" ? db.entry : db.current, error: null }),
    then: (resolve: (v: unknown) => void) =>
      resolve(table === "undoable_actions" && mode === "update" ? { data: db.claimFails ? [] : [{ id: "x" }] } : { error: null }),
  };
  return chain;
}
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({ from: q }) }));

const { performUndo } = await import("@/lib/undo/journal");

const actor = { user: { id: "u1" }, role: "Staff" as const, fullName: "" };
const future = new Date(Date.now() + 3600_000).toISOString();

beforeEach(() => {
  db.ops = [];
  db.claimFails = false;
  db.current = null;
  db.entry = {
    id: "e1", actor_id: "u1", label: "Delete Asha", undone_at: null, expires_at: future, guard: null,
    restore_steps: [
      { table: "students", op: "upsert", rows: [{ id: "s1" }] },
      { table: "student_results", op: "upsert", rows: [{ id: "r1" }, { id: "r2" }] },
    ],
  };
});

describe("performUndo", () => {
  it("replays steps in order after claiming the entry", async () => {
    expect(await performUndo("e1", actor)).toEqual({ ok: true, label: "Delete Asha" });
    expect(db.ops).toEqual(["claim", "upsert:students:1", "upsert:student_results:2"]);
  });

  it("only lets the actor or an Admin undo", async () => {
    expect(await performUndo("e1", { ...actor, user: { id: "other" } })).toMatchObject({ ok: false, status: 403 });
    expect(await performUndo("e1", { ...actor, user: { id: "other" }, role: "Admin" })).toMatchObject({ ok: true });
  });

  it("refuses expired, already-undone and double-clicked entries", async () => {
    db.entry = { ...db.entry!, expires_at: new Date(Date.now() - 1000).toISOString() };
    expect(await performUndo("e1", actor)).toMatchObject({ ok: false, status: 410 });
    db.entry = { ...db.entry!, expires_at: future, undone_at: future };
    expect(await performUndo("e1", actor)).toMatchObject({ ok: false, status: 409 });
    db.entry = { ...db.entry!, undone_at: null };
    db.claimFails = true;
    expect(await performUndo("e1", actor)).toMatchObject({ ok: false, status: 409 });
    expect(db.ops.filter((o) => o.startsWith("upsert"))).toHaveLength(0);
  });

  it("does not overwrite a record edited again after the action", async () => {
    db.entry = { ...db.entry!, guard: { table: "students", id: "s1", updated_at: "2026-10-28T10:00:00Z" } };
    db.current = { updated_at: "2026-10-28T11:00:00Z" };
    expect(await performUndo("e1", actor)).toMatchObject({ ok: false, status: 409 });
    db.current = { updated_at: "2026-10-28T10:00:00Z" };
    expect(await performUndo("e1", actor)).toMatchObject({ ok: true });
  });
});
