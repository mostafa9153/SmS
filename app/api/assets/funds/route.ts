import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/api/guard";
import { actorOf, assetRouteError, readJson } from "@/lib/assets/api";
import { createFund } from "@/lib/assets/db-asset-masters";
import { fundSchema } from "@/lib/assets/types";

// POST /api/assets/funds — add a fund (undo deletes it)
export async function POST(req: Request) {
  const gate = await requireStaff("can_manage_assets");
  if (!gate.ok) return gate.response;
  try {
    const body = fundSchema.parse(await readJson(req));
    const { row, undoId } = await createFund(body, actorOf(gate.auth));
    return NextResponse.json({ success: true, data: row, undoId });
  } catch (err) {
    return assetRouteError(err);
  }
}
