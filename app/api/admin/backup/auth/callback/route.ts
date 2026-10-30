import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { timingSafeEqual } from "node:crypto";
import { exchangeCodeForTokens } from "@/lib/backup/google-drive";
import { OAUTH_STATE_COOKIE, verifyAdminUser } from "@/lib/backup/auth";

// guard: custom — verifyAdminUser() (Admin only)
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const state = searchParams.get("state"); // one-time nonce, matched against OAUTH_STATE_COOKIE

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

  // The code must come from the consent this browser started (see /backup/auth):
  // without this, a link carrying an attacker's code would bind their Drive.
  const expected = (await cookies()).get(OAUTH_STATE_COOKIE)?.value;
  const matches =
    !!state && !!expected && state.length === expected.length && timingSafeEqual(Buffer.from(state), Buffer.from(expected));
  if (!matches) {
    return NextResponse.redirect(`${settingsUrl}?error=Invalid_or_expired_authorization_state`);
  }

  if (!code) {
    return NextResponse.redirect(`${settingsUrl}?error=No_authorization_code_received`);
  }

  try {
    await exchangeCodeForTokens(code, redirectUri, auth.user?.id);
    const res = NextResponse.redirect(`${settingsUrl}?connected=true`);
    res.cookies.delete({ name: OAUTH_STATE_COOKIE, path: "/api/admin/backup/auth/callback" });
    return res;
  } catch (err: any) {
    console.error("Failed in OAuth callback:", err);
    return NextResponse.redirect(
      `${settingsUrl}?error=${encodeURIComponent(err.message || "Failed_to_connect_drive")}`
    );
  }
}
