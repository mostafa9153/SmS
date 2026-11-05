import type { BulkPreviewRow, ColumnMapping, Student, StudentStatus, ValidationIssue } from "@/lib/types";
import { normalizeClass, normalizeGender, normalizeSocialCategory, normalizeStatus, splitClassSection, toIsoDate } from "./normalizers";

// Cells that mean "nothing here": placeholders and masked values (UDISE shows "********0184")
const BLANK_CELLS = new Set([
  "na", "n/a", "n.a", "n.a.", "nil", "none", "null", "-", "--", "/", ".", "0000-00-00",
  "not defined", "not applicable", "not available", "select", "unknown blood group",
]);
function cleanCell(value: unknown): unknown {
  if (Array.isArray(value)) return value;
  const str = String(value ?? "").trim();
  if (!str || BLANK_CELLS.has(str.toLowerCase()) || str.includes("**")) return "";
  return str;
}

// UDISE prefixes coded values with their code: "1 - MUSLIM", "1 - Bengali - Bengali"
const CODED_FIELDS = new Set(["motherTongue", "minorityGroup", "religion", "socialCategory", "impairmentType", "mediumOfInstruction"]);
function stripCode(value: string): string {
  const parts = value.replace(/^\d+\s*-\s*/, "").split(/\s+-\s+/).map((p) => p.trim()).filter(Boolean);
  const unique = parts.filter((p, i) => parts.findIndex((q) => q.toLowerCase() === p.toLowerCase()) === i);
  const text = unique.join(" - ");
  return text === text.toUpperCase() ? text.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()) : text;
}

const RELIGION_BY_MINORITY: Record<string, string> = {
  muslim: "Islam", christian: "Christianity", sikh: "Sikhism", buddhist: "Buddhism", jain: "Jainism",
};

const DATE_LABELS: Record<string, string> = {
  admissionDate: "Admission Date",
  presentClassAdmissionDate: "Present Class Admission Date",
  mainstreamedDate: "Mainstreamed Date",
};

/** A mapped row, with notes on cells that could not be read (never sent to the server). */
export type MappedRow = Partial<Student> & {
  _notes?: Array<{ field: string; text: string }>;
  /** Fields the upload settings filled (no sheet column): applied to new students only */
  _defaults?: string[];
};

export const VALID_CLASSES = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];

/**
 * Transforms raw excel rows into structured student payloads based on mapping.
 */
