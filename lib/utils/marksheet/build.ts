import type { StudentResult, ClassResultsSummary, Student } from "@/lib/types";
import { calculateSubjectRow, getStandardSubjectsForClass, getWBBSEGrade, normalizeSubjectName } from "@/lib/utils/marksheet/grading";
import { MarksheetData, SubjectMarksheetRow } from "@/lib/utils/marksheet/types";

/**
 * Summary totals across all subjects
 */
interface MarksheetGrandTotals {
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
