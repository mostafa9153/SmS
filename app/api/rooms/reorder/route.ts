import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/api/guard";
import { actorId, roomRouteError } from "@/lib/rooms/api";
import { reorderRooms } from "@/lib/rooms/db-rooms";

// POST /api/rooms/reorder — { ids: string[] } in the new order
export async function POST(req: Request) {
  const gate = await requireStaff("can_manage_ems");
  if (!gate.ok) return gate.response;
  try {
    const body = (await req.json().catch(() => null)) as { ids?: unknown } | null;
    const ids = Array.isArray(body?.ids) ? body.ids.filter((x): x is string => typeof x === "string") : [];
    if (!ids.length || new Set(ids).size !== ids.length || ids.length > 500) {
      return NextResponse.json({ success: false, error: "Invalid room order." }, { status: 400 });
    }
    const { undoId } = await reorderRooms(ids, actorId(gate.auth));
    return NextResponse.json({ success: true, data: { ids }, undoId });
  } catch (err) {
    return roomRouteError(err);
  }
}
