import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/api/guard";
import { actorOf, assetRouteError, readJson } from "@/lib/assets/api";
import { archiveFund, updateFund } from "@/lib/assets/db-asset-masters";
import { fundSchema } from "@/lib/assets/types";

// recordUndo runs inside updateFund / archiveFund (lib/assets/db-asset-masters.ts); responses carry undoId.
type Ctx = { params: Promise<{ id: string }> };

// PATCH /api/assets/funds/[id] — edit a fund
export async function PATCH(req: Request, { params }: Ctx) {
  const gate = await requireStaff("can_manage_assets");
  if (!gate.ok) return gate.response;
  try {
    const { id } = await params;
    const body = fundSchema.partial().parse(await readJson(req));
    const { row, undoId } = await updateFund(id, body, actorOf(gate.auth));
    return NextResponse.json({ success: true, data: row, undoId });
  } catch (err) {
    return assetRouteError(err);
  }
}

// DELETE /api/assets/funds/[id] — remove (archive) a fund
export async function DELETE(_req: Request, { params }: Ctx) {
  const gate = await requireStaff("can_manage_assets");
  if (!gate.ok) return gate.response;
  try {
    const { id } = await params;
    const { undoId } = await archiveFund(id, actorOf(gate.auth));
    return NextResponse.json({ success: true, data: { id }, undoId });
  } catch (err) {
    return assetRouteError(err);
  }
}
