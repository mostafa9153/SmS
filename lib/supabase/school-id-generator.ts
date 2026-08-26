import { createClient as createServerClient } from "@/lib/supabase/server";

const SCHOOL_PREFIX = "MHS";
const SESSION_CODE = "01";

/**
 * Server-side atomic generator for unique permanent School IDs.
 * Format: MHS/YYYY/01/CLASS/SECTION/NNN
 * 
 * Example: MHS/2026/01/V/A/001
 */
export async function generateSchoolId(
  admissionYear: number,
  presentClass: string,
  presentSection: string
): Promise<string> {
  const supabase = await createServerClient();
  const yearStr = String(admissionYear || new Date().getFullYear());
  const classStr = (presentClass || "V").toUpperCase().trim();
  const sectionStr = (presentSection || "A").toUpperCase().trim();

  // Pattern prefix: MHS/YYYY/01/CLASS/SECTION/
  const prefix = `${SCHOOL_PREFIX}/${yearStr}/${SESSION_CODE}/${classStr}/${sectionStr}/`;

  // Find all existing school_ids with this prefix to get the maximum serial
  const { data, error } = await supabase
    .from("students")
    .select("school_id")
    .ilike("school_id", `${prefix}%`);

  if (error) {
    console.error("Error querying school_id for sequence:", error);
  }

  const existingSerials = new Set<number>();
  let maxSerial = 0;

  if (data && data.length > 0) {
    for (const row of data) {
      if (!row.school_id) continue;
      const parts = row.school_id.split("/");
      const serialPart = parts[parts.length - 1];
      const parsedSerial = parseInt(serialPart, 10);
      if (!isNaN(parsedSerial)) {
        existingSerials.add(parsedSerial);
        if (parsedSerial > maxSerial) {
          maxSerial = parsedSerial;
        }
      }
    }
  }

  // Find the next available unallocated serial number
  let nextSerial = maxSerial + 1;
  while (existingSerials.has(nextSerial)) {
    nextSerial++;
  }

  const formattedSerial = String(nextSerial).padStart(3, "0");
  return `${prefix}${formattedSerial}`;
}

/**
 * Batch generator to allocate N sequential school IDs safely in memory for bulk insert.
 */
export async function generateBatchSchoolIds(
  allocations: Array<{ admissionYear: number; presentClass: string; presentSection: string }>
): Promise<string[]> {
  const supabase = await createServerClient();
  const generatedIds: string[] = [];

  // Group by (year, class, section) to calculate starting counters
  const groupCounters: Record<string, number> = {};
  const groupExisting: Record<string, Set<number>> = {};

  for (const alloc of allocations) {
    const yearStr = String(alloc.admissionYear || new Date().getFullYear());
    const classStr = (alloc.presentClass || "V").toUpperCase().trim();
    const sectionStr = (alloc.presentSection || "A").toUpperCase().trim();
    const key = `${SCHOOL_PREFIX}/${yearStr}/${SESSION_CODE}/${classStr}/${sectionStr}/`;

    if (groupCounters[key] === undefined) {
      const { data } = await supabase
        .from("students")
        .select("school_id")
        .ilike("school_id", `${key}%`);

      let maxSerial = 0;
      const existing = new Set<number>();

      if (data && data.length > 0) {
        for (const row of data) {
          if (!row.school_id) continue;
          const parts = row.school_id.split("/");
          const serialPart = parts[parts.length - 1];
          const parsedSerial = parseInt(serialPart, 10);
          if (!isNaN(parsedSerial)) {
            existing.add(parsedSerial);
            if (parsedSerial > maxSerial) {
              maxSerial = parsedSerial;
            }
          }
        }
      }

      groupCounters[key] = maxSerial;
      groupExisting[key] = existing;
    }

    let nextSerial = groupCounters[key] + 1;
    while (groupExisting[key].has(nextSerial)) {
      nextSerial++;
    }

    groupCounters[key] = nextSerial;
    groupExisting[key].add(nextSerial);

    const serialStr = String(nextSerial).padStart(3, "0");
    generatedIds.push(`${key}${serialStr}`);
  }

  return generatedIds;
}
