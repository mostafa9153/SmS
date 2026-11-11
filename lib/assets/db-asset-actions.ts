import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { recordUndo } from "@/lib/undo/journal";
import { assetError } from "./errors";
import type { AddInput, AssetEvent, ChangeInput, CountInput } from "./types";

type RpcResult = { event_id: string | null; codes?: string[]; changed?: number; replayed?: boolean };
export type ActionResult = { eventId: string | null; codes: string[]; changed?: number; replayed: boolean; undoId: string | null };

const db = () => createAdminClient();

async function rpc(fn: string, args: Record<string, unknown>): Promise<RpcResult> {
  const { data, error } = await db().rpc(fn, args);
  if (error) throw assetError(error.message) ?? new Error(`${fn}: ${error.message}`);
  return data as RpcResult;
}

/** The undo entry already recorded for an event (a replayed request must not add a second one). */
async function existingUndo(eventId: string): Promise<string | null> {
  const { data } = await db()
    .from("undoable_actions")
    .select("id")
    .contains("restore_steps", [{ args: { p_event_id: eventId } }])
    .is("undone_at", null)
    .limit(1)
    .maybeSingle();
  return data?.id ?? null;
}

const COND: Record<string, string> = { working: "working", repair: "needs repair", damaged: "damaged" };

/** One readable line for the undo toast and history. */
export function eventLabel(e: Pick<AssetEvent, "kind" | "item_name" | "qty" | "from_room_name" | "to_room_name" | "from_condition" | "to_condition" | "reason">, changed?: number): string {
  const what = `${e.qty ?? ""} ${e.item_name ?? ""}`.trim();
  switch (e.kind) {
    case "opening":
    case "purchase":
      return `Added ${what} to ${e.to_room_name}`;
    case "move":
      return `Moved ${what}: ${e.from_room_name} → ${e.to_room_name}`;
    case "condition":
      return `${what} in ${e.from_room_name}: ${COND[e.from_condition ?? ""]} → ${COND[e.to_condition ?? ""]}`;
    case "write_off":
      return `Wrote off ${what} (${e.reason}) from ${e.from_room_name}`;
    case "batch":
      return `Counted ${e.to_room_name} (${changed ?? 0} change${changed === 1 ? "" : "s"})`;
    default:
      return "Asset change";
  }
}

/** Runs one ledger RPC, then journals its undo (or finds the one a replay already journaled). */
async function run(fn: string, args: Record<string, unknown>, actorId: string, requestId: string): Promise<ActionResult> {
  const r = await rpc(fn, { ...args, p_actor: actorId, p_request_id: requestId });
  const base = { eventId: r.event_id, codes: r.codes ?? [], changed: r.changed, replayed: r.replayed === true };
  if (!r.event_id) return { ...base, undoId: null };
  if (r.replayed) return { ...base, undoId: await existingUndo(r.event_id) };

  let label = "Asset change";
  try {
    const { data } = await db().from("asset_events").select("*").eq("id", r.event_id).single();
    if (data) label = eventLabel(data as AssetEvent, r.changed);
  } catch (err) {
    console.error("[assets] label lookup failed:", err);
  }
  const undoId = await recordUndo({
    actorId,
    action: `asset.${fn.replace(/^asset_/, "")}`,
    label,
    entity: "asset_events",
    entityId: r.event_id,
    steps: [{ op: "rpc", fn: "asset_undo", args: { p_event_id: r.event_id }, actorArgs: true }],
    // A school fixes a wrong entry within the day; older changes are corrected with a new entry.
    ttlHours: 24,
  });
  return { ...base, undoId };
}

export const addAsset = (b: AddInput, actorId: string) =>
  run(
    "asset_add",
    {
      p_kind: b.kind,
      p_room_id: b.roomId,
      p_item_id: b.itemId,
      p_qty: b.qty,
      p_condition: b.condition,
      p_unit_price: b.unitPrice ?? null,
      p_fund_id: b.fundId ?? null,
      p_occurred_on: b.occurredOn ?? null,
      p_serials: b.serials?.length ? b.serials : null,
      p_note: b.note ?? null,
    },
    actorId,
    b.requestId,
  );

export const changeAsset = (b: ChangeInput, actorId: string) =>
  run(
    "asset_change",
    {
      p_kind: b.kind,
      p_item_id: b.itemId,
      p_room_id: b.roomId,
      p_condition: b.condition,
      p_qty: b.qty ?? null,
      p_unit_id: b.unitId ?? null,
      p_to_room_id: b.toRoomId ?? null,
      p_to_condition: b.toCondition ?? null,
      p_reason: b.reason ?? null,
      p_occurred_on: b.occurredOn ?? null,
      p_note: b.note ?? null,
    },
    actorId,
    b.requestId,
  );

export const countRoom = (b: CountInput, actorId: string) =>
  run(
    "asset_count",
    {
      p_room_id: b.roomId,
      p_occurred_on: b.occurredOn ?? null,
      p_lines: b.lines.map((l) => ({ item_id: l.itemId, condition: l.condition, counted: l.counted, expected: l.expected })),
    },
    actorId,
    b.requestId,
  );
