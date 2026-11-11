import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/api/guard";
import { assetRouteError } from "@/lib/assets/api";
import { listFunds, listItems } from "@/lib/assets/db-assets";

// GET /api/assets/catalog — active items and funds
export async function GET() {
  const gate = await requireStaff("can_manage_assets");
  if (!gate.ok) return gate.response;
  try {
    const [items, funds] = await Promise.all([listItems(), listFunds()]);
    return NextResponse.json({ success: true, data: { items, funds } });
  } catch (err) {
    return assetRouteError(err);
  }
}
