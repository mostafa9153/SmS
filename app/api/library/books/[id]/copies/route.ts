import { NextResponse } from "next/server";
import { z } from "zod";
import { requireStaff } from "@/lib/api/guard";
import { actorOf, libraryRouteError, readJson, requestId, uuid } from "@/lib/library/api";
import { addCopies } from "@/lib/library/db-library-actions";

const body = z.object({
  requestId,
  count: z.number().int().min(1).max(500),
  price: z.number().finite().min(0).max(99_999_999).nullable().default(null),
});

// POST /api/library/books/[id]/copies — more copies of a title; numbers are never reused (journaled: recordUndo → library_undo)
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireStaff("can_manage_library");
  if (!gate.ok) return gate.response;
  try {
    const bookId = uuid.parse((await params).id);
    const input = body.parse(await readJson(request));
    const result = await addCopies({ bookId, ...input, actor: actorOf(gate.auth) });
    return NextResponse.json({ success: true, data: result.data, undoId: result.undoId }, { status: 201 });
  } catch (err) {
    return libraryRouteError(err);
  }
}
