import "server-only";
import type { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { recordUndo, snapshotRows } from "@/lib/undo/journal";
import { AssetError } from "./errors";
import type { AssetFund, AssetItem, fundSchema, itemSchema } from "./types";

type ItemInput = z.infer<typeof itemSchema>;
type FundInput = z.infer<typeof fundSchema>;
type Master = "asset_items" | "asset_funds";

const db = () => createAdminClient();

/** A unique-index hit (23505) is a name clash; anything else is a real failure. */
function writeError(error: { code?: string; message: string }, what: string): Error {
  return error.code === "23505" ? new AssetError("name_taken") : new Error(`${what}: ${error.message}`);
}

async function create<T extends { id: string }>(table: Master, row: Record<string, unknown>, actorId: string, label: string) {
  const { data, error } = await db().from(table).insert(row).select("*").single();
  if (error) throw writeError(error, label);
  const created = data as T;
  const undoId = await recordUndo({
    actorId,
    action: `${table}.create`,
    label,
    entity: table,
    entityId: created.id,
    steps: [{ table, op: "delete", column: "id", values: [created.id] }],
  });
  return { row: created, undoId };
}

async function update<T extends { id: string; updated_at: string }>(
  table: Master,
  id: string,
  patch: Record<string, unknown>,
  actorId: string,
  label: string,
) {
  const before = await snapshotRows(db(), table, "id", id);
  if (!before.length || before[0].archived_at) throw new AssetError(table === "asset_items" ? "item_not_found" : "fund_not_found");
  const { data, error } = await db().from(table).update(patch).eq("id", id).select("*").single();
  if (error) throw writeError(error, label);
  const row = data as T;
  const undoId = await recordUndo({
    actorId,
    action: `${table}.update`,
    label,
    entity: table,
    entityId: id,
    steps: [{ table, op: "upsert", rows: before }],
    guard: { table, id, updated_at: row.updated_at },
  });
  return { row, undoId };
}

// ---------- items ----------

/** Has this item ever been used (any ledger event)? Then its tracking type is fixed. */
async function itemHasHistory(id: string): Promise<boolean> {
  const { count } = await db().from("asset_events").select("id", { count: "exact", head: true }).eq("item_id", id);
  return (count ?? 0) > 0;
}

async function itemInStock(id: string): Promise<boolean> {
  const { count } = await db().from("asset_room_balance").select("item_id", { count: "exact", head: true }).eq("item_id", id);
  return (count ?? 0) > 0;
}

export async function createItem(input: ItemInput, actorId: string) {
  const { data: last } = await db().from("asset_items").select("sort_order").order("sort_order", { ascending: false }).limit(1);
  const sort_order = (last?.[0]?.sort_order ?? 0) + 1;
  return create<AssetItem>("asset_items", { ...input, sort_order }, actorId, `Added item ${input.name}`);
}

export async function updateItem(id: string, input: Partial<ItemInput>, actorId: string) {
  if (input.tracking) {
    const { data } = await db().from("asset_items").select("tracking").eq("id", id).maybeSingle();
    if (data && data.tracking !== input.tracking && (await itemHasHistory(id))) throw new AssetError("in_use");
  }
  return update<AssetItem>("asset_items", id, input, actorId, `Edited item ${input.name ?? ""}`.trim());
}

/** Hidden from lists; refused while any room still holds it. History keeps its name. */
export async function archiveItem(id: string, actorId: string) {
  if (await itemInStock(id)) throw new AssetError("in_use");
  return update<AssetItem>("asset_items", id, { archived_at: new Date().toISOString() }, actorId, "Removed item");
}

// ---------- funds ----------

export const createFund = (input: FundInput, actorId: string) =>
  create<AssetFund>("asset_funds", { name: input.name, financial_year: input.financial_year || null }, actorId, `Added fund ${input.name}`);

export const updateFund = (id: string, input: Partial<FundInput>, actorId: string) =>
  update<AssetFund>("asset_funds", id, "financial_year" in input ? { ...input, financial_year: input.financial_year || null } : input, actorId, `Edited fund ${input.name ?? ""}`.trim());

/** Hidden from pickers; past purchases keep the fund name. */
export const archiveFund = (id: string, actorId: string) =>
  update<AssetFund>("asset_funds", id, { archived_at: new Date().toISOString() }, actorId, "Removed fund");
