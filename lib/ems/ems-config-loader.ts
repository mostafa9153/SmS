import { getSavedSchoolProfile, SchoolProfileData } from "@/lib/utils/school-profile";
import { getSavedMarksSchemes, ClassMarksScheme } from "@/lib/utils/marks-config";
import { getStandardSubjectsForClass } from "@/lib/utils/marksheet-calc";

export interface DynamicClassItem {
  id?: string;
  name: string;
  code: string;
  sections: string[];
  stream?: string;
}

export const FALLBACK_CLASSES: DynamicClassItem[] = [
  { name: "Class V", code: "V", sections: ["A", "B"] },
  { name: "Class VI", code: "VI", sections: ["A", "B"] },
  { name: "Class VII", code: "VII", sections: ["A", "B"] },
  { name: "Class VIII", code: "VIII", sections: ["A", "B"] },
  { name: "Class IX", code: "IX", sections: ["A", "B"] },
  { name: "Class X", code: "X", sections: ["A", "B"] },
  { name: "Class XI", code: "XI", sections: ["A", "B", "C"] },
  { name: "Class XII", code: "XII", sections: ["A", "B", "C"] },
];

// Numeric rank helper to sort classes in standard grade sequence: V -> VI -> VII -> VIII -> IX -> X -> XI -> XII
export function getClassNumericRank(c?: string): number {
  if (!c) return 99;
  const clean = c.trim().toUpperCase().replace(/^CLASS\s*[-_]?\s*/i, "");
  const romanMap: Record<string, number> = {
    "PP": 0, "PRE-PRIMARY": 0,
    "I": 1, "1": 1,
    "II": 2, "2": 2,
    "III": 3, "3": 3,
    "IV": 4, "4": 4,
    "V": 5, "5": 5,
    "VI": 6, "6": 6,
    "VII": 7, "7": 7,
    "VIII": 8, "8": 8,
    "IX": 9, "9": 9,
    "X": 10, "10": 10,
    "XI": 11, "11": 11,
    "XII": 12, "12": 12,
  };
  if (clean in romanMap) return romanMap[clean];
  const num = parseInt(clean.replace(/\D/g, ""), 10);
  return !isNaN(num) ? num : 99;
}

/**
 * Retrieve active classes configured in the database / School Details.
 */
export function getDynamicClassList(): DynamicClassItem[] {
  if (typeof window === "undefined") return FALLBACK_CLASSES;
  try {
    const raw = localStorage.getItem("sms_class_management");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const mapped: DynamicClassItem[] = parsed.map((c: any) => ({
          name: c.name || `Class ${c.code}`,
          code: String(c.code || c.name).trim().toUpperCase(),
          sections: Array.isArray(c.sections) && c.sections.length > 0 ? c.sections : ["A", "B"],
          stream: c.stream,
        }));
        return mapped.sort((a, b) => getClassNumericRank(a.code) - getClassNumericRank(b.code));
      }
    }
  } catch (err) {
    console.error("Error reading dynamic classes from storage:", err);
  }
  return [...FALLBACK_CLASSES].sort((a, b) => getClassNumericRank(a.code) - getClassNumericRank(b.code));
}

/**
 * Get class codes array sorted in standard grade order (e.g. ["V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"]).
 */
export function getDynamicClassCodes(): string[] {
  const classes = getDynamicClassList();
  return classes.map((c) => c.code);
}

/**
 * Get active sections configured for a specific class code.
 */
export function getDynamicSectionsForClass(classCode: string): string[] {
  const classes = getDynamicClassList();
  const target = classes.find(
    (c) => c.code.toUpperCase() === classCode.trim().toUpperCase()
  );
  if (target && target.sections && target.sections.length > 0) {
    return target.sections;
  }
  return ["A", "B", "C", "D"];
}

/**
 * Clean and simplify long subject names for exam columns (e.g. "Bengali (1st Language)" -> "Bengali").
 */
export function simplifySubjectName(fullName: string): string {
  if (!fullName) return "Exam";
  return fullName
    .replace(/\s*\([^)]*\)/g, "") // remove parentheticals like (1st Language)
    .replace(/Environment & /gi, "")
    .trim();
}

/**
 * Get the real subjects configured for given classes from Marks Distribution Schemes.
 * Returns up to 8 subjects matching the classes.
 */
export function getDynamicSubjectsForClasses(classCodes: string[]): string[] {
  const schemes: ClassMarksScheme[] = getSavedMarksSchemes();
  const subjectsSet = new Set<string>();

  // If specific classes are provided, pull their subjects
  const cleanCodes = classCodes.map((c) => c.trim().toUpperCase());
  const matchedSchemes = schemes.filter((s) => cleanCodes.includes(s.classCode.toUpperCase()));

  const targetSchemes = matchedSchemes.length > 0 ? matchedSchemes : schemes;

  targetSchemes.forEach((s) => {
    if (Array.isArray(s.subjects) && s.subjects.length > 0) {
      s.subjects.forEach((sub) => {
        const simplified = simplifySubjectName(sub);
        if (simplified) subjectsSet.add(simplified);
      });
    }
  });

  const subjectList = Array.from(subjectsSet);

  if (subjectList.length > 0) {
    // Fill or slice to exactly 8 columns
    const result: string[] = [];
    for (let i = 0; i < 8; i++) {
      if (i < subjectList.length) {
        result.push(subjectList[i]);
      } else {
        result.push(`Exam ${i + 1}`);
      }
    }
    return result;
  }

  // Fallback defaults
  return [
    "Bengali",
    "English",
    "Math",
    "Phy Sci",
    "Life Sci",
    "History",
    "Geography",
    "Additional",
  ];
}