export function applyMapping(
  rawRows: Record<string, any>[],
  mapping: ColumnMapping,
  defaultSessionYear?: number,
  defaultClass?: string,
  defaultSection?: string,
  defaultStatus?: StudentStatus
): MappedRow[] {
  const currentYear = new Date().getFullYear();

  return rawRows.map((row) => {
    const student: Partial<Student> = {
      admissionYear: defaultSessionYear || currentYear,
      currentStatus: defaultStatus || "Continuing",
    };
    // Cells that could not be read: the field stays blank and the preview warns about it
    const notes: Array<{ field: string; text: string }> = [];
    const fromSheet = new Set<string>();

    if (defaultClass && defaultClass !== "AUTO") {
      student.presentClass = normalizeClass(defaultClass);
    }

    if (defaultSection && defaultSection !== "AUTO") {
      student.presentSection = defaultSection.toUpperCase().trim();
    }

    for (const [header, fieldKey] of Object.entries(mapping)) {
      if (fieldKey === "ignore") continue;
      let rawVal = cleanCell(row[header]);
      if (rawVal === "") continue;
      if (CODED_FIELDS.has(fieldKey) && typeof rawVal === "string") rawVal = stripCode(rawVal);
      fromSheet.add(fieldKey);

      if (fieldKey === "dob") {
        const iso = toIsoDate(rawVal);
        if (iso) student.dob = iso;
        else notes.push({ field: "dob", text: `Date of Birth "${rawVal}" is not a date, left blank` });
      } else if (fieldKey === "gender") {
        student.gender = normalizeGender(rawVal);
      } else if (fieldKey === "presentClass" || fieldKey === "previousClass") {
        // "5", "V", "Class-5", "VI-A": an unreadable class is left empty, never guessed
        const { cls, section } = splitClassSection(rawVal);
        if (cls) {
          student[fieldKey] = cls;
          if (fieldKey === "presentClass" && section && !student.presentSection) student.presentSection = section;
        } else if (fieldKey === "presentClass") {
          notes.push({ field: "presentClass", text: `Class "${rawVal}" not recognised, left blank` });
        }
      } else if (fieldKey === "currentStatus") {
        student.currentStatus = normalizeStatus(rawVal, defaultStatus || "Continuing");
      } else if (fieldKey === "presentRoll") {
        const rollNum = parseInt(String(rawVal).replace(/\D/g, ""), 10);
        if (!isNaN(rollNum)) student.presentRoll = rollNum;
      } else if (fieldKey === "admissionYear") {
        const yr = parseInt(String(rawVal).replace(/\D/g, ""), 10);
        student.admissionYear = isNaN(yr) ? new Date().getFullYear() : yr;
      } else if (fieldKey === "academicYear") {
        const strVal = String(rawVal).trim();
        student.academicYear = strVal;
        const yrMatch = strVal.match(/\b(20\d{2})\b/);
        if (yrMatch && !student.admissionYear) {
          student.admissionYear = parseInt(yrMatch[1], 10);
        }
      } else if (fieldKey === "bankIfsc") {
        student.bankIfsc = String(rawVal).trim().toUpperCase();
      } else if (fieldKey === "hasAadhaar") {
        const rawStr = String(rawVal).trim().toLowerCase();
        if (["yes", "y", "true", "1"].includes(rawStr)) {
          student.hasAadhaar = "Yes";
        } else if (["no", "n", "false", "0"].includes(rawStr)) {
          student.hasAadhaar = "No";
          if (!student.aadhaar) student.aadhaar = "";
        } else {
          student.hasAadhaar = String(rawVal).trim();
        }
      } else if (fieldKey === "aadhaar") {
        const rawStr = String(rawVal).trim();
        const digitsOnly = rawStr.replace(/\D/g, "");
        if (digitsOnly.length === 12) {
          student.aadhaar = digitsOnly;
          if (!student.hasAadhaar) student.hasAadhaar = "Yes";
        } else if (["yes", "y", "true", "1"].includes(rawStr.toLowerCase())) {
          student.hasAadhaar = "Yes";
        } else if (["no", "n", "false", "0"].includes(rawStr.toLowerCase())) {
          student.hasAadhaar = "No";
          student.aadhaar = "";
        } else {
          student.aadhaar = digitsOnly || rawStr;
        }
      } else if (fieldKey === "socialCategory") {
        student.socialCategory = normalizeSocialCategory(rawVal);
      } else if (fieldKey === "studentContact" || fieldKey === "altMobile") {
        const str = String(rawVal).trim();
        const digits = str.replace(/\D/g, "");
        if (digits.length >= 7) {
          student[fieldKey] = digits;
        } else if (/[a-zA-Z]/.test(str) && !student.guardianName) {
          // Handle BSP files where column labeled "Guardian Number" contains Guardian Name (e.g. REJAUL LASKAR)
          student.guardianName = str;
        }
      } else if (
        fieldKey === "isCwsn" ||
        fieldKey === "isAay" ||
        fieldKey === "isEws" ||
        fieldKey === "indianNationality" ||
        fieldKey === "hasDisabilityCertificate" ||
        fieldKey === "isOutOfSchool" ||
        fieldKey === "previousAppearedForExams" ||
        fieldKey === "rteSection12C" ||
        fieldKey === "ncc" ||
        fieldKey === "nss" ||
        fieldKey === "scoutsGuides"
      ) {
        const s = String(rawVal).trim().toLowerCase();
        (student as any)[fieldKey] = ["yes", "y", "true", "1", "t"].includes(s);
      } else if (
        fieldKey === "heightCm" ||
        fieldKey === "weightKg" ||
        fieldKey === "annualFamilyIncome" ||
        fieldKey === "previousRollNo" ||
        fieldKey === "previousMarksPercent" ||
        fieldKey === "disabilityPercentage" ||
        fieldKey === "previousDaysAttended" ||
        fieldKey === "rteAmountClaimed" ||
        fieldKey === "distanceToSchool"
      ) {
        const num = parseFloat(String(rawVal).replace(/[^\d.]/g, ""));
        (student as any)[fieldKey] = isNaN(num) ? undefined : num;
      } else if (
        fieldKey === "admissionDate" ||
        fieldKey === "presentClassAdmissionDate" ||
        fieldKey === "mainstreamedDate"
      ) {
        const iso = toIsoDate(rawVal);
        if (iso) (student as any)[fieldKey] = iso;
        else notes.push({ field: fieldKey, text: `${DATE_LABELS[fieldKey]} "${rawVal}" is not a date, left blank` });
      } else if (
        fieldKey === "languageGroup" ||
        fieldKey === "mandatorySubjects" ||
        fieldKey === "additionalSubjects" ||
        fieldKey === "coCurricularSubjects" ||
        fieldKey === "facilitiesProvided" ||
        fieldKey === "cwsnFacilities" ||
        fieldKey === "competitionsOlympiads"
      ) {
        if (Array.isArray(rawVal)) {
          (student as any)[fieldKey] = rawVal;
        } else {
          const arr = String(rawVal)
            .split(/[,;\n/]+/)
            .map((s) => s.trim())
            .filter(Boolean);
          (student as any)[fieldKey] = arr;
        }
      } else if (
        fieldKey === "wbbseRegNo" ||
        fieldKey === "wbchseRegNo" ||
        fieldKey === "boardRegistrationNo"
      ) {
        const trimmedVal = String(rawVal).trim();
        student.boardRegistrationNo = trimmedVal;
        (student as any)[fieldKey] = trimmedVal;
      } else if (
        fieldKey === "wbbseRollNo" ||
        fieldKey === "wbchseRollNo" ||
        fieldKey === "boardRollNo"
      ) {
        const trimmedVal = String(rawVal).trim();
        student.boardRollNo = trimmedVal;
        (student as any)[fieldKey] = trimmedVal;
      } else {
        (student as any)[fieldKey] = String(rawVal).trim();
      }
    }

    // UDISE gives the minority group, not the religion
    const fromMinority = RELIGION_BY_MINORITY[(student.minorityGroup || "").trim().toLowerCase()];
    if (!student.religion && fromMinority) student.religion = fromMinority;

    // No entry defaults here: a blank cell stays blank
    if (notes.length) (student as MappedRow)._notes = notes;
    const defaults = ["admissionYear", "currentStatus"].filter((k) => !fromSheet.has(k));
    if (defaults.length) (student as MappedRow)._defaults = defaults;
    return student;
  });
}

