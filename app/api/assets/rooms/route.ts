import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/api/guard";
import { assetRouteError } from "@/lib/assets/api";
import { roomSummaries } from "@/lib/assets/db-assets";

// GET /api/assets/rooms — item totals per room (rooms themselves come from /api/rooms)
export async function GET() {
  const gate = await requireStaff("can_manage_assets");
  if (!gate.ok) return gate.response;
  try {
    return NextResponse.json({ success: true, data: await roomSummaries() });
  } catch (err) {
    return assetRouteError(err);
  }
}
