import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/api/guard";
import { actorOf, assetRouteError, readJson } from "@/lib/assets/api";
import { addAsset } from "@/lib/assets/db-asset-actions";
import { addSchema } from "@/lib/assets/types";

// POST /api/assets/add — add opening stock or a purchase. recordUndo runs inside addAsset (undo = asset_undo RPC).
export async function POST(req: Request) {
  const gate = await requireStaff("can_manage_assets");
  if (!gate.ok) return gate.response;
  try {
    const body = addSchema.parse(await readJson(req));
    const { undoId, ...data } = await addAsset(body, actorOf(gate.auth));
    return NextResponse.json({ success: true, data, undoId });
  } catch (err) {
    return assetRouteError(err);
  }
}
