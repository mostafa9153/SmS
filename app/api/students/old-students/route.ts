import { NextResponse } from "next/server";
import { dbGetOldStudentYears, dbGetOldStudentsByYear } from "@/lib/supabase/db-students";
import { getAuthenticatedUserRole } from "@/lib/supabase/auth-helper";

export async function GET(req: Request) {
  try {
    const auth = await getAuthenticatedUserRole();
    if (auth.role === "Guest") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const meta = searchParams.get("meta");

    // Return list of available archive years
    if (meta === "years") {
      const years = await dbGetOldStudentYears();
      return NextResponse.json({ years });
    }

    const yearParam = searchParams.get("year");
    const currentYear = new Date().getFullYear();
    const year = yearParam ? parseInt(yearParam, 10) : currentYear - 1;
    const query = searchParams.get("q") || undefined;
    const studentClass = searchParams.get("class") || undefined;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "20", 10);

    const result = await dbGetOldStudentsByYear({
      year,
      query,
      studentClass,
      page,
      pageSize,
    });

    return NextResponse.json(result);
  } catch (err: any) {
    console.error("Error in GET /api/students/old-students:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to fetch old students" },
      { status: 500 }
    );
  }
}
