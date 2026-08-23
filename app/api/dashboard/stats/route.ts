import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { StudentStatus } from "@/lib/types";

export async function GET() {
  try {
    const supabase = await createClient();

    // Get current logged-in user to verify session
    const { data: { user }, error: authUserError } = await supabase.auth.getUser();
    if (authUserError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Run parallel aggregation counts in database
    const [
      { count: total },
      { count: boys },
      { count: girls },
      { data: studentsData }
    ] = await Promise.all([
      supabase.from("students").select("*", { count: "exact", head: true }),
      supabase.from("students").select("*", { count: "exact", head: true }).eq("gender", "Male"),
      supabase.from("students").select("*", { count: "exact", head: true }).eq("gender", "Female"),
      // Fetch statuses and classes for grouping
      supabase.from("students").select("current_status, present_class")
    ]);

    // Grouping calculations
    const statusCounts = (studentsData || []).reduce(
      (acc, s) => {
        const status = s.current_status as StudentStatus;
        acc[status] = (acc[status] ?? 0) + 1;
        return acc;
      },
      {} as Record<StudentStatus, number>
    );

    const classWiseCounts = (studentsData || []).reduce(
      (acc, s) => {
        acc[s.present_class] = (acc[s.present_class] ?? 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    return NextResponse.json({
      total: total || 0,
      boys: boys || 0,
      girls: girls || 0,
      statusCounts,
      classWiseCounts,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to load dashboard stats" }, { status: 500 });
  }
}
