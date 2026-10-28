import "server-only";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { AuthContext } from "@/lib/supabase/auth-helper";
import { denyOutsideClasses, teacherPermissions } from "@/lib/api/guard";

/**
 * Class scope for writes that target students: the class label in the body
 * and every student's actual `present_class` must be inside a Teacher's
 * `allowed_classes`. Returns a 403 response when anything is out of scope.
 */
export async function denyStudentsOutsideClasses(
  auth: AuthContext,
  className: string | null | undefined,
  studentIds: (string | null | undefined)[],
): Promise<NextResponse | null> {
  const labelDenied = denyOutsideClasses(auth, className);
  if (labelDenied) return labelDenied;
  if (auth.role !== "Teacher") return null;
  const allowed = teacherPermissions(auth).allowed_classes;
  if (!allowed?.length) return null;

  const ids = [...new Set(studentIds.filter((id): id is string => Boolean(id)))];
  if (!ids.length) return null;

  const { data, error } = await createAdminClient().from("students").select("id, present_class").in("id", ids);
  const outside = error || (data ?? []).length !== ids.length || (data ?? []).some((s) => !allowed.includes(s.present_class));
  return outside
    ? NextResponse.json({ success: false, error: "Forbidden: student outside your classes" }, { status: 403 })
    : null;
}
