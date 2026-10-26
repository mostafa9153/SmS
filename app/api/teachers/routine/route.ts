import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchTeacherRoutineData } from "@/lib/supabase/teacher-routine";

export async function GET(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authUserError,
    } = await supabase.auth.getUser();

    if (authUserError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const adminClient = createAdminClient();

    // Fetch user role & linked staff_id
    const { data: roleRow } = await adminClient
      .from("user_roles")
      .select("role, staff_id, full_name")
      .eq("user_id", user.id)
      .maybeSingle();

    // Allow Admin to preview routine for any teacher by passing ?staff_id=...
    const { searchParams } = new URL(req.url);
    const queryStaffId = searchParams.get("staff_id");
    const effectiveStaffId =
      roleRow?.role === "Admin" && queryStaffId ? queryStaffId : roleRow?.staff_id;

    if (!effectiveStaffId) {
      return NextResponse.json({
        success: true,
        activeRoutine: null,
        periodsByDay: {},
        todaySlots: [],
        totalWeeklyPeriods: 0,
        message: "No linked staff profile found for this user account.",
      });
    }

    const result = await fetchTeacherRoutineData(
      adminClient,
      effectiveStaffId,
      roleRow?.full_name
    );

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    console.error("Teacher routine sync error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch teacher routine" },
      { status: 500 }
    );
  }
}
