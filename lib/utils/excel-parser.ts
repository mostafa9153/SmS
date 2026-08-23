import * as XLSX from "xlsx";
import type { Student, ColumnMapping, ValidationIssue, BulkPreviewRow, BulkResultRow } from "@/lib/types";

export interface ParsedExcelResult {
  sheetNames: string[];
  selectedSheet: string;
  headers: string[];
  rawRows: Record<string, any>[];
}

export interface FieldDefinition {
  key: keyof Student;
  label: string;
  category: string;
  aliases: string[];
  required?: boolean;
}

export const TARGET_FIELDS: FieldDefinition[] = [
  {
    key: "name",
    label: "Student Name",
    category: "Core",
    aliases: [
      "student name",
      "student's name",
      "student_name",
      "candidate name",
      "name of student",
      "name of the student",
      "student fullname",
      "name",
    ],
    required: true,
  },
  {
    key: "schoolId",
    label: "School ID",
    category: "Identifiers",
    aliases: [
      "school id",
      "school_id",
      "student id",
      "studentid",
      "admission no",
      "admission number",
      "id",
    ],
  },
  {
    key: "studentUniqueCode",
    label: "Student Code (BSP)",
    category: "Identifiers",
    aliases: [
      "student code",
      "student unique code",
      "bsp id",
      "bsp code",
      "banglar shiksha id",
      "banglar shiksha code",
      "unique code",
      "student_code",
    ],
  },
  {
    key: "pen",
    label: "PEN Number",
    category: "Identifiers",
    aliases: [
      "pen",
      "pen no",
      "pen number",
      "permanent education number",
      "pen_no",
    ],
  },
  {
    key: "hasAadhaar",
    label: "Aadhaar Available (Yes/No)",
    category: "Identifiers",
    aliases: [
      "aadhaar y n",
      "aadhar y n",
      "aadhaar y/n",
      "aadhar y/n",
      "aadhaar yn",
      "aadhar yn",
      "aadhaar yes no",
      "aadhar yes no",
      "aadhaar yes/no",
      "aadhar yes/no",
      "aadhaar y",
      "aadhar y",
      "aadhaar available",
      "aadhar available",
      "has aadhaar",
      "has aadhar",
      "aadhaar status",
      "aadhar status",
    ],
  },
  {
    key: "aadhaar",
    label: "Aadhaar Number (12 digits)",
    category: "Identifiers",
    aliases: [
      "aadhaar number",
      "aadhar number",
      "aadhaar no",
      "aadhar no",
      "aadhaar card no",
      "aadhar card no",
      "student aadhaar",
      "student aadhar",
      "aadhaar",
      "aadhar",
      "uid",
      "uidai",
    ],
  },
  {
    key: "dob",
    label: "Date of Birth",
    category: "Demographics",
    aliases: [
      "student dob",
      "student date of birth",
      "date of birth",
      "birth date",
      "dob",
      "d.o.b",
      "birth_date",
    ],
    required: true,
  },
  {
    key: "gender",
    label: "Gender",
    category: "Demographics",
    aliases: ["gender", "sex"],
    required: true,
  },
  {
    key: "presentClass",
    label: "Class",
    category: "Enrolment",
    aliases: [
      "class",
      "present class",
      "current class",
      "standard",
      "grade",
      "enrolled class",
    ],
    required: true,
  },
  {
    key: "presentSection",
    label: "Section",
    category: "Enrolment",
    aliases: ["section", "sec", "present section", "division"],
  },
  {
    key: "presentRoll",
    label: "Roll No",
    category: "Enrolment",
    aliases: [
      "roll no",
      "roll number",
      "roll",
      "present roll",
      "roll_no",
      "student roll",
    ],
  },
  {
    key: "academicYear",
    label: "Academic Year",
    category: "Enrolment",
    aliases: [
      "academic year",
      "session",
      "academic session",
      "current academic year",
      "acad year",
    ],
  },
  {
    key: "admissionYear",
    label: "Admission Year",
    category: "Enrolment",
    aliases: ["admission year", "adm year", "admission_year"],
  },
  {
    key: "currentStatus",
    label: "Status",
    category: "Enrolment",
    aliases: ["status", "current status", "student status"],
  },
  {
    key: "fatherName",
    label: "Father Name",
    category: "Family",
    aliases: [
      "father name",
      "father's name",
      "father",
      "father_name",
      "father full name",
      "fathers name",
    ],
  },
  {
    key: "motherName",
    label: "Mother Name",
    category: "Family",
    aliases: [
      "mother name",
      "mother's name",
      "mother",
      "mother_name",
      "mother full name",
      "mothers name",
    ],
  },
  {
    key: "guardianName",
    label: "Guardian Name",
    category: "Family",
    aliases: [
      "guardian name",
      "guardian's name",
      "guardian fullname",
      "guardians name",
      "name of guardian",
    ],
  },
  {
    key: "studentContact",
    label: "Student Contact Number",
    category: "Contact",
    aliases: [
      "student contact number",
      "student contact no",
      "student contact",
      "student mobile",
      "student phone",
      "primary mobile",
      "mobile number",
      "mobile no",
      "contact no",
      "phone no",
      "contact",
      "mobile",
      "phone",
    ],
  },
  {
    key: "altMobile",
    label: "Guardian Contact Number",
    category: "Contact",
    aliases: [
      "guardian contact number",
      "guardian contact no",
      "guardian number",
      "guardian contact",
      "guardian mobile",
      "guardian phone",
      "alternate contact number",
      "alternate mobile",
      "alt mobile",
      "alt_mobile",
    ],
  },
  {
    key: "email",
    label: "Email ID",
    category: "Contact",
    aliases: ["email", "email id", "contact email", "e-mail"],
  },
  {
    key: "address",
    label: "Address",
    category: "Contact",
    aliases: [
      "address",
      "permanent address",
      "residential address",
      "village",
    ],
  },
  {
    key: "pincode",
    label: "Pincode",
    category: "Contact",
    aliases: ["pincode", "pin code", "pin", "postal code"],
  },
  {
    key: "socialCategory",
    label: "Social Category",
    category: "Demographics",
    aliases: ["social category", "category", "caste", "caste category"],
  },
  {
    key: "religion",
    label: "Religion",
    category: "Demographics",
    aliases: ["religion", "faith"],
  },
  {
    key: "bankIfsc",
    label: "Bank IFSC Code",
    category: "Bank",
    aliases: [
      "bank ifs code",
      "bank ifsc code",
      "bank ifs",
      "bank ifsc",
      "ifs code",
      "ifsc code",
      "ifs",
      "ifsc",
    ],
  },
  {
    key: "bankAccountNo",
    label: "Bank Account Number",
    category: "Bank",
    aliases: [
      "bank a c number",
      "bank a/c number",
      "bank a c no",
      "bank a/c no",
      "bank account number",
      "bank account no",
      "bank account",
      "a/c number",
      "a/c no",
      "account number",
      "account no",
      "a c number",
      "a c no",
      "acc no",
      "bank acc",
    ],
  },
];

