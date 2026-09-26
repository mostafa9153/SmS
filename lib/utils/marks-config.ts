/**
 * Centralized Evaluation Marks Distribution & Configuration System
 * Handles per-class, per-exam marks division, subject counts, subject lists,
 * and dynamic calculations for West Bengal Board (WBBSE/WBCHSE) schools.
 */

export interface ClassMarksScheme {
  classCode: string; // "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"
  className: string; // "Class V", "Class VI", etc.
  subjectCount: number; // Number of subjects
  subjects?: string[]; // Configured subject list for this class
  isSemesterSystem?: boolean; // true for Higher Secondary (XI & XII)
  
  // 1st Summative Evaluation (per subject) - Secondary (V - X)
  firstSummativeWritten?: number;
  firstSummativePractical?: number;
  
  // 2nd Summative Evaluation (per subject) - Secondary (V - X)
  secondSummativeWritten?: number;
  secondSummativePractical?: number;
  
  // 3rd Summative / Annual Evaluation (per subject) - Secondary (V - X)
  annualWritten?: number;
  annualPractical?: number;

  // Higher Secondary Semester Evaluation (50 Marks per Semester) - (XI & XII)
  oddSemesterMarks?: number;  // Sem 1 (Class XI) / Sem 3 (Class XII) - Default: 50
  evenSemesterMarks?: number; // Sem 2 (Class XI) / Sem 4 (Class XII) - Default: 50

  notes?: string;
}

export interface SubjectCategory {
  category: string;
  subjects: string[];
}

// Master Subject Bank for WBBSE & WBCHSE (First Language: Bangla, Second Language: English, No Vocational)
export const MASTER_SUBJECT_BANK: SubjectCategory[] = [
  {
    category: "Languages",
    subjects: [
      "Bengali (1st Language)",
      "English (2nd Language)",
      "Sanskrit (3rd Language)",
      "Hindi (3rd Language)",
      "Arabic (3rd Language)",
    ],
  },
  {
    category: "General Subjects (Class V - X)",
    subjects: [
      "Mathematics",
      "Our Environment",
      "Environment & Science",
      "Environment & History",
      "Environment & Geography",
      "Physical Science",
      "Life Science",
      "History",
      "Geography",
      "Health & Physical Education",
      "Art & Work Education",
      "Work Education",
      "Computer Application",
    ],
  },
  {
    category: "Science (Class XI - XII)",
    subjects: [
      "Physics",
      "Chemistry",
      "Mathematics",
      "Biological Sciences",
      "Computer Science",
      "Modern Computer Application",
      "Statistics",
      "Nutrition",
      "Environmental Studies",
    ],
  },
  {
    category: "Humanities & Arts (Class XI - XII)",
    subjects: [
      "Political Science",
      "History",
      "Geography",
      "Philosophy",
      "Education",
      "Sanskrit",
      "Sociology",
      "Economics",
      "Psychology",
      "Journalism & Mass Communication",
      "Music",
      "Visual Arts",
      "Physical Education",
    ],
  },
  {
    category: "Commerce (Class XI - XII)",
    subjects: [
      "Accountancy",
      "Business Studies",
      "Commercial Law & Auditing (CLPA)",
      "Costing & Taxation (CSTX)",
      "Economics",
    ],
  },
];

