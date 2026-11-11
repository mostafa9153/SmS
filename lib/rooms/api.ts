import { NextResponse } from "next/server";
import { notifyAdminsOfError } from "@/lib/notifications/notify";
import type { AuthContext } from "@/lib/supabase/auth-helper";
import { RoomError } from "./db-rooms";

/** Known refusals keep their status and message; anything else is a 500 that admins see. */
export function roomRouteError(err: unknown) {
  if (err instanceof RoomError) {
    return NextResponse.json({ success: false, error: err.message }, { status: err.status });
  }
  void notifyAdminsOfError("rooms", "Room action failed", err, "/ems");
  console.error("[rooms]", err);
  return NextResponse.json({ success: false, error: "Room action failed. Please try again." }, { status: 500 });
}

export function actorId(auth: AuthContext): string {
  const id = auth.user?.id;
  if (!id) throw new RoomError("Sign in again to continue.", 400);
  return id;
}
