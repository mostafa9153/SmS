/**
 * Calculation and Data Models for Continuous & Comprehensive Evaluation (CCE) Marksheet
 * Marigachi High School (H.S.) - WBBSE / WBCHSE Curriculum
 */

import type { StudentResult, ClassResultsSummary, Student } from "@/lib/types";

export interface AssessmentTerm {
  periodic: number | "";      // Written assessment
  preparatory: number | "";   // Oral / Formative / Project assessment
  total: number;
}

export interface SubjectMarksheetRow {
  id: string;
  subjectName: string;
  term1: AssessmentTerm;       // 1st Summative Evaluation: 40 + 10 = 50
  term2: AssessmentTerm;       // 2nd Summative Evaluation: 40 + 10 = 50
  term3: AssessmentTerm;       // 3rd Summative Evaluation: 90 + 10 = 100
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

export const CLASS_V_SUBJECTS = [
  "Bengali",
  "English",
  "Mathematics",
  "Our Environment",
  "Health & Physical Education",
];

export const CLASS_VI_VIII_SUBJECTS = [
  "Bengali",
  "English",
  "Mathematics",
  "Science",
  "History",
  "Geography",
  "Health & Physical Education",
];

/**
 * Normalizes subject names across various spellings and abbreviations
 */
export function normalizeSubjectName(raw: string): string {
  if (!raw) return "";
  const s = raw.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (s.includes("bengali") || s === "ben" || s === "fl" || s.includes("firstlanguage")) return "Bengali";
  if (s.includes("english") || s === "eng" || s === "sl" || s.includes("secondlanguage")) return "English";
  if (s.includes("math") || s === "mat") return "Mathematics";
  if (s.includes("physic") || s === "psc" || s.includes("physicalsc")) return "Physical Science";
  if (s.includes("lifesc") || s.includes("bio") || s === "lsc" || s.includes("lifescience")) return "Life Science";
  if (s.includes("history") || s === "his" || s === "hist") return "History";
  if (s.includes("geography") || s === "geo" || s === "geog") return "Geography";
  if (s.includes("environ") || s.includes("paribesh") || s === "evs") return "Our Environment";
  if (s.includes("science") && !s.includes("life") && !s.includes("physical")) return "Science";
  if (s.includes("health") || s === "pe" || s.includes("physicaled") || s === "hp") return "Health & Physical Education";
  if (s.includes("art") || s.includes("work") || s.includes("supw")) return "Art & Work Education";
  return raw;
}

/**
 * Resolves standard curriculum subject names by class
 */
export function getStandardSubjectsForClass(className?: string): string[] {
  const c = (className || "IX").toUpperCase().trim();
  if (c === "V" || c === "5") return CLASS_V_SUBJECTS;
  if (["VI", "VII", "VIII", "6", "7", "8"].includes(c)) return CLASS_VI_VIII_SUBJECTS;
  return DEFAULT_CLASS_IX_SUBJECTS.map((s) => s.subjectName);
}

/**
 * Automatically transforms database result records for a student into complete marksheet subject rows
 */
export function buildMarksheetFromDBResults(
  studentResults: StudentResult[],
  student: Student,
  classSummary?: ClassResultsSummary | null
): Partial<MarksheetData> {
  const normClass = (student.presentClass || "IX").toUpperCase().trim();
  const defaultSubjects = getStandardSubjectsForClass(normClass);

  // Separate results by exam term
  let term1Result: StudentResult | undefined;
  let term2Result: StudentResult | undefined;
  let term3Result: StudentResult | undefined;

  // Pick the most recent academic year results
  const sorted = [...(studentResults || [])].sort((a, b) => (b.academicYear || 0) - (a.academicYear || 0));
  const latestYear = sorted[0]?.academicYear || new Date().getFullYear();
  const currentYearResults = sorted.filter((r) => r.academicYear === latestYear);

  for (const r of currentYearResults) {
    const exam = (r.examName || "").toLowerCase();
    if (exam.includes("1st") || exam.includes("first")) {
      term1Result = r;
    } else if (exam.includes("2nd") || exam.includes("second")) {
      term2Result = r;
    } else if (exam.includes("3rd") || exam.includes("third") || exam.includes("annual")) {
      term3Result = r;
    }
  }

  // Collect all subject keys from any term results or default
  const subjectSet = new Set<string>();
  const addFromRecord = (rec?: StudentResult) => {
    if (rec?.subjectMarks && typeof rec.subjectMarks === "object") {
      Object.keys(rec.subjectMarks).forEach((k) => {
        const norm = normalizeSubjectName(k);
        if (norm) subjectSet.add(norm);
      });
    }
  };
  addFromRecord(term1Result);
  addFromRecord(term2Result);
  addFromRecord(term3Result);

  // If no subjects found from DB, use standard syllabus for class
  if (subjectSet.size === 0) {
    defaultSubjects.forEach((s) => subjectSet.add(s));
  }

  const subjectList = Array.from(subjectSet);

  // Compute highest marks per subject in class if classSummary is provided
  const highestMarksMap = new Map<string, number>();
  if (classSummary?.results) {
    for (const res of classSummary.results) {
      if (res.subjectMarks && typeof res.subjectMarks === "object") {
        for (const [rawSub, mark] of Object.entries(res.subjectMarks)) {
          const normSub = normalizeSubjectName(rawSub);
          const numMark = Number(mark) || 0;
          const currentHigh = highestMarksMap.get(normSub) || 0;
          if (numMark > currentHigh) {
            highestMarksMap.set(normSub, numMark);
          }
        }
      }
    }
  }

  // Helper to extract mark from a term result
  function getTermMark(
    res?: StudentResult,
    subjectName?: string,
    maxCap = 50
  ): { periodic: number | ""; preparatory: number | ""; total: number } {
    if (!res?.subjectMarks || !subjectName) {
      return { periodic: "", preparatory: "", total: 0 };
    }

    let rawVal: any = undefined;
    for (const [k, v] of Object.entries(res.subjectMarks)) {
      if (normalizeSubjectName(k) === subjectName) {
        rawVal = v;
        break;
      }
    }

    if (rawVal === undefined || rawVal === null || rawVal === "") {
      return { periodic: "", preparatory: "", total: 0 };
    }

    if (typeof rawVal === "object") {
      const p = Number(rawVal.periodic ?? rawVal.written ?? 0);
      const prep = Number(rawVal.preparatory ?? rawVal.oral ?? rawVal.project ?? 0);
      return { periodic: p, preparatory: prep, total: Math.min(maxCap, p + prep) };
    }

    const num = Number(rawVal);
    if (isNaN(num)) return { periodic: "", preparatory: "", total: 0 };

    // Standard WBBSE distribution: if single combined mark provided
    const capped = Math.min(maxCap, num);
    return { periodic: capped, preparatory: 0, total: capped };
  }

  // Build subject rows
  const subjectRows: SubjectMarksheetRow[] = subjectList.map((subName, idx) => {
    const t1 = getTermMark(term1Result, subName, 50);
    const t2 = getTermMark(term2Result, subName, 50);
    const t3 = getTermMark(term3Result, subName, 100);

    const highestInClass = highestMarksMap.get(subName) || "";

    const rawRow: SubjectMarksheetRow = {
      id: `sub-${idx + 1}`,
      subjectName: subName,
      term1: t1,
      term2: t2,
      term3: t3,
      overallTotal: 0,
      percentage: 0,
      grade: "",
      highestMarksInClass: highestInClass,
    };

    return calculateSubjectRow(rawRow);
  });

  // Determine Class Rank
  let classRankStr = "";
  const bestRankResult = term3Result || term2Result || term1Result || sorted[0];
  if (bestRankResult?.rankInClass && bestRankResult.rankInClass > 0) {
    const r = bestRankResult.rankInClass;
    classRankStr = r === 1 ? "1st" : r === 2 ? "2nd" : r === 3 ? "3rd" : `${r}th`;
  } else if (bestRankResult?.rankInSection && bestRankResult.rankInSection > 0) {
    const r = bestRankResult.rankInSection;
    classRankStr = r === 1 ? "1st" : r === 2 ? "2nd" : r === 3 ? "3rd" : `${r}th`;
  } else {
    const rollNum = Number(student.presentRoll);
    if (!isNaN(rollNum) && rollNum > 0) {
      classRankStr = rollNum === 1 ? "1st" : rollNum === 2 ? "2nd" : rollNum === 3 ? "3rd" : `${rollNum}th`;
    } else {
      classRankStr = "1st";
    }
  }

  const totals = calculateMarksheetTotals(subjectRows);
  const nextClassMap: Record<string, string> = {
    V: "VI",
    VI: "VII",
    VII: "VIII",
    VIII: "IX",
    IX: "X",
    X: "XI",
    XI: "XII",
  };
  const promotedTo = nextClassMap[normClass] || "Next Higher Class";

  return {
    academicYear: String(latestYear),
    subjects: subjectRows,
    classRank: classRankStr,
    promotionStatus: totals.resultStatus,
    promotedToClass: promotedTo,
  };
}

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

