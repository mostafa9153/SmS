import { NextResponse } from "next/server";
import { requireRole, teacherPermissions } from "@/lib/api/guard";
import { libraryRouteError } from "@/lib/library/api";
import { getLibrarySettings } from "@/lib/library/db-library";
import { libraryDuesForStudents, openBooksByClass } from "@/lib/library/db-library-tc";
import { hasDues } from "@/lib/library/tc";

const UUID = /^[0-9a-f-]{36}$/i;

// GET /api/library/dues?studentIds=a,b  → students who still owe books or money (TC page)
// GET /api/library/dues?byClass=1       → books out per present class (promotion warning)
export async function GET(req: Request) {
  const gate = await requireRole(["Admin", "Staff", "Teacher"]);
  if (!gate.ok) return gate.response;
  try {
    const url = new URL(req.url);
    const settings = await getLibrarySettings();
    if (url.searchParams.get("byClass")) {
      // Teachers see only their own classes (empty allowed_classes = all).
      const allowed = gate.auth.role === "Teacher" ? teacherPermissions(gate.auth).allowed_classes : null;
      const classes = (await openBooksByClass()).filter((c) => !allowed?.length || allowed.includes(c.className));
      return NextResponse.json({ success: true, data: { mode: settings.tcMode, classes } });
    }
    // Per-student dues name students, so Teachers (class-scoped) get only the class totals.
    if (gate.auth.role === "Teacher") {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }
    const ids = (url.searchParams.get("studentIds") ?? "").split(",").filter((id) => UUID.test(id));
    if (!ids.length || ids.length > 200) {
      return NextResponse.json({ success: false, error: "1 to 200 studentIds required" }, { status: 400 });
    }
    const dues = settings.tcMode === "off" ? [] : (await libraryDuesForStudents(ids, settings)).filter(hasDues);
    return NextResponse.json({ success: true, data: { mode: settings.tcMode, dues } });
  } catch (err) {
    return libraryRouteError(err);
  }
}
