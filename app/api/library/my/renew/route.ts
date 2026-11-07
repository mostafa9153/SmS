import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/api/guard";
import { actorOf, libraryRouteError, readJson, requestId, uuid } from "@/lib/library/api";
import { getLoan } from "@/lib/library/db-library";
import { renewLoan } from "@/lib/library/db-library-actions";
import { LibraryError } from "@/lib/library/errors";
import { ownsLoan } from "@/lib/library/my-books";

const body = z.object({ requestId, loanId: uuid });

// POST /api/library/my/renew — renew one of the signed-in person's own books.
// Another person's loan answers "not found", the same as a loan that does not exist.
// Journaled (renewLoan → recordUndo); the response carries undoId.
export async function POST(request: Request) {
  const gate = await requireRole();
  if (!gate.ok) return gate.response;
  try {
    const input = body.parse(await readJson(request));
    const loan = await getLoan(input.loanId);
    if (!ownsLoan(loan, gate.auth.staffId ?? null)) throw new LibraryError("loan_not_found");
    const result = await renewLoan({ ...input, actor: actorOf(gate.auth) });
    return NextResponse.json({ success: true, data: result.data, undoId: result.undoId });
  } catch (err) {
    return libraryRouteError(err);
  }
}
