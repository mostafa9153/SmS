/**
 * Calculation and Data Models for Continuous & Comprehensive Evaluation (CCE) Marksheet
 * Morigachi High School (H.S.) - WBBSE / WBCHSE Curriculum
 */

export interface AssessmentTerm {
  periodic: number | "";      // Written assessment
  preparatory: number | "";   // Oral / Formative / Project assessment
  total: number;
}

export interface SubjectMarksheetRow {
  id: string;
  subjectName: string;
  term1: AssessmentTerm;       // 1st Periodic: 40 + 10 = 50
  term2: AssessmentTerm;       // 2nd Periodic: 40 + 10 = 50
  term3: AssessmentTerm;       // 3rd Periodic: 90 + 10 = 100
  overallTotal: number;        // Out of 200
  percentage: number;          // Out of 100%
  grade: string;               // AA, A+, A, B+, B, C, D
  highestMarksInClass?: number | ""; // Out of 200
}

export interface MarksheetData {
  academicYear: string;        // "2025" / "2026"
  studentName: string;
  studentClass: string;        // "IX"
  section: string;             // "A"
  rollNo: string;              // "01"
  studentId: string;           // "MHS-2026-0036"
  registrationNo?: string;
  penNumber?: string;
  guardianName?: string;
  subjects: SubjectMarksheetRow[];
  classTeacherName?: string;
  issueDate: string;
  promotionStatus: "PROMOTED" | "PASSED" | "DETAINED" | "ELIGIBLE";
  promotedToClass: string;
  classRank?: string;          // e.g. "1st", "2nd", "3rd"
  attendanceDays?: number;
  totalWorkingDays?: number;
}

export interface GradeScaleEntry {
  range: string;
  grade: string;
  remarks: string;
}

export const WBBSE_GRADE_SCALE: GradeScaleEntry[] = [
  { range: "90% – 100%", grade: "AA", remarks: "Outstanding" },
  { range: "80% – 89%", grade: "A+", remarks: "Excellent" },
  { range: "60% – 79%", grade: "A", remarks: "Very Good" },
  { range: "45% – 59%", grade: "B+", remarks: "Good" },
  { range: "35% – 44%", grade: "B", remarks: "Satisfactory" },
  { range: "25% – 34%", grade: "C", remarks: "Marginal" },
  { range: "Below 25%", grade: "D", remarks: "Disqualified" },
];

/**
 * Returns WBBSE letter grade based on percentage (0 - 100)
 */
export function getWBBSEGrade(percentage: number): string {
  if (percentage >= 90) return "AA";
  if (percentage >= 80) return "A+";
  if (percentage >= 60) return "A";
  if (percentage >= 45) return "B+";
  if (percentage >= 35) return "B";
  if (percentage >= 25) return "C";
  return "D";
}

/**
 * Calculates a single subject row with its 3 term totals, 200-mark overall total, %, and letter grade
 */
export function calculateSubjectRow(row: SubjectMarksheetRow): SubjectMarksheetRow {
  const p1 = Number(row.term1.periodic) || 0;
  const prep1 = Number(row.term1.preparatory) || 0;
  const t1 = Math.min(50, p1 + prep1);

  const p2 = Number(row.term2.periodic) || 0;
  const prep2 = Number(row.term2.preparatory) || 0;
  const t2 = Math.min(50, p2 + prep2);

  const p3 = Number(row.term3.periodic) || 0;
  const prep3 = Number(row.term3.preparatory) || 0;
  const t3 = Math.min(100, p3 + prep3);

  const overallTotal = t1 + t2 + t3; // max 200
  const percentage = Math.round(((overallTotal / 200) * 100) * 10) / 10;
  const grade = overallTotal > 0 ? getWBBSEGrade(percentage) : "";

  return {
    ...row,
    term1: { ...row.term1, total: t1 },
    term2: { ...row.term2, total: t2 },
    term3: { ...row.term3, total: t3 },
    overallTotal,
    percentage,
    grade,
  };
}

/**
 * Default Class IX Subject List from official WBBSE syllabus
 */
