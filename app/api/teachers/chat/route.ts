import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "60", 10);

    const adminClient = createAdminClient();
    const { data: messages, error } = await adminClient
      .from("teacher_chat_messages")
      .select(`
        id,
        user_id,
        teacher_id,
        sender_name,
        message,
        is_edited,
        is_deleted,
        created_at,
        updated_at
      `)
      .order("created_at", { ascending: true })
      .limit(limit);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, messages: messages || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to fetch messages" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
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
    const { data: currentRole } = await adminClient
      .from("user_roles")
      .select("role, full_name, staff_id")
      .eq("user_id", user.id)
      .maybeSingle();

    const senderName = currentRole?.full_name || user.user_metadata?.full_name || user.email?.split("@")[0] || "Faculty Member";

    const { data: newMsg, error: insertError } = await adminClient
      .from("teacher_chat_messages")
      .insert({
        user_id: user.id,
        teacher_id: currentRole?.staff_id || null,
        sender_name: senderName,
        message: message.trim(),
        is_edited: false,
        is_deleted: false,
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: newMsg });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to send message" }, { status: 500 });
  }
}
