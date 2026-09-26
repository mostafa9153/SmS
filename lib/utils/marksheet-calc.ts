/**
 * Calculation Engine and Data Models for Continuous & Comprehensive Evaluation (CCE) Marksheet
 * Marigachi High School (H.S.) - WBBSE / WBCHSE Curriculum
 */

import type { StudentResult, ClassResultsSummary, Student, StudentStatus, Semester, SubjectMarksMap, SubjectScoreDetail } from "@/lib/types";
import {
  getSavedMarksSchemes,
  DEFAULT_MARKS_SCHEMES,
  ClassMarksScheme,
  PromotionPolicy,
  getSavedPromotionPolicy,
  DEFAULT_PROMOTION_POLICY,
} from "@/lib/utils/marks-config";

export interface AssessmentTerm {
  periodic: number | "";      // Written assessment
  preparatory: number | "";   // Oral / Formative / Project assessment
  total: number;
}

export interface SubjectMarksheetRow {
  id: string;
  subjectName: string;
  term1: AssessmentTerm;       // 1st Summative Evaluation: 40 + 10 = 50 (or per class scheme)
  term2: AssessmentTerm;       // 2nd Summative Evaluation: 40 + 10 = 50
  term3: AssessmentTerm;       // 3rd Summative Evaluation: 90 + 10 = 100
  overallTotal: number;        // Out of 200
  percentage: number;          // Out of 100%
  grade: string;               // AA, A+, A, B+, B, C, D
  highestMarksInClass?: number | ""; // Highest in class / 1st boy marks comparison
}

export interface MarksheetData {
  academicYear: string;        // "2026"
  studentName: string;
  studentClass: string;        // "IX", "V", "VI", etc.
  section?: string;            // Optional
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
  classRank?: string;          // e.g. "1st", "2nd", "3rd", "10th"
  attendanceDays?: number;
  totalWorkingDays?: number;
}

export interface GradeScaleEntry {
  range: string;
  grade: string;
  remarks: string;
}

/**
 * Official WBBSE 7-Tier Evaluation Grading Scale
 */
