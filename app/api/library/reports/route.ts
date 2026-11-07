import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/api/guard";
import { libraryRouteError } from "@/lib/library/api";
import { addDays, libraryToday } from "@/lib/library/dates";
import { getReports } from "@/lib/library/db-library-reports";

// GET /api/library/reports?from=&to= — most-read titles and readers, never-lent titles, waivers by month (default: last 90 days)
export async function GET(request: Request) {
  const gate = await requireStaff("can_manage_library");
  if (!gate.ok) return gate.response;
  try {
    const p = new URL(request.url).searchParams;
    const to = p.get("to") || libraryToday();
    const from = p.get("from") || addDays(to, -90);
    return NextResponse.json({ success: true, data: await getReports(from, to) });
  } catch (err) {
    return libraryRouteError(err);
  }
}
