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

    // Role check: Staff and Admin can view session readiness
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (!roleData || (roleData.role !== "Admin" && roleData.role !== "Staff")) {
      return NextResponse.json({ error: "Forbidden: Access denied" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const year = searchParams.get("year") ? parseInt(searchParams.get("year")!) : new Date().getFullYear();
    const examName = searchParams.get("examName") || "Annual Examination";
    const minPassPercentage = searchParams.get("minPassPercentage") ? parseInt(searchParams.get("minPassPercentage")!) : 30;

    const report = await dbGetSessionReadiness(year, examName, minPassPercentage);
    return NextResponse.json({ success: true, report });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to fetch session readiness report" }, { status: 500 });
  }
}
