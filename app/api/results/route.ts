import { NextResponse } from "next/server";
import { dbGetResultsByClass, dbSaveOrUpdateResult } from "@/lib/supabase/db-results";
import type { Semester } from "@/lib/types";
import { denyOutsideClasses, requireRole, requireStaff } from "@/lib/api/guard";
import { denyStudentsOutsideClasses } from "@/lib/api/class-scope";
import { getAcademicYear } from "@/lib/academic/current-year";
import { recordResultsUndo, snapshotClassResults } from "@/lib/academic/results-undo";

// GET /api/results?year=2026&class=V&section=A&exam=Annual%20Examination&semester=Sem%201
export async function GET(req: Request) {
  const gate = await requireRole();
  if (!gate.ok) return gate.response;

  try {
    const { searchParams } = new URL(req.url);
    const academicYear = parseInt(searchParams.get("year") || String((await getAcademicYear())), 10);
    const className = searchParams.get("class") || "V";
    const section = searchParams.get("section") || undefined;
    const examName = searchParams.get("exam") || "Annual Examination";
    const semester = (searchParams.get("semester") as Semester) || undefined;
    const outside = denyOutsideClasses(gate.auth, className);
    if (outside) return outside;

    const summary = await dbGetResultsByClass(academicYear, className, section, examName, semester);
    return NextResponse.json(summary);
  } catch (error: any) {
    console.error("Results API GET error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch class results" }, { status: 500 });
  }
}

// POST /api/results - Save or update student marks
export async function POST(req: Request) {
  const gate = await requireStaff("can_enter_results");
  if (!gate.ok) return gate.response;

  try {
    const { user } = gate.auth;

    const body = await req.json();
    const { studentId, academicYear, class: className, section, roll, semester, examName, fullMarks, marksObtained, subjectMarks, remarks } = body;

    if (!studentId || !className || marksObtained === undefined) {
      return NextResponse.json({ error: "Missing required fields (studentId, class, marksObtained)" }, { status: 400 });
    }
    const outside = await denyStudentsOutsideClasses(gate.auth, className, [studentId]);
    if (outside) return outside;

    const year = academicYear || (await getAcademicYear());
    const classBefore = await snapshotClassResults(year, className, examName || "Annual Examination");
    const savedResult = await dbSaveOrUpdateResult(
      {
        studentId,
        academicYear: year,
        class: className,
        section: section || "A",
        roll: roll || 1,
        semester,
        examName: examName || "Annual Examination",
        fullMarks: fullMarks || 500,
        marksObtained: Number(marksObtained),
        subjectMarks,
        remarks,
      },
      user.id
    );

    const undoId = await recordResultsUndo({
      actorId: user.id,
      action: "results.save",
      label: "Save student marks",
      academicYear: year,
      className,
      examName: examName || "Annual Examination",
      before: classBefore,
    });
    return NextResponse.json({ success: true, result: savedResult, undoId });
  } catch (error: any) {
    console.error("Results API POST error:", error);
    return NextResponse.json({ error: error.message || "Failed to save student result" }, { status: 400 });
  }
}
