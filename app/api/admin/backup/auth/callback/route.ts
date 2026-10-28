import { NextResponse } from "next/server";
import { exchangeCodeForTokens } from "@/lib/backup/google-drive";
import { verifyAdminUser } from "@/lib/backup/auth";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const state = searchParams.get("state"); // Contains admin user id

  const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "localhost:3000";
  const proto = req.headers.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");
  const redirectUri = `${proto}://${host}/api/admin/backup/auth/callback`;
  const settingsUrl = `${proto}://${host}/settings/backup`;

  if (error) {
    console.error("Google OAuth error from callback:", error);
    return NextResponse.redirect(`${settingsUrl}?error=${encodeURIComponent(error)}`);
  }

  // Only a signed-in Admin may bind a Drive account; otherwise anyone could
  // complete the flow with their own Google code and receive the school backups.
  const auth = await verifyAdminUser();
  if (!auth.isAdmin) {
    return NextResponse.redirect(`${settingsUrl}?error=Unauthorized`);
  }

  if (!code) {
    return NextResponse.redirect(`${settingsUrl}?error=No_authorization_code_received`);
  }

  try {
    await exchangeCodeForTokens(code, redirectUri, state || undefined);
    return NextResponse.redirect(`${settingsUrl}?connected=true`);
  } catch (err: any) {
    console.error("Failed in OAuth callback:", err);
    return NextResponse.redirect(
      `${settingsUrl}?error=${encodeURIComponent(err.message || "Failed_to_connect_drive")}`
    );
  }
}