export const TEMPLATE_PRESETS: Record<string, { name: string; mapping: ColumnMapping }> = {
  banglarShiksha: {
    name: "Banglar Shiksha (BSP) Export",
    mapping: {
      "Student Unique Code": "studentUniqueCode",
      "Student Name": "name",
      "Gender": "gender",
      "Date of Birth": "dob",
      "Father Name": "fatherName",
      "Mother Name": "motherName",
      "Guardian Name": "guardianName",
      "Class": "presentClass",
      "Section": "presentSection",
      "Roll No": "presentRoll",
      "Mobile No": "studentContact",
      "Aadhaar No": "aadhaar",
      "PEN": "pen",
      "Social Category": "socialCategory",
      "Religion": "religion",
      "IFSC": "bankIfsc",
      "Account No": "bankAccountNo",
    },
  },
  udise: {
    name: "UDISE+ Student Portal",
    mapping: {
      "PEN": "pen",
      "Student Name": "name",
      "Gender": "gender",
      "DOB": "dob",
      "Class": "presentClass",
      "Section": "presentSection",
      "Roll": "presentRoll",
      "Father's Name": "fatherName",
      "Mother's Name": "motherName",
      "Aadhaar Number": "aadhaar",
      "Mobile Number": "studentContact",
      "Caste": "socialCategory",
    },
  },
};

