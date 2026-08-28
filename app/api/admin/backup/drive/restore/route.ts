import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { verifyAdminUser } from "@/lib/backup/auth";
import { downloadDriveBackup } from "@/lib/backup/google-drive";
import { restoreBackup } from "@/lib/backup/backup-engine";

export async function POST(req: Request) {
  const auth = await verifyAdminUser();
  if (!auth.isAdmin || !auth.user) {
    return NextResponse.json({ error: auth.error }, { status: auth.statusCode || 401 });
  }

  try {
    const body = await req.json();
    const { fileId, adminPassword, mode = "clean_restore" } = body;

    if (!fileId) {
      return NextResponse.json({ error: "Missing fileId parameter" }, { status: 400 });
    }

    if (!adminPassword) {
      return NextResponse.json({ error: "Admin login password is required to authorize database restoration." }, { status: 400 });
    }

    // Verify Admin Password with Supabase Auth
    const supabase = await createClient();
    const { error: passErr } = await supabase.auth.signInWithPassword({
      email: auth.user.email,
      password: adminPassword,
    });

    if (passErr) {
      return NextResponse.json({ error: "Invalid admin password. Authorization failed." }, { status: 401 });
    }

    // 1. Download snapshot directly from Google Drive
    const payload = await downloadDriveBackup(fileId);

    // 2. Execute database restoration
    const result = await restoreBackup(payload, {
      mode,
      adminUserId: auth.user.id,
      adminEmail: auth.user.email,
    });

    return NextResponse.json(result);
  } catch (err: any) {
    console.error("Cloud restore failed:", err);
    return NextResponse.json({ error: err.message || "Cloud restoration failed" }, { status: 500 });
  }
}