export const DEFAULT_MARKS_SCHEMES: ClassMarksScheme[] = [
  {
    classCode: "V",
    className: "Class V",
    subjectCount: 5,
    isSemesterSystem: false,
    subjects: [
      "Bengali (1st Language)",
      "English (2nd Language)",
      "Mathematics",
      "Our Environment",
      "Health & Physical Education",
    ],
    firstSummativeWritten: 20,
    firstSummativePractical: 0,
    secondSummativeWritten: 30,
    secondSummativePractical: 0,
    annualWritten: 50,
    annualPractical: 0,
    notes: "Primary/Junior: 5 subjects",
  },
  {
    classCode: "VI",
    className: "Class VI",
    subjectCount: 7,
    isSemesterSystem: false,
    subjects: [
      "Bengali (1st Language)",
      "English (2nd Language)",
      "Mathematics",
      "Environment & Science",
      "Environment & History",
      "Environment & Geography",
      "Health & Physical Education",
    ],
    firstSummativeWritten: 30,
    firstSummativePractical: 0,
    secondSummativeWritten: 50,
    secondSummativePractical: 0,
    annualWritten: 70,
    annualPractical: 0,
    notes: "Upper Primary: 7 subjects",
  },
  {
    classCode: "VII",
    className: "Class VII",
    subjectCount: 8,
    isSemesterSystem: false,
    subjects: [
      "Bengali (1st Language)",
      "English (2nd Language)",
      "Sanskrit (3rd Language)",
      "Mathematics",
      "Environment & Science",
      "History",
      "Geography",
      "Health & Physical Education",
    ],
    firstSummativeWritten: 30,
    firstSummativePractical: 0,
    secondSummativeWritten: 50,
    secondSummativePractical: 0,
    annualWritten: 70,
    annualPractical: 0,
    notes: "Upper Primary: 8 subjects",
  },
  {
    classCode: "VIII",
    className: "Class VIII",
    subjectCount: 8,
    isSemesterSystem: false,
    subjects: [
      "Bengali (1st Language)",
      "English (2nd Language)",
      "Sanskrit (3rd Language)",
      "Mathematics",
      "Environment & Science",
      "History",
      "Geography",
      "Health & Physical Education",
    ],
    firstSummativeWritten: 30,
    firstSummativePractical: 0,
    secondSummativeWritten: 50,
    secondSummativePractical: 0,
    annualWritten: 70,
    annualPractical: 0,
    notes: "Upper Primary: 8 subjects",
  },
  {
    classCode: "IX",
    className: "Class IX",
    subjectCount: 7,
    isSemesterSystem: false,
    subjects: [
      "Bengali (1st Language)",
      "English (2nd Language)",
      "Mathematics",
      "Physical Science",
      "Life Science",
      "History",
      "Geography",
    ],
    firstSummativeWritten: 40,
    firstSummativePractical: 10,
    secondSummativeWritten: 40,
    secondSummativePractical: 10,
    annualWritten: 90,
    annualPractical: 10,
    notes: "Secondary: 7 subjects (40w + 10p = 50 in 1st/2nd; 90w + 10p = 100 in Annual)",
  },
  {
    classCode: "X",
    className: "Class X",
    subjectCount: 7,
    isSemesterSystem: false,
    subjects: [
      "Bengali (1st Language)",
      "English (2nd Language)",
      "Mathematics",
      "Physical Science",
      "Life Science",
      "History",
      "Geography",
    ],
    firstSummativeWritten: 40,
    firstSummativePractical: 10,
    secondSummativeWritten: 40,
    secondSummativePractical: 10,
    annualWritten: 90,
    annualPractical: 10,
    notes: "Madhyamik: 7 subjects (40w + 10p = 50 in 1st/2nd; 90w + 10p = 100 in Selection/Annual)",
  },
  {
    classCode: "XI",
    className: "Class XI",
    subjectCount: 5,
    isSemesterSystem: true,
    subjects: [
      "Bengali (1st Language)",
      "English (2nd Language)",
      "Physics",
      "Chemistry",
      "Mathematics",
    ],
    oddSemesterMarks: 50,  // Semester 1: 50 Marks per subject
    evenSemesterMarks: 50, // Semester 2: 50 Marks per subject
    firstSummativeWritten: 50,
    firstSummativePractical: 0,
    secondSummativeWritten: 50,
    secondSummativePractical: 0,
    annualWritten: 50,
    annualPractical: 0,
    notes: "Higher Secondary (WBCHSE): Semester 1 (50) + Semester 2 (50) = 100/sub (500 Marks Total)",
  },
  {
    classCode: "XII",
    className: "Class XII",
    subjectCount: 5,
    isSemesterSystem: true,
    subjects: [
      "Bengali (1st Language)",
      "English (2nd Language)",
      "Physics",
      "Chemistry",
      "Mathematics",
    ],
    oddSemesterMarks: 50,  // Semester 3: 50 Marks per subject
    evenSemesterMarks: 50, // Semester 4: 50 Marks per subject
    firstSummativeWritten: 50,
    firstSummativePractical: 0,
    secondSummativeWritten: 50,
    secondSummativePractical: 0,
    annualWritten: 50,
    annualPractical: 0,
    notes: "HS Final (WBCHSE): Semester 3 (50) + Semester 4 (50) = 100/sub (500 Marks Total)",
  },
];

