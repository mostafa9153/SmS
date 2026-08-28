import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { verifyAdminUser } from "@/lib/backup/auth";
import { validateBackupPayload, restoreBackup } from "@/lib/backup/backup-engine";

export async function POST(req: Request) {
  const auth = await verifyAdminUser();
  if (!auth.isAdmin || !auth.user) {
    return NextResponse.json({ error: auth.error }, { status: auth.statusCode || 401 });
  }

  try {
    const body = await req.json();
    const { action = "preview", payload, adminPassword, mode = "clean_restore" } = body;

    if (!payload) {
      return NextResponse.json({ error: "Missing backup payload" }, { status: 400 });
    }

    // 1. Dry Run / Preview Only
    if (action === "preview") {
      const preview = validateBackupPayload(payload);
      return NextResponse.json({ preview });
    }

    // 2. Execute Restoration
    if (action === "execute") {
      if (!adminPassword) {
        return NextResponse.json(
          { error: "Admin login password is required to authorize database restoration." },
          { status: 400 }
        );
      }

      // Verify Admin's login password
      const supabase = await createClient();
      const { error: passErr } = await supabase.auth.signInWithPassword({
        email: auth.user.email,
        password: adminPassword,
      });

      if (passErr) {
        return NextResponse.json({ error: "Invalid admin password. Authorization failed." }, { status: 401 });
      }

      const result = await restoreBackup(payload, {
        mode,
        adminUserId: auth.user.id,
        adminEmail: auth.user.email,
      });

      return NextResponse.json(result);
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err: any) {
    console.error("Local restore error:", err);
    return NextResponse.json({ error: err.message || "Failed to process backup file" }, { status: 500 });
  }
}
