import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/api/guard";
import { libraryRouteError } from "@/lib/library/api";
import { scannerTestLookup } from "@/lib/library/db-library";

// GET /api/library/scanner-test?field=school_id|pen&code=… — Settings "Scanner test": the cleaned code and the students it matches
export async function GET(request: Request) {
  const gate = await requireStaff("can_manage_library");
  if (!gate.ok) return gate.response;
  try {
    const p = new URL(request.url).searchParams;
    const field = p.get("field");
    const code = p.get("code") ?? "";
    if ((field !== "school_id" && field !== "pen") || code.length > 200) {
      return NextResponse.json({ success: false, error: "অনুরোধ ঠিক নেই।" }, { status: 400 });
    }
    return NextResponse.json({ success: true, data: await scannerTestLookup(field, code) });
  } catch (err) {
    return libraryRouteError(err);
  }
}
