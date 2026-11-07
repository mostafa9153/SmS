import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/api/guard";
import { libraryRouteError } from "@/lib/library/api";
import { libraryToday } from "@/lib/library/dates";
import { deskActivityToday } from "@/lib/library/desk-activity";

// GET /api/library/desk/activity → every librarian's desk actions today (rebuilt after a refresh)
export async function GET() {
  const gate = await requireStaff("can_manage_library");
  if (!gate.ok) return gate.response;
  try {
    return NextResponse.json({ success: true, data: await deskActivityToday(gate.auth.user!.id, libraryToday(), gate.auth.role === "Admin") });
  } catch (err) {
    return libraryRouteError(err);
  }
}
