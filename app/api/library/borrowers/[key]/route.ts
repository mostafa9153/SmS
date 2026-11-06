import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/api/guard";
import { libraryRouteError } from "@/lib/library/api";
import { getBorrowerSummary, parseBorrowerKey } from "@/lib/library/db-library";

// GET /api/library/borrowers/student:<id> | staff:<id> — the desk panel: profile, books in hand, fines, balance
export async function GET(_request: Request, { params }: { params: Promise<{ key: string }> }) {
  const gate = await requireStaff("can_manage_library");
  if (!gate.ok) return gate.response;
  try {
    const parsed = parseBorrowerKey(decodeURIComponent((await params).key));
    if (!parsed) return NextResponse.json({ success: false, error: "Borrower পাওয়া যায়নি।" }, { status: 404 });
    return NextResponse.json({ success: true, data: await getBorrowerSummary(parsed.type, parsed.id) });
  } catch (err) {
    return libraryRouteError(err);
  }
}
