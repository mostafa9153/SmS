import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/api/guard";
import { actorOf, denyWaive, libraryRouteError, readJson, requestId, uuid } from "@/lib/library/api";
import { waiveFine } from "@/lib/library/db-library-actions";

const body = z.object({
  requestId,
  fineId: uuid,
  mode: z.enum(["full", "half", "custom"]),
  custom: z.number().finite().optional(),
  reason: z.string().trim().min(1).max(300),
});

// POST /api/library/fines/waive — Admin, or a Teacher with can_waive_library_fines; Staff may not waive (plan S2).
// Journaled (recordUndo → library_undo); the response carries undoId.
export async function POST(request: Request) {
  const gate = await requireRole(["Admin", "Teacher"]);
  if (!gate.ok) return gate.response;
  const denied = denyWaive(gate.auth);
  if (denied) return denied;
  try {
    const input = body.parse(await readJson(request));
    const result = await waiveFine({ ...input, actor: actorOf(gate.auth) });
    return NextResponse.json({ success: true, data: result.data, undoId: result.undoId });
  } catch (err) {
    return libraryRouteError(err);
  }
}
