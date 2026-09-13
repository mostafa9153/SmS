import { NextRequest, NextResponse } from "next/server";
import {
  dbGetTeacherAssignedInvoices,
  dbGetTeacherSettlements,
  dbGetAssignedTeachers,
} from "@/lib/supabase/db-invoices";

/**
 * GET /api/invoices/teacher-assignments
 * Query params:
 *   ?teacher=<name>  → invoices assigned to that teacher
 *   (no param)       → summary for all teachers + teacher list
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const teacher = searchParams.get("teacher");

    if (teacher) {
      // Return individual teacher's invoice list
      const { data, error } = await dbGetTeacherAssignedInvoices(teacher);
      if (error) {
        return NextResponse.json({ error }, { status: 500 });
      }
      return NextResponse.json({ data, teacher });
    }

    // Return all teacher summaries + unique teacher list
    const [settlementsResult, teachersResult] = await Promise.all([
      dbGetTeacherSettlements(),
      dbGetAssignedTeachers(),
    ]);

    return NextResponse.json({
      summaries: settlementsResult.data,
      teachers: teachersResult.teachers,
      error: settlementsResult.error || teachersResult.error,
    });
  } catch (err: any) {
    console.error("Error in teacher-assignments GET:", err);
    return NextResponse.json({ error: err?.message || "Server error" }, { status: 500 });
  }
}
