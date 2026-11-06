import "server-only";
import { NextResponse } from "next/server";
import { z } from "zod";
import type { AuthContext } from "@/lib/supabase/auth-helper";
import { teacherPermissions } from "@/lib/api/guard";
import { notifyAdminsOfError } from "@/lib/notifications/notify";
import { LibraryError, libraryError } from "./errors";
import type { Actor } from "./db-library-actions";

export const uuid = z.string().uuid();
export const borrowerKeySchema = z.string().regex(/^(student|staff):[0-9a-f-]{36}$/i) as z.ZodType<`${"student" | "staff"}:${string}`>;
/** Desk and money writes carry the client's request id so a retry is not applied twice (D8). */
export const requestId = uuid;
export const amount = z.number().finite().positive().max(99_999_999);

const bookText = z.string().max(300).nullish();
/** Catalog fields of a title; `title` is required on create (cleanBookInput trims and NFC-normalises). */
export const bookFields = z
  .object({
    title: z.string().trim().min(1).max(300),
    author: bookText,
    publisher: bookText,
    category: bookText,
    language: bookText,
    isbn: bookText,
    edition: bookText,
    legacy_no: bookText,
  })
  .partial();

/** Library route failure: rule refusals keep their status and Bengali message; anything else is a 500 that admins see. */
export function libraryRouteError(err: unknown) {
  const known = err instanceof LibraryError ? err : libraryError(err instanceof Error ? err.message : null);
  if (known) {
    return NextResponse.json(
      { success: false, error: known.message, code: known.code, detail: known.detail ?? null },
      { status: known.status },
    );
  }
  if (err instanceof z.ZodError) {
    return NextResponse.json({ success: false, error: "অনুরোধের তথ্য ঠিক নেই।", code: "invalid_request" }, { status: 400 });
  }
  void notifyAdminsOfError("library", "Library action failed", err, "/library");
  console.error("[library]", err);
  return NextResponse.json({ success: false, error: "Library-র কাজটা হয়নি। আবার চেষ্টা করুন।" }, { status: 500 });
}

/** The signed-in user as the actor recorded on every library row (S5). */
export function actorOf(auth: AuthContext): Actor {
  const id = auth.user?.id;
  if (!id) throw new LibraryError("actor_required");
  return { id };
}

/** S2: waivers are for Admins and Teachers granted can_waive_library_fines; Staff may not waive. */
export function denyWaive(auth: AuthContext): NextResponse | null {
  if (auth.role === "Admin") return null;
  if (auth.role === "Teacher" && teacherPermissions(auth).can_waive_library_fines === true) return null;
  return NextResponse.json({ success: false, error: "মওকুফ করার অনুমতি নেই।" }, { status: 403 });
}

export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}
