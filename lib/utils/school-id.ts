export const SCHOOL_PREFIX = "MHS";

/**
 * Helper to format Register Number (School Hard Copy Book/Register No):
 * - Minimum 2 digits: "01", "02", ... "99"
 * - Automatically expands to 3 digits if > 99: "100", "101", ... "999"
 * - Expands further if > 999: "1000", ...
 */
export function formatRegisterNo(regNo: number | string = 1): string {
  const num = typeof regNo === "string" ? parseInt(regNo, 10) : regNo;
  const validNum = isNaN(num) || num <= 0 ? 1 : num;
  const str = String(validNum);
  return str.length < 2 ? str.padStart(2, "0") : str;
}

/**
 * Helper to format Roll Number:
 * - Minimum 3 digits padded: "001", "002", "012", "100", "1000"
 */
export function formatRollNo(roll: number | string = 1): string {
  const num = typeof roll === "string" ? parseInt(roll, 10) : roll;
  const validNum = isNaN(num) || num <= 0 ? 1 : num;
  const str = String(validNum);
  return str.length < 3 ? str.padStart(3, "0") : str;
}

/**
 * Builds standard School ID:
 * Format: MHS/[YEAR]/[REGISTER_NO]/[CLASS]/[SECTION]/[ROLL_NO]
 * 
 * Example: MHS/2026/01/V/A/001
 * Example (Reg 105, Roll 45): MHS/2026/105/X/B/045
 */
export function buildSchoolId(
  year: number | string,
  registerNo: number | string = 1,
  classStr: string = "V",
  sectionStr: string = "A",
  rollNo: number | string = 1,
  prefix: string = SCHOOL_PREFIX
): string {
  const p = (prefix || SCHOOL_PREFIX).trim().toUpperCase();
  const y = String(year || new Date().getFullYear());
  const reg = formatRegisterNo(registerNo);
  const cls = (classStr || "V").toUpperCase().trim();
  const sec = (sectionStr || "A").toUpperCase().trim();
  const roll = formatRollNo(rollNo);
  return `${p}/${y}/${reg}/${cls}/${sec}/${roll}`;
}

export function parseSchoolId(val: string, defaultPrefix: string = SCHOOL_PREFIX) {
  if (!val || typeof val !== "string") {
    const currentYear = String(new Date().getFullYear());
    return {
      prefix: defaultPrefix,
      year: currentYear,
      registerNo: "01",
      classStr: "V",
      sectionStr: "A",
      rollStr: "001",
    };
  }

  const parts = val.split("/").map((p) => p.trim());
  if (parts.length >= 6) {
    return {
      prefix: parts[0] || defaultPrefix,
      year: parts[1] || String(new Date().getFullYear()),
      registerNo: parts[2] || "01",
      classStr: parts[3] || "V",
      sectionStr: parts[4] || "A",
      rollStr: parts[5] || "001",
    };
  } else if (parts.length === 5) {
    return {
      prefix: defaultPrefix,
      year: parts[0] || String(new Date().getFullYear()),
      registerNo: parts[1] || "01",
      classStr: parts[2] || "V",
      sectionStr: parts[3] || "A",
      rollStr: parts[4] || "001",
    };
  }

  const hyphenParts = val.split("-").map((p) => p.trim());
  if (hyphenParts.length >= 3) {
    return {
      prefix: hyphenParts[0] || defaultPrefix,
      year: hyphenParts[1] || String(new Date().getFullYear()),
      registerNo: "01",
      classStr: "V",
      sectionStr: "A",
      rollStr: hyphenParts[2] || "001",
    };
  }

  return {
    prefix: defaultPrefix,
    year: String(new Date().getFullYear()),
    registerNo: "01",
    classStr: "V",
    sectionStr: "A",
    rollStr: "001",
  };
}
