import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sortClasses, CLASS_ORDER } from "@/lib/utils";

interface CachedMetadata {
  data: {
    classes: string[];
    sections: string[];
    admissionYears: number[];
  };
  cachedAt: number;
}
let cachedMetadata: CachedMetadata | null = null;
const METADATA_CACHE_TTL_MS = 3 * 60 * 1000; // 3 minutes

// GET /api/students/metadata - Returns lightweight distinct filter options
export async function GET() {
  try {
    const supabase = await createClient();

    // Verify session
    const { data: { user }, error: authUserError } = await supabase.auth.getUser();
    if (authUserError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Serve from in-memory cache if fresh
    if (cachedMetadata && Date.now() - cachedMetadata.cachedAt < METADATA_CACHE_TTL_MS) {
      return NextResponse.json(cachedMetadata.data, {
        headers: {
          "Cache-Control": "private, max-age=120, stale-while-revalidate=300",
        },
      });
    }

    // 1. Try fast server-side RPC first (calculates distinct values in PostgreSQL directly)
    try {
      const { data: rpcData, error: rpcError } = await supabase.rpc("get_student_distinct_metadata");
      if (!rpcError && rpcData && typeof rpcData === "object") {
        const rpcClasses = Array.isArray(rpcData.classes) ? rpcData.classes : [];
        const rpcSections = Array.isArray(rpcData.sections) ? rpcData.sections : [];
        const rpcYears = Array.isArray(rpcData.admissionYears) ? rpcData.admissionYears : [];

        const classSet = new Set<string>([...CLASS_ORDER, ...rpcClasses.filter(Boolean)]);
        const sectionSet = new Set<string>(rpcSections.filter(Boolean));
        const yearSet = new Set<number>(rpcYears.filter((y: any) => typeof y === "number"));

        const payload = {
          classes: sortClasses(Array.from(classSet)),
          sections: Array.from(sectionSet).sort(),
          admissionYears: Array.from(yearSet).sort((a, b) => b - a),
        };

        cachedMetadata = {
          data: payload,
          cachedAt: Date.now(),
        };

        return NextResponse.json(payload, {
          headers: {
            "Cache-Control": "private, max-age=120, stale-while-revalidate=300",
          },
        });
      }
    } catch {
      // Fall through to query fallback
    }

    // 2. Fallback: Pre-seed standard school classes (V to XII)
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

    const payload = {
      classes,
      sections,
      admissionYears,
    };

    cachedMetadata = {
      data: payload,
      cachedAt: Date.now(),
    };

    return NextResponse.json(payload, {
      headers: {
        "Cache-Control": "private, max-age=120, stale-while-revalidate=300",
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to load metadata" }, { status: 500 });
  }
}
