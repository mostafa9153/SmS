import { NextResponse } from "next/server";
import { z } from "zod";
import { requireStaff } from "@/lib/api/guard";
import { actorOf, bookFields, libraryRouteError, readJson, requestId } from "@/lib/library/api";
import { listBooks } from "@/lib/library/db-library";
import { createBook } from "@/lib/library/db-library-actions";

const createBody = z.object({
  requestId,
  book: bookFields.required({ title: true }),
  copies: z.number().int().min(0).max(500).default(1),
  price: z.number().finite().min(0).max(99_999_999).nullable().default(null),
});

// GET /api/library/books?q=&limit=&offset= — catalog with stock counts
export async function GET(request: Request) {
  const gate = await requireStaff("can_manage_library");
  if (!gate.ok) return gate.response;
  try {
    const p = new URL(request.url).searchParams;
    const num = (k: string) => (p.get(k) ? Number(p.get(k)) || undefined : undefined);
    const data = await listBooks({ q: p.get("q") ?? undefined, limit: num("limit"), offset: num("offset") });
    return NextResponse.json({ success: true, data });
  } catch (err) {
    return libraryRouteError(err);
  }
}

// POST /api/library/books — a new title with its first copies (journaled: recordUndo removes both)
export async function POST(request: Request) {
  const gate = await requireStaff("can_manage_library");
  if (!gate.ok) return gate.response;
  try {
    const input = createBody.parse(await readJson(request));
    const result = await createBook({ ...input, actor: actorOf(gate.auth) });
    return NextResponse.json({ success: true, data: result.data, undoId: result.undoId }, { status: 201 });
  } catch (err) {
    return libraryRouteError(err);
  }
}
