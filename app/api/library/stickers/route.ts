import { NextResponse } from "next/server";
import { z } from "zod";
import { requireStaff } from "@/lib/api/guard";
import { actorOf, libraryRouteError, readJson, requestId, uuid } from "@/lib/library/api";
import { STICKER_RUN_MAX, listStickerCopies } from "@/lib/library/db-library";
import { markStickers } from "@/lib/library/db-library-actions";

// GET /api/library/stickers?copies=a,b | ?book=<id>[&unprinted=1] | (none: every unprinted copy on the shelf)
export async function GET(request: Request) {
  const gate = await requireStaff("can_manage_library");
  if (!gate.ok) return gate.response;
  try {
    const p = new URL(request.url).searchParams;
    const copyIds = (p.get("copies") ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const ids = z.array(uuid).max(STICKER_RUN_MAX).parse(copyIds);
    const bookId = p.get("book") ? uuid.parse(p.get("book")) : undefined;
    const data = await listStickerCopies({ copyIds: ids, bookId, unprinted: p.get("unprinted") === "1" });
    return NextResponse.json({ success: true, data });
  } catch (err) {
    return libraryRouteError(err);
  }
}

const body = z.object({ requestId, copyIds: z.array(uuid).min(1).max(2000), printed: z.boolean() });

// POST /api/library/stickers — mark printed (after the librarian confirms the sheet) or back to pending.
// Journaled (recordUndo → library_undo); the response carries undoId.
export async function POST(request: Request) {
  const gate = await requireStaff("can_manage_library");
  if (!gate.ok) return gate.response;
  try {
    const input = body.parse(await readJson(request));
    const result = await markStickers({ ...input, actor: actorOf(gate.auth) });
    return NextResponse.json({ success: true, data: result.data, undoId: result.undoId });
  } catch (err) {
    return libraryRouteError(err);
  }
}