export const DEFAULT_CLASS_IX_SUBJECTS: SubjectMarksheetRow[] = [
  {
    id: "sub-1",
    subjectName: "Bengali",
    term1: { periodic: 34, preparatory: 9, total: 43 },
    term2: { periodic: 36, preparatory: 10, total: 46 },
    term3: { periodic: 78, preparatory: 9, total: 87 },
    overallTotal: 176,
    percentage: 88,
    grade: "A+",
    highestMarksInClass: 192,
  },
  {
    id: "sub-2",
    subjectName: "English",
    term1: { periodic: 32, preparatory: 8, total: 40 },
    term2: { periodic: 35, preparatory: 9, total: 44 },
    term3: { periodic: 74, preparatory: 9, total: 83 },
    overallTotal: 167,
    percentage: 83.5,
    grade: "A+",
    highestMarksInClass: 188,
  },
  {
    id: "sub-3",
    subjectName: "Mathematics",
    term1: { periodic: 38, preparatory: 10, total: 48 },
    term2: { periodic: 39, preparatory: 10, total: 49 },
    term3: { periodic: 86, preparatory: 10, total: 96 },
    overallTotal: 193,
    percentage: 96.5,
    grade: "AA",
    highestMarksInClass: 198,
  },
  {
    id: "sub-4",
    subjectName: "Physical Science",
    term1: { periodic: 35, preparatory: 9, total: 44 },
    term2: { periodic: 37, preparatory: 9, total: 46 },
    term3: { periodic: 80, preparatory: 10, total: 90 },
    overallTotal: 180,
    percentage: 90,
    grade: "AA",
    highestMarksInClass: 194,
  },
  {
    id: "sub-5",
    subjectName: "Life Science",
    term1: { periodic: 36, preparatory: 10, total: 46 },
    term2: { periodic: 38, preparatory: 10, total: 48 },
    term3: { periodic: 82, preparatory: 10, total: 92 },
    overallTotal: 186,
    percentage: 93,
    grade: "AA",
    highestMarksInClass: 195,
  },
  {
    id: "sub-6",
    subjectName: "History",
    term1: { periodic: 33, preparatory: 9, total: 42 },
    term2: { periodic: 34, preparatory: 9, total: 43 },
    term3: { periodic: 76, preparatory: 9, total: 85 },
    overallTotal: 170,
    percentage: 85,
    grade: "A+",
    highestMarksInClass: 189,
  },
  {
    id: "sub-7",
    subjectName: "Geography",
    term1: { periodic: 35, preparatory: 9, total: 44 },
    term2: { periodic: 36, preparatory: 10, total: 46 },
    term3: { periodic: 79, preparatory: 10, total: 89 },
    overallTotal: 179,
    percentage: 89.5,
    grade: "A+",
    highestMarksInClass: 191,
  },
];

/**
 * Creates blank subject rows for data entry
 */
export function createBlankSubjectRows(subjects: string[]): SubjectMarksheetRow[] {
  return subjects.map((name, idx) => ({
    id: `sub-${idx + 1}`,
    subjectName: name,
    term1: { periodic: "", preparatory: "", total: 0 },
    term2: { periodic: "", preparatory: "", total: 0 },
    term3: { periodic: "", preparatory: "", total: 0 },
    overallTotal: 0,
    percentage: 0,
    grade: "",
    highestMarksInClass: "",
  }));
}

/**
 * Summary totals across all subjects
 */
export interface MarksheetGrandTotals {
  maxPossibleMarks: number;
  totalMarksObtained: number;
  overallPercentage: number;
  overallGrade: string;
  highestTotalInClass: number;
  resultStatus: "PROMOTED" | "PASSED" | "DETAINED";
}

export function calculateMarksheetTotals(subjects: SubjectMarksheetRow[]): MarksheetGrandTotals {
  const count = subjects.length || 7;
  const maxPossibleMarks = count * 200;

  const totalMarksObtained = subjects.reduce((sum, row) => sum + (row.overallTotal || 0), 0);
  const highestTotalInClass = subjects.reduce((sum, row) => sum + (Number(row.highestMarksInClass) || 0), 0);

  const overallPercentage = maxPossibleMarks > 0
    ? Math.round(((totalMarksObtained / maxPossibleMarks) * 100) * 10) / 10
    : 0;

  const overallGrade = overallPercentage > 0 ? getWBBSEGrade(overallPercentage) : "";

  // RTE Promotion rule: 25% minimum or passing grade C
  const resultStatus = overallPercentage >= 25 ? "PROMOTED" : "DETAINED";

  return {
    maxPossibleMarks,
    totalMarksObtained,
    overallPercentage,
    overallGrade,
    highestTotalInClass,
    resultStatus,
  };
}
