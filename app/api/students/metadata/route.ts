import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sortClasses } from "@/lib/utils";

// GET /api/students/metadata - Returns lightweight distinct filter options
export async function GET() {
  try {
    const supabase = await createClient();

    // Verify session
    const { data: { user }, error: authUserError } = await supabase.auth.getUser();
    if (authUserError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch only 3 small scalar columns needed for filters
    const { data, error } = await supabase
      .from("students")
      .select("present_class, present_section, admission_year");

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const rows = data || [];
    const classSet = new Set<string>();
    const sectionSet = new Set<string>();
    const yearSet = new Set<number>();

    for (const r of rows) {
      if (r.present_class) classSet.add(r.present_class);
      if (r.present_section) sectionSet.add(r.present_section);
      if (r.admission_year) yearSet.add(r.admission_year);
    }

    const classes = sortClasses(Array.from(classSet));
    const sections = Array.from(sectionSet).sort();
    const admissionYears = Array.from(yearSet).sort((a, b) => b - a);

    return NextResponse.json({
      classes,
      sections,
      admissionYears,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to load metadata" }, { status: 500 });
  }
}
