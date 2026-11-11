import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/api/guard";
import { actorOf, assetRouteError, readJson } from "@/lib/assets/api";
import { createItem } from "@/lib/assets/db-asset-masters";
import { itemSchema } from "@/lib/assets/types";

// POST /api/assets/items — add a item (undo deletes it)
export async function POST(req: Request) {
  const gate = await requireStaff("can_manage_assets");
  if (!gate.ok) return gate.response;
  try {
    const body = itemSchema.parse(await readJson(req));
    const { row, undoId } = await createItem(body, actorOf(gate.auth));
    return NextResponse.json({ success: true, data: row, undoId });
  } catch (err) {
    return assetRouteError(err);
  }
}
