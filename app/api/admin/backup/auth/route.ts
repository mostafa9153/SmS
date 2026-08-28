import { NextResponse } from "next/server";
import { verifyAdminUser } from "@/lib/backup/auth";
import { generateGoogleAuthUrl } from "@/lib/backup/google-drive";

export async function GET(req: Request) {
  const auth = await verifyAdminUser();
  if (!auth.isAdmin) {
    return NextResponse.json({ error: auth.error }, { status: auth.statusCode || 401 });
  }

  try {
    const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "localhost:3000";
    const proto = req.headers.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");
    const redirectUri = `${proto}://${host}/api/admin/backup/auth/callback`;

    const authUrl = generateGoogleAuthUrl(redirectUri, auth.user?.id);
    return NextResponse.json({ authUrl });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to generate Google Auth URL" }, { status: 500 });
  }
}
