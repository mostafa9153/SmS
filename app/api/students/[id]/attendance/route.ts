import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: studentId } = await params;
    
    if (!studentId) {
      return NextResponse.json({ success: false, error: "Student ID required" }, { status: 400 });
    }

    const supabase = await createClient();
    
    // Fetch last 30 days of attendance
    const { data, error } = await supabase
      .from("student_attendance")
      .select("attendance_date, status, remarks")
      .eq("student_id", studentId)
      .order("attendance_date", { ascending: false })
      .limit(30);

    if (error) throw error;

    return NextResponse.json({ success: true, history: data || [] });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
