import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const { message } = await req.json();

    if (!message || !message.trim()) {
      return NextResponse.json({ error: "Message cannot be empty." }, { status: 400 });
    }

    const adminClient = createAdminClient();
    // Verify ownership
    const { data: existingMsg, error: fetchErr } = await adminClient
      .from("teacher_chat_messages")
      .select("user_id, created_at")
      .eq("id", id)
      .maybeSingle();

    if (fetchErr || !existingMsg) {
      return NextResponse.json({ error: "Message not found." }, { status: 404 });
    }

    if (existingMsg.user_id !== user.id) {
      return NextResponse.json({ error: "Forbidden: You can only edit your own messages." }, { status: 403 });
    }

    const { data: updatedMsg, error: updateErr } = await adminClient
      .from("teacher_chat_messages")
      .update({
        message: message.trim(),
        is_edited: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: updatedMsg });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to update message" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const adminClient = createAdminClient();

    // Verify ownership or Admin role
    const { data: existingMsg, error: fetchErr } = await adminClient
      .from("teacher_chat_messages")
      .select("user_id")
      .eq("id", id)
      .maybeSingle();

    if (fetchErr || !existingMsg) {
      return NextResponse.json({ error: "Message not found." }, { status: 404 });
    }

    const { data: userRole } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();

    const isAdmin = userRole?.role === "Admin";
    if (existingMsg.user_id !== user.id && !isAdmin) {
      return NextResponse.json({ error: "Forbidden: You can only delete your own messages." }, { status: 403 });
    }

    const { error: delErr } = await adminClient
      .from("teacher_chat_messages")
      .update({
        is_deleted: true,
        message: "This message was deleted",
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (delErr) {
      return NextResponse.json({ error: delErr.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to delete message" }, { status: 500 });
  }
}