/**
 * Parses an Excel or CSV file in the browser using XLSX.
 */
export async function parseExcelFile(file: File): Promise<ParsedExcelResult> {
  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data, { type: "array", cellDates: true });

  const sheetNames = workbook.SheetNames;
  const selectedSheet = sheetNames[0] || "Sheet1";
  const worksheet = workbook.Sheets[selectedSheet];

  // Convert to JSON with headers
  const rawRows: Record<string, any>[] = XLSX.utils.sheet_to_json(worksheet, {
    defval: "",
    raw: false,
    dateNF: "yyyy-mm-dd",
  });

  // Extract column headers from sheet range
  let headers: string[] = [];
  if (rawRows.length > 0) {
    headers = Object.keys(rawRows[0]);
  } else if (worksheet["!ref"]) {
    const range = XLSX.utils.decode_range(worksheet["!ref"]);
    for (let col = range.s.c; col <= range.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: range.s.r, c: col });
      const cell = worksheet[cellAddress];
      headers.push(cell ? String(cell.v).trim() : `Column ${col + 1}`);
    }
  }

  return {
    sheetNames,
    selectedSheet,
    headers,
    rawRows,
  };
}

/**
 * Auto-suggests column mappings based on prioritized fuzzy matching.
 */
export function autoSuggestMapping(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = {};

  const clean = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^a-z0-9]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

  // Explicit priority order for matching to prevent generic collisions (like "name" eating "father name")
  const PRIORITY_KEYS: (keyof Student)[] = [
    "fatherName",
    "motherName",
    "altMobile",
    "studentContact",
    "guardianName",
    "studentUniqueCode",
    "bankAccountNo",
    "bankIfsc",
    "dob",
    "academicYear",
    "admissionYear",
    "presentRoll",
    "presentClass",
    "presentSection",
    "pen",
    "hasAadhaar",
    "aadhaar",
    "name",
    "gender",
    "schoolId",
    "socialCategory",
    "religion",
    "email",
    "address",
    "pincode",
    "currentStatus",
  ];

  const fieldMap = new Map<keyof Student, FieldDefinition>();
  for (const f of TARGET_FIELDS) {
    fieldMap.set(f.key, f);
  }

  for (const rawHeader of headers) {
    const cleanHeader = clean(rawHeader);
    let bestMatch: keyof Student | "ignore" = "ignore";

    // 1. Direct exact or boundary match in priority order
    for (const key of PRIORITY_KEYS) {
      const field = fieldMap.get(key);
      if (!field) continue;

      const matched = field.aliases.some((alias) => {
        const cleanAlias = clean(alias);
        return (
          cleanHeader === cleanAlias ||
          cleanHeader.startsWith(cleanAlias + " ") ||
          cleanHeader.endsWith(" " + cleanAlias) ||
          cleanHeader === cleanAlias.replace(/\s+/g, "")
        );
      });

      if (matched) {
        bestMatch = key;
        break;
      }
    }

    // 2. Fallback partial contains check in priority order
    if (bestMatch === "ignore") {
      for (const key of PRIORITY_KEYS) {
        const field = fieldMap.get(key);
        if (!field) continue;

        // Skip generic 'name' in partial match if 'father', 'mother', or 'guardian' is present
        if (
          key === "name" &&
          (cleanHeader.includes("father") ||
            cleanHeader.includes("mother") ||
            cleanHeader.includes("guardian"))
        ) {
          continue;
        }

        const matched = field.aliases.some((alias) => {
          const cleanAlias = clean(alias);
          return cleanHeader.includes(cleanAlias);
        });

        if (matched) {
          bestMatch = key;
          break;
        }
      }
    }

    mapping[rawHeader] = bestMatch;
  }

  return mapping;
}

