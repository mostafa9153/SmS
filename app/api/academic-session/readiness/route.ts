import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api/guard";
import { dbGetSessionReadiness } from "@/lib/supabase/db-academic-session";
import { getAcademicYear } from "@/lib/academic/current-year";

// GET /api/academic-session/readiness
export async function GET(req: Request) {
  try {
    // Staff and Admin can view session readiness
    const gate = await requireRole(["Admin", "Staff"]);
    if (!gate.ok) return gate.response;

    const { searchParams } = new URL(req.url);
    const year = searchParams.get("year") ? parseInt(searchParams.get("year")!) : (await getAcademicYear());
    const examName = searchParams.get("examName") || "Annual Examination";
    const minPassPercentage = searchParams.get("minPassPercentage") ? parseInt(searchParams.get("minPassPercentage")!) : 30;
    const section = searchParams.get("section") || "secondary";

    let report;
    if (section === "higher_secondary") {
      const { dbGetSessionReadinessHS } = await import("@/lib/supabase/db-academic-session");
      report = await dbGetSessionReadinessHS(year, examName, minPassPercentage);
    } else {
      report = await dbGetSessionReadiness(year, examName, minPassPercentage);
    }
    
    return NextResponse.json({ success: true, report });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to fetch session readiness report" }, { status: 500 });
  }
}
