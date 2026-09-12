/**
 * Centralized Welfare & Scholarship Eligibility Engine (West Bengal Board & Govt)
 * Accurately determines student eligibility, combinations, and mutual exclusions.
 */

import { calculateExactAge } from "@/lib/utils";

export interface StudentEligibilityInput {
  gender?: string | null;
  dob?: string | null;
  presentClass?: string | null;
  socialCategory?: string | null; // "General", "SC", "ST", "OBC", "OBC-A", "OBC-B"
  religion?: string | null;       // "Muslim", "Christian", "Hindu", "Buddhist", "Sikh", "Jain", "Parsi"
  minorityGroup?: string | null;
  previousMarksPercent?: number | null;
  previousResult?: string | null;
  isCwsn?: boolean | null;
  hasDisabilityCertificate?: boolean | null;
}

export type ScholarshipId =
  | "kanyashree_k1"
  | "kanyashree_k2"
  | "sikshashree"
  | "oasis_pre"
  | "oasis_post"
  | "nsp_pre"
  | "nsp_post"
  | "svmcm"
  | "sabooj_sathi"
  | "cwsn_scholarship";

export interface ScholarshipSchemeMeta {
  id: ScholarshipId;
  name: string;
  shortCode: string;
  type: "Incentive" | "Academic" | "Asset" | "Special";
  amount: string;
  category: "All" | "Minority" | "SC/ST" | "OBC" | "Girls" | "Merit" | "CWSN";
  colorBadge: string;
  description: string;
}

export const SCHOLARSHIP_REGISTRY: Record<ScholarshipId, ScholarshipSchemeMeta> = {
  kanyashree_k1: {
    id: "kanyashree_k1",
    name: "Kanyashree Prakalpa (K1)",
    shortCode: "K1",
    type: "Incentive",
    amount: "₹1,000/yr",
    category: "Girls",
    colorBadge: "bg-pink-50 text-pink-700 border-pink-200 dark:bg-pink-950/40 dark:text-pink-300",
    description: "Annual incentive for unmarried girls aged 13–18 or enrolled in Class VIII–XII",
  },
  kanyashree_k2: {
    id: "kanyashree_k2",
    name: "Kanyashree Prakalpa (K2)",
    shortCode: "K2",
    type: "Incentive",
    amount: "₹25,000 (One-time)",
    category: "Girls",
    colorBadge: "bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200 dark:bg-fuchsia-950/40 dark:text-fuchsia-300",
    description: "One-time grant for unmarried girls aged 18+ continuing education in Class XII/College",
  },
  sikshashree: {
    id: "sikshashree",
    name: "Sikshashree Scholarship",
    shortCode: "Sikshashree",
    type: "Academic",
    amount: "₹800/yr",
    category: "SC/ST",
    colorBadge: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300",
    description: "Pre-Matric scholarship for SC & ST students studying in Class V to VIII (All eligible regardless of religion, no minimum marks)",
  },
  oasis_pre: {
    id: "oasis_pre",
    name: "OASIS Pre-Matric (SC/ST/OBC)",
    shortCode: "OASIS Pre",
    type: "Academic",
    amount: "₹1,500 - ₹3,500/yr",
    category: "SC/ST",
    colorBadge: "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300",
    description: "Pre-Matric scholarship for SC, ST & OBC students in Class IX & X (Passing previous exam required)",
  },
  oasis_post: {
    id: "oasis_post",
    name: "OASIS Post-Matric (SC/ST/OBC)",
    shortCode: "OASIS Post",
    type: "Academic",
    amount: "₹2,500 - ₹5,000/yr",
    category: "SC/ST",
    colorBadge: "bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950/40 dark:text-cyan-300",
    description: "Post-Matric scholarship for SC, ST & OBC students in Class XI & XII (Passing previous exam required)",
  },
  nsp_pre: {
    id: "nsp_pre",
    name: "Pre-Matric NSP (Minority)",
    shortCode: "NSP Pre",
    type: "Academic",
    amount: "₹1,000 - ₹5,000/yr",
    category: "Minority",
    colorBadge: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300",
    description: "National Scholarship Portal Pre-Matric scholarship for Muslim/Minority students in Class IX & X (Passing previous exam required)",
  },
  nsp_post: {
    id: "nsp_post",
    name: "Post-Matric NSP (Minority)",
    shortCode: "NSP Post",
    type: "Academic",
    amount: "₹3,000 - ₹10,000/yr",
    category: "Minority",
    colorBadge: "bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/40 dark:text-teal-300",
    description: "National Scholarship Portal Post-Matric scholarship for Muslim/Minority students in Class XI & XII (Passed, marks below 60%)",
  },
  svmcm: {
    id: "svmcm",
    name: "Swami Vivekananda (SVMCM)",
    shortCode: "SVMCM",
    type: "Academic",
    amount: "₹1,000/mo (₹12,000/yr)",
    category: "Minority",
    colorBadge: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300",
    description: "Merit scholarship for Muslim students in Class XI & XII with ≥60% marks",
  },
  sabooj_sathi: {
    id: "sabooj_sathi",
    name: "Sarathi (Bicycle)",
    shortCode: "Sarathi",
    type: "Asset",
    amount: "Free Bi-Cycle",
    category: "All",
    colorBadge: "bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/40 dark:text-teal-300",
    description: "Free bi-cycle for all students studying in Class IX",
  },
  cwsn_scholarship: {
    id: "cwsn_scholarship",
    name: "CWSN Divyangjan Scholarship",
    shortCode: "CWSN",
    type: "Special",
    amount: "₹1,000 - ₹3,000/yr",
    category: "CWSN",
    colorBadge: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300",
    description: "Disability support scholarship for students with ≥40% disability certificate",
  },
};

