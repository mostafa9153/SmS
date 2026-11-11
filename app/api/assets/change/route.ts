import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/api/guard";
import { actorOf, assetRouteError, readJson } from "@/lib/assets/api";
import { changeAsset } from "@/lib/assets/db-asset-actions";
import { changeSchema } from "@/lib/assets/types";

// POST /api/assets/change — move, change condition or write off. recordUndo runs inside changeAsset (undo = asset_undo RPC).
export async function POST(req: Request) {
  const gate = await requireStaff("can_manage_assets");
  if (!gate.ok) return gate.response;
  try {
    const body = changeSchema.parse(await readJson(req));
    const { undoId, ...data } = await changeAsset(body, actorOf(gate.auth));
    return NextResponse.json({ success: true, data, undoId });
  } catch (err) {
    return assetRouteError(err);
  }
}
