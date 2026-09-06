import { createClient as createServerClient } from "@/lib/supabase/server";
import {
  SCHOOL_PREFIX,
  formatRegisterNo,
  formatRollNo,
  buildSchoolId,
} from "@/lib/utils/school-id";

export {
  SCHOOL_PREFIX,
  formatRegisterNo,
  formatRollNo,
  buildSchoolId,
};

/**
 * Server-side atomic generator for unique permanent School IDs.
 * Format: MHS/YYYY/REGISTER_NO/CLASS/SECTION/ROLL_NO
 * 
 * Example: MHS/2026/01/V/A/001
 */
export async function generateSchoolId(
  admissionYear: number,
  presentClass: string,
  presentSection: string,
  presentRoll?: number | string,
  registerNo: number | string = 1
): Promise<string> {
  const supabase = await createServerClient();
  const yearStr = String(admissionYear || new Date().getFullYear());
  const classStr = (presentClass || "V").toUpperCase().trim();
  const sectionStr = (presentSection || "A").toUpperCase().trim();
  const regFormatted = formatRegisterNo(registerNo);

  // If a valid roll number is provided, format and return directly
  if (presentRoll !== undefined && presentRoll !== null && presentRoll !== "" && Number(presentRoll) > 0) {
    return buildSchoolId(yearStr, regFormatted, classStr, sectionStr, presentRoll);
  }

  // Pattern prefix: MHS/YYYY/REG/CLASS/SECTION/
  const prefix = `${SCHOOL_PREFIX}/${yearStr}/${regFormatted}/${classStr}/${sectionStr}/`;

  // 1. Try atomic database RPC function if installed
  try {
    const { data: rpcId, error: rpcError } = await supabase.rpc("next_school_id", { prefix });
    if (!rpcError && rpcId && typeof rpcId === "string") {
      return rpcId;
    }
  } catch {
    // Fall back to query-based generation
  }

  // 2. Resilient fallback query: Find all existing school_ids with this prefix to get the maximum serial/roll
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

  // Find the next available unallocated roll number
  let nextRoll = maxSerial + 1;
  while (existingSerials.has(nextRoll)) {
    nextRoll++;
  }

  const formattedRoll = formatRollNo(nextRoll);
  return `${prefix}${formattedRoll}`;
}

/**
 * Batch generator to allocate N sequential school IDs safely in memory for bulk insert.
 */
export async function generateBatchSchoolIds(
  allocations: Array<{ 
    admissionYear: number; 
    presentClass: string; 
    presentSection: string;
    presentRoll?: number | string;
    registerNo?: number | string;
  }>
): Promise<string[]> {
  const supabase = await createServerClient();
  const generatedIds: string[] = [];

  // Group by (year, regNo, class, section) to calculate starting counters
  const groupCounters: Record<string, number> = {};
  const groupExisting: Record<string, Set<number>> = {};

  for (const alloc of allocations) {
    const yearStr = String(alloc.admissionYear || new Date().getFullYear());
    const classStr = (alloc.presentClass || "V").toUpperCase().trim();
    const sectionStr = (alloc.presentSection || "A").toUpperCase().trim();
    const regFormatted = formatRegisterNo(alloc.registerNo || 1);

    if (alloc.presentRoll !== undefined && alloc.presentRoll !== null && alloc.presentRoll !== "" && Number(alloc.presentRoll) > 0) {
      generatedIds.push(buildSchoolId(yearStr, regFormatted, classStr, sectionStr, alloc.presentRoll));
      continue;
    }

    const key = `${SCHOOL_PREFIX}/${yearStr}/${regFormatted}/${classStr}/${sectionStr}/`;

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

    const rollStr = formatRollNo(nextSerial);
    generatedIds.push(`${key}${rollStr}`);
  }

  return generatedIds;
}
