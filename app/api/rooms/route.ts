import { NextResponse } from "next/server";
import { requireRole, requireStaff } from "@/lib/api/guard";
import { actorId, canManageEms, roomRouteError } from "@/lib/rooms/api";
import { createRoom, listRooms } from "@/lib/rooms/db-rooms";
import { parseRoomInput } from "@/lib/rooms/types";

// GET /api/rooms?exam=1 — active rooms (exam rooms only with exam=1)
export async function GET(req: Request) {
  const gate = await requireRole();
  if (!gate.ok) return gate.response;
  try {
    const examOnly = new URL(req.url).searchParams.get("exam") === "1";
    return NextResponse.json({ success: true, data: await listRooms({ examOnly }) });
  } catch (err) {
    return roomRouteError(err);
  }
}

// POST /api/rooms — add a room
export async function POST(req: Request) {
  const gate = await requireStaff("can_manage_ems", "can_manage_assets");
  if (!gate.ok) return gate.response;
  try {
    const parsed = parseRoomInput(await req.json().catch(() => null), false);
    if ("error" in parsed) return NextResponse.json({ success: false, error: parsed.error }, { status: 400 });
    if (parsed.value.is_exam_room && !canManageEms(gate.auth)) {
      return NextResponse.json({ success: false, error: "Exam rooms are managed from EMS." }, { status: 403 });
    }
    const { room, undoId } = await createRoom(parsed.value as Parameters<typeof createRoom>[0], actorId(gate.auth));
    return NextResponse.json({ success: true, data: room, undoId });
  } catch (err) {
    return roomRouteError(err);
  }
}
