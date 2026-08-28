import { NextResponse } from "next/server";
import { verifyAdminUser } from "@/lib/backup/auth";
import { generateBackupSnapshot } from "@/lib/backup/backup-engine";

export async function GET() {
  const auth = await verifyAdminUser();
  if (!auth.isAdmin) {
    return NextResponse.json({ error: auth.error }, { status: auth.statusCode || 401 });
  }

  try {
    const payload = await generateBackupSnapshot(auth.user);
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 16);
    const filename = `SMS_Backup_${timestamp}.json`;

    const jsonString = JSON.stringify(payload, null, 2);

    return new NextResponse(jsonString, {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to generate export" }, { status: 500 });
  }
}
