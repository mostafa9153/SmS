import { NextResponse } from "next/server";
import { requireRole, requireStaff } from "@/lib/api/guard";
import { actorOf, libraryRouteError, readJson } from "@/lib/library/api";
import { getLibrarySettings } from "@/lib/library/db-library";
import { saveLibrarySettings } from "@/lib/library/db-library-actions";
import { validateSettingsPatch } from "@/lib/library/settings";

// GET /api/library/settings — loan rules, holidays, code prefix, sticker layout
export async function GET() {
  const gate = await requireStaff("can_manage_library");
  if (!gate.ok) return gate.response;
  try {
    return NextResponse.json({ success: true, data: await getLibrarySettings() });
  } catch (err) {
    return libraryRouteError(err);
  }
}

// PUT /api/library/settings — Admin only. Body { changes }: just the keys that changed, merged onto the current rules.
// Invalid fields come back as { errors: { path: message } }.
// Journaled (recordUndo restores the previous rules); the response carries undoId.
export async function PUT(request: Request) {
  const gate = await requireRole(["Admin"]);
  if (!gate.ok) return gate.response;
  try {
    const body = (await readJson(request)) as { changes?: unknown } | null;
    const check = validateSettingsPatch(await getLibrarySettings(), body?.changes);
    if (!check.ok) {
      return NextResponse.json({ success: false, error: "Settings ঠিক নেই।", code: "invalid_settings", errors: check.errors }, { status: 400 });
    }
    const result = await saveLibrarySettings({ settings: check.settings, actor: actorOf(gate.auth) });
    return NextResponse.json({ success: true, data: result.data, undoId: result.undoId });
  } catch (err) {
    return libraryRouteError(err);
  }
}
