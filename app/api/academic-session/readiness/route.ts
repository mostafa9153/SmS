import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { dbGetSessionReadiness } from "@/lib/supabase/db-academic-session";

// GET /api/academic-session/readiness
export async function GET(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const year = searchParams.get("year") ? parseInt(searchParams.get("year")!) : new Date().getFullYear();
    const examName = searchParams.get("examName") || "Annual Examination";

    const report = await dbGetSessionReadiness(year, examName);
    return NextResponse.json({ success: true, report });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to fetch session readiness report" }, { status: 500 });
  }
}