const STORAGE_KEY = "sms_marks_distribution_schemes";

/**
 * Get all configured marks schemes (from localStorage or defaults)
 */
export function getSavedMarksSchemes(): ClassMarksScheme[] {
  if (typeof window === "undefined") {
    return DEFAULT_MARKS_SCHEMES;
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error("Failed to load marks distribution schemes from storage:", e);
  }
  return DEFAULT_MARKS_SCHEMES;
}

/**
 * Save marks schemes to localStorage
 */
export function saveMarksSchemes(schemes: ClassMarksScheme[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(schemes));
    window.dispatchEvent(new Event("sms_marks_schemes_updated"));
  } catch (e) {
    console.error("Failed to save marks schemes:", e);
  }

  // Background sync to database
  try {
    fetch("/api/school-config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: "marks_schemes", value: schemes }),
    }).catch((err) => console.warn("Background DB sync for marks schemes failed:", err));
  } catch {}
}

/**
 * Compute calculated totals for a single ClassMarksScheme
 */
export function computeSchemeTotals(scheme: ClassMarksScheme) {
  const count = (scheme.subjects && scheme.subjects.length > 0) ? scheme.subjects.length : (scheme.subjectCount || 1);
  const isHs = scheme.classCode === "XI" || scheme.classCode === "XII" || scheme.isSemesterSystem;

  if (isHs) {
    const oddSemSubTotal = Number(scheme.oddSemesterMarks) || 50;
    const evenSemSubTotal = Number(scheme.evenSemesterMarks) || 50;
    const oddExamTotal = count * oddSemSubTotal;
    const evenExamTotal = count * evenSemSubTotal;
    const grandTotal = oddExamTotal + evenExamTotal;

    return {
      count,
      firstSubTotal: oddSemSubTotal,
      secondSubTotal: evenSemSubTotal,
      annualSubTotal: oddSemSubTotal + evenSemSubTotal,
      firstExamTotal: oddExamTotal,
      secondExamTotal: evenExamTotal,
      annualExamTotal: grandTotal,
      oddSemSubTotal,
      evenSemSubTotal,
      oddExamTotal,
      evenExamTotal,
      grandTotal,
    };
  }

  const firstSubTotal = (scheme.firstSummativeWritten || 0) + (scheme.firstSummativePractical || 0);
  const secondSubTotal = (scheme.secondSummativeWritten || 0) + (scheme.secondSummativePractical || 0);
  const annualSubTotal = (scheme.annualWritten || 0) + (scheme.annualPractical || 0);

  const firstExamTotal = count * firstSubTotal;
  const secondExamTotal = count * secondSubTotal;
  const annualExamTotal = count * annualSubTotal;
  const grandTotal = firstExamTotal + secondExamTotal + annualExamTotal;

  return {
    count,
    firstSubTotal,
    secondSubTotal,
    annualSubTotal,
    firstExamTotal,
    secondExamTotal,
    annualExamTotal,
    grandTotal,
  };
}

