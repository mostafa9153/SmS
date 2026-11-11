import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/api/guard";
import { assetRouteError } from "@/lib/assets/api";
import { recentEvents } from "@/lib/assets/db-assets";

// GET /api/assets/history?room=<id>&limit=50 — newest changes first
export async function GET(req: Request) {
  const gate = await requireStaff("can_manage_assets");
  if (!gate.ok) return gate.response;
  try {
    const sp = new URL(req.url).searchParams;
    const data = await recentEvents({ roomId: sp.get("room") ?? undefined, limit: Number(sp.get("limit")) || 50 });
    return NextResponse.json({ success: true, data });
  } catch (err) {
    return assetRouteError(err);
  }
}
