import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/api/guard";
import { libraryRouteError } from "@/lib/library/api";
import { findDuplicateBooks } from "@/lib/library/db-library";

// GET /api/library/books/duplicates?title=&author= — titles a new entry would duplicate (K1)
export async function GET(request: Request) {
  const gate = await requireStaff("can_manage_library");
  if (!gate.ok) return gate.response;
  try {
    const p = new URL(request.url).searchParams;
    const title = (p.get("title") ?? "").slice(0, 300);
    const author = (p.get("author") ?? "").slice(0, 300);
    return NextResponse.json({ success: true, data: await findDuplicateBooks(title, author || null) });
  } catch (err) {
    return libraryRouteError(err);
  }
}
