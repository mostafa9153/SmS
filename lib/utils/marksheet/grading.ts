import { getSavedMarksSchemes, DEFAULT_MARKS_SCHEMES, ClassMarksScheme } from "@/lib/utils/marks-config";
import { DEFAULT_CLASS_IX_SUBJECTS } from "@/lib/utils/marksheet/default-subjects";
import { GradeScaleEntry, SubjectMarksheetRow } from "@/lib/utils/marksheet/types";

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
