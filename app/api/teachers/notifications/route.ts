import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api/guard";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// GET /api/teachers/notifications - Get notifications for current user
export async function GET() {
  try {
    const gate = await requireRole();
    if (!gate.ok) return gate.response;
    const supabase = await createClient();
    const { data: { user }, error: authUserError } = await supabase.auth.getUser();
    if (authUserError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const adminClient = createAdminClient();
    const { data: notifications, error } = await adminClient
      .from("teacher_notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, notifications: notifications || [] });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

// PATCH /api/teachers/notifications - Mark notification(s) as read
// undo: n/a — only flips read flags on the caller's own notifications
export async function PATCH(req: Request) {
  try {
    const gate = await requireRole();
    if (!gate.ok) return gate.response;
    const supabase = await createClient();
    const { data: { user }, error: authUserError } = await supabase.auth.getUser();
    if (authUserError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { id, markAllAsRead } = body;

    const adminClient = createAdminClient();

    if (markAllAsRead) {
      await adminClient
        .from("teacher_notifications")
        .update({ is_read: true })
        .eq("user_id", user.id);
      return NextResponse.json({ success: true, message: "All marked as read" });
    }

    if (id) {
      await adminClient
        .from("teacher_notifications")
        .update({ is_read: true })
        .eq("id", id)
        .eq("user_id", user.id);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
