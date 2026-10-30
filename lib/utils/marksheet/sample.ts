import { calculateSubjectRow, getStandardSubjectsForClass } from "@/lib/utils/marksheet/grading";
import { SubjectMarksheetRow } from "@/lib/utils/marksheet/types";

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
