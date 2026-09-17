import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// GET /api/teachers/activity - Fetch teacher activities & collection performance
export async function GET(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authUserError } = await supabase.auth.getUser();
    if (authUserError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const year = Number(searchParams.get("year")) || new Date().getFullYear();
    const actionType = searchParams.get("actionType");
    const teacherId = searchParams.get("teacherId");
    const limit = Number(searchParams.get("limit")) || 50;

    const adminClient = createAdminClient();
    const { data: currentRole } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    const isAdmin = currentRole?.role === "Admin";

    // 1. Performance Summary (Admins get all teachers summary; Teachers get their own)
    let performanceSummary: any[] = [];
    if (isAdmin) {
      const { data: rpcData, error: rpcError } = await adminClient.rpc(
        "get_admin_teacher_performance_summary",
        { p_year: year }
      );
      if (!rpcError && rpcData) {
        performanceSummary = rpcData;
      }
    }

    // 2. Activity Logs Query
    let query = adminClient
      .from("teacher_activity_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (!isAdmin) {
      // Non-admins can only see their own logs
      query = query.eq("user_id", user.id);
    } else if (teacherId) {
      query = query.eq("teacher_id", teacherId);
    }

    if (actionType) {
      query = query.eq("action_type", actionType);
    }

    const { data: logs, error: logsError } = await query;
    if (logsError) {
      return NextResponse.json({ error: logsError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      summary: performanceSummary,
      logs: logs || [],
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
