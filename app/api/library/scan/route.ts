import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/api/guard";
import { libraryRouteError } from "@/lib/library/api";
import { resolveLibraryScan } from "@/lib/library/db-library";

// GET /api/library/scan?code=… — what a scanned or typed code is (copy, borrower, several, unknown)
export async function GET(request: Request) {
  const gate = await requireStaff("can_manage_library");
  if (!gate.ok) return gate.response;
  try {
    const code = new URL(request.url).searchParams.get("code") ?? "";
    if (code.length > 200) return NextResponse.json({ success: false, error: "Code too long." }, { status: 400 });
    return NextResponse.json({ success: true, data: await resolveLibraryScan(code) });
  } catch (err) {
    return libraryRouteError(err);
  }
}
