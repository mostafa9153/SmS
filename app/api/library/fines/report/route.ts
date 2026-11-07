import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/api/guard";
import { libraryRouteError } from "@/lib/library/api";
import { libraryToday } from "@/lib/library/dates";
import { getDayReport } from "@/lib/library/db-library-fines";

// GET /api/library/fines/report?day=YYYY-MM-DD — collected, refunded, voided and waived that day, kept apart (R13)
export async function GET(request: Request) {
  const gate = await requireStaff("can_manage_library");
  if (!gate.ok) return gate.response;
  try {
    const day = new URL(request.url).searchParams.get("day") || libraryToday();
    return NextResponse.json({ success: true, data: await getDayReport(day) });
  } catch (err) {
    return libraryRouteError(err);
  }
}
