import type { BulkPreviewRow, ColumnMapping, Student, StudentStatus, ValidationIssue } from "@/lib/types";
import { applyStudentEntryDefaults } from "@/lib/utils/student-entry-presets";
import { normalizeClass, normalizeDate, normalizeGender, normalizeSocialCategory, normalizeStatus } from "./normalizers";

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
): Array<Partial<Student>> {
  const currentYear = new Date().getFullYear();

  return rawRows.map((row) => {
    const student: Partial<Student> = {
      admissionYear: defaultSessionYear || currentYear,
      currentStatus: defaultStatus || "Continuing",
    };

    if (defaultClass && defaultClass !== "AUTO") {
      student.presentClass = normalizeClass(defaultClass);
    }

    if (defaultSection && defaultSection !== "AUTO") {
      student.presentSection = defaultSection.toUpperCase().trim();
    }

    for (const [header, fieldKey] of Object.entries(mapping)) {
      if (fieldKey === "ignore") continue;
      const rawVal = row[header];
      if (rawVal === undefined || rawVal === null || rawVal === "") continue;

      if (fieldKey === "dob") {
        student.dob = normalizeDate(rawVal);
      } else if (fieldKey === "gender") {
        student.gender = normalizeGender(rawVal);
      } else if (fieldKey === "presentClass") {
        student.presentClass = normalizeClass(rawVal);
      } else if (fieldKey === "currentStatus") {
        student.currentStatus = normalizeStatus(rawVal, defaultStatus || "Continuing");
      } else if (fieldKey === "presentRoll") {
        const rollNum = parseInt(String(rawVal).replace(/\D/g, ""), 10);
        student.presentRoll = isNaN(rollNum) ? 1 : rollNum;
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
        (student as any)[fieldKey] = normalizeDate(rawVal);
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

    return applyStudentEntryDefaults(student);
  });
}

/**
 * Client-side validation: checks for in-file duplicates and Class vs DOB mismatches.
 */
export function validateMappedRows(rows: Array<Partial<Student>>): {
  issues: ValidationIssue[];
  previewRows: BulkPreviewRow[];
} {
  const issues: ValidationIssue[] = [];
  const previewRows: BulkPreviewRow[] = [];

  const seenPens = new Map<string, number>();
  const seenAadhaars = new Map<string, number>();
  const seenSchoolIds = new Map<string, number>();

  const currentYear = new Date().getFullYear();

  for (let idx = 0; idx < rows.length; idx++) {
    const r = rows[idx];
    const rowNum = idx + 2;
    const rowWarnings: string[] = [];
    const rowErrors: string[] = [];

    // 1. Check required Name
    if (!r.name || r.name.trim().length === 0) {
      issues.push({
        row: rowNum,
        field: "name",
        issue: "Student Name is missing",
        severity: "error",
      });
      rowErrors.push("Missing Name");
    }

    // 2. Check DOB & Class-Age plausibility
    if (!r.dob) {
      issues.push({
        row: rowNum,
        field: "dob",
        issue: "Date of Birth is missing",
        severity: "warning",
        studentName: r.name,
      });
      rowWarnings.push("Missing DOB");
    } else {
      const birthYear = new Date(r.dob).getFullYear();
      const age = currentYear - birthYear;

      if (age < 3 || age > 25) {
        issues.push({
          row: rowNum,
          field: "dob",
          issue: `Unusual age calculated (${age} years) from DOB ${r.dob}`,
          severity: "warning",
          studentName: r.name,
        });
        rowWarnings.push(`Age ${age} yrs`);
      }

      // Class vs Age sanity check (e.g. Class V should typically be 9-13)
      if (r.presentClass === "V" && age > 15) {
        issues.push({
          row: rowNum,
          field: "presentClass",
          issue: `Class V student has unusually high age (${age} yrs)`,
          severity: "warning",
          studentName: r.name,
        });
        rowWarnings.push("Class/Age mismatch");
      }
    }

    // 3. In-file duplicate checks
    if (r.pen) {
      const cleanPen = r.pen.toUpperCase().trim();
      if (seenPens.has(cleanPen)) {
        issues.push({
          row: rowNum,
          field: "pen",
          issue: `Duplicate PEN "${cleanPen}" (also on row ${seenPens.get(cleanPen)})`,
          severity: "error",
          studentName: r.name,
        });
        rowErrors.push("Duplicate PEN");
      } else {
        seenPens.set(cleanPen, rowNum);
      }
    }

    if (r.aadhaar && r.aadhaar.length === 12) {
      if (seenAadhaars.has(r.aadhaar)) {
        issues.push({
          row: rowNum,
          field: "aadhaar",
          issue: `Duplicate Aadhaar "${r.aadhaar}" (also on row ${seenAadhaars.get(r.aadhaar)})`,
          severity: "warning",
          studentName: r.name,
        });
        rowWarnings.push("Duplicate Aadhaar");
      } else {
        seenAadhaars.set(r.aadhaar, rowNum);
      }
    }

    if (r.schoolId) {
      const cleanSid = r.schoolId.toUpperCase().trim();
      if (seenSchoolIds.has(cleanSid)) {
        issues.push({
          row: rowNum,
          field: "schoolId",
          issue: `Duplicate School ID "${cleanSid}" in file (row ${seenSchoolIds.get(cleanSid)})`,
          severity: "warning",
          studentName: r.name,
        });
        rowWarnings.push("Duplicate School ID");
      } else {
        seenSchoolIds.set(cleanSid, rowNum);
      }
    }

    // Build preview row
    previewRows.push({
      rowNumber: rowNum,
      action:
        r.schoolId || r.pen || (r.aadhaar && r.aadhaar !== "PENDING_RECORD") || r.studentUniqueCode
          ? "update"
          : "create",
      name: r.name || "Unknown",
      schoolId: r.schoolId,
      pen: r.pen,
      aadhaar: r.aadhaar,
      presentClass: r.presentClass || "V",
      presentSection: r.presentSection || "A",
      presentRoll: r.presentRoll || 1,
      data: r,
      warnings: rowWarnings,
      errors: rowErrors,
    });
  }

  return { issues, previewRows };
}
