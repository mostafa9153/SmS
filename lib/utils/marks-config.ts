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
  
  // 1st Summative Evaluation (per subject)
  firstSummativeWritten: number;
  firstSummativePractical: number;
  
  // 2nd Summative Evaluation (per subject)
  secondSummativeWritten: number;
  secondSummativePractical: number;
  
  // 3rd Summative / Annual Evaluation (per subject)
  annualWritten: number;
  annualPractical: number;

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
    subjects: [
      "Bengali (1st Language)",
      "English (2nd Language)",
      "Physics",
      "Chemistry",
      "Mathematics",
    ],
    firstSummativeWritten: 50,
    firstSummativePractical: 0,
    secondSummativeWritten: 50,
    secondSummativePractical: 0,
    annualWritten: 80,
    annualPractical: 20,
    notes: "Higher Secondary: 5 main subjects",
  },
  {
    classCode: "XII",
    className: "Class XII",
    subjectCount: 5,
    subjects: [
      "Bengali (1st Language)",
      "English (2nd Language)",
      "Physics",
      "Chemistry",
      "Mathematics",
    ],
    firstSummativeWritten: 50,
    firstSummativePractical: 0,
    secondSummativeWritten: 50,
    secondSummativePractical: 0,
    annualWritten: 80,
    annualPractical: 20,
    notes: "HS Final: 5 main subjects",
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
}

/**
 * Compute calculated totals for a single ClassMarksScheme
 */
export function computeSchemeTotals(scheme: ClassMarksScheme) {
  const count = (scheme.subjects && scheme.subjects.length > 0) ? scheme.subjects.length : (scheme.subjectCount || 1);
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
  if (e.includes("1st") || e.includes("first")) return "1st";
  if (e.includes("2nd") || e.includes("second")) return "2nd";
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