/**
 * Helper to resolve exam slot name from arbitrary exam string
 */
export function resolveExamSlot(examName?: string): "1st" | "2nd" | "annual" {
  if (!examName) return "annual";
  const e = examName.toLowerCase();
  if (e.includes("1st") || e.includes("first") || e.includes("sem 1") || e.includes("semester 1") || e.includes("sem 3") || e.includes("semester 3")) return "1st";
  if (e.includes("2nd") || e.includes("second") || e.includes("sem 2") || e.includes("semester 2") || e.includes("sem 4") || e.includes("semester 4")) return "2nd";
  return "annual";
}

/**
 * Dynamically get full marks for any class & exam from saved config or default
 */
export function getDynamicClassFullMarks(className: string, examName?: string): number {
  const norm = (className || "V").toUpperCase().trim().replace(/^CLASS\s+/i, "");
  const digitMap: Record<string, string> = {
    "5": "V", "6": "VI", "7": "VII", "8": "VIII", "9": "IX", "10": "X", "11": "XI", "12": "XII",
  };
  const standardKey = digitMap[norm] || norm;
  const schemes = getSavedMarksSchemes();
  const matched = schemes.find((s) => s.classCode.toUpperCase() === standardKey || s.className.toUpperCase().includes(standardKey));

  const slot = resolveExamSlot(examName);

  if (matched) {
    const totals = computeSchemeTotals(matched);
    if (standardKey === "XI" || standardKey === "XII" || matched.isSemesterSystem) {
      if (slot === "1st") return totals.firstExamTotal;
      if (slot === "2nd") return totals.secondExamTotal;
      // If full year / general annual
      return totals.grandTotal;
    }
    if (slot === "1st") return totals.firstExamTotal;
    if (slot === "2nd") return totals.secondExamTotal;
    return totals.annualExamTotal;
  }

  // Fallback defaults if not matched
  const fallbackDefaults: Record<string, Record<string, number>> = {
    V:    { "1st": 100,  "2nd": 150,  "annual": 250 },
    VI:   { "1st": 210,  "2nd": 350,  "annual": 490 },
    VII:  { "1st": 240,  "2nd": 400,  "annual": 560 },
    VIII: { "1st": 240,  "2nd": 400,  "annual": 560 },
    IX:   { "1st": 350,  "2nd": 350,  "annual": 700 },
    X:    { "1st": 350,  "2nd": 350,  "annual": 700 },
    XI:   { "1st": 250,  "2nd": 250,  "annual": 500 },
    XII:  { "1st": 250,  "2nd": 250,  "annual": 500 },
  };

  return fallbackDefaults[standardKey]?.[slot] ?? 500;
}

export interface PromotionPolicy {
  autoPassClasses: string[]; // e.g. ["V", "VI", "VII", "VIII"]
  minPassPercentage?: number; // legacy fallback
  subjectPassPercentage: number; // Class IX & X Per-Subject Minimum Pass % (default 30)
  theoryPassPercentage: number; // Theory / Written Minimum Pass % (default 30)
  practicalPassPercentage: number; // Practical / Project Minimum Pass % (default 30)
  requireFiveSubjectsPass: boolean; // default true: student must pass at least 5 subjects
  compulsorySubjects: string[]; // default ["Bengali", "English"]
  class11MaxSupplementarySubjects: number; // default 2 (1-2 failed subjects -> Supplementary; >2 -> Detained)
  class12MaxCompartmentalSubjects: number; // default 2 (1-2 failed subjects -> Compartmental; >2 -> C.C.H.S.)
}

export const DEFAULT_PROMOTION_POLICY: PromotionPolicy = {
  autoPassClasses: ["V", "VI", "VII", "VIII"],
  minPassPercentage: 30,
  subjectPassPercentage: 30,
  theoryPassPercentage: 30,
  practicalPassPercentage: 30,
  requireFiveSubjectsPass: true,
  compulsorySubjects: ["Bengali", "English"],
  class11MaxSupplementarySubjects: 2,
  class12MaxCompartmentalSubjects: 2,
};

