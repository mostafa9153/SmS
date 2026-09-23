import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendWebPushNotification } from "@/lib/push-notifications";

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { userIds, role, title, body: messageBody, url, icon } = body;

    const result = await sendWebPushNotification({
      userIds,
      role,
      title: title || "School Workspace Alert",
      body: messageBody || "You have a new workspace update.",
      url: url || "/teacher",
      icon: icon || "/icon-192.png",
    });

    return NextResponse.json({
      success: result.success,
      sent: result.sent,
      failed: result.failed,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to send push notifications" }, { status: 500 });
  }
}
