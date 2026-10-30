import { NextResponse } from "next/server";
import { dbCalculateAndAssignRanks } from "@/lib/supabase/db-results";
import { denyOutsideClasses, requireStaff } from "@/lib/api/guard";
import { getAcademicYear } from "@/lib/academic/current-year";
import { recordResultsUndo, snapshotClassResults } from "@/lib/academic/results-undo";

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

    const year = academicYear || (await getAcademicYear());
    const exam = examName || "Annual Examination";
    const classBefore = await snapshotClassResults(year, className, exam);
    const result = await dbCalculateAndAssignRanks(year, className, exam);
    const undoId = await recordResultsUndo({
      actorId: user.id,
      action: "results.ranks",
      label: "Recalculate ranks",
      academicYear: year,
      className,
      examName: exam,
      before: classBefore,
    });

    return NextResponse.json({
      success: true,
      message: `Ranks recalculated for Class ${className}. ${result.classUpdated} records updated.`,
      ...result,
      undoId,
    });
  } catch (error: any) {
    console.error("Rank calculation error:", error);
    return NextResponse.json({ error: error.message || "Failed to calculate ranks" }, { status: 500 });
  }
}
