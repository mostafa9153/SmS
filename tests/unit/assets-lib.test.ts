import { beforeEach, describe, expect, it, vi } from "vitest";

// Minimal admin client: the undo entry, the claim update, and an rpc whose error we choose.
const state: { rpcError: string | null; deleteError: { code: string; message: string } | null; rpcCalls: { fn: string; args: Record<string, unknown> }[] } =
  { rpcError: null, deleteError: null, rpcCalls: [] };
const future = new Date(Date.now() + 3600_000).toISOString();
const entry: { restore_steps: unknown[] } & Record<string, unknown> = {
  id: "e1", actor_id: "u1", label: "Moved 4 Bench", undone_at: null, expires_at: future, guard: null,
  restore_steps: [{ op: "rpc", fn: "asset_undo", args: { p_event_id: "ev1" }, actorArgs: true }],
};
function q() {
  let mode = "select";
  const chain: Record<string, unknown> = {
    select: () => chain,
    eq: () => chain,
    is: () => chain,
    update: () => { mode = "update"; return chain; },
    delete: () => { mode = "delete"; return chain; },
    in: () => chain,
    maybeSingle: async () => ({ data: entry, error: null }),
    then: (resolve: (v: unknown) => void) => resolve(mode === "update" ? { data: [{ id: "e1" }], error: null } : mode === "delete" ? { error: state.deleteError } : { error: null }),
  };
  return chain;
}
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: q,
    rpc: async (fn: string, args: Record<string, unknown>) => {
      state.rpcCalls.push({ fn, args });
      return { error: state.rpcError ? { message: state.rpcError } : null };
    },
  }),
}));

const { performUndo } = await import("@/lib/undo/journal");
const { assetError, AssetError } = await import("@/lib/assets/errors");
const { eventLabel } = await import("@/lib/assets/db-asset-actions");
const { itemSchema, changeSchema, countSchema } = await import("@/lib/assets/types");

const actor = { user: { id: "u1" }, role: "Staff" as const, fullName: "" };

const RPC_STEP = entry.restore_steps;
beforeEach(() => {
  entry.restore_steps = RPC_STEP;
  state.deleteError = null;
  state.rpcError = null;
  state.rpcCalls = [];
});

describe("asset undo through the journal", () => {
  it("calls asset_undo with the actor and a request id", async () => {
    expect(await performUndo("e1", actor as never)).toEqual({ ok: true, label: "Moved 4 Bench" });
    expect(state.rpcCalls[0].fn).toBe("asset_undo");
    expect(state.rpcCalls[0].args).toMatchObject({ p_event_id: "ev1", p_actor: "u1" });
    expect(typeof state.rpcCalls[0].args.p_request_id).toBe("string");
  });

  it("treats AST:already_undone as done (a retried undo whose answer was lost)", async () => {
    state.rpcError = "AST:already_undone";
    expect(await performUndo("e1", actor as never)).toEqual({ ok: true, label: "Moved 4 Bench" });
  });

  it("turns AST:state_changed into a readable 409, not a 500", async () => {
    state.rpcError = "AST:state_changed";
    const r = await performUndo("e1", actor as never);
    expect(r).toMatchObject({ ok: false, status: 409 });
    expect(r.ok === false && r.error).toMatch(/Undo the later change first/);
  });
});

describe("undo of a create once the row is in use", () => {
  it("is a readable 409, not a 500", async () => {
    entry.restore_steps = [{ table: "rooms", op: "delete", column: "id", values: ["r1"] }];
    state.deleteError = { code: "23503", message: "violates foreign key constraint" };
    const r = await performUndo("e1", actor as never);
    expect(r).toMatchObject({ ok: false, status: 409 });
    expect(r.ok === false && r.error).toMatch(/in use now/);
  });
});

describe("asset errors", () => {
  it("parses codes and details from database messages", () => {
    const e = assetError("ERROR: AST:stale_count:Bench");
    expect(e).toBeInstanceOf(AssetError);
    expect(e?.status).toBe(409);
    expect(e?.message).toMatch(/^Bench: Someone changed/);
    expect(assetError("AST:not_a_code")).toBeNull();
    expect(assetError("LIB:limit")).toBeNull();
  });
});

describe("event labels", () => {
  const base = { item_name: "Bench", qty: 4, from_room_name: "Room 41", to_room_name: "33", from_condition: null, to_condition: null, reason: null } as const;
  it("reads like a sentence", () => {
    expect(eventLabel({ ...base, kind: "move" })).toBe("Moved 4 Bench: Room 41 → 33");
    expect(eventLabel({ ...base, kind: "purchase" })).toBe("Added 4 Bench to 33");
    expect(eventLabel({ ...base, kind: "condition", from_condition: "working", to_condition: "repair" })).toBe("4 Bench in Room 41: working → needs repair");
    expect(eventLabel({ ...base, kind: "write_off", reason: "lost" })).toBe("Wrote off 4 Bench (lost) from Room 41");
    expect(eventLabel({ ...base, kind: "batch", to_room_name: "Room 41" }, 1)).toBe("Counted Room 41 (1 change)");
  });
});

describe("request schemas", () => {
  it("an item rename does not reset its category or tracking", () => {
    expect(itemSchema.partial().parse({ name: "Bench" })).toEqual({ name: "Bench" });
  });
  it("a count cannot list the same item and condition twice", () => {
    const line = { itemId: crypto.randomUUID(), condition: "working", counted: 12, expected: 10 };
    const body = { requestId: crypto.randomUUID(), roomId: "room-101", lines: [line, line] };
    expect(countSchema.safeParse(body).success).toBe(false);
    expect(countSchema.safeParse({ ...body, lines: [line, { ...line, condition: "damaged" }] }).success).toBe(true);
  });
  it("a change needs a qty or a unit", () => {
    const b = { requestId: crypto.randomUUID(), kind: "move", itemId: crypto.randomUUID(), roomId: "room-101", condition: "working", toRoomId: "r2" };
    expect(changeSchema.safeParse(b).success).toBe(false);
    expect(changeSchema.safeParse({ ...b, qty: 2 }).success).toBe(true);
  });
});
