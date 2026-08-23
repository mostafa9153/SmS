import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { dbGetResultsByClass, dbSaveOrUpdateResult } from "@/lib/supabase/db-results";

// GET /api/results?year=2026&class=V&section=A&exam=Annual%20Examination
export async function GET(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const academicYear = parseInt(searchParams.get("year") || String(new Date().getFullYear()), 10);
    const className = searchParams.get("class") || "V";
    const section = searchParams.get("section") || undefined;
    const examName = searchParams.get("exam") || "Annual Examination";

    const summary = await dbGetResultsByClass(academicYear, className, section, examName);
    return NextResponse.json(summary);
  } catch (error: any) {
    console.error("Results API GET error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch class results" }, { status: 500 });
  }
}

// POST /api/results - Save or update student marks
export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { studentId, academicYear, class: className, section, roll, examName, fullMarks, marksObtained, subjectMarks, remarks } = body;

    if (!studentId || !className || marksObtained === undefined) {
      return NextResponse.json({ error: "Missing required fields (studentId, class, marksObtained)" }, { status: 400 });
    }

    const savedResult = await dbSaveOrUpdateResult(
      {
        studentId,
        academicYear: academicYear || new Date().getFullYear(),
        class: className,
        section: section || "A",
        roll: roll || 1,
        examName: examName || "Annual Examination",
        fullMarks: fullMarks || 500,
        marksObtained: Number(marksObtained),
        subjectMarks,
        remarks,
      },
      user.id
    );

    return NextResponse.json({ success: true, result: savedResult });
  } catch (error: any) {
    console.error("Results API POST error:", error);
    return NextResponse.json({ error: error.message || "Failed to save student result" }, { status: 400 });
  }
}
