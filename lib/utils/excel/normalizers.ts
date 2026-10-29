import type { StudentStatus } from "@/lib/types";

/**
 * Normalizes date inputs from Excel formats (e.g. DD/MM/YYYY, YYYY-MM-DD, Excel Serial) to ISO "YYYY-MM-DD".
 */
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
    // DD/MM/YYYY or DD-MM-YYYY
    const ddmmyyyy = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
    if (ddmmyyyy) {
      const day = ddmmyyyy[1].padStart(2, "0");
      const month = ddmmyyyy[2].padStart(2, "0");
      const year = ddmmyyyy[3];
      return `${year}-${month}-${day}`;
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
 * Normalizes Class into standard Roman/String format.
 */
export function normalizeClass(val: any): string {
  const str = String(val || "").trim().toUpperCase();
  const romanMap: Record<string, string> = {
    "5": "V", "6": "VI", "7": "VII", "8": "VIII", "9": "IX", "10": "X", "11": "XI", "12": "XII",
    "CLASS 5": "V", "CLASS 6": "VI", "CLASS 7": "VII", "CLASS 8": "VIII", "CLASS 9": "IX", "CLASS 10": "X", "CLASS 11": "XI", "CLASS 12": "XII",
    "CLASS V": "V", "CLASS VI": "VI", "CLASS VII": "VII", "CLASS VIII": "VIII", "CLASS IX": "IX", "CLASS X": "X", "CLASS XI": "XI", "CLASS XII": "XII",
  };
  return romanMap[str] || str;
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