/** Normalize Roman & Numeric Class to standard uppercase string */
function normalizeClass(raw?: string | null): string {
  if (!raw) return "";
  const norm = raw.trim().toUpperCase().replace(/^CLASS\s+/i, "");
  const map: Record<string, string> = {
    "5": "V", "6": "VI", "7": "VII", "8": "VIII", "9": "IX", "10": "X", "11": "XI", "12": "XII",
  };
  return map[norm] || norm;
}

/** Check if religion or minority group is a notified minority in West Bengal */
export function isMinorityReligion(religion?: string | null, minorityGroup?: string | null): boolean {
  const rel = (religion || "").trim().toLowerCase();
  const min = (minorityGroup || "").trim().toLowerCase();

  const isNotified = (str: string) => {
    if (!str || ["none", "no", "n/a", "na", "not applicable", "general", "hindu", "null", "undefined"].includes(str)) {
      return false;
    }
    return (
      str.includes("muslim") ||
      str.includes("islam") ||
      str.includes("christian") ||
      str.includes("buddhist") ||
      str.includes("sikh") ||
      str.includes("jain") ||
      str.includes("parsi")
    );
  };

  // If religion is explicitly Hindu / Sanatan, they are NOT minority
  if (rel.includes("hindu") || rel.includes("sanatan")) {
    return false;
  }

  return isNotified(rel) || isNotified(min);
}

/** Check if student belongs to Muslim minority */
export function isMuslimStudent(religion?: string | null, minorityGroup?: string | null): boolean {
  const rel = (religion || "").trim().toLowerCase();
  const min = (minorityGroup || "").trim().toLowerCase();
  return (
    rel.includes("muslim") ||
    rel.includes("islam") ||
    min.includes("muslim") ||
    min.includes("islam")
  );
}

/**
 * Evaluates all eligible welfare & scholarship schemes for a student.
 */
