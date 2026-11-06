import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/api/guard";
import { libraryRouteError } from "@/lib/library/api";
import { getCatalogStats } from "@/lib/library/db-library";

// GET /api/library/stats — titles, copies, on loan, overdue, lost, stickers not yet printed
export async function GET() {
  const gate = await requireStaff("can_manage_library");
  if (!gate.ok) return gate.response;
  try {
    return NextResponse.json({ success: true, data: await getCatalogStats() });
  } catch (err) {
    return libraryRouteError(err);
  }
}