const PROMOTION_POLICY_KEY = "sms_promotion_pass_policy";

export function getSavedPromotionPolicy(): PromotionPolicy {
  if (typeof window === "undefined") return DEFAULT_PROMOTION_POLICY;
  try {
    const raw = localStorage.getItem(PROMOTION_POLICY_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        ...DEFAULT_PROMOTION_POLICY,
        ...parsed,
      };
    }
  } catch (e) {
    console.error("Failed to load promotion policy:", e);
  }
  return DEFAULT_PROMOTION_POLICY;
}

export function savePromotionPolicy(policy: PromotionPolicy): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(PROMOTION_POLICY_KEY, JSON.stringify(policy));
    window.dispatchEvent(new Event("sms_promotion_policy_updated"));
  } catch (e) {
    console.error("Failed to save promotion policy:", e);
  }

  // Background sync to database
  try {
    fetch("/api/school-config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: "promotion_policy", value: policy }),
    }).catch((err) => console.warn("Background DB sync for promotion policy failed:", err));
  } catch {}
}

// ----------------------------------------------------------------------------
// Class, Section & Subject Dynamic Preset Helpers
// ----------------------------------------------------------------------------

export interface ClassPresetItem {
  id: string;
  name: string;
  code: string;
  sections: string[];
  stream?: string;
  isAutoPass?: boolean;
}

export const DEFAULT_CLASS_PRESETS_DATA: ClassPresetItem[] = [
  { id: "c-5", name: "Class V", code: "V", sections: ["A", "B"], isAutoPass: true },
  { id: "c-6", name: "Class VI", code: "VI", sections: ["A", "B"], isAutoPass: true },
  { id: "c-7", name: "Class VII", code: "VII", sections: ["A", "B"], isAutoPass: true },
  { id: "c-8", name: "Class VIII", code: "VIII", sections: ["A", "B"], isAutoPass: true },
  { id: "c-9", name: "Class IX", code: "IX", sections: ["A", "B"], isAutoPass: false },
  { id: "c-10", name: "Class X", code: "X", sections: ["A", "B"], isAutoPass: false },
  { id: "c-11", name: "Class XI", code: "XI", sections: ["A", "B"], stream: "Arts / Science / Commerce", isAutoPass: false },
  { id: "c-12", name: "Class XII", code: "XII", sections: ["A", "B"], stream: "Arts / Science / Commerce", isAutoPass: false },
];

export function getSavedClassPresets(): ClassPresetItem[] {
  if (typeof window === "undefined") return DEFAULT_CLASS_PRESETS_DATA;
  try {
    const raw = localStorage.getItem("sms_class_management");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.error("Failed to load class presets from storage", e);
  }
  return DEFAULT_CLASS_PRESETS_DATA;
}

/**
 * Returns dynamic list of sections configured in School Settings for the specified class.
 */
export function getSectionsForClass(className?: string): string[] {
  const norm = (className || "V").toUpperCase().trim().replace(/^CLASS\s+/i, "");
  const digitMap: Record<string, string> = {
    "5": "V", "6": "VI", "7": "VII", "8": "VIII", "9": "IX", "10": "X", "11": "XI", "12": "XII",
  };
  const standardKey = digitMap[norm] || norm;
  const classes = getSavedClassPresets();
  const matched = classes.find(
    (c) => c.code.toUpperCase() === standardKey || c.name.toUpperCase().includes(standardKey)
  );
  return matched?.sections && matched.sections.length > 0 ? matched.sections : ["A", "B"];
}

/**
 * Returns list of subjects configured in School Settings for the specified class.
 */
