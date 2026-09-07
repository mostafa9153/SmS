// Dynamic configuration loader for EMS (Classes, Sections, Subjects, and School Profile from DB)
import { getSavedSchoolProfile, SchoolProfileData } from "@/lib/utils/school-profile";
import { getSavedMarksSchemes, ClassMarksScheme } from "@/lib/utils/marks-config";

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
        return parsed.map((c: any) => ({
          name: c.name || `Class ${c.code}`,
          code: String(c.code || c.name).trim().toUpperCase(),
          sections: Array.isArray(c.sections) && c.sections.length > 0 ? c.sections : ["A", "B"],
          stream: c.stream,
        }));
      }
    }
  } catch (err) {
    console.error("Error reading dynamic classes from storage:", err);
  }
  return FALLBACK_CLASSES;
}

/**
 * Get class codes array (e.g. ["V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"]).
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
 * Reads directly from saved Marks Schemes (synced from DB) and checks students' subjects.
 * Never adds dummy "Exam X" values.
 */
export function getDatabaseSubjectsForClass(
  classCode: string,
  students: { presentClass?: string; mandatorySubjects?: string[]; additionalSubjects?: string[] }[] = []
): string[] {
  const schemes: ClassMarksScheme[] = getSavedMarksSchemes();
  const subjectsSet = new Set<string>();
  const targetCode = classCode.trim().toUpperCase();

  // 1. Check matching scheme in database
  const matched = schemes.find((s) => s.classCode.trim().toUpperCase() === targetCode);
  if (matched && Array.isArray(matched.subjects) && matched.subjects.length > 0) {
    matched.subjects.forEach((sub) => {
      const clean = sub.replace(/\s*\([^)]*\)/g, "").trim();
      if (clean) subjectsSet.add(clean);
    });
  }

  // 2. Check students belonging to this class in database for their subjects
  const classStudents = students.filter(
    (st) => (st.presentClass || "").trim().toUpperCase() === targetCode
  );
  classStudents.forEach((st) => {
    [...(st.mandatorySubjects || []), ...(st.additionalSubjects || [])].forEach((sub) => {
      const clean = sub.replace(/\s*\([^)]*\)/g, "").trim();
      if (clean) subjectsSet.add(clean);
    });
  });

  // 3. If found in database, return list
  if (subjectsSet.size > 0) {
    return Array.from(subjectsSet);
  }

  // 4. Default fallback based on WBBSE curriculum if class not yet configured in DB
  if (["IX", "X"].includes(targetCode)) {
    return ["Bengali", "English", "Mathematics", "Physical Science", "Life Science", "History", "Geography"];
  }
  if (["XI", "XII"].includes(targetCode)) {
    return ["Bengali", "English", "Physics", "Chemistry", "Mathematics", "Biological Sciences", "History", "Geography"];
  }
  return ["Bengali", "English", "Mathematics", "Environment & Science", "History", "Geography", "Health & Physical Education"];
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