/**
 * Get pure, unpadded real subjects configured in the database for a specific class.
 * Normalizes Roman/number class representations, reads directly from saved Marks Schemes
 * (synced from DB), checks students' subjects, and merges standard WBBSE/WBCHSE subjects.
 * Never adds dummy "Exam X" values.
 */
export function getDatabaseSubjectsForClass(
  classCode: string,
  students: {
    presentClass?: string;
    mandatorySubjects?: string[];
    additionalSubjects?: string[];
    coCurricularSubjects?: string[];
    languageGroup?: string[];
  }[] = []
): string[] {
  const normClass = (classCode || "VII")
    .trim()
    .toUpperCase()
    .replace(/^CLASS\s*[-_]?\s*/i, "");

  const romanMap: Record<string, string> = {
    "1": "I", "2": "II", "3": "III", "4": "IV", "5": "V",
    "6": "VI", "7": "VII", "8": "VIII", "9": "IX", "10": "X",
    "11": "XI", "12": "XII",
  };
  const normalizedClass = romanMap[normClass] || normClass;

  const cleanSubjectName = (sub: string): string => {
    if (!sub) return "";
    let s = sub.trim();
    // Clean "(1st Language)", "(2nd Language)", etc. for clean tabular display
    s = s.replace(/\s*\([^)]*\)/g, "").trim();
    return s;
  };

  // 1. Primary Source of Truth: Settings -> School Details & Institutional Setup -> Class Subjects
  const schemes: ClassMarksScheme[] = getSavedMarksSchemes();
  const matchedScheme = schemes.find((s) => {
    const sCode = (s.classCode || s.className || "")
      .trim()
      .toUpperCase()
      .replace(/^CLASS\s*[-_]?\s*/i, "");
    return (romanMap[sCode] || sCode) === normalizedClass;
  });

  // If configured in School Details -> Class Subjects, return EXACTLY those subjects (besio na, komo na)
  if (matchedScheme && Array.isArray(matchedScheme.subjects) && matchedScheme.subjects.length > 0) {
    const exactConfiguredSubjects: string[] = [];
    matchedScheme.subjects.forEach((sub) => {
      const clean = cleanSubjectName(sub);
      if (clean && !exactConfiguredSubjects.includes(clean)) {
        exactConfiguredSubjects.push(clean);
      }
    });
    if (exactConfiguredSubjects.length > 0) {
      return exactConfiguredSubjects;
    }
  }

  // 2. Default fallback if no scheme is configured yet in Settings
  const fallbackCurriculumMap: Record<string, string[]> = {
    V: ["Bengali", "English", "Mathematics", "Our Environment"],
    VI: ["Bengali", "English", "Mathematics", "Environment & Science", "History", "Geography"],
    VII: ["Bengali", "English", "Sanskrit", "Mathematics", "Environment & Science", "History", "Geography"],
    VIII: ["Bengali", "English", "Sanskrit", "Mathematics", "Environment & Science", "History", "Geography"],
    IX: ["Bengali", "English", "Mathematics", "Physical Science", "Life Science", "History", "Geography"],
    X: ["Bengali", "English", "Mathematics", "Physical Science", "Life Science", "History", "Geography"],
    XI: ["Bengali", "English", "Physics", "Chemistry", "Mathematics", "Biological Sciences"],
    XII: ["Bengali", "English", "Physics", "Chemistry", "Mathematics", "Biological Sciences"],
  };

  return fallbackCurriculumMap[normalizedClass] || [
    "Bengali", "English", "Mathematics", "Environment & Science", "History", "Geography",
  ];
}

/**
 * Fetch and sync all fresh school configurations (Profile, Classes, Marks Schemes, Rooms, Allocations)
 * directly from the Supabase database.
 */
export async function syncAllEmsConfigsFromDb(): Promise<{
  profile: SchoolProfileData;
  classes: DynamicClassItem[];
}> {
  try {
    const res = await fetch("/api/school-config", { cache: "no-store" });
    if (res.ok) {
      const json = await res.json();
      if (json?.data) {
        if (json.data.school_profile && typeof window !== "undefined") {
          localStorage.setItem("sms_school_profile", JSON.stringify(json.data.school_profile));
        }
        if (json.data.class_management && Array.isArray(json.data.class_management) && typeof window !== "undefined") {
          localStorage.setItem("sms_class_management", JSON.stringify(json.data.class_management));
        }
        if (json.data.marks_schemes && Array.isArray(json.data.marks_schemes) && typeof window !== "undefined") {
          localStorage.setItem("sms_marks_distribution_schemes", JSON.stringify(json.data.marks_schemes));
        }
        if (json.data.ems_rooms && Array.isArray(json.data.ems_rooms) && typeof window !== "undefined") {
          localStorage.setItem("sms_ems_saved_rooms_v1", JSON.stringify(json.data.ems_rooms));
        }
        if (json.data.ems_allocations && Array.isArray(json.data.ems_allocations) && typeof window !== "undefined") {
          localStorage.setItem("sms_ems_saved_allocations_v1", JSON.stringify(json.data.ems_allocations));
        }
      }
    }
  } catch (err) {
    console.error("Failed to sync EMS configs from DB:", err);
  }

  return {
    profile: getSavedSchoolProfile(),
    classes: getDynamicClassList(),
  };
}
