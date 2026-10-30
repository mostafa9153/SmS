import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api/guard";
import { performUndo } from "@/lib/undo/journal";

// POST /api/undo/[id] — reverse one journaled action (actor or Admin, once, before expiry)
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireRole();
  if (!gate.ok) return gate.response;

  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ success: false, error: "Nothing to undo." }, { status: 404 });

  const result = await performUndo(id, gate.auth);
  return result.ok
    ? NextResponse.json({ success: true, data: { label: result.label } })
    : NextResponse.json({ success: false, error: result.error }, { status: result.status });
}
