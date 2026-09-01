import { NextResponse } from "next/server";
import { getBackupConfig, uploadSnapshotToDrive } from "@/lib/backup/google-drive";
import { generateBackupSnapshot } from "@/lib/backup/backup-engine";

export async function GET(req: Request) {
  try {
    // 1. Strictly verify Cron Secret
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret) {
      if (authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: "Unauthorized: Invalid cron authorization token" }, { status: 401 });
      }
    } else if (process.env.NODE_ENV === "production") {
      return NextResponse.json({ error: "CRON_SECRET environment variable is missing in production" }, { status: 500 });
    }

    // 2. Check if backup is enabled
    const config = await getBackupConfig();

    if (!config.refreshToken) {
      return NextResponse.json({
        skipped: true,
        reason: "No Google Drive account is connected.",
      });
    }

    if (config.frequency === "off") {
      return NextResponse.json({
        skipped: true,
        reason: "Automatic scheduled backup is disabled in settings.",
      });
    }

    // 3. Generate snapshot and upload to Google Drive
    const payload = await generateBackupSnapshot({
      id: "system-cron",
      email: "automated-cron@sms-web-app",
    });

    const file = await uploadSnapshotToDrive(payload);

    return NextResponse.json({
      success: true,
      message: `Automated ${config.frequency} backup uploaded to Google Drive.`,
      file,
    });
  } catch (err: any) {
    console.error("Cron backup error:", err);
    return NextResponse.json({ error: err.message || "Failed to execute cron backup" }, { status: 500 });
  }
}
