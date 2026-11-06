import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api/guard";
import { libraryRouteError } from "@/lib/library/api";
import { getMyBooks } from "@/lib/library/db-library-my";

// GET /api/library/my — the signed-in person's own books, balance and unpaid fines.
// Any signed-in role. The borrower is always the session's staff id (S4); nothing in the request picks a person.
export async function GET() {
  const gate = await requireRole();
  if (!gate.ok) return gate.response;
  try {
    return NextResponse.json({ success: true, data: await getMyBooks(gate.auth.staffId ?? null) });
  } catch (err) {
    return libraryRouteError(err);
  }
}
