import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { AssetEvent, AssetFund, AssetItem, AssetUnit, RoomSummary, StockLine } from "./types";

const db = () => createAdminClient();

async function rows<T>(query: PromiseLike<{ data: unknown; error: { message: string } | null }>, what: string): Promise<T[]> {
  const { data, error } = await query;
  if (error) throw new Error(`${what}: ${error.message}`);
  return (data ?? []) as T[];
}

export const listItems = () =>
  rows<AssetItem>(db().from("asset_items").select("*").is("archived_at", null).order("sort_order").order("name"), "Items");

export const listFunds = () =>
  rows<AssetFund>(
    db().from("asset_funds").select("*").is("archived_at", null).order("financial_year", { ascending: false }).order("name"),
    "Funds",
  );

/** Item counts per room for the room list (counted + serial, active only). */
export async function roomSummaries(): Promise<RoomSummary[]> {
  const balance = await rows<{ room_id: string; condition: string; qty: number }>(
    db().from("asset_room_balance").select("room_id, condition, qty"),
    "Room balance",
  );
  const map = new Map<string, RoomSummary>();
  for (const b of balance) {
    const s = map.get(b.room_id) ?? { room_id: b.room_id, total: 0, needs_repair: 0, damaged: 0 };
    s.total += b.qty;
    if (b.condition === "repair") s.needs_repair += b.qty;
    if (b.condition === "damaged") s.damaged += b.qty;
    map.set(b.room_id, s);
  }
  return [...map.values()];
}

/** Everything in one room: counted lines (qty > 0) and active serial units. */
export async function roomStock(roomId: string): Promise<{ stock: StockLine[]; units: AssetUnit[] }> {
  const [stock, units] = await Promise.all([
    rows<StockLine>(db().from("asset_stock").select("item_id, condition, qty").eq("room_id", roomId).gt("qty", 0), "Stock"),
    rows<AssetUnit>(
      db().from("asset_units").select("*").eq("room_id", roomId).eq("status", "active").order("code"),
      "Units",
    ),
  ]);
  return { stock, units };
}

/** True when a room still holds any stock (counted or serial). */
export async function roomHasStock(roomId: string): Promise<boolean> {
  const { count, error } = await db()
    .from("asset_room_balance")
    .select("room_id", { count: "exact", head: true })
    .eq("room_id", roomId);
  if (error) {
    // Asset module not installed yet: nothing can be in the room.
    if (error.code === "42P01") return false;
    throw new Error(`Room stock: ${error.message}`);
  }
  return (count ?? 0) > 0;
}

/** Recent ledger rows, newest first (count children are folded into their batch). */
export async function recentEvents(opts: { roomId?: string; limit?: number } = {}): Promise<AssetEvent[]> {
  let q = db().from("asset_events").select("*").is("parent_id", null);
  // Room ids are 'room-123' or uuids; anything else would break out of the or() filter.
  if (opts.roomId && !/^[A-Za-z0-9_-]+$/.test(opts.roomId)) return [];
  if (opts.roomId) q = q.or(`from_room_id.eq.${opts.roomId},to_room_id.eq.${opts.roomId}`);
  return rows<AssetEvent>(q.order("seq", { ascending: false }).limit(Math.min(Math.max(Math.trunc(opts.limit ?? 50) || 50, 1), 200)), "History");
}