export const WBBSE_GRADE_SCALE: GradeScaleEntry[] = [
  { range: "90% – 100%", grade: "AA", remarks: "Outstanding" },
  { range: "80% – 89%", grade: "A+", remarks: "Excellent" },
  { range: "60% – 79%", grade: "A", remarks: "Very Good" },
  { range: "45% – 59%", grade: "B+", remarks: "Good" },
  { range: "35% – 44%", grade: "B", remarks: "Satisfactory" },
  { range: "25% – 34%", grade: "C", remarks: "Marginal" },
  { range: "Below 25%", grade: "D", remarks: "Fail" },
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
 * Normalizes subject names across various spellings, abbreviations, and language keys
 */
export function normalizeSubjectName(raw: string): string {
  if (!raw) return "";
  const s = raw.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (s.includes("bengali") || s === "ben" || s === "fl" || s.includes("firstlanguage") || s === "beng") return "Bengali";
  if (s.includes("english") || s === "eng" || s === "sl" || s.includes("secondlanguage")) return "English";
  if (s.includes("sanskrit") || s === "sans" || s.includes("thirdlanguage")) return "Sanskrit (3rd Language)";
  if (s.includes("math") || s === "mat") return "Mathematics";
  if (s.includes("physic") || s === "psc" || s.includes("physicalsc")) return "Physical Science";
  if (s.includes("lifesc") || s.includes("bio") || s === "lsc" || s.includes("lifescience")) return "Life Science";
  if (s.includes("history") || s === "his" || s === "hist") return "History";
  if (s.includes("geography") || s === "geo" || s === "geog") return "Geography";
  if (s.includes("environ") || s.includes("paribesh") || s === "evs") return "Our Environment";
  if (s.includes("science") && !s.includes("life") && !s.includes("physical")) return "Environment & Science";
  if (s.includes("health") || s === "pe" || s.includes("physicaled") || s === "hp") return "Health & Physical Education";
  if (s.includes("art") || s.includes("work") || s.includes("supw")) return "Art & Work Education";
  return raw;
}

/**
 * Resolves the configuration scheme for a class
 */
export function getClassScheme(className?: string): ClassMarksScheme {
  const raw = (className || "IX").toUpperCase().trim().replace(/^CLASS\s+/i, "");
  const digitMap: Record<string, string> = {
    "5": "V", "6": "VI", "7": "VII", "8": "VIII", "9": "IX", "10": "X", "11": "XI", "12": "XII",
  };
  const standardKey = digitMap[raw] || raw;
  const schemes = typeof window !== "undefined" ? getSavedMarksSchemes() : DEFAULT_MARKS_SCHEMES;
  const matched = schemes.find(
    (s) => s.classCode.toUpperCase() === standardKey || s.className.toUpperCase().includes(standardKey)
  );
  if (matched) return matched;
  return DEFAULT_MARKS_SCHEMES.find((s) => s.classCode === standardKey) || DEFAULT_MARKS_SCHEMES[4]; // Fallback to Class IX
}

/**
 * Resolves standard curriculum subject names by class dynamically
 * - Class V: 5 subjects
 * - Class VI: 7 subjects
 * - Class VII & VIII: 8 subjects
 * - Class IX & X: 7 subjects
 * - Class XI & XII: 5 or 6 subjects
 */
export function getStandardSubjectsForClass(className?: string): string[] {
  const scheme = getClassScheme(className);
  if (scheme.subjects && scheme.subjects.length > 0) {
    return scheme.subjects;
  }

  const raw = (className || "IX").toUpperCase().trim().replace(/^CLASS\s+/i, "");
  if (raw === "V" || raw === "5") {
    return [
      "Bengali",
      "English",
      "Mathematics",
      "Our Environment",
      "Health & Physical Education",
    ];
  }
  if (raw === "VI" || raw === "6") {
    return [
      "Bengali",
      "English",
      "Mathematics",
      "Environment & Science",
      "Environment & History",
      "Environment & Geography",
      "Health & Physical Education",
    ];
  }
  if (raw === "VII" || raw === "7" || raw === "VIII" || raw === "8") {
    return [
      "Bengali",
      "English",
      "Sanskrit (3rd Language)",
      "Mathematics",
      "Environment & Science",
      "History",
      "Geography",
      "Health & Physical Education",
    ];
  }
  if (raw === "XI" || raw === "11" || raw === "XII" || raw === "12") {
    return [
      "Bengali",
      "English",
      "Physics",
      "Chemistry",
      "Mathematics",
      "Biological Sciences",
    ];
  }

  return DEFAULT_CLASS_IX_SUBJECTS.map((s) => s.subjectName);
}

/**
 * Calculates a single subject row with its 3 term totals, 200-mark overall total, %, and letter grade
 */
export function calculateSubjectRow(
  row: SubjectMarksheetRow,
  maxSubjectMarks: number = 200
): SubjectMarksheetRow {
  const p1 = Number(row.term1.periodic) || 0;
  const prep1 = Number(row.term1.preparatory) || 0;
  const t1 = p1 + prep1;

  const p2 = Number(row.term2.periodic) || 0;
  const prep2 = Number(row.term2.preparatory) || 0;
  const t2 = p2 + prep2;

  const p3 = Number(row.term3.periodic) || 0;
  const prep3 = Number(row.term3.preparatory) || 0;
  const t3 = p3 + prep3;

  const overallTotal = t1 + t2 + t3;
  const maxMarks = maxSubjectMarks > 0 ? maxSubjectMarks : 200;
  const percentage = Math.round(((overallTotal / maxMarks) * 100) * 10) / 10;
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
 * Generates realistic sample subject marks for any class (5, 7, 8, etc. subjects)
 */
export function getSampleSubjectsForClass(className?: string): SubjectMarksheetRow[] {
  const subjects = getStandardSubjectsForClass(className);
  const sampleScores = [
    { p1: 34, prep1: 9, p2: 36, prep2: 10, p3: 78, prep3: 9, high: 192 },
    { p1: 32, prep1: 8, p2: 35, prep2: 9, p3: 74, prep3: 9, high: 188 },
    { p1: 38, prep1: 10, p2: 39, prep2: 10, p3: 86, prep3: 10, high: 198 },
    { p1: 35, prep1: 9, p2: 37, prep2: 9, p3: 80, prep3: 10, high: 194 },
    { p1: 36, prep1: 10, p2: 38, prep2: 10, p3: 82, prep3: 10, high: 195 },
    { p1: 33, prep1: 9, p2: 34, prep2: 9, p3: 76, prep3: 9, high: 189 },
    { p1: 35, prep1: 9, p2: 36, prep2: 10, p3: 79, prep3: 10, high: 191 },
    { p1: 37, prep1: 10, p2: 38, prep2: 9, p3: 84, prep3: 10, high: 196 },
    { p1: 34, prep1: 9, p2: 35, prep2: 10, p3: 77, prep3: 9, high: 187 },
  ];

  return subjects.map((subName, idx) => {
    const s = sampleScores[idx % sampleScores.length];
    const row: SubjectMarksheetRow = {
      id: `sub-${idx + 1}`,
      subjectName: subName,
      term1: { periodic: s.p1, preparatory: s.prep1, total: 0 },
      term2: { periodic: s.p2, preparatory: s.prep2, total: 0 },
      term3: { periodic: s.p3, preparatory: s.prep3, total: 0 },
      overallTotal: 0,
      percentage: 0,
      grade: "",
      highestMarksInClass: s.high,
    };
    return calculateSubjectRow(row);
  });
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

export function calculateMarksheetTotals(
  subjects: SubjectMarksheetRow[],
  subjectMax: number = 200
): MarksheetGrandTotals {
  const count = subjects.length || 7;
  const maxPossibleMarks = count * (subjectMax > 0 ? subjectMax : 200);

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

/**
 * Automatically transforms database result records for a student into complete marksheet subject rows
 * and calculates highest marks in class per subject
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

  // Compute highest marks per subject in class (First Boy comparison)
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

// ============================================================================
// Automatic Promotion & Lifecycle Status Evaluation Engine
// ============================================================================

export interface SubjectEvaluationDetail {
  subjectName: string;
  theoryMarks?: number;
  theoryFullMarks?: number;
  theoryPassPercentage: number;
  theoryPassed: boolean;
  practicalMarks?: number;
  practicalFullMarks?: number;
  practicalPassPercentage: number;
  practicalPassed: boolean;
  totalMarks: number;
  totalFullMarks: number;
  totalPercentage: number;
  isPassed: boolean;
  isCompulsory: boolean;
  supplementaryTheory?: number;
  supplementaryPractical?: number;
  supplementaryTotal?: number;
  isSupplementaryCleared?: boolean;
}

export interface StudentPromotionEvaluation {
  studentId: string;
  studentName?: string;
  currentClass: string;
  currentSemester?: Semester | null;
  academicYear: number;
  eligibleStatus: StudentStatus;
  targetClass: string;
  targetSemester?: Semester | null;
  targetStudentType: "active" | "pending" | "old";
  isAutoPass: boolean;
  totalMarksObtained: number;
  totalFullMarks: number;
  overallPercentage: number;
  passedSubjectsCount: number;
  failedSubjectsCount: number;
  failedSubjectNames: string[];
  compulsoryPassed: boolean;
  subjectDetails: SubjectEvaluationDetail[];
  reason: string;
}

/**
 * Evaluates a student's marks and determines their next promotion status,
 * target class, target semester, and student register section (Active, Pending, or Old).
 */
export function evaluateStudentPromotionEligibility(params: {
  studentId: string;
  studentName?: string;
  currentClass: string;
  currentSemester?: Semester | null;
  academicYear: number;
  examName?: string;
  marksObtained: number;
  fullMarks?: number;
  subjectMarks?: SubjectMarksMap;
  historicalSemesterResults?: {
    sem1?: StudentResult | null;
    sem2?: StudentResult | null;
    sem3?: StudentResult | null;
    sem4?: StudentResult | null;
  };
  policy?: PromotionPolicy;
}): StudentPromotionEvaluation {
  const policy = params.policy || getSavedPromotionPolicy();
  const normClass = (params.currentClass || "V").toUpperCase().trim().replace(/^CLASS\s+/i, "");
  const digitMap: Record<string, string> = {
    "5": "V", "6": "VI", "7": "VII", "8": "VIII", "9": "IX", "10": "X", "11": "XI", "12": "XII",
  };
  const standardClass = digitMap[normClass] || normClass;
  const currentSemester = params.currentSemester || null;
  const examName = params.examName || "Annual Examination";

  const nextClassMap: Record<string, string> = {
    V: "VI", VI: "VII", VII: "VIII", VIII: "IX", IX: "X", X: "XI", XI: "XII", XII: "Passed Out",
  };
  const targetClass = nextClassMap[standardClass] || standardClass;

  // 1. RTE Auto-Pass Classes (Class V - VIII)
  const isAutoPassClass = policy.autoPassClasses.includes(standardClass);
  if (isAutoPassClass) {
    return {
      studentId: params.studentId,
      studentName: params.studentName,
      currentClass: standardClass,
      currentSemester: null,
      academicYear: params.academicYear,
      eligibleStatus: "Promoted But Not Admitted",
      targetClass,
      targetSemester: null,
      targetStudentType: "pending",
      isAutoPass: true,
      totalMarksObtained: params.marksObtained,
      totalFullMarks: params.fullMarks || 500,
      overallPercentage: params.fullMarks ? Number(((params.marksObtained / params.fullMarks) * 100).toFixed(2)) : 100,
      passedSubjectsCount: 0,
      failedSubjectsCount: 0,
      failedSubjectNames: [],
      compulsoryPassed: true,
      subjectDetails: [],
      reason: "RTE Act Government Policy: 100% Auto-Promotion to Next Higher Class.",
    };
  }

  // 2. Class Scheme & Subject Breakdown Analysis
  const scheme = getClassScheme(standardClass);
  const configuredSubjects = scheme.subjects && scheme.subjects.length > 0
    ? scheme.subjects
    : getStandardSubjectsForClass(standardClass);

  const subjectDetails: SubjectEvaluationDetail[] = [];
  const failedSubjectNames: string[] = [];
  let compulsoryPassed = true;

  const rawSubjectMarks = params.subjectMarks || {};
  const hasSubjectMarks = Object.keys(rawSubjectMarks).length > 0;

  if (hasSubjectMarks) {
    for (const subName of configuredSubjects) {
      // Find mark in subjectMarks
      let rawVal: any = undefined;
      for (const [k, v] of Object.entries(rawSubjectMarks)) {
        if (normalizeSubjectName(k) === normalizeSubjectName(subName) || k.toLowerCase().trim() === subName.toLowerCase().trim()) {
          rawVal = v;
          break;
        }
      }

      const isCompulsory = policy.compulsorySubjects.some((comp) =>
        normalizeSubjectName(comp) === normalizeSubjectName(subName)
      );

      // Resolve full marks per subject for this class
      const subFullWritten = scheme.annualWritten || 90;
      const subFullPractical = scheme.annualPractical || 10;
      const subTotalFull = subFullWritten + subFullPractical;

      let tMarks = 0;
      let pMarks = 0;
      let totalMarks = 0;
      let hasBreakdown = false;
      let suppTheory: number | undefined = undefined;
      let suppPractical: number | undefined = undefined;
      let suppTotal: number | undefined = undefined;
      let isSupplementaryCleared = false;

      if (rawVal !== undefined && rawVal !== null) {
        if (typeof rawVal === "object") {
          tMarks = Number(rawVal.theory ?? rawVal.periodic ?? rawVal.written ?? 0);
          pMarks = Number(rawVal.practical ?? rawVal.preparatory ?? rawVal.project ?? 0);
          totalMarks = Number(rawVal.total ?? (tMarks + pMarks));
          hasBreakdown = true;

          if (rawVal.supplementaryTheory !== undefined || rawVal.supplementaryPractical !== undefined || rawVal.supplementaryTotal !== undefined) {
            suppTheory = rawVal.supplementaryTheory !== undefined && rawVal.supplementaryTheory !== "" ? Number(rawVal.supplementaryTheory) : undefined;
            suppPractical = rawVal.supplementaryPractical !== undefined && rawVal.supplementaryPractical !== "" ? Number(rawVal.supplementaryPractical) : undefined;
            suppTotal = rawVal.supplementaryTotal !== undefined && rawVal.supplementaryTotal !== ""
              ? Number(rawVal.supplementaryTotal)
              : (suppTheory !== undefined || suppPractical !== undefined)
              ? (Number(suppTheory ?? tMarks) + Number(suppPractical ?? pMarks))
              : undefined;
          }
        } else {
          totalMarks = Number(rawVal) || 0;
        }
      }

      const theoryPercentage = subFullWritten > 0 ? (tMarks / subFullWritten) * 100 : 100;
      const practicalPercentage = subFullPractical > 0 ? (pMarks / subFullPractical) * 100 : 100;
      const totalPercentage = subTotalFull > 0 ? (totalMarks / subTotalFull) * 100 : 100;

      let isPassed = false;
      let theoryPassed = true;
      let practicalPassed = true;

      const reqSubjectPassPct = policy.subjectPassPercentage ?? policy.minPassPercentage ?? 30;
      const reqTheoryPassPct = policy.theoryPassPercentage ?? 30;
      const reqPracticalPassPct = policy.practicalPassPercentage ?? 30;

      if (hasBreakdown) {
        theoryPassed = theoryPercentage >= reqTheoryPassPct;
        practicalPassed = practicalPercentage >= reqPracticalPassPct;
        isPassed = theoryPassed && practicalPassed && totalPercentage >= reqSubjectPassPct;
      } else {
        isPassed = totalPercentage >= reqSubjectPassPct;
      }

      // Check if supplementary / re-test marks clear the subject failure
      if (!isPassed && (suppTheory !== undefined || suppPractical !== undefined || suppTotal !== undefined)) {
        const evalSuppT = suppTheory !== undefined ? suppTheory : tMarks;
        const evalSuppP = suppPractical !== undefined ? suppPractical : pMarks;
        const evalSuppTot = suppTotal !== undefined ? suppTotal : (evalSuppT + evalSuppP);

        const suppTPct = subFullWritten > 0 ? (evalSuppT / subFullWritten) * 100 : 100;
        const suppPPct = subFullPractical > 0 ? (evalSuppP / subFullPractical) * 100 : 100;
        const suppTotPct = subTotalFull > 0 ? (evalSuppTot / subTotalFull) * 100 : 100;

        const sTPassed = suppTPct >= reqTheoryPassPct;
        const sPPassed = suppPPct >= reqPracticalPassPct;
        const sTotPassed = suppTotPct >= reqSubjectPassPct;

        if (sTPassed && sPPassed && sTotPassed) {
          isPassed = true;
          theoryPassed = true;
          practicalPassed = true;
          isSupplementaryCleared = true;
          tMarks = evalSuppT;
          pMarks = evalSuppP;
          totalMarks = evalSuppTot;
        }
      }

      if (!isPassed) {
        failedSubjectNames.push(subName);
        if (isCompulsory) {
          compulsoryPassed = false;
        }
      }

      subjectDetails.push({
        subjectName: subName,
        theoryMarks: hasBreakdown ? tMarks : undefined,
        theoryFullMarks: hasBreakdown ? subFullWritten : undefined,
        theoryPassPercentage: reqTheoryPassPct,
        theoryPassed,
        practicalMarks: hasBreakdown ? pMarks : undefined,
        practicalFullMarks: hasBreakdown ? subFullPractical : undefined,
        practicalPassPercentage: reqPracticalPassPct,
        practicalPassed,
        totalMarks,
        totalFullMarks: subTotalFull,
        totalPercentage: Number((subTotalFull > 0 ? (totalMarks / subTotalFull) * 100 : 100).toFixed(2)),
        isPassed,
        isCompulsory,
        supplementaryTheory: suppTheory,
        supplementaryPractical: suppPractical,
        supplementaryTotal: suppTotal,
        isSupplementaryCleared,
      });
    }
  }

  const annualWrittenFull = scheme.annualWritten ?? scheme.evenSemesterMarks ?? 50;
  const annualPracticalFull = scheme.annualPractical ?? 0;
  const fullMarks = params.fullMarks || (scheme.subjectCount * (annualWrittenFull + annualPracticalFull)) || 500;
  const overallPercentage = fullMarks > 0 ? Number(((params.marksObtained / fullMarks) * 100).toFixed(2)) : 0;
  const passedSubjectsCount = configuredSubjects.length - failedSubjectNames.length;
  const failedSubjectsCount = failedSubjectNames.length;

  // Pass evaluation flags (strictly based on subject-level pass + compulsory rules)
  const passedSubjectCountRequirement = policy.requireFiveSubjectsPass
    ? passedSubjectsCount >= Math.min(5, configuredSubjects.length)
    : failedSubjectsCount === 0;
  const overallPassed = hasSubjectMarks
    ? passedSubjectCountRequirement && compulsoryPassed
    : overallPercentage >= (policy.subjectPassPercentage ?? policy.minPassPercentage ?? 30);

  // 3. Class IX Evaluation
  if (standardClass === "IX") {
    if (overallPassed) {
      return {
        studentId: params.studentId,
        studentName: params.studentName,
        currentClass: "IX",
        currentSemester: null,
        academicYear: params.academicYear,
        eligibleStatus: "Promoted But Not Admitted",
        targetClass: "X",
        targetSemester: null,
        targetStudentType: "pending",
        isAutoPass: false,
        totalMarksObtained: params.marksObtained,
        totalFullMarks: fullMarks,
        overallPercentage,
        passedSubjectsCount,
        failedSubjectsCount,
        failedSubjectNames,
        compulsoryPassed,
        subjectDetails,
        reason: "Passed Class IX Annual Examination. Eligible for Class X Re-Admission.",
      };
    } else {
      const failReason = !compulsoryPassed
        ? "Failed in compulsory language subject(s)"
        : !passedSubjectCountRequirement
        ? `Passed only ${passedSubjectsCount} subjects (5 required)`
        : `Failed in ${failedSubjectsCount} subject(s)`;

      return {
        studentId: params.studentId,
        studentName: params.studentName,
        currentClass: "IX",
        currentSemester: null,
        academicYear: params.academicYear,
        eligibleStatus: "Detained",
        targetClass: "IX",
        targetSemester: null,
        targetStudentType: "active",
        isAutoPass: false,
        totalMarksObtained: params.marksObtained,
        totalFullMarks: fullMarks,
        overallPercentage,
        passedSubjectsCount,
        failedSubjectsCount,
        failedSubjectNames,
        compulsoryPassed,
        subjectDetails,
        reason: `Detained in Class IX: ${failReason}.`,
      };
    }
  }

  // 4. Class X (Selection / Test Exam - November)
  if (standardClass === "X") {
    if (overallPassed) {
      return {
        studentId: params.studentId,
        studentName: params.studentName,
        currentClass: "X",
        currentSemester: null,
        academicYear: params.academicYear,
        eligibleStatus: "Sent Up M.P.",
        targetClass: "X",
        targetSemester: null,
        targetStudentType: "active",
        isAutoPass: false,
        totalMarksObtained: params.marksObtained,
        totalFullMarks: fullMarks,
        overallPercentage,
        passedSubjectsCount,
        failedSubjectsCount,
        failedSubjectNames,
        compulsoryPassed,
        subjectDetails,
        reason: "Passed Madhyamik Selection Test Exam. Sent Up for Madhyamik Pariksha.",
      };
    } else {
      return {
        studentId: params.studentId,
        studentName: params.studentName,
        currentClass: "X",
        currentSemester: null,
        academicYear: params.academicYear,
        eligibleStatus: "10th test fail",
        targetClass: "X",
        targetSemester: null,
        targetStudentType: "active",
        isAutoPass: false,
        totalMarksObtained: params.marksObtained,
        totalFullMarks: fullMarks,
        overallPercentage,
        passedSubjectsCount,
        failedSubjectsCount,
        failedSubjectNames,
        compulsoryPassed,
        subjectDetails,
        reason: `Failed Madhyamik Selection Test Exam (${overallPercentage}%). Detained / Needs Re-test.`,
      };
    }
  }

  // 5. Class XI (Higher Secondary - Semester 1 & Semester 2)
  if (standardClass === "XI") {
    const isSem1Exam =
      examName.toLowerCase().includes("sem 1") ||
      examName.toLowerCase().includes("semester 1") ||
      (currentSemester === "Sem 1" &&
        !examName.toLowerCase().includes("sem 2") &&
        !examName.toLowerCase().includes("semester 2") &&
        !examName.toLowerCase().includes("annual"));

    // Semester 1 -> Semester 2: In-place direct progression
    if (isSem1Exam) {
      return {
        studentId: params.studentId,
        studentName: params.studentName,
        currentClass: "XI",
        currentSemester: "Sem 1",
        academicYear: params.academicYear,
        eligibleStatus: "Continuing",
        targetClass: "XI",
        targetSemester: "Sem 2",
        targetStudentType: "active",
        isAutoPass: false,
        totalMarksObtained: params.marksObtained,
        totalFullMarks: fullMarks,
        overallPercentage,
        passedSubjectsCount,
        failedSubjectsCount,
        failedSubjectNames,
        compulsoryPassed,
        subjectDetails,
        reason: "Completed Semester 1. Direct in-place advancement to Semester 2 (No re-admission required).",
      };
    }

    // Semester 2: Comprehensive evaluation across Sem 1 & Sem 2
    // Combine unique failed subjects across Sem 1 and Sem 2
    const allUniqueFailedSubjects = new Set<string>(failedSubjectNames);
    if (params.historicalSemesterResults?.sem1?.subjectMarks) {
      const s1Marks = params.historicalSemesterResults.sem1.subjectMarks;
      for (const sub of configuredSubjects) {
        const val = s1Marks[sub] || s1Marks[normalizeSubjectName(sub)];
        const semPassPct = policy.subjectPassPercentage ?? policy.minPassPercentage ?? 30;
        if (typeof val === "number" && val < (50 * (semPassPct / 100))) {
          allUniqueFailedSubjects.add(sub);
        }
      }
    }

    const uniqueFailedList = Array.from(allUniqueFailedSubjects);
    const uniqueFailedCount = uniqueFailedList.length;

    if (uniqueFailedCount === 0 && overallPassed) {
      return {
        studentId: params.studentId,
        studentName: params.studentName,
        currentClass: "XI",
        currentSemester: "Sem 2",
        academicYear: params.academicYear,
        eligibleStatus: "Promoted But Not Admitted",
        targetClass: "XII",
        targetSemester: "Sem 3",
        targetStudentType: "pending",
        isAutoPass: false,
        totalMarksObtained: params.marksObtained,
        totalFullMarks: fullMarks,
        overallPercentage,
        passedSubjectsCount,
        failedSubjectsCount: 0,
        failedSubjectNames: [],
        compulsoryPassed: true,
        subjectDetails,
        reason: "Cleared Class XI (Sem 1 & Sem 2). Promoted to Class XII (Sem 3) - Pending Re-Admission.",
      };
    } else if (uniqueFailedCount >= 1 && uniqueFailedCount <= policy.class11MaxSupplementarySubjects) {
      return {
        studentId: params.studentId,
        studentName: params.studentName,
        currentClass: "XI",
        currentSemester: "Sem 2",
        academicYear: params.academicYear,
        eligibleStatus: "Supplementary",
        targetClass: "XI",
        targetSemester: "Sem 2",
        targetStudentType: "active",
        isAutoPass: false,
        totalMarksObtained: params.marksObtained,
        totalFullMarks: fullMarks,
        overallPercentage,
        passedSubjectsCount,
        failedSubjectsCount: uniqueFailedCount,
        failedSubjectNames: uniqueFailedList,
        compulsoryPassed,
        subjectDetails,
        reason: `Supplementary in ${uniqueFailedCount} subject(s): ${uniqueFailedList.join(", ")}. Eligible to appear for Supplementary examination.`,
      };
    } else {
      const failReason = uniqueFailedCount > 0
        ? `Failed in ${uniqueFailedCount} subjects (${uniqueFailedList.join(", ")})`
        : `Overall score ${overallPercentage}% is below required ${policy.minPassPercentage}%`;

      return {
        studentId: params.studentId,
        studentName: params.studentName,
        currentClass: "XI",
        currentSemester: "Sem 2",
        academicYear: params.academicYear,
        eligibleStatus: "Detained",
        targetClass: "XI",
        targetSemester: "Sem 1",
        targetStudentType: "active",
        isAutoPass: false,
        totalMarksObtained: params.marksObtained,
        totalFullMarks: fullMarks,
        overallPercentage,
        passedSubjectsCount,
        failedSubjectsCount: uniqueFailedCount,
        failedSubjectNames: uniqueFailedList,
        compulsoryPassed,
        subjectDetails,
        reason: `Detained in Class XI (Year Back): ${failReason}.`,
      };
    }
  }

  // 6. Class XII (Higher Secondary - Semester 3 & Semester 4)
  if (standardClass === "XII") {
    const isSem3Exam =
      examName.toLowerCase().includes("sem 3") ||
      examName.toLowerCase().includes("semester 3") ||
      (currentSemester === "Sem 3" &&
        !examName.toLowerCase().includes("sem 4") &&
        !examName.toLowerCase().includes("semester 4") &&
        !examName.toLowerCase().includes("annual") &&
        !examName.toLowerCase().includes("selection"));

    // Semester 3 -> Semester 4: In-place direct progression
    if (isSem3Exam) {
      return {
        studentId: params.studentId,
        studentName: params.studentName,
        currentClass: "XII",
        currentSemester: "Sem 3",
        academicYear: params.academicYear,
        eligibleStatus: "Continuing",
        targetClass: "XII",
        targetSemester: "Sem 4",
        targetStudentType: "active",
        isAutoPass: false,
        totalMarksObtained: params.marksObtained,
        totalFullMarks: fullMarks,
        overallPercentage,
        passedSubjectsCount,
        failedSubjectsCount,
        failedSubjectNames,
        compulsoryPassed,
        subjectDetails,
        reason: "Completed Semester 3. Direct in-place advancement to Semester 4.",
      };
    }

    // Semester 4: Final Board Examination Evaluation across Sem 3 & Sem 4
    const allUniqueFailedSubjects = new Set<string>(failedSubjectNames);
    if (params.historicalSemesterResults?.sem3?.subjectMarks) {
      const s3Marks = params.historicalSemesterResults.sem3.subjectMarks;
      for (const sub of configuredSubjects) {
        const val = s3Marks[sub] || s3Marks[normalizeSubjectName(sub)];
        const semPassPct = policy.subjectPassPercentage ?? policy.minPassPercentage ?? 30;
        if (typeof val === "number" && val < (50 * (semPassPct / 100))) {
          allUniqueFailedSubjects.add(sub);
        }
      }
    }

    const uniqueFailedList = Array.from(allUniqueFailedSubjects);
    const uniqueFailedCount = uniqueFailedList.length;

    if (uniqueFailedCount === 0 && overallPassed) {
      return {
        studentId: params.studentId,
        studentName: params.studentName,
        currentClass: "XII",
        currentSemester: "Sem 4",
        academicYear: params.academicYear,
        eligibleStatus: "Passed Out",
        targetClass: "XII",
        targetSemester: "Sem 4",
        targetStudentType: "old",
        isAutoPass: false,
        totalMarksObtained: params.marksObtained,
        totalFullMarks: fullMarks,
        overallPercentage,
        passedSubjectsCount,
        failedSubjectsCount: 0,
        failedSubjectNames: [],
        compulsoryPassed: true,
        subjectDetails,
        reason: "Successfully cleared Higher Secondary Examination (WBCHSE). Graduated / Passed Out.",
      };
    } else if (uniqueFailedCount >= 1 && uniqueFailedCount <= policy.class12MaxCompartmentalSubjects) {
      return {
        studentId: params.studentId,
        studentName: params.studentName,
        currentClass: "XII",
        currentSemester: "Sem 4",
        academicYear: params.academicYear,
        eligibleStatus: "Compartmental",
        targetClass: "XII",
        targetSemester: "Sem 4",
        targetStudentType: "active",
        isAutoPass: false,
        totalMarksObtained: params.marksObtained,
        totalFullMarks: fullMarks,
        overallPercentage,
        passedSubjectsCount,
        failedSubjectsCount: uniqueFailedCount,
        failedSubjectNames: uniqueFailedList,
        compulsoryPassed,
        subjectDetails,
        reason: `Compartmental candidate in ${uniqueFailedCount} subject(s): ${uniqueFailedList.join(", ")}. Eligible for Board Compartmental Examination.`,
      };
    } else {
      const failReason = uniqueFailedCount > 0
        ? `Failed in ${uniqueFailedCount} subjects (${uniqueFailedList.join(", ")})`
        : `Overall score ${overallPercentage}% is below required ${policy.minPassPercentage}%`;

      return {
        studentId: params.studentId,
        studentName: params.studentName,
        currentClass: "XII",
        currentSemester: "Sem 4",
        academicYear: params.academicYear,
        eligibleStatus: "C.C.H.S.",
        targetClass: "XII",
        targetSemester: "Sem 4",
        targetStudentType: "active",
        isAutoPass: false,
        totalMarksObtained: params.marksObtained,
        totalFullMarks: fullMarks,
        overallPercentage,
        passedSubjectsCount,
        failedSubjectsCount: uniqueFailedCount,
        failedSubjectNames: uniqueFailedList,
        compulsoryPassed,
        subjectDetails,
        reason: `C.C.H.S. (Continuing Candidate H.S.): ${failReason}.`,
      };
    }
  }

  // Generic fallback
  return {
    studentId: params.studentId,
    studentName: params.studentName,
    currentClass: standardClass,
    currentSemester,
    academicYear: params.academicYear,
    eligibleStatus: overallPassed ? "Promoted But Not Admitted" : "Detained",
    targetClass,
    targetSemester: null,
    targetStudentType: overallPassed ? "pending" : "active",
    isAutoPass: false,
    totalMarksObtained: params.marksObtained,
    totalFullMarks: fullMarks,
    overallPercentage,
    passedSubjectsCount,
    failedSubjectsCount,
    failedSubjectNames,
    compulsoryPassed,
    subjectDetails,
    reason: overallPassed ? "Passed evaluation criteria." : "Failed evaluation criteria.",
  };
}