export function evaluateStudentScholarships(student: StudentEligibilityInput): {
  eligibleSchemes: ScholarshipSchemeMeta[];
  primaryAcademicScheme: ScholarshipSchemeMeta | null; // Selected primary category scholarship
  incentiveSchemes: ScholarshipSchemeMeta[];          // K1 / K2 (can be co-opted)
  assetSchemes: ScholarshipSchemeMeta[];              // Taruner Swapno / Sabooj Sathi
  specialSchemes: ScholarshipSchemeMeta[];            // CWSN
  conflicts: string[];                                // Human-readable notes if any
} {
  const eligibleIds: ScholarshipId[] = [];
  const conflicts: string[] = [];

  const isFemale = (student.gender || "").trim().toLowerCase() === "female";
  const age = student.dob ? calculateExactAge(student.dob) : null;
  const cls = normalizeClass(student.presentClass);
  const socialCat = (student.socialCategory || "").trim().toUpperCase();
  const isSC = socialCat === "SC";
  const isST = socialCat === "ST";
  const isOBC = socialCat.startsWith("OBC");
  const isMuslim = isMuslimStudent(student.religion, student.minorityGroup);
  const isNonMuslim = !isMuslim;
  const marks = student.previousMarksPercent ?? 50; // default 50% if unrecorded
  const isFailed = (student.previousResult || "").trim().toLowerCase().includes("fail");
  // Just pass for Class 9-12: student has passed / not failed (no minimum percentage restriction)
  const isPassed = !isFailed;

  // -------------------------------------------------------------
  // 1. Kanyashree K1 & K2 (Incentive schemes — Allowed with others)
  // -------------------------------------------------------------
  if (isFemale) {
    if (age !== null && age >= 18) {
      eligibleIds.push("kanyashree_k2");
    } else if (cls === "XII") {
      eligibleIds.push("kanyashree_k2");
    } else if ((age !== null && age >= 13 && age < 18) || ["VIII", "IX", "X", "XI"].includes(cls)) {
      eligibleIds.push("kanyashree_k1");
    }
  }

  // -------------------------------------------------------------
  // 2. Academic / Category Scholarships (MUTUALLY EXCLUSIVE)
  // -------------------------------------------------------------

  // Rule 1. Sikshashree (SC & ST in Class V to VIII) -> All SC & ST eligible regardless of religion, no minimum marks
  if ((isSC || isST) && ["V", "VI", "VII", "VIII"].includes(cls)) {
    eligibleIds.push("sikshashree");
  }

  // Rule 2. OASIS Pre-Matric (SC, ST, OBC in Class IX & X) -> Just pass (no 50% cutoff)
  if (isNonMuslim && (isSC || isST || isOBC) && ["IX", "X"].includes(cls) && isPassed) {
    eligibleIds.push("oasis_pre");
  }

  // Rule 3. OASIS Post-Matric (SC, ST, OBC in Class XI & XII) -> Just pass (no 50% cutoff)
  if (isNonMuslim && (isSC || isST || isOBC) && ["XI", "XII"].includes(cls) && isPassed) {
    eligibleIds.push("oasis_post");
  }

  // Rule 4. Muslim: Pre-Matric NSP (Class IX & X) -> Just pass (no 50% cutoff)
  if (isMuslim && ["IX", "X"].includes(cls) && isPassed) {
    eligibleIds.push("nsp_pre");
  }

  // Rule 5. Muslim: Post-Matric NSP (Class XI & XII) -> Just pass & below 60% (60%+ goes to SVMCM)
  if (isMuslim && ["XI", "XII"].includes(cls) && isPassed && marks < 60) {
    eligibleIds.push("nsp_post");
  }

  // Rule 6. Swami Vivekananda Merit-cum-Means (SVMCM) -> Muslim students in Class XI & XII with >= 60%
  if (isMuslim && ["XI", "XII"].includes(cls) && marks >= 60) {
    eligibleIds.push("svmcm");
  }

  // -------------------------------------------------------------
  // 3. Asset & Free Learning Grants (Universal)
  // -------------------------------------------------------------
  // Sarathi: Class IX only (Free Bicycle)
  if (cls === "IX") {
    eligibleIds.push("sabooj_sathi");
  }

  // -------------------------------------------------------------
  // 4. Special Need (CWSN)
  // -------------------------------------------------------------
  if (student.isCwsn || student.hasDisabilityCertificate) {
    eligibleIds.push("cwsn_scholarship");
  }

  // Map to full metadata
  const allEligible = eligibleIds.map((id) => SCHOLARSHIP_REGISTRY[id]);

  const incentiveSchemes = allEligible.filter((s) => s.type === "Incentive");
  const academicSchemes = allEligible.filter((s) => s.type === "Academic");
  const assetSchemes = allEligible.filter((s) => s.type === "Asset");
  const specialSchemes = allEligible.filter((s) => s.type === "Special");

  // Conflict detection for multiple academic scholarships
  if (academicSchemes.length > 1) {
    const names = academicSchemes.map((s) => s.shortCode).join(" and ");
    conflicts.push(`Student qualifies for multiple category scholarships (${names}). State rules allow only ONE academic scholarship. Selected highest benefit.`);
  }

  // Primary academic scholarship priority: SVMCM > OASIS Post / NSP Post > OASIS Pre / NSP Pre > Sikshashree
  let primaryAcademicScheme: ScholarshipSchemeMeta | null = null;
  if (academicSchemes.length > 0) {
    if (academicSchemes.some((s) => s.id === "svmcm")) {
      primaryAcademicScheme = SCHOLARSHIP_REGISTRY["svmcm"];
    } else if (academicSchemes.some((s) => s.id === "oasis_post")) {
      primaryAcademicScheme = SCHOLARSHIP_REGISTRY["oasis_post"];
    } else if (academicSchemes.some((s) => s.id === "nsp_post")) {
      primaryAcademicScheme = SCHOLARSHIP_REGISTRY["nsp_post"];
    } else if (academicSchemes.some((s) => s.id === "oasis_pre")) {
      primaryAcademicScheme = SCHOLARSHIP_REGISTRY["oasis_pre"];
    } else if (academicSchemes.some((s) => s.id === "nsp_pre")) {
      primaryAcademicScheme = SCHOLARSHIP_REGISTRY["nsp_pre"];
    } else if (academicSchemes.some((s) => s.id === "sikshashree")) {
      primaryAcademicScheme = SCHOLARSHIP_REGISTRY["sikshashree"];
    } else {
      primaryAcademicScheme = academicSchemes[0];
    }
  }

  return {
    eligibleSchemes: allEligible,
    primaryAcademicScheme,
    incentiveSchemes,
    assetSchemes,
    specialSchemes,
    conflicts,
  };
}
