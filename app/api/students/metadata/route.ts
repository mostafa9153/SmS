import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sortClasses, CLASS_ORDER } from "@/lib/utils";

// GET /api/students/metadata - Returns lightweight distinct filter options
export async function GET() {
  try {
    const supabase = await createClient();

    // Verify session
    const { data: { user }, error: authUserError } = await supabase.auth.getUser();
    if (authUserError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Pre-seed standard school classes (V to XII) so they are always available
    const classSet = new Set<string>(CLASS_ORDER);
    const sectionSet = new Set<string>();
    const yearSet = new Set<number>();

    // Paginate in chunks of 1000 to overcome Supabase's 1000 row limit on all 1900+ students
    let page = 0;
    const pageSize = 1000;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await supabase
        .from("students")
        .select("present_class, present_section, admission_year")
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      const rows = data || [];
      for (const r of rows) {
        if (r.present_class) classSet.add(r.present_class);
        if (r.present_section) sectionSet.add(r.present_section);
        if (r.admission_year) yearSet.add(r.admission_year);
      }

      if (rows.length < pageSize) {
        hasMore = false;
      } else {
        page++;
      }
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
