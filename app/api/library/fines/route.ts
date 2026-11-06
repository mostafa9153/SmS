import { NextResponse } from "next/server";
import { z } from "zod";
import { requireStaff } from "@/lib/api/guard";
import { actorOf, amount, libraryRouteError, readJson, requestId, uuid } from "@/lib/library/api";
import { recordPayment, recordRefund, voidReceipt } from "@/lib/library/db-library-actions";
import { listDebtors } from "@/lib/library/db-library-fines";

// GET /api/library/fines?q= — borrowers with fines still outstanding
export async function GET(request: Request) {
  const gate = await requireStaff("can_manage_library");
  if (!gate.ok) return gate.response;
  try {
    const q = (new URL(request.url).searchParams.get("q") ?? "").slice(0, 100);
    return NextResponse.json({ success: true, data: await listDebtors(q) });
  } catch (err) {
    return libraryRouteError(err);
  }
}

const body = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("pay"),
    requestId,
    lines: z.array(z.object({ fineId: uuid, amount })).min(1).max(50),
  }),
  z.object({ action: z.literal("refund"), requestId, fineId: uuid, amount, note: z.string().max(300).optional() }),
  z.object({
    action: z.literal("void"),
    requestId,
    receiptNo: z.number().int().positive(),
    reason: z.string().trim().min(1).max(300),
  }),
]);

// POST /api/library/fines — collect (one receipt for several fines), refund, void a receipt.
// Pay and refund are journaled (recordUndo → library_undo) and return undoId.
// undo: n/a — void is itself the reverse of a receipt and is confirmed on the client first.
export async function POST(request: Request) {
  const gate = await requireStaff("can_manage_library");
  if (!gate.ok) return gate.response;
  try {
    const input = body.parse(await readJson(request));
    const actor = actorOf(gate.auth);
    const result =
      input.action === "pay"
        ? await recordPayment({ ...input, actor })
        : input.action === "refund"
          ? await recordRefund({ ...input, actor })
          : await voidReceipt({ ...input, actor });
    return NextResponse.json({ success: true, data: result.data, undoId: result.undoId });
  } catch (err) {
    return libraryRouteError(err);
  }
}
