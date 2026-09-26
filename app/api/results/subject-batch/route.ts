import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { dbSaveSubjectBatchMarks, SaveSubjectBatchParams } from "@/lib/supabase/db-results";

// POST /api/results/subject-batch
export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json()) as SaveSubjectBatchParams;
    const { academicYear, class: className, examName, subjectName, scores } = body;

    if (!className || !examName || !subjectName || !Array.isArray(scores)) {
      return NextResponse.json(
        { error: "Missing required fields (class, examName, subjectName, scores[])" },
        { status: 400 }
      );
    }

    const result = await dbSaveSubjectBatchMarks(
      {
        academicYear: academicYear || new Date().getFullYear(),
        class: className,
        section: body.section,
        examName,
        subjectName,
        scores,
      },
      user.id
    );

    return NextResponse.json({ success: true, count: result.count });
  } catch (error: any) {
    console.error("Subject batch save API error:", error);
    return NextResponse.json({ error: error.message || "Failed to save subject batch marks" }, { status: 500 });
  }
}
