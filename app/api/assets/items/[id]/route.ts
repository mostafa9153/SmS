import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/api/guard";
import { actorOf, assetRouteError, readJson } from "@/lib/assets/api";
import { archiveItem, updateItem } from "@/lib/assets/db-asset-masters";
import { itemSchema } from "@/lib/assets/types";

// recordUndo runs inside updateItem / archiveItem (lib/assets/db-asset-masters.ts); responses carry undoId.
type Ctx = { params: Promise<{ id: string }> };

// PATCH /api/assets/items/[id] — edit a item
export async function PATCH(req: Request, { params }: Ctx) {
  const gate = await requireStaff("can_manage_assets");
  if (!gate.ok) return gate.response;
  try {
    const { id } = await params;
    const body = itemSchema.partial().parse(await readJson(req));
    const { row, undoId } = await updateItem(id, body, actorOf(gate.auth));
    return NextResponse.json({ success: true, data: row, undoId });
  } catch (err) {
    return assetRouteError(err);
  }
}

// DELETE /api/assets/items/[id] — remove (archive) a item
export async function DELETE(_req: Request, { params }: Ctx) {
  const gate = await requireStaff("can_manage_assets");
  if (!gate.ok) return gate.response;
  try {
    const { id } = await params;
    const { undoId } = await archiveItem(id, actorOf(gate.auth));
    return NextResponse.json({ success: true, data: { id }, undoId });
  } catch (err) {
    return assetRouteError(err);
  }
}
