import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  try {
    const supabase = await createClient();

    // Get current logged-in user
    const { data: { user }, error: authUserError } = await supabase.auth.getUser();
    if (authUserError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if current user is Admin
    const { data: roleData, error: roleError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (roleError || !roleData || roleData.role !== "Admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const adminClient = createAdminClient();

    // Fetch audit logs with the performing user's name
    const { data: logs, error: logsError } = await adminClient
      .from("audit_log")
      .select(`
        *,
        user_roles!inner (
          full_name,
          role
        )
      `)
      .order("created_at", { ascending: false })
      .limit(100);

    if (logsError) {
      // Fallback: if !inner join fails, select without join
      const { data: simpleLogs, error: simpleError } = await adminClient
        .from("audit_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (simpleError) {
        return NextResponse.json({ error: simpleError.message }, { status: 500 });
      }
      return NextResponse.json({ logs: simpleLogs });
    }

    // Format logs to include performer name
    const formattedLogs = logs.map((log: any) => ({
      id: log.id,
      action: log.action,
      tableName: log.table_name,
      recordId: log.record_id,
      oldValues: log.old_values,
      newValues: log.new_values,
      metadata: log.metadata,
      createdAt: log.created_at,
      performedBy: {
        id: log.performed_by,
        fullName: log.user_roles?.full_name || "Unknown",
        role: log.user_roles?.role || "Staff",
      },
    }));

    return NextResponse.json({ logs: formattedLogs });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
