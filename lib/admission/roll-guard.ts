import type { SupabaseClient } from "@supabase/supabase-js";

export interface RollSlot {
  className: string;
  section: string;
  roll: number;
  /** Year of the admitted applications to check (they hold rolls before they become students). */
  academicYear: string | number;
  excludeStudentId?: string | null;
  excludeApplicationId?: string | null;
}

/**
 * Roll numbers come from `next-roll` (max + 1) or are typed in, and nothing in the DB stops two
 * students sharing one. Checked right before an admission writes the roll: a continuing student
 * or an admitted application still waiting for transfer already holding (class, section, roll)
 * is a conflict. Returns the message to show, or null. A failed lookup also blocks (fail closed).
 *
 * Not a DB unique index on purpose: promotion rewrites rolls one student at a time, so rolls
 * swap through a transient duplicate there.
 */
export async function rollConflict(supabase: SupabaseClient, slot: RollSlot): Promise<string | null> {
  const where = `Class ${slot.className}-${slot.section}, Roll ${slot.roll}`;

  let students = supabase
    .from("students")
    .select("id, name")
    .eq("present_class", slot.className)
    .eq("present_section", slot.section)
    .eq("present_roll", slot.roll)
    .eq("current_status", "Continuing")
    .limit(1);
  if (slot.excludeStudentId) students = students.neq("id", slot.excludeStudentId);

  let apps = supabase
    .from("admission_applications")
    .select("id, student_name")
    .eq("status", "admitted")
    .eq("is_transferred_to_active", false)
    .eq("academic_year", String(slot.academicYear))
    .eq("admitted_class", slot.className)
    .eq("admitted_section", slot.section)
    .eq("admitted_roll", slot.roll)
    .limit(1);
  if (slot.excludeApplicationId) apps = apps.neq("id", slot.excludeApplicationId);

  const [s, a] = await Promise.all([students, apps]);
  if (s.error || a.error) return `Could not check ${where}: ${(s.error ?? a.error)!.message}`;
  if (s.data?.length) return `${where} already belongs to ${s.data[0].name || "another student"}`;
  if (a.data?.length) return `${where} is already given to admitted applicant ${a.data[0].student_name || ""}`.trim();
  return null;
}