export function getSubjectListForClass(className?: string): string[] {
  const norm = (className || "V").toUpperCase().trim().replace(/^CLASS\s+/i, "");
  const digitMap: Record<string, string> = {
    "5": "V", "6": "VI", "7": "VII", "8": "VIII", "9": "IX", "10": "X", "11": "XI", "12": "XII",
  };
  const standardKey = digitMap[norm] || norm;
  const schemes = getSavedMarksSchemes();
  const matched = schemes.find(
    (s) => s.classCode.toUpperCase() === standardKey || s.className.toUpperCase().includes(standardKey)
  );
  if (matched?.subjects && matched.subjects.length > 0) return matched.subjects;

  const defaultMatched = DEFAULT_MARKS_SCHEMES.find((s) => s.classCode === standardKey);
  return defaultMatched?.subjects || [
    "Bengali (1st Language)",
    "English (2nd Language)",
    "Mathematics",
    "Environment & Science",
    "Health & Physical Education",
  ];
}

export interface SubjectFullMarksInfo {
  writtenFull: number;
  practicalFull: number;
  totalFull: number;
  hasPractical: boolean; // false for Class 5-8 & HS Semester (50 flat), true for Class 9-10
}

/**
 * Returns exact written vs practical / project full marks for a single subject in a given class & exam.
 */
export function getSubjectFullMarks(className: string, examName?: string): SubjectFullMarksInfo {
  const norm = (className || "V").toUpperCase().trim().replace(/^CLASS\s+/i, "");
  const digitMap: Record<string, string> = {
    "5": "V", "6": "VI", "7": "VII", "8": "VIII", "9": "IX", "10": "X", "11": "XI", "12": "XII",
  };
  const standardKey = digitMap[norm] || norm;
  const schemes = getSavedMarksSchemes();
  const matched = schemes.find(
    (s) => s.classCode.toUpperCase() === standardKey || s.className.toUpperCase().includes(standardKey)
  );
  const slot = resolveExamSlot(examName);

  // Classes XI & XII (Higher Secondary - 50 Marks per subject per semester)
  if (standardKey === "XI" || standardKey === "XII" || matched?.isSemesterSystem) {
    const semMarks = (slot === "1st" ? matched?.oddSemesterMarks : matched?.evenSemesterMarks) || 50;
    return {
      writtenFull: semMarks,
      practicalFull: 0,
      totalFull: semMarks,
      hasPractical: false,
    };
  }

  // Classes V to VIII (5 to 8): Written only (No practical/project)
  if (["V", "VI", "VII", "VIII"].includes(standardKey)) {
    let written = 50;
    if (matched) {
      if (slot === "1st") written = matched.firstSummativeWritten || 20;
      else if (slot === "2nd") written = matched.secondSummativeWritten || 30;
      else written = matched.annualWritten || 50;
    } else {
      if (standardKey === "V") written = slot === "1st" ? 20 : slot === "2nd" ? 30 : 50;
      else written = slot === "1st" ? 30 : slot === "2nd" ? 50 : 70;
    }
    return {
      writtenFull: written,
      practicalFull: 0,
      totalFull: written,
      hasPractical: false,
    };
  }

  // Classes IX & X (9 & 10): Written + Project & Practical (40+10 in 1st/2nd, 90+10 in Annual)
  let written = 90;
  let practical = 10;
  if (matched) {
    if (slot === "1st") {
      written = matched.firstSummativeWritten || 40;
      practical = matched.firstSummativePractical ?? 10;
    } else if (slot === "2nd") {
      written = matched.secondSummativeWritten || 40;
      practical = matched.secondSummativePractical ?? 10;
    } else {
      written = matched.annualWritten || 90;
      practical = matched.annualPractical ?? 10;
    }
  } else {
    if (slot === "1st" || slot === "2nd") {
      written = 40;
      practical = 10;
    } else {
      written = 90;
      practical = 10;
    }
  }
  return {
    writtenFull: written,
    practicalFull: practical,
    totalFull: written + practical,
    hasPractical: true,
  };
}

