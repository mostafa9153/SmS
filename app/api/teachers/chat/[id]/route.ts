import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PATCH(req: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { message } = body;

    if (!message || !message.trim()) {
      return NextResponse.json({ error: "Message cannot be empty." }, { status: 400 });
    }

    const adminClient = createAdminClient();

    // Fetch existing message
    const { data: existingMsg, error: fetchError } = await adminClient
      .from("teacher_chat_messages")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError || !existingMsg) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }

    // Must be sender
    if (existingMsg.user_id !== user.id) {
      return NextResponse.json({ error: "You can only edit your own messages." }, { status: 403 });
    }

    // Check 1-hour window (3,600,000 ms)
    const createdAtTime = new Date(existingMsg.created_at).getTime();
    const nowTime = Date.now();
    const oneHour = 60 * 60 * 1000;
    if (nowTime - createdAtTime > oneHour) {
      return NextResponse.json(
        { error: "Edit time limit expired. Messages can only be edited within 1 hour." },
        { status: 400 }
      );
    }

    const { data: updatedMsg, error: updateError } = await adminClient
      .from("teacher_chat_messages")
      .update({
        message: message.trim(),
        is_edited: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: updatedMsg });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to update message" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const adminClient = createAdminClient();
    const { data: currentRole } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();

    const roleLower = (currentRole?.role || "").toLowerCase();
    const isAdmin = roleLower === "admin" || roleLower === "super admin" || roleLower === "super_admin";

    // Fetch message
    const { data: existingMsg, error: fetchError } = await adminClient
      .from("teacher_chat_messages")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError || !existingMsg) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }

    if (!isAdmin) {
      if (existingMsg.user_id !== user.id) {
        return NextResponse.json({ error: "You can only delete your own messages." }, { status: 403 });
      }

      // Check 1-hour window for author deletion
      const createdAtTime = new Date(existingMsg.created_at).getTime();
      const nowTime = Date.now();
      const oneHour = 60 * 60 * 1000;
      if (nowTime - createdAtTime > oneHour) {
        return NextResponse.json(
          { error: "Delete time limit expired. Messages can only be deleted within 1 hour." },
          { status: 400 }
        );
      }
    }

    // Soft delete message
    const { error: deleteError } = await adminClient
      .from("teacher_chat_messages")
      .update({
        is_deleted: true,
        message: "This message was deleted.",
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "Message deleted" });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to delete message" }, { status: 500 });
  }
}
