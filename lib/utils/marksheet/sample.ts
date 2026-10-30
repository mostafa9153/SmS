import { calculateSubjectRow, getStandardSubjectsForClass } from "@/lib/utils/marksheet/grading";
import { DEFAULT_CLASS_IX_SUBJECTS } from "@/lib/utils/marksheet/default-subjects";
import { SubjectMarksheetRow } from "@/lib/utils/marksheet/types";

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
