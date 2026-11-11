import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/api/guard";
import { actorId, canManageEms, roomRouteError } from "@/lib/rooms/api";
import { archiveRoom, updateRoom } from "@/lib/rooms/db-rooms";
import { parseRoomInput } from "@/lib/rooms/types";

// recordUndo runs inside updateRoom / archiveRoom (lib/rooms/db-rooms.ts); responses carry undoId.
type Ctx = { params: Promise<{ id: string }> };

// PATCH /api/rooms/[id] — edit a room
export async function PATCH(req: Request, { params }: Ctx) {
  const gate = await requireStaff("can_manage_ems", "can_manage_assets");
  if (!gate.ok) return gate.response;
  try {
    const { id } = await params;
    const parsed = parseRoomInput(await req.json().catch(() => null), true);
    if ("error" in parsed) return NextResponse.json({ success: false, error: parsed.error }, { status: 400 });
    const { room, undoId } = await updateRoom(id, parsed.value, actorId(gate.auth), { ems: canManageEms(gate.auth) });
    return NextResponse.json({ success: true, data: room, undoId });
  } catch (err) {
    return roomRouteError(err);
  }
}

// DELETE /api/rooms/[id] — remove (archive) a room
export async function DELETE(_req: Request, { params }: Ctx) {
  const gate = await requireStaff("can_manage_ems", "can_manage_assets");
  if (!gate.ok) return gate.response;
  try {
    const { id } = await params;
    const { undoId } = await archiveRoom(id, actorId(gate.auth), { ems: canManageEms(gate.auth) });
    return NextResponse.json({ success: true, data: { id }, undoId });
  } catch (err) {
    return roomRouteError(err);
  }
}
