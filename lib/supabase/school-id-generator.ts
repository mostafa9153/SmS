import { createAdminClient } from "@/lib/supabase/admin";
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
 * Server-side generator for unique permanent School IDs.
 * Format: [SCHOOL_CODE] / [CLASS] / [FIRST_ADMISSION_YEAR] / [REGISTER_NUMBER]
 * 
 * Example: MHS/IX/2026/01
 */
export async function generateSchoolId(
  admissionYear: number,
  presentClass: string,
  presentSection: string,
  presentRoll?: number | string,
  registerNo?: number | string,
  schoolCode: string = SCHOOL_PREFIX
): Promise<string> {
  const yearNum = Number(admissionYear || new Date().getFullYear());
  const yearStr = String(yearNum);
  const classStr = (presentClass || "V").toUpperCase().trim();

  let cleanReg = registerNo ? String(registerNo).trim() : "";

  // If registerNo is missing, default '01', or contains application tracking ADM-/APP-, calculate next sequential year serial number
  if (!cleanReg || /^ADM-?/i.test(cleanReg) || /^APP-?/i.test(cleanReg) || cleanReg === "01") {
    try {
      const supabase = createAdminClient();
      const { count } = await supabase
        .from("students")
        .select("id", { count: "exact", head: true })
        .eq("admission_year", yearNum);

      const nextSeq = (count || 0) + 1;
      cleanReg = String(nextSeq).padStart(2, "0");
    } catch {
      cleanReg = "01";
    }
  }

  const regFormatted = formatRegisterNo(cleanReg);
  return buildSchoolId(classStr, yearStr, regFormatted, schoolCode);
}

/**
 * Batch generator to allocate N sequential school IDs in memory for bulk insert.
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
  const supabase = createAdminClient();
  const generatedIds: string[] = [];
  const yearCounts = new Map<number, number>();

  for (const alloc of allocations) {
    const yearNum = Number(alloc.admissionYear || new Date().getFullYear());
    const yearStr = String(yearNum);
    const classStr = (alloc.presentClass || "V").toUpperCase().trim();

    let cleanReg = alloc.registerNo ? String(alloc.registerNo).trim() : "";

    if (!cleanReg || /^ADM-?/i.test(cleanReg) || /^APP-?/i.test(cleanReg)) {
      if (!yearCounts.has(yearNum)) {
        try {
          const { count } = await supabase
            .from("students")
            .select("id", { count: "exact", head: true })
            .eq("admission_year", yearNum);
          yearCounts.set(yearNum, (count || 0) + 1);
        } catch {
          yearCounts.set(yearNum, 1);
        }
      } else {
        yearCounts.set(yearNum, (yearCounts.get(yearNum) || 1) + 1);
      }
      cleanReg = String(yearCounts.get(yearNum)).padStart(2, "0");
    }

    const regFormatted = formatRegisterNo(cleanReg);
    generatedIds.push(buildSchoolId(classStr, yearStr, regFormatted));
  }

  return generatedIds;
}
