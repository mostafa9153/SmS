import type { BulkResultRow, ColumnMapping, ValidationIssue } from "@/lib/types";
import { normalizeClass } from "./normalizers";

// ---------------------------------------------------------------
//  Result Bulk Upload Parser & Mapping Helpers
// ---------------------------------------------------------------

interface ResultFieldDefinition {
  key: string;
  label: string;
  category: string;
  icon?: string;
  aliases: string[];
  required?: boolean;
}

export const RESULT_TARGET_FIELDS: ResultFieldDefinition[] = [
  // Student identification
  { key: "schoolId", label: "School ID", category: "Identifier", icon: "🔢", aliases: ["school id", "student id", "school_id", "admission no", "id"] },
  { key: "studentUniqueCode", label: "Student Code (BSP)", category: "Identifier", icon: "🆔", aliases: ["student code", "bsp id", "bsp code", "student unique code", "student_code"] },
  { key: "pen", label: "PEN Number", category: "Identifier", icon: "📝", aliases: ["pen", "pen no", "pen number", "permanent education number", "pen_no", "pen no."] },
  { key: "name", label: "Student Name", category: "Identifier", icon: "👤", aliases: ["student name", "name", "student's name"] },
  { key: "presentClass", label: "Class", category: "Enrolment", icon: "🏫", aliases: ["class", "standard", "grade", "present class"] },
  { key: "presentSection", label: "Section", category: "Enrolment", icon: "🔤", aliases: ["section", "sec", "present section"] },
  { key: "presentRoll", label: "Roll No", category: "Enrolment", icon: "🎯", aliases: ["roll", "roll no", "roll number", "present roll"] },
  
  // Evaluation specifics
  { key: "academicYear", label: "Academic Session / Year", category: "Exam", icon: "🗓️", aliases: ["academic year", "session", "year", "session year", "exam year"], required: true },
  { key: "examName", label: "Evaluation / Exam Name", category: "Exam", icon: "📝", aliases: ["exam name", "evaluation name", "exam", "evaluation", "term", "summative"], required: true },
  // NOTE: fullMarks must appear before marksObtained in both the array and PRIORITY_KEYS
  // so that "Full Marks" header is not matched by the "marks" alias of marksObtained
  { key: "fullMarks", label: "Full Marks", category: "Marks", icon: "💯", aliases: ["full marks", "maximum marks", "max marks", "fm", "total full marks", "full mark"] },
  { key: "marksObtained", label: "Total Marks Obtained", category: "Marks", icon: "📊", aliases: ["total marks", "marks obtained", "total obtained", "obtained marks", "grand total", "total", "marks"], required: true },
  { key: "percentage", label: "Percentage (%)", category: "Marks", icon: "📈", aliases: ["percentage", "percent", "%", "marks percent"] },
  { key: "grade", label: "Grade", category: "Marks", icon: "🏆", aliases: ["grade", "division", "rank grade"] },
  { key: "remarks", label: "Remarks / Result Status", category: "Marks", icon: "💬", aliases: ["remarks", "remark", "result", "status", "comment"] },

  // Subjects (West Bengal Secondary/Primary Board subjects)
  { key: "bengali", label: "Bengali (First Language)", category: "Subjects", icon: "📚", aliases: ["bengali", "first language", "1st language", "ben", "fl"] },
  { key: "english", label: "English (Second Language)", category: "Subjects", icon: "📚", aliases: ["english", "second language", "2nd language", "eng", "sl"] },
  { key: "mathematics", label: "Mathematics", category: "Subjects", icon: "📐", aliases: ["mathematics", "math", "maths", "mat"] },
  { key: "ourEnvironment", label: "Our Environment", category: "Subjects", icon: "🌿", aliases: ["our environment", "environment", "environmental studies", "evs", "our env", "environment studies", "paribesh", "amader paribesh"] },
  { key: "physicalScience", label: "Physical Science", category: "Subjects", icon: "🔬", aliases: ["physical science", "physical sc", "psc", "physics", "phy sc"] },
  { key: "lifeScience", label: "Life Science", category: "Subjects", icon: "🧬", aliases: ["life science", "life sc", "lsc", "biology", "bio sc"] },
  { key: "history", label: "History", category: "Subjects", icon: "📜", aliases: ["history", "hist", "his"] },
  { key: "geography", label: "Geography", category: "Subjects", icon: "🗺️", aliases: ["geography", "geog", "geo"] },
  { key: "artEducation", label: "Art & Work Education", category: "Subjects", icon: "🎨", aliases: ["art & work education", "art and work education", "art work education", "art education", "work education", "art & craft", "art craft", "chitrakala", "art"] },
  { key: "healthPE", label: "Health & Physical Education", category: "Subjects", icon: "🏃", aliases: ["health & physical education", "health and physical education", "health physical education", "physical education", "health education", "pe", "hp education", "health pe", "svasthya"] },
  { key: "workEducation", label: "Work Education", category: "Subjects", icon: "🔧", aliases: ["work education", "socially useful productive work", "supw", "work ed"] },
];

type ResultColumnMapping = Record<string, string>;

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
    "pen",
    "presentRoll",
    "presentSection",
    "presentClass",
    "name",
    "academicYear",
    "examName",
    // fullMarks MUST come before marksObtained so "Full Marks" header isn't
    // greedily matched by the broad "marks" alias in marksObtained
    "fullMarks",
    "marksObtained",
    "percentage",
    "grade",
    "remarks",
    "bengali",
    "english",
    "mathematics",
    "ourEnvironment",
    "physicalScience",
    "lifeScience",
    "history",
    "geography",
    "artEducation",
    "healthPE",
    "workEducation",
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

        // "%" cleans to "", and includes("") is always true: skip blank aliases
        if (field.aliases.some((alias) => { const c = clean(alias); return c.length > 0 && cleanHeader.includes(c); })) {
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
        [
          "bengali",
          "english",
          "mathematics",
          "ourEnvironment",
          "physicalScience",
          "lifeScience",
          "history",
          "geography",
          "artEducation",
          "healthPE",
          "workEducation",
        ].includes(field)
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

    // Calculate (or recalculate) percentage from actual marks:
    // - If subject marks were summed, always recalculate so we don't use
    //   the Excel's per-subject or incorrect pre-calculated percentage.
    // - Also guard against the case where fullMarks is a per-subject value
    //   (e.g. 100) while marksObtained is the total sum of subjects — in
    //   that scenario the percentage would exceed 100%, which is wrong.
    //   Clear fullMarks so the DB layer picks the correct class total.
    if (hasSubjectMarks && result.fullMarks !== undefined && result.fullMarks > 0 && result.marksObtained > result.fullMarks) {
      // fullMarks was per-subject; discard it so getClassFullMarks() is used
      result.fullMarks = undefined;
    }

    if (result.fullMarks && result.fullMarks > 0) {
      if (hasSubjectMarks || result.percentage === undefined) {
        result.percentage = Number(((result.marksObtained / result.fullMarks) * 100).toFixed(2));
      }
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
