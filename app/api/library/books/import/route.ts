import { NextResponse } from "next/server";
import { z } from "zod";
import { requireStaff } from "@/lib/api/guard";
import { actorOf, libraryRouteError, readJson, requestId } from "@/lib/library/api";
import { planImport } from "@/lib/library/db-library";
import { importBooks } from "@/lib/library/db-library-actions";
import { IMPORT_MAX_ROWS } from "@/lib/library/import";

const text = z.string().max(300).nullable();
const entry = z.object({
  rows: z.array(z.number().int()).max(IMPORT_MAX_ROWS),
  book: z.object({
    title: z.string().trim().min(1).max(300),
    author: text,
    publisher: text,
    category: text,
    language: text,
    edition: text,
    isbn: text,
    legacy_no: text,
  }),
  copies: z.number().int().min(0).max(500),
  price: z.number().finite().min(0).max(99_999_999).nullable(),
});

const body = z.discriminatedUnion("mode", [
  z.object({ mode: z.literal("preview"), entries: z.array(entry).min(1).max(IMPORT_MAX_ROWS) }),
  z.object({ mode: z.literal("commit"), requestId, entries: z.array(entry).min(1).max(IMPORT_MAX_ROWS) }),
]);

// POST /api/library/books/import — K2. `preview` says per entry: new title, copies added to an
// existing one, or skipped (and why). `commit` rebuilds that plan and writes it in one
// transaction, journaled (recordUndo → library_undo removes everything it added).
export async function POST(request: Request) {
  const gate = await requireStaff("can_manage_library");
  if (!gate.ok) return gate.response;
  try {
    const input = body.parse(await readJson(request));
    if (input.mode === "preview") return NextResponse.json({ success: true, data: await planImport(input.entries) });
    const result = await importBooks({ entries: input.entries, requestId: input.requestId, actor: actorOf(gate.auth) });
    return NextResponse.json({ success: true, data: result.data, undoId: result.undoId });
  } catch (err) {
    return libraryRouteError(err);
  }
}
