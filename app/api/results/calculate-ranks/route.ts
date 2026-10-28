import { NextResponse } from "next/server";
import { dbCalculateAndAssignRanks } from "@/lib/supabase/db-results";
import { denyOutsideClasses, requireStaff } from "@/lib/api/guard";

// POST /api/results/calculate-ranks - Recalculate ranks for a class
export async function POST(req: Request) {
  const gate = await requireStaff("can_enter_results");
  if (!gate.ok) return gate.response;

  try {
    const { user } = gate.auth;

    const body = await req.json();
    const { academicYear, class: className, examName } = body;

    if (!className) {
      return NextResponse.json({ error: "Missing required 'class' parameter" }, { status: 400 });
    }
    const outside = denyOutsideClasses(gate.auth, className);
    if (outside) return outside;

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
