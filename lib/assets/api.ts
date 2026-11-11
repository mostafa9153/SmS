import "server-only";
import { NextResponse } from "next/server";
import { z } from "zod";
import { notifyAdminsOfError } from "@/lib/notifications/notify";
import type { AuthContext } from "@/lib/supabase/auth-helper";
import { AssetError, assetError } from "./errors";

/** Rule refusals keep their status and message; anything else is a 500 that admins see. */
export function assetRouteError(err: unknown) {
  const known = err instanceof AssetError ? err : assetError(err instanceof Error ? err.message : null);
  if (known) {
    return NextResponse.json({ success: false, error: known.message, code: known.code }, { status: known.status });
  }
  if (err instanceof z.ZodError) {
    return NextResponse.json({ success: false, error: err.issues[0]?.message ?? "Invalid request data." }, { status: 400 });
  }
  void notifyAdminsOfError("assets", "Asset action failed", err, "/assets");
  console.error("[assets]", err);
  return NextResponse.json({ success: false, error: "Asset action failed. Please try again." }, { status: 500 });
}

export function actorOf(auth: AuthContext): string {
  const id = auth.user?.id;
  if (!id) throw new AssetError("actor_required");
  return id;
}

export const readJson = (req: Request) => req.json().catch(() => null);
