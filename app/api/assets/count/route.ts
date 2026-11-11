import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/api/guard";
import { actorOf, assetRouteError, readJson } from "@/lib/assets/api";
import { countRoom } from "@/lib/assets/db-asset-actions";
import { countSchema } from "@/lib/assets/types";

// POST /api/assets/count — save a room count. recordUndo runs inside countRoom (undo = asset_undo RPC).
export async function POST(req: Request) {
  const gate = await requireStaff("can_manage_assets");
  if (!gate.ok) return gate.response;
  try {
    const body = countSchema.parse(await readJson(req));
    const { undoId, ...data } = await countRoom(body, actorOf(gate.auth));
    return NextResponse.json({ success: true, data, undoId });
  } catch (err) {
    return assetRouteError(err);
  }
}