/**
 * Normalizes date inputs from Excel formats (e.g. DD/MM/YYYY, YYYY-MM-DD, Excel Serial) to ISO "YYYY-MM-DD".
 */
export function normalizeDate(value: any): string {
  if (!value) return "";
  if (typeof value === "string") {
    const trimmed = value.trim();
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
 */
export function normalizeGender(val: any): "Male" | "Female" | "Other" {
  const str = String(val || "").toLowerCase().trim();
  if (str.startsWith("m") || str === "1" || str === "boy") return "Male";
  if (str.startsWith("f") || str === "2" || str === "girl") return "Female";
  return "Other";
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
 * Transforms raw excel rows into structured student payloads based on mapping.
 */
export function applyMapping(
  rawRows: Record<string, any>[],
  mapping: ColumnMapping
): Array<Partial<Student>> {
  return rawRows.map((row) => {
    const student: Partial<Student> = {};

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
      } else if (fieldKey === "studentContact" || fieldKey === "altMobile") {
        student[fieldKey] = String(rawVal).replace(/\D/g, "");
      } else {
        (student as any)[fieldKey] = String(rawVal).trim();
      }
    }

    return student;
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
          issue: `Duplicate PEN '${cleanPen}' in this file (also in Row ${seenPens.get(cleanPen)})`,
          severity: "warning",
          studentName: r.name,
        });
        rowWarnings.push("Duplicate PEN in file");
      } else {
        seenPens.set(cleanPen, rowNum);
      }
    }

    if (r.aadhaar && r.aadhaar !== "PENDING_RECORD") {
      const cleanAadhaar = r.aadhaar.trim().replace(/\D/g, "");
      if (cleanAadhaar.length > 0 && cleanAadhaar.length !== 12) {
        issues.push({
          row: rowNum,
          field: "aadhaar",
          issue: `Aadhaar must be 12 digits (got ${cleanAadhaar.length} digits)`,
          severity: "warning",
          studentName: r.name,
        });
        rowWarnings.push("Invalid Aadhaar length");
      } else if (cleanAadhaar.length === 12 && seenAadhaars.has(cleanAadhaar)) {
        issues.push({
          row: rowNum,
          field: "aadhaar",
          issue: `Duplicate Aadhaar in this file (also in Row ${seenAadhaars.get(cleanAadhaar)})`,
          severity: "warning",
          studentName: r.name,
        });
        rowWarnings.push("Duplicate Aadhaar in file");
      } else if (cleanAadhaar.length === 12) {
        seenAadhaars.set(cleanAadhaar, rowNum);
      }
    }

    if (r.schoolId) {
      const cleanId = r.schoolId.toUpperCase().trim();
      if (seenSchoolIds.has(cleanId)) {
        issues.push({
          row: rowNum,
          field: "schoolId",
          issue: `Duplicate School ID '${cleanId}' in this file`,
          severity: "warning",
          studentName: r.name,
        });
        rowWarnings.push("Duplicate School ID");
      } else {
        seenSchoolIds.set(cleanId, rowNum);
      }
    }

    // Build preview row
    previewRows.push({
      rowNumber: rowNum,
      action: r.schoolId || r.pen || (r.aadhaar && r.aadhaar !== "PENDING_RECORD") || r.studentUniqueCode ? "update" : "create",
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

// ---------------------------------------------------------------
//  Result Bulk Upload Parser & Mapping Helpers
// ---------------------------------------------------------------

export interface ResultFieldDefinition {
  key: string;
  label: string;
  category: string;
  aliases: string[];
  required?: boolean;
}

export const RESULT_TARGET_FIELDS: ResultFieldDefinition[] = [
  // Student identification
  { key: "schoolId", label: "School ID", category: "Identifier", aliases: ["school id", "student id", "school_id", "admission no", "id"] },
  { key: "studentUniqueCode", label: "Student Code (BSP)", category: "Identifier", aliases: ["student code", "bsp id", "bsp code", "student unique code", "student_code"] },
  { key: "name", label: "Student Name", category: "Identifier", aliases: ["student name", "name", "student's name"] },
  { key: "presentClass", label: "Class", category: "Enrolment", aliases: ["class", "standard", "grade", "present class"] },
  { key: "presentSection", label: "Section", category: "Enrolment", aliases: ["section", "sec", "present section"] },
  { key: "presentRoll", label: "Roll No", category: "Enrolment", aliases: ["roll", "roll no", "roll number", "present roll"] },
  
  // Evaluation specifics
  { key: "academicYear", label: "Academic Session / Year", category: "Exam", aliases: ["academic year", "session", "year", "session year", "exam year"], required: true },
  { key: "examName", label: "Evaluation / Exam Name", category: "Exam", aliases: ["exam name", "evaluation name", "exam", "evaluation", "term", "summative"], required: true },
  { key: "fullMarks", label: "Full Marks", category: "Marks", aliases: ["full marks", "maximum marks", "max marks", "fm", "total full marks"] },
  { key: "marksObtained", label: "Total Marks Obtained", category: "Marks", aliases: ["total marks", "marks obtained", "total obtained", "obtained marks", "grand total", "total", "marks"], required: true },
  { key: "percentage", label: "Percentage (%)", category: "Marks", aliases: ["percentage", "percent", "%", "marks percent"] },
  { key: "grade", label: "Grade", category: "Marks", aliases: ["grade", "division", "rank grade"] },
  { key: "remarks", label: "Remarks / Result Status", category: "Marks", aliases: ["remarks", "remark", "result", "status", "comment"] },

  // Subjects (West Bengal Secondary Board subjects)
  { key: "bengali", label: "Bengali (First Language)", category: "Subjects", aliases: ["bengali", "first language", "1st language", "ben", "fl"] },
  { key: "english", label: "English (Second Language)", category: "Subjects", aliases: ["english", "second language", "2nd language", "eng", "sl"] },
  { key: "mathematics", label: "Mathematics", category: "Subjects", aliases: ["mathematics", "math", "maths", "mat"] },
  { key: "physicalScience", label: "Physical Science", category: "Subjects", aliases: ["physical science", "physical sc", "psc", "physics", "phy sc"] },
  { key: "lifeScience", label: "Life Science", category: "Subjects", aliases: ["life science", "life sc", "lsc", "biology", "bio sc"] },
  { key: "history", label: "History", category: "Subjects", aliases: ["history", "hist", "his"] },
  { key: "geography", label: "Geography", category: "Subjects", aliases: ["geography", "geog", "geo"] },
];

export type ResultColumnMapping = Record<string, string>;

export const RESULT_TEMPLATE_PRESETS: Record<string, { name: string; mapping: ResultColumnMapping }> = {
  wbSummative: {
    name: "WB Summative Evaluation Marksheet",
    mapping: {
      "Student Code": "studentUniqueCode",
      "Student Name": "name",
      "Class": "presentClass",
      "Section": "presentSection",
      "Roll No": "presentRoll",
      "Academic Year": "academicYear",
      "Exam Name": "examName",
      "Bengali": "bengali",
      "English": "english",
      "Mathematics": "mathematics",
      "Physical Science": "physicalScience",
      "Life Science": "lifeScience",
      "History": "history",
      "Geography": "geography",
      "Total Marks": "marksObtained",
      "Full Marks": "fullMarks",
    },
  },
  simpleMarks: {
    name: "Simple Total Marks Sheet",
    mapping: {
      "School ID": "schoolId",
      "Student Code": "studentUniqueCode",
      "Student Name": "name",
      "Class": "presentClass",
      "Section": "presentSection",
      "Roll No": "presentRoll",
      "Academic Year": "academicYear",
      "Exam Name": "examName",
      "Marks Obtained": "marksObtained",
      "Full Marks": "fullMarks",
    },
  },
};

/**
 * Auto-suggests column mappings for exam result sheets.
 */
export function autoSuggestResultMapping(headers: string[]): ResultColumnMapping {
  const mapping: ResultColumnMapping = {};

  const clean = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^a-z0-9]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

  const PRIORITY_KEYS = [
    "studentUniqueCode",
    "schoolId",
    "presentRoll",
    "presentSection",
    "presentClass",
    "name",
    "academicYear",
    "examName",
    "marksObtained",
    "fullMarks",
    "percentage",
    "grade",
    "remarks",
    "bengali",
    "english",
    "mathematics",
    "physicalScience",
    "lifeScience",
    "history",
    "geography",
  ];

  const fieldMap = new Map<string, ResultFieldDefinition>();
  for (const f of RESULT_TARGET_FIELDS) {
    fieldMap.set(f.key, f);
  }

  for (const rawHeader of headers) {
    const cleanHeader = clean(rawHeader);
    let bestMatch: string = "ignore";

    for (const key of PRIORITY_KEYS) {
      const field = fieldMap.get(key);
      if (!field) continue;

      const matched = field.aliases.some((alias) => {
        const cleanAlias = clean(alias);
        return (
          cleanHeader === cleanAlias ||
          cleanHeader.startsWith(cleanAlias + " ") ||
          cleanHeader.endsWith(" " + cleanAlias) ||
          cleanHeader === cleanAlias.replace(/\s+/g, "")
        );
      });

      if (matched) {
        bestMatch = key;
        break;
      }
    }

    if (bestMatch === "ignore") {
      for (const key of PRIORITY_KEYS) {
        const field = fieldMap.get(key);
        if (!field) continue;

        if (field.aliases.some((alias) => cleanHeader.includes(clean(alias)))) {
          bestMatch = key;
          break;
        }
      }
    }

    mapping[rawHeader] = bestMatch;
  }

  return mapping;
}

/**
 * Transforms raw result excel rows into structured BulkResultRow objects.
 */
export function applyResultMapping(
  rawRows: Record<string, any>[],
  mapping: ResultColumnMapping | ColumnMapping,
  defaultSessionYear?: number,
  defaultExamName?: string
): BulkResultRow[] {
  const currentYear = new Date().getFullYear();

  return rawRows.map((row) => {
    const result: Partial<BulkResultRow> = {
      academicYear: defaultSessionYear || currentYear,
      examName: defaultExamName || "1st Summative Evaluation",
      subjectMarks: {},
    };

    let subjectSum = 0;
    let hasSubjectMarks = false;

    for (const [header, fieldKey] of Object.entries(mapping)) {
      const field = String(fieldKey);
      if (field === "ignore") continue;
      const rawVal = row[header];
      if (rawVal === undefined || rawVal === null || rawVal === "") continue;

      const strVal = String(rawVal).trim();

      if (field === "academicYear") {
        const num = parseInt(strVal.replace(/\D/g, ""), 10);
        result.academicYear = isNaN(num) ? (defaultSessionYear || currentYear) : num;
      } else if (field === "examName") {
        result.examName = strVal;
      } else if (field === "marksObtained") {
        const num = parseFloat(strVal);
        result.marksObtained = isNaN(num) ? 0 : num;
      } else if (field === "fullMarks") {
        const num = parseFloat(strVal);
        result.fullMarks = isNaN(num) ? undefined : num;
      } else if (field === "percentage") {
        const num = parseFloat(strVal);
        result.percentage = isNaN(num) ? undefined : num;
      } else if (field === "presentRoll") {
        const rollNum = parseInt(strVal.replace(/\D/g, ""), 10);
        result.presentRoll = isNaN(rollNum) ? 1 : rollNum;
      } else if (field === "presentClass") {
        result.presentClass = normalizeClass(strVal);
      } else if (
        ["bengali", "english", "mathematics", "physicalScience", "lifeScience", "history", "geography"].includes(
          field
        )
      ) {
        const mark = parseFloat(strVal);
        if (!isNaN(mark)) {
          const capitalized = field.charAt(0).toUpperCase() + field.slice(1);
          result.subjectMarks![capitalized] = mark;
          subjectSum += mark;
          hasSubjectMarks = true;
        }
      } else {
        (result as any)[field] = strVal;
      }
    }

    // Auto calculate marksObtained from subjects if not explicitly set
    if (result.marksObtained === undefined && hasSubjectMarks) {
      result.marksObtained = subjectSum;
    }

    if (result.marksObtained === undefined) {
      result.marksObtained = 0;
    }

    // Calculate percentage if fullMarks exists
    if (result.fullMarks && result.fullMarks > 0 && result.percentage === undefined) {
      result.percentage = Number(((result.marksObtained / result.fullMarks) * 100).toFixed(2));
    }

    return result as BulkResultRow;
  });
}

/**
 * Validates result spreadsheet rows before importing.
 */
export function validateResultRows(rows: BulkResultRow[]): {
  issues: ValidationIssue[];
  previewRows: Array<{
    rowNumber: number;
    name: string;
    schoolId?: string;
    studentUniqueCode?: string;
    class?: string;
    section?: string;
    roll?: number;
    academicYear: number;
    examName: string;
    marksObtained: number;
    fullMarks?: number;
    percentage?: number;
    warnings: string[];
    errors: string[];
  }>;
} {
  const issues: ValidationIssue[] = [];
  const previewRows: any[] = [];

  for (let idx = 0; idx < rows.length; idx++) {
    const r = rows[idx];
    const rowNum = idx + 2;
    const warnings: string[] = [];
    const errors: string[] = [];

    // Check student identifier
    if (!r.schoolId && !r.studentUniqueCode && (!r.presentClass || !r.presentSection || !r.presentRoll)) {
      issues.push({
        row: rowNum,
        field: "schoolId",
        issue: "Row has no identifier (Must provide School ID, BSP Code, or Class+Sec+Roll)",
        severity: "error",
      });
      errors.push("Missing Identifier");
    }

    // Check Exam Name & Year
    if (!r.academicYear) {
      issues.push({
        row: rowNum,
        field: "academicYear",
        issue: "Academic Year is required",
        severity: "error",
      });
      errors.push("Missing Year");
    }

    if (!r.examName) {
      issues.push({
        row: rowNum,
        field: "examName",
        issue: "Exam Name is required",
        severity: "error",
      });
      errors.push("Missing Exam Name");
    }

    // Check Marks
    if (r.marksObtained === undefined || isNaN(r.marksObtained) || r.marksObtained < 0) {
      issues.push({
        row: rowNum,
        field: "marksObtained",
        issue: "Invalid marks obtained value",
        severity: "error",
      });
      errors.push("Invalid Marks");
    } else if (r.fullMarks && r.marksObtained > r.fullMarks) {
      issues.push({
        row: rowNum,
        field: "marksObtained",
        issue: `Marks obtained (${r.marksObtained}) exceeds full marks (${r.fullMarks})`,
        severity: "warning",
      });
      warnings.push("Marks > Full Marks");
    }

    previewRows.push({
      rowNumber: rowNum,
      name: r.name || "Student",
      schoolId: r.schoolId,
      studentUniqueCode: r.studentUniqueCode,
      class: r.presentClass,
      section: r.presentSection,
      roll: r.presentRoll,
      academicYear: r.academicYear,
      examName: r.examName,
      marksObtained: r.marksObtained,
      fullMarks: r.fullMarks,
      percentage: r.percentage,
      warnings,
      errors,
    });
  }

  return { issues, previewRows };
}
