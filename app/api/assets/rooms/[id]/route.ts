import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/api/guard";
import { assetRouteError } from "@/lib/assets/api";
import { roomStock } from "@/lib/assets/db-assets";

type Ctx = { params: Promise<{ id: string }> };

// GET /api/assets/rooms/[id] — counted stock and serial units in one room
export async function GET(_req: Request, { params }: Ctx) {
  const gate = await requireStaff("can_manage_assets");
  if (!gate.ok) return gate.response;
  try {
    const { id } = await params;
    return NextResponse.json({ success: true, data: await roomStock(id) });
  } catch (err) {
    return assetRouteError(err);
  }
}
