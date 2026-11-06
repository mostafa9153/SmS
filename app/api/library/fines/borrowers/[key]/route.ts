import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/api/guard";
import { denyWaive, libraryRouteError } from "@/lib/library/api";
import { parseBorrowerKey } from "@/lib/library/db-library";
import { getBorrowerLedger } from "@/lib/library/db-library-fines";

// GET /api/library/fines/borrowers/student:<id> | staff:<id> — fines, receipts and waivers of one borrower
export async function GET(_request: Request, { params }: { params: Promise<{ key: string }> }) {
  const gate = await requireStaff("can_manage_library");
  if (!gate.ok) return gate.response;
  try {
    const parsed = parseBorrowerKey(decodeURIComponent((await params).key));
    if (!parsed) return NextResponse.json({ success: false, error: "Borrower পাওয়া যায়নি।" }, { status: 404 });
    const ledger = await getBorrowerLedger(parsed.type, parsed.id);
    // The client shows the waive button only to those who may waive (S2); the waive route checks again.
    return NextResponse.json({ success: true, data: { ...ledger, canWaive: denyWaive(gate.auth) === null } });
  } catch (err) {
    return libraryRouteError(err);
  }
}
