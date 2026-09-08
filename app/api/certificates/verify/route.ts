import { NextResponse } from "next/server";
import { dbVerifyCertificate } from "@/lib/supabase/db-certificates";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const term = searchParams.get("number") || searchParams.get("id") || searchParams.get("q");

    if (!term || !term.trim()) {
      return NextResponse.json(
        { valid: false, error: "Missing certificate number or student ID" },
        { status: 400 }
      );
    }

    const result = await dbVerifyCertificate(term.trim());

    return NextResponse.json(result);
  } catch (err: any) {
    console.error("Error in GET /api/certificates/verify:", err);
    return NextResponse.json(
      { valid: false, error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
