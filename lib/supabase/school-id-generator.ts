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
 * Server-side generator for unique permanent School IDs.
 * Format: [SCHOOL_CODE] / [CLASS] / [FIRST_ADMISSION_YEAR] / [REGISTER_NUMBER]
 * 
 * Example: MHS/IX/2024/105
 */
export async function generateSchoolId(
  admissionYear: number,
  presentClass: string,
  presentSection: string,
  presentRoll?: number | string,
  registerNo: number | string = "01",
  schoolCode: string = SCHOOL_PREFIX
): Promise<string> {
  const yearStr = String(admissionYear || new Date().getFullYear());
  const classStr = (presentClass || "V").toUpperCase().trim();
  const regFormatted = formatRegisterNo(registerNo);

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
  const generatedIds: string[] = [];

  for (const alloc of allocations) {
    const yearStr = String(alloc.admissionYear || new Date().getFullYear());
    const classStr = (alloc.presentClass || "V").toUpperCase().trim();
    const regFormatted = formatRegisterNo(alloc.registerNo || "01");

    generatedIds.push(buildSchoolId(classStr, yearStr, regFormatted));
  }

  return generatedIds;
}
