import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/api/guard";
import { libraryRouteError } from "@/lib/library/api";
import { getReceipt } from "@/lib/library/db-library-fines";

// GET /api/library/fines/receipts/<no> — one receipt for printing
export async function GET(_request: Request, { params }: { params: Promise<{ no: string }> }) {
  const gate = await requireStaff("can_manage_library");
  if (!gate.ok) return gate.response;
  try {
    const no = Number((await params).no);
    if (!Number.isSafeInteger(no) || no <= 0) return NextResponse.json({ success: false, error: "রসিদ নম্বর ঠিক নেই।" }, { status: 400 });
    return NextResponse.json({ success: true, data: await getReceipt(no) });
  } catch (err) {
    return libraryRouteError(err);
  }
}
