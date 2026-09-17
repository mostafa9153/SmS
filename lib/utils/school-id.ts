export const SCHOOL_PREFIX = "MHS";
export const DEFAULT_SCHOOL_PREFIX = "MHS";

/**
 * Extracts a clean short school prefix from school profile or school code.
 * E.g. "MHS-1965" -> "MHS", "ABC" -> "ABC"
 */
export function getSchoolPrefix(customCode?: string): string {
  if (customCode && customCode.trim()) {
    const cleaned = customCode.trim().split(/[-_\s]/)[0];
    return cleaned.toUpperCase() || DEFAULT_SCHOOL_PREFIX;
  }
  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem("sms_school_profile");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.schoolCode) {
          const cleaned = String(parsed.schoolCode).trim().split(/[-_\s]/)[0];
          return cleaned.toUpperCase() || DEFAULT_SCHOOL_PREFIX;
        }
      }
    } catch {
      // Fallback
    }
  }
  return DEFAULT_SCHOOL_PREFIX;
}

/**
 * Normalizes class strings to clean Roman or standard numerals:
 * e.g. "Class IX" -> "IX", "class 5" -> "V", "10" -> "X"
 */
export function normalizeClassForId(className?: string): string {
  if (!className) return "V";
  const upper = className.toString().toUpperCase().trim().replace(/^CLASS\s+/i, "").replace(/^STD\s+/i, "");
  const numToRoman: Record<string, string> = {
    "1": "I", "2": "II", "3": "III", "4": "IV", "5": "V",
    "6": "VI", "7": "VII", "8": "VIII", "9": "IX", "10": "X",
    "11": "XI", "12": "XII",
  };
  if (numToRoman[upper]) return numToRoman[upper];
  return upper || "V";
}

/**
 * Helper to format Register Number / Admission Number:
 * - Keeps standard value, cleans spaces and slashes
 */
export function formatRegisterNo(regNo?: number | string): string {
  if (regNo === undefined || regNo === null || regNo === "") return "01";
  const str = String(regNo).trim().replace(/[^a-zA-Z0-9_-]/g, "");
  return str || "01";
}

export function formatRollNo(roll?: number | string): string {
  const num = typeof roll === "string" ? parseInt(roll, 10) : roll;
  const validNum = isNaN(num as number) || (num as number) <= 0 ? 1 : num;
  const str = String(validNum);
  return str.length < 3 ? str.padStart(3, "0") : str;
}

/**
 * Builds standard School Student ID:
 * Format: [SCHOOL_CODE] / [CLASS] / [FIRST_ADMISSION_YEAR] / [REGISTER_NUMBER]
 * 
 * Example: MHS/IX/2024/105
 * Example: MHS/V/2026/01
 */
export function buildSchoolId(
  classStr: string = "V",
  admissionYear: number | string = new Date().getFullYear(),
  registerNo: number | string = "01",
  schoolCode: string = DEFAULT_SCHOOL_PREFIX
): string {
  const prefix = getSchoolPrefix(schoolCode);
  const cls = normalizeClassForId(classStr);
  const year = String(admissionYear || new Date().getFullYear()).replace(/\D/g, "").slice(0, 4) || String(new Date().getFullYear());
  const reg = formatRegisterNo(registerNo);
  return `${prefix}/${cls}/${year}/${reg}`;
}

export interface ParsedSchoolId {
  prefix: string;
  classStr: string;
  year: string;
  registerNo: string;
  sectionStr?: string;
  rollStr?: string;
  isLegacyFormat: boolean;
}

/**
 * Parses any existing or new school ID into component parts
 */
export function parseSchoolId(val: string, defaultPrefix: string = DEFAULT_SCHOOL_PREFIX): ParsedSchoolId {
  const currentYear = String(new Date().getFullYear());
  if (!val || typeof val !== "string") {
    return {
      prefix: defaultPrefix,
      classStr: "V",
      year: currentYear,
      registerNo: "01",
      isLegacyFormat: false,
    };
  }

  const parts = val.split("/").map((p) => p.trim());

  // 1. New standard 4-part format: MHS/IX/2024/105
  if (parts.length === 4) {
    const isYearPart2 = /^\d{4}$/.test(parts[2]);
    if (isYearPart2) {
      return {
        prefix: parts[0] || defaultPrefix,
        classStr: parts[1] || "V",
        year: parts[2] || currentYear,
        registerNo: parts[3] || "01",
        isLegacyFormat: false,
      };
    }
    // Variant: MHS/2024/IX/105
    if (/^\d{4}$/.test(parts[1])) {
      return {
        prefix: parts[0] || defaultPrefix,
        year: parts[1] || currentYear,
        classStr: parts[2] || "V",
        registerNo: parts[3] || "01",
        isLegacyFormat: false,
      };
    }
  }

  // 2. Legacy 6-part format: MHS/2026/01/V/A/001
  if (parts.length >= 6) {
    return {
      prefix: parts[0] || defaultPrefix,
      year: parts[1] || currentYear,
      registerNo: parts[2] || "01",
      classStr: parts[3] || "V",
      sectionStr: parts[4] || "A",
      rollStr: parts[5] || "001",
      isLegacyFormat: true,
    };
  }

  // 3. Legacy 5-part format: 2026/01/V/A/001
  if (parts.length === 5) {
    return {
      prefix: defaultPrefix,
      year: parts[0] || currentYear,
      registerNo: parts[1] || "01",
      classStr: parts[2] || "V",
      sectionStr: parts[3] || "A",
      rollStr: parts[4] || "001",
      isLegacyFormat: true,
    };
  }

  // 4. Fallback: single or partial string
  return {
    prefix: parts[0] || defaultPrefix,
    classStr: parts[1] || "V",
    year: parts[2] || currentYear,
    registerNo: parts[3] || "01",
    isLegacyFormat: false,
  };
}
