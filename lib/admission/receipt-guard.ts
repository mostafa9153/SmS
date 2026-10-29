import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Admission flows upsert `admission_invoices` on `invoice_number` so a pre-printed blank slip
 * gets filled in. Without this check, typing a number that is already used overwrote another
 * student's invoice. Returns null when the number is free, still a blank slip, or already this
 * student's; otherwise the message to show. A failed lookup also blocks (fail closed).
 */
export async function receiptConflict(
  supabase: SupabaseClient,
  receiptNo: string,
  ownStudentIds: (string | null | undefined)[],
): Promise<string | null> {
  const { data, error } = await supabase
    .from("admission_invoices")
    .select("student_id, student_name, is_blank")
    .eq("invoice_number", receiptNo)
    .maybeSingle();
  if (error) return `Could not check receipt ${receiptNo}: ${error.message}`;
  if (!data || data.is_blank) return null;
  if (data.student_id && ownStudentIds.filter(Boolean).includes(data.student_id)) return null;
  return `Receipt ${receiptNo} is already used for ${data.student_name || data.student_id || "another student"}`;
}
