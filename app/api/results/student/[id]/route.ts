import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/api/guard";
import { createClient } from "@/lib/supabase/server";
import { dbGetStudentResultHistory } from "@/lib/supabase/db-results";

// GET /api/results/student/[id] - Get multi-year result history for a student
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const gate = await requireStaff("can_view_student_profile", "can_enter_results", "can_generate_marksheets");
    if (!gate.ok) return gate.response;
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const results = await dbGetStudentResultHistory(id);
    return NextResponse.json({ results });
  } catch (error: any) {
    console.error("Student results API error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch student results" }, { status: 500 });
  }
}
