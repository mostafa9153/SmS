import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/api/guard";
import { libraryRouteError } from "@/lib/library/api";
import { libraryToday } from "@/lib/library/dates";
import { listOpenLoans } from "@/lib/library/db-library-reports";

// GET /api/library/loans — every book still out with its borrower's class at issue and now (overdue and clearance views)
export async function GET() {
  const gate = await requireStaff("can_manage_library");
  if (!gate.ok) return gate.response;
  try {
    const today = libraryToday();
    return NextResponse.json({ success: true, data: { today, loans: await listOpenLoans(today) } });
  } catch (err) {
    return libraryRouteError(err);
  }
}
