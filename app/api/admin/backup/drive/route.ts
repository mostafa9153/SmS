import { NextResponse } from "next/server";
import { verifyAdminUser } from "@/lib/backup/auth";
import {
  getGoogleAccountStatus,
  listDriveBackups,
  uploadSnapshotToDrive,
  disconnectGoogleDrive,
  saveBackupConfig,
} from "@/lib/backup/google-drive";
import { generateBackupSnapshot } from "@/lib/backup/backup-engine";
import { createAdminClient } from "@/lib/supabase/admin";

// GET: Return Google account status, backup frequency, and list of cloud backups
export async function GET() {
  const auth = await verifyAdminUser();
  if (!auth.isAdmin) {
    return NextResponse.json({ error: auth.error }, { status: auth.statusCode || 401 });
  }

  try {
    const status = await getGoogleAccountStatus();
    let backups: any[] = [];
    let driveError: string | null = null;

    if (status.isConnected) {
      try {
        backups = await listDriveBackups();
      } catch (err: any) {
        driveError = err.message || "Failed to load backups from Google Drive";
      }
    }

    // Get current database counts for the UI summary
    const supabase = createAdminClient();
    const [{ count: studentsCount }, { count: resultsCount }] = await Promise.all([
      supabase.from("students").select("*", { count: "exact", head: true }),
      supabase.from("student_results").select("*", { count: "exact", head: true }),
    ]);

    return NextResponse.json({
      status,
      backups,
      driveError,
      dbSummary: {
        totalStudents: studentsCount || 0,
        totalResults: resultsCount || 0,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to fetch backup status" }, { status: 500 });
  }
}

// POST: Backup to Google Drive immediately ("Back Up Now")
export async function POST() {
  const auth = await verifyAdminUser();
  if (!auth.isAdmin) {
    return NextResponse.json({ error: auth.error }, { status: auth.statusCode || 401 });
  }

  try {
    const status = await getGoogleAccountStatus();
    if (!status.isConnected) {
      return NextResponse.json(
        { error: "Google Drive is not connected. Please link your Google Account first." },
        { status: 400 }
      );
    }

    // 1. Generate full database snapshot
    const payload = await generateBackupSnapshot(auth.user);

    // 2. Upload snapshot directly to Google Drive
    const uploadedFile = await uploadSnapshotToDrive(payload);

    return NextResponse.json({
      success: true,
      message: "Backup successfully uploaded to Google Drive!",
      file: uploadedFile,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to complete Google Drive backup" }, { status: 500 });
  }
}

// PATCH: Update backup frequency (weekly, monthly, yearly, off)
export async function PATCH(req: Request) {
  const auth = await verifyAdminUser();
  if (!auth.isAdmin) {
    return NextResponse.json({ error: auth.error }, { status: auth.statusCode || 401 });
  }

  try {
    const body = await req.json();
    const { frequency } = body;

    if (!["off", "weekly", "monthly", "yearly"].includes(frequency)) {
      return NextResponse.json({ error: "Invalid frequency value" }, { status: 400 });
    }

    await saveBackupConfig({ frequency }, auth.user?.id);

    return NextResponse.json({
      success: true,
      frequency,
      message: `Backup schedule set to: ${frequency}`,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to update backup frequency" }, { status: 500 });
  }
}

// DELETE: Disconnect Google Drive account
export async function DELETE() {
  const auth = await verifyAdminUser();
  if (!auth.isAdmin) {
    return NextResponse.json({ error: auth.error }, { status: auth.statusCode || 401 });
  }

  try {
    await disconnectGoogleDrive(auth.user?.id);
    return NextResponse.json({
      success: true,
      message: "Google Drive disconnected successfully.",
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to disconnect Google Drive" }, { status: 500 });
  }
}
