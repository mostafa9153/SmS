import { NextResponse } from "next/server";
import { z } from "zod";
import { requireStaff } from "@/lib/api/guard";
import { actorOf, amount, borrowerKeySchema, libraryRouteError, readJson, requestId, uuid } from "@/lib/library/api";
import {
  issueCopy,
  markDamaged,
  markFound,
  markLost,
  renewLoan,
  returnLoan,
  returnToRenew,
  setCopyWithdrawn,
} from "@/lib/library/db-library-actions";

const body = z.discriminatedUnion("action", [
  z.object({ action: z.literal("issue"), requestId, copyId: uuid, borrower: borrowerKeySchema }),
  z.object({ action: z.literal("return"), requestId, loanId: uuid }),
  z.object({ action: z.literal("renew"), requestId, loanId: uuid }),
  z.object({ action: z.literal("return_to_renew"), requestId, loanId: uuid }),
  z.object({ action: z.literal("lost"), requestId, copyId: uuid, replaced: z.boolean().optional() }),
  z.object({
    action: z.literal("found"),
    requestId,
    copyId: uuid,
    source: z.enum(["borrower", "library"]),
    keepLostFine: z.boolean().optional(),
  }),
  z.object({
    action: z.literal("damaged"),
    requestId,
    loanId: uuid,
    amount,
    withdraw: z.boolean(),
    note: z.string().max(300).optional(),
  }),
  z.object({ action: z.literal("withdraw"), requestId, copyId: uuid, reason: z.string().max(300).optional() }),
  z.object({ action: z.literal("restore"), requestId, copyId: uuid }),
]);

// POST /api/library/desk — issue, return, renew, return→renew, lost, found, damaged, withdraw/restore a copy.
// Each is journaled (recordUndo → library_undo); the response carries undoId.
export async function POST(request: Request) {
  const gate = await requireStaff("can_manage_library");
  if (!gate.ok) return gate.response;
  try {
    const input = body.parse(await readJson(request));
    const actor = actorOf(gate.auth);
    let result;
    switch (input.action) {
      case "issue":
        result = await issueCopy({ ...input, actor });
        break;
      case "return":
        result = await returnLoan({ ...input, actor });
        break;
      case "renew":
        result = await renewLoan({ ...input, actor });
        break;
      case "return_to_renew":
        result = await returnToRenew({ ...input, actor });
        break;
      case "lost":
        result = await markLost({ ...input, actor });
        break;
      case "found":
        result = await markFound({ ...input, actor });
        break;
      case "damaged":
        result = await markDamaged({ ...input, actor });
        break;
      case "withdraw":
      case "restore":
        result = await setCopyWithdrawn({ ...input, withdrawn: input.action === "withdraw", actor });
        break;
    }
    return NextResponse.json({ success: true, data: result.data, undoId: result.undoId });
  } catch (err) {
    return libraryRouteError(err);
  }
}
