import { NextResponse } from "next/server";
import { z } from "zod";
import { requireStaff } from "@/lib/api/guard";
import { actorOf, bookFields, libraryRouteError, readJson, requestId, uuid } from "@/lib/library/api";
import { getBook } from "@/lib/library/db-library";
import { deleteBook, updateBook } from "@/lib/library/db-library-actions";

const patchBody = bookFields.extend({ status: z.enum(["active", "withdrawn"]) }).partial();

// GET /api/library/books/[id] — a title with its copies
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireStaff("can_manage_library");
  if (!gate.ok) return gate.response;
  try {
    const id = uuid.parse((await params).id);
    return NextResponse.json({ success: true, data: await getBook(id) });
  } catch (err) {
    return libraryRouteError(err);
  }
}

// PATCH /api/library/books/[id] — edit details or withdraw; recordUndo restores the before-image
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireStaff("can_manage_library");
  if (!gate.ok) return gate.response;
  try {
    const id = uuid.parse((await params).id);
    const changes = patchBody.parse(await readJson(request));
    const result = await updateBook({ bookId: id, changes, actor: actorOf(gate.auth) });
    return NextResponse.json({ success: true, data: result.data, undoId: result.undoId });
  } catch (err) {
    return libraryRouteError(err);
  }
}

// DELETE /api/library/books/[id] — only a title none of whose copies was ever lent or changed (K9);
// journaled (recordUndo → library_undo puts back the same ids and codes). Otherwise withdraw it.
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireStaff("can_manage_library");
  if (!gate.ok) return gate.response;
  try {
    const id = uuid.parse((await params).id);
    const body = z.object({ requestId }).parse(await readJson(request));
    const result = await deleteBook({ bookId: id, requestId: body.requestId, actor: actorOf(gate.auth) });
    return NextResponse.json({ success: true, data: result.data, undoId: result.undoId });
  } catch (err) {
    return libraryRouteError(err);
  }
}