// Identifiers that point at one student: a repeat in the same file would update one student twice
const IDENTITY_FIELDS = [
  { key: "pen", label: "PEN" },
  { key: "studentUniqueCode", label: "Banglar Shiksha ID" },
  { key: "schoolId", label: "School ID" },
  { key: "aadhaar", label: "Aadhaar" },
] as const;

/**
 * Client-side validation: unreadable cells, in-file duplicates and Class vs DOB mismatches.
 * Only a missing name blocks a row; everything else is imported as it is and reported.
 * `rowNumbers` are the sheet's own row numbers (blank rows are not in `rows`).
 */
export function validateMappedRows(
  rows: MappedRow[],
  rowNumbers?: number[]
): {
  issues: ValidationIssue[];
  previewRows: BulkPreviewRow[];
} {
  const issues: ValidationIssue[] = [];
  const previewRows: BulkPreviewRow[] = [];
  const seen = new Map<string, Map<string, number>>(IDENTITY_FIELDS.map((f) => [f.key, new Map()]));
  const currentYear = new Date().getFullYear();

  for (let idx = 0; idx < rows.length; idx++) {
    const r = rows[idx];
    const rowNum = rowNumbers?.[idx] ?? idx + 2;
    const rowWarnings: string[] = [];
    const rowErrors: string[] = [];
    const warn = (field: string, issue: string, short: string) => {
      issues.push({ row: rowNum, field, issue, severity: "warning", studentName: r.name });
      rowWarnings.push(short);
    };

    if (!r.name || r.name.trim().length === 0) {
      issues.push({ row: rowNum, field: "name", issue: "Student Name is missing", severity: "error" });
      rowErrors.push("Missing Name");
    }

    // An unreadable cell is reported once, not again as "missing"
    const unreadable = new Set((r._notes || []).map((n) => n.field));
    for (const note of r._notes || []) warn(note.field, note.text, "Unreadable cell");

    if (!r.dob) {
      if (!unreadable.has("dob")) warn("dob", "Date of Birth is missing", "Missing DOB");
    } else {
      const age = currentYear - new Date(r.dob).getFullYear();
      if (age < 3 || age > 25) warn("dob", `Unusual age calculated (${age} years) from DOB ${r.dob}`, `Age ${age} yrs`);
      if (r.presentClass === "V" && age > 15) warn("presentClass", `Class V student has unusually high age (${age} yrs)`, "Class/Age mismatch");
    }

    if (!r.presentClass && !unreadable.has("presentClass")) warn("presentClass", "Class missing (left blank, or kept as it is for an existing student)", "No class");

    for (const { key, label } of IDENTITY_FIELDS) {
      const raw = r[key];
      if (!raw) continue;
      const value = String(raw).toUpperCase().trim();
      const firstRow = seen.get(key)!.get(value);
      if (firstRow !== undefined) {
        issues.push({
          row: rowNum,
          field: key,
          issue: `Same ${label} "${value}" as row ${firstRow}: this row is skipped`,
          severity: "error",
          studentName: r.name,
        });
        rowErrors.push(`Duplicate ${label}`);
      } else {
        seen.get(key)!.set(value, rowNum);
      }
    }

    previewRows.push({
      rowNumber: rowNum,
      action: r.schoolId || r.pen || r.aadhaar || r.studentUniqueCode ? "update" : "create",
      name: r.name || "Unknown",
      schoolId: r.schoolId,
      pen: r.pen,
      aadhaar: r.aadhaar,
      presentClass: r.presentClass || "",
      presentSection: r.presentSection || "",
      presentRoll: r.presentRoll || 0,
      data: r,
      warnings: rowWarnings,
      errors: rowErrors,
    });
  }

  return { issues, previewRows };
}
