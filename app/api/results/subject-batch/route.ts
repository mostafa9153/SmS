import { NextResponse } from "next/server";
import { dbSaveSubjectBatchMarks, SaveSubjectBatchParams } from "@/lib/supabase/db-results";
import { requireStaff } from "@/lib/api/guard";
import { denyStudentsOutsideClasses } from "@/lib/api/class-scope";
import { getAcademicYear } from "@/lib/academic/current-year";
import { recordResultsUndo, snapshotClassResults } from "@/lib/academic/results-undo";

// POST /api/results/subject-batch
export async function POST(req: Request) {
  const gate = await requireStaff("can_enter_results");
  if (!gate.ok) return gate.response;

  try {
    const { user } = gate.auth;

    const body = (await req.json()) as SaveSubjectBatchParams;
    const { academicYear, class: className, examName, subjectName, scores } = body;

    if (!className || !examName || !subjectName || !Array.isArray(scores)) {
      return NextResponse.json(
        { error: "Missing required fields (class, examName, subjectName, scores[])" },
        { status: 400 }
      );
    }
    const outside = await denyStudentsOutsideClasses(gate.auth, className, scores.map((s) => s.studentId));
    if (outside) return outside;

    const year = academicYear || (await getAcademicYear());
    const classBefore = await snapshotClassResults(year, className, examName);
    const result = await dbSaveSubjectBatchMarks(
      {
        academicYear: year,
        class: className,
        section: body.section,
        examName,
        subjectName,
        scores,
      },
      user.id
    );

    const undoId = await recordResultsUndo({
      actorId: user.id,
      action: "results.subject-batch",
      label: `Save ${subjectName} marks`,
      academicYear: year,
      className,
      examName,
      before: classBefore,
    });
    return NextResponse.json({ success: true, count: result.count, undoId });
  } catch (error: any) {
    console.error("Subject batch save API error:", error);
    return NextResponse.json({ error: error.message || "Failed to save subject batch marks" }, { status: 500 });
  }
}
