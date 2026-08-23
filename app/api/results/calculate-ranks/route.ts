import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { dbCalculateAndAssignRanks } from "@/lib/supabase/db-results";

// POST /api/results/calculate-ranks - Recalculate ranks for a class
export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { academicYear, class: className, examName } = body;

    if (!className) {
      return NextResponse.json({ error: "Missing required 'class' parameter" }, { status: 400 });
    }

    const result = await dbCalculateAndAssignRanks(
      academicYear || new Date().getFullYear(),
      className,
      examName || "Annual Examination"
    );

    return NextResponse.json({
      success: true,
      message: `Ranks recalculated for Class ${className}. ${result.classUpdated} records updated.`,
      ...result,
    });
  } catch (error: any) {
    console.error("Rank calculation error:", error);
    return NextResponse.json({ error: error.message || "Failed to calculate ranks" }, { status: 500 });
  }
}
