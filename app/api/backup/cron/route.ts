import { NextResponse } from "next/server";
import { getBackupConfig, uploadSnapshotToDrive } from "@/lib/backup/google-drive";
import { generateBackupSnapshot } from "@/lib/backup/backup-engine";

export async function GET(req: Request) {
  try {
    // 1. Check Cron secret or Vercel header if configured
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      // Allow Vercel Cron internal header
      const isVercelCron = req.headers.get("user-agent")?.includes("vercel-cron");
      if (!isVercelCron) {
        return NextResponse.json({ error: "Unauthorized cron execution" }, { status: 401 });
      }
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
