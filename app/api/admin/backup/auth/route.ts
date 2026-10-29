import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { generateGoogleAuthUrl } from "@/lib/backup/google-drive";
import { OAUTH_STATE_COOKIE, verifyAdminUser } from "@/lib/backup/auth";

// guard: custom — verifyAdminUser() (Admin only)
export async function GET(req: Request) {
  const auth = await verifyAdminUser();
  if (!auth.isAdmin) {
    return NextResponse.json({ error: auth.error }, { status: auth.statusCode || 401 });
  }

  try {
    const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "localhost:3000";
    const proto = req.headers.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");
    const redirectUri = `${proto}://${host}/api/admin/backup/auth/callback`;

    // One-time nonce bound to this browser: the callback only accepts a code whose
    // `state` matches it, so a code from someone else's Google consent is rejected.
    const nonce = randomUUID();
    const res = NextResponse.json({ authUrl: generateGoogleAuthUrl(redirectUri, nonce) });
    res.cookies.set(OAUTH_STATE_COOKIE, nonce, {
      httpOnly: true,
      sameSite: "lax",
      secure: proto === "https",
      path: "/api/admin/backup/auth/callback",
      maxAge: 600,
    });
    return res;
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to generate Google Auth URL" }, { status: 500 });
  }
}
