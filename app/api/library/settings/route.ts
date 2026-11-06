import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/api/guard";
import { libraryRouteError } from "@/lib/library/api";
import { getLibrarySettings } from "@/lib/library/db-library";

// GET /api/library/settings — loan rules, holidays, code prefix, sticker layout (editing comes with the settings page)
export async function GET() {
  const gate = await requireStaff("can_manage_library");
  if (!gate.ok) return gate.response;
  try {
    return NextResponse.json({ success: true, data: await getLibrarySettings() });
  } catch (err) {
    return libraryRouteError(err);
  }
}
