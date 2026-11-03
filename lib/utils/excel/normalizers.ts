import type { StudentStatus } from "@/lib/types";

/**
 * Normalizes date inputs from Excel formats (e.g. DD/MM/YYYY, YYYY-MM-DD, Excel Serial) to ISO "YYYY-MM-DD".
 */
const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

/** "15" -> 2015, "98" -> 1998: a two-digit year past this year is last century */
function fullYear(y: string): number {
  if (y.length === 4) return Number(y);
  const n = Number(y);
  return n <= new Date().getFullYear() % 100 ? 2000 + n : 1900 + n;
}

export function normalizeDate(value: any): string {
  if (!value) return "";
  // Excel serial date number
  if (typeof value === "number" && value > 1000 && value < 100000) {
    const date = new Date(Math.round((value - 25569) * 86400 * 1000));
    if (!isNaN(date.getTime())) {
      return date.toISOString().split("T")[0];
    }
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!isNaN(Number(trimmed)) && Number(trimmed) > 1000 && Number(trimmed) < 100000) {
      const serial = Number(trimmed);
      const date = new Date(Math.round((serial - 25569) * 86400 * 1000));
      if (!isNaN(date.getTime())) {
        return date.toISOString().split("T")[0];
      }
    }
    // DD/MM/YYYY, DD-MM-YY, DD.MM.YYYY (MM/DD when the second part cannot be a month)
    const ddmmyyyy = trimmed.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4}|\d{2})$/);
    if (ddmmyyyy) {
      let [day, month] = [Number(ddmmyyyy[1]), Number(ddmmyyyy[2])];
      if (month > 12 && day <= 12) [day, month] = [month, day];
      return `${fullYear(ddmmyyyy[3])}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    }
    // 06-Aug-2015, 6 August 2015
    const named = trimmed.match(/^(\d{1,2})[\s/.-]*([A-Za-z]{3,9})[\s/.,-]*(\d{4}|\d{2})$/);
    const monthIdx = named ? MONTHS.indexOf(named[2].slice(0, 3).toLowerCase()) : -1;
    if (named && monthIdx >= 0) {
      return `${fullYear(named[3])}-${String(monthIdx + 1).padStart(2, "0")}-${named[1].padStart(2, "0")}`;
    }
    // YYYY-MM-DD
    const yyyymmdd = trimmed.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/);
    if (yyyymmdd) {
      const year = yyyymmdd[1];
      const month = yyyymmdd[2].padStart(2, "0");
      const day = yyyymmdd[3].padStart(2, "0");
      return `${year}-${month}-${day}`;
    }
    return trimmed;
  }
  if (value instanceof Date && !isNaN(value.getTime())) {
    return value.toISOString().split("T")[0];
  }
  return String(value);
}

/**
 * Normalizes Gender to "Male" | "Female" | "Other".
 * Handles all variations: boy, boys, b, girl, girls, g, male, female, 1, 2, regional terms, etc.
 */
export function normalizeGender(val: any): "Male" | "Female" | "Other" {
  if (val === undefined || val === null) return "Other";
  const str = String(val).trim().toLowerCase().replace(/[^a-z0-9]/g, "");
  if (!str) return "Other";

  // 1. Female variations (check first to catch words starting with 'fem' or 'gir')
  if (
    str === "f" ||
    str === "female" ||
    str === "females" ||
    str === "girl" ||
    str === "girls" ||
    str === "g" ||
    str === "woman" ||
    str === "women" ||
    str === "mahila" ||
    str === "mohila" ||
    str === "meye" ||
    str === "meyera" ||
    str === "nari" ||
    str === "daughter" ||
    str === "kumari" ||
    str === "2" ||
    str === "02" ||
    str.startsWith("fem") ||
    str.startsWith("gir")
  ) {
    return "Female";
  }

  // 2. Male variations
  if (
    str === "m" ||
    str === "male" ||
    str === "males" ||
    str === "boy" ||
    str === "boys" ||
    str === "b" ||
    str === "man" ||
    str === "men" ||
    str === "purush" ||
    str === "puroosh" ||
    str === "chele" ||
    str === "chhele" ||
    str === "son" ||
    str === "kumar" ||
    str === "1" ||
    str === "01" ||
    str.startsWith("mal") ||
    str.startsWith("boy")
  ) {
    return "Male";
  }

  // 3. Transgender / Other
  if (
    str === "t" ||
    str === "trans" ||
    str === "transgender" ||
    str === "tg" ||
    str === "other" ||
    str === "others" ||
    str === "o" ||
    str === "3" ||
    str === "03"
  ) {
    return "Other";
  }

  return "Other";
}

/**
 * Normalizes Social Category (combines OBC-A, OBC-B, OBC A, OBC B into single "OBC" category).
 */
export function normalizeSocialCategory(val: any): string {
  if (val === undefined || val === null) return "";
  const str = String(val).trim();
  if (!str) return "";

  const upper = str.toUpperCase().replace(/[\s\-_]/g, "");
  if (upper.startsWith("OBC") || upper.includes("OBC")) {
    return "OBC";
  }
  if (upper === "SC" || upper.startsWith("SCHEDULEDCASTE") || upper.startsWith("SCHEDULCASTE")) {
    return "SC";
  }
  if (upper === "ST" || upper.startsWith("SCHEDULEDTRIBE") || upper.startsWith("SCHEDULTRIBE")) {
    return "ST";
  }
  if (upper === "GEN" || upper.startsWith("GENERAL") || upper === "UNRESERVED" || upper === "UR") {
    return "General";
  }
  return str;
}

/**
 * A valid ISO date ("YYYY-MM-DD") from any accepted date input, or "" when the cell is not a date
 * ("NA", "In earlier academic year"). The database rejects anything else.
 */
export function toIsoDate(value: any): string {
  const iso = normalizeDate(value);
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return "";
  const d = new Date(`${iso}T00:00:00Z`);
  return !isNaN(d.getTime()) && d.getUTCDate() === Number(m[3]) ? iso : "";
}

const ROMAN_CLASSES = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];
const CLASS_WORDS: Record<string, number> = {
  ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5, SIX: 6, SEVEN: 7, EIGHT: 8, NINE: 9, TEN: 10, ELEVEN: 11, TWELVE: 12,
  FIRST: 1, SECOND: 2, THIRD: 3, FOURTH: 4, FIFTH: 5, SIXTH: 6, SEVENTH: 7, EIGHTH: 8, NINTH: 9, TENTH: 10, ELEVENTH: 11, TWELFTH: 12,
};
const BENGALI_DIGITS = "০১২৩৪৫৬৭৮৯";

/**
 * Reads a class and an optional section from one cell, as a number or Roman numeral:
 * "5", "05", "5.0", "5th", "Class-5", "Std V", "Five", "VI-A", "6 (B)", "IX A", "৭".
 * The class is "" when the cell cannot be read.
 */
export function splitClassSection(val: any): { cls: string; section?: string } {
  let str = String(val ?? "")
    .replace(/[০-৯]/g, (d) => String(BENGALI_DIGITS.indexOf(d)))
    .toUpperCase()
    .trim();
  str = str.replace(/^(CLASS|STD|STANDARD|GRADE)\b\.?\s*[:\-]?\s*/, "").trim();

  // class, then an optional one-letter section or a stream word ("XI ARTS")
  const m = str.match(
    /^(?:(\d{1,2})(?:\.0+)?(?:ST|ND|RD|TH)?|([IVX]{1,4})|([A-Z]{3,}))(?:\s*[-/(.:,]?\s*(?:([A-Z])|[A-Z]{2,})\)?)?$/
  );
  if (!m) return { cls: "" };
  let n: number | undefined;
  if (m[1]) n = Number(m[1]);
  else if (m[2]) n = ROMAN_CLASSES.indexOf(m[2]) + 1;
  else n = CLASS_WORDS[m[3]];
  if (!n || n < 1 || n > 12) return { cls: "" };
  return { cls: ROMAN_CLASSES[n - 1], section: m[4] };
}

/**
 * Normalizes Class into standard Roman format ("5", "Class 5", "V" -> "V"). An unreadable class is
 * returned as it was, so callers can tell it apart.
 */
export function normalizeClass(val: any): string {
  return splitClassSection(val).cls || String(val || "").trim().toUpperCase();
}

/**
 * Normalizes Student Status string to valid StudentStatus enum.
 */
export function normalizeStatus(val: any, defaultStatus: StudentStatus = "Continuing"): StudentStatus {
  if (!val) return defaultStatus;
  const str = String(val).trim().toLowerCase();
  if (str.includes("pass") || str.includes("alumni") || str.includes("graduat") || str.includes("completed") || str.includes("archive")) {
    return "Passed Out";
  }
  if (str.includes("drop") || str.includes("left") || str.includes("discontinue")) {
    return "Drop Out";
  }
  if (str.includes("sent up") || str.includes("mp") || str.includes("m.p.")) {
    return "Sent Up M.P.";
  }
  if (str.includes("cchs") || str.includes("c.c.h.s.")) {
    return "C.C.H.S.";
  }
  if (str.includes("continu") || str.includes("active") || str.includes("present") || str.includes("enrolled")) {
    return "Continuing";
  }
  return defaultStatus;
}
