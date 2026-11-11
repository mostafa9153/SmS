import { createAdminClient } from "@/lib/supabase/admin";
import { mustWrite } from "@/lib/supabase/write";
import { recordUndo, snapshotRows } from "@/lib/undo/journal";
import type { RoomInput, RoomRow } from "./types";

const TABLE = "rooms";

export class RoomError extends Error {
  constructor(message: string, readonly status: 400 | 404 | 409) {
    super(message);
  }
}

/** Active rooms in display order; `examOnly` = rooms EMS may seat students in. */
export async function listRooms(opts: { examOnly?: boolean } = {}): Promise<RoomRow[]> {
  let q = createAdminClient().from(TABLE).select("*").is("archived_at", null);
  if (opts.examOnly) q = q.eq("is_exam_room", true);
  const { data, error } = await q.order("sort_order").order("name");
  if (error) throw new Error(`Rooms: ${error.message}`);
  return (data ?? []) as RoomRow[];
}

/** The unique index rooms_active_name turns a racing duplicate into 23505. */
function nameConflict(error: { code?: string } | null, name: string): RoomError | null {
  return error?.code === "23505" ? new RoomError(`A room named "${name}" already exists.`, 409) : null;
}

async function activeNameTaken(name: string, exceptId?: string): Promise<boolean> {
  let q = createAdminClient().from(TABLE).select("id").is("archived_at", null).ilike("name", name.replace(/[%_\\]/g, "\\$&"));
  if (exceptId) q = q.neq("id", exceptId);
  const { data } = await q.limit(1);
  return (data?.length ?? 0) > 0;
}

/** New rooms go on top of the list. */
export async function createRoom(input: RoomInput, actorId: string) {
  if (await activeNameTaken(input.name)) throw new RoomError(`A room named "${input.name}" already exists.`, 409);
  const admin = createAdminClient();
  const { data: top } = await admin.from(TABLE).select("sort_order").order("sort_order").limit(1);
  const sort_order = top?.length ? (top[0].sort_order as number) - 1 : 0;
  const { data, error } = await admin.from(TABLE).insert({ ...input, sort_order }).select("*").single();
  if (error) throw nameConflict(error, input.name) ?? new Error(`Create room: ${error.message}`);
  const room = data as RoomRow;
  const undoId = await recordUndo({
    actorId,
    action: "room.create",
    label: `Added room ${room.name}`,
    entity: TABLE,
    entityId: room.id,
    steps: [{ table: TABLE, op: "delete", column: "id", values: [room.id] }],
  });
  return { room, undoId };
}

export async function updateRoom(id: string, patch: Partial<RoomInput>, actorId: string) {
  const admin = createAdminClient();
  const before = (await snapshotRows(admin, TABLE, "id", id)) as RoomRow[];
  if (!before.length || before[0].archived_at) throw new RoomError("Room not found.", 404);
  // Only a real rename is checked, so an old duplicate never blocks editing its layout.
  const renamed = patch.name !== undefined && patch.name.toLowerCase() !== before[0].name.trim().toLowerCase();
  if (renamed && (await activeNameTaken(patch.name!, id))) throw new RoomError(`A room named "${patch.name}" already exists.`, 409);
  const { data, error } = await admin.from(TABLE).update(patch).eq("id", id).select("*").single();
  if (error) throw nameConflict(error, patch.name ?? before[0].name) ?? new Error(`Update room: ${error.message}`);
  const room = data as RoomRow;
  const undoId = await recordUndo({
    actorId,
    action: "room.update",
    label: `Edited room ${room.name}`,
    entity: TABLE,
    entityId: id,
    steps: [{ table: TABLE, op: "upsert", rows: before }],
    guard: { table: TABLE, id, updated_at: room.updated_at },
  });
  return { room, undoId };
}

/** Rooms are archived, never hard-deleted: saved EMS allocations and (later) asset history point at them. */
export async function archiveRoom(id: string, actorId: string) {
  const admin = createAdminClient();
  const before = (await snapshotRows(admin, TABLE, "id", id)) as RoomRow[];
  if (!before.length || before[0].archived_at) throw new RoomError("Room not found.", 404);
  const { data } = await mustWrite(
    admin.from(TABLE).update({ archived_at: new Date().toISOString() }).eq("id", id).select("*").single(),
    "Remove room",
  );
  const room = data as RoomRow;
  const undoId = await recordUndo({
    actorId,
    action: "room.archive",
    label: `Removed room ${room.name}`,
    entity: TABLE,
    entityId: id,
    steps: [{ table: TABLE, op: "upsert", rows: before }],
    guard: { table: TABLE, id, updated_at: room.updated_at },
  });
  return { undoId };
}

/** Set the order of the given rooms in one statement; undo puts back the previous order of the same rooms only. */
export async function reorderRooms(ids: string[], actorId: string) {
  const admin = createAdminClient();
  const { data: rows, error } = await admin.from(TABLE).select("id, sort_order, name").in("id", ids).is("archived_at", null);
  if (error) throw new Error(`Rooms: ${error.message}`);
  const found = (rows ?? []) as Pick<RoomRow, "id" | "sort_order" | "name">[];
  if (found.length !== ids.length) throw new RoomError("Some rooms no longer exist. Reload and try again.", 409);
  const previous = [...found].sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name)).map((r) => r.id);
  await mustWrite(admin.rpc("asset_rooms_set_order", { p_ids: ids }), "Reorder rooms");
  const undoId = await recordUndo({
    actorId,
    action: "room.reorder",
    label: "Reordered rooms",
    entity: TABLE,
    steps: [{ op: "rpc", fn: "asset_rooms_set_order", args: { p_ids: previous } }],
  });
  return { undoId };
}
