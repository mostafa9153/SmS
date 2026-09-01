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
  isCwsn?: boolean | null;
  hasDisabilityCertificate?: boolean | null;
}

export type ScholarshipId =
  | "kanyashree_k1"
  | "kanyashree_k2"
  | "aikyashree"
  | "sikshashree"
  | "medhashree"
  | "oasis_pre"
  | "oasis_post"
  | "svmcm"
  | "taruner_swapno"
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
  aikyashree: {
    id: "aikyashree",
    name: "Aikyashree Scholarship",
    shortCode: "Aikyashree",
    type: "Academic",
    amount: "₹1,100 - ₹10,200/yr",
    category: "Minority",
    colorBadge: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300",
    description: "Scholarship for Minority students (Muslim, Christian, Buddhist, Sikh, Jain, Parsi) with ≥50% marks",
  },
  sikshashree: {
    id: "sikshashree",
    name: "Sikshashree Scholarship",
    shortCode: "Sikshashree",
    type: "Academic",
    amount: "₹800/yr",
    category: "SC/ST",
    colorBadge: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300",
    description: "Pre-Matric scholarship for SC & ST students studying in Class V to VIII with ≥50% marks",
  },
  medhashree: {
    id: "medhashree",
    name: "Medhashree Scholarship",
    shortCode: "Medhashree",
    type: "Academic",
    amount: "₹800/yr",
    category: "OBC",
    colorBadge: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300",
    description: "Pre-Matric scholarship for OBC students studying in Class V to VIII with ≥50% marks",
  },
  oasis_pre: {
    id: "oasis_pre",
    name: "OASIS Pre-Matric (SC/ST)",
    shortCode: "OASIS Pre",
    type: "Academic",
    amount: "₹1,500 - ₹3,500/yr",
    category: "SC/ST",
    colorBadge: "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300",
    description: "Pre-Matric scholarship for SC/ST students in Class IX & X",
  },
  oasis_post: {
    id: "oasis_post",
    name: "OASIS Post-Matric (SC/ST/OBC)",
    shortCode: "OASIS Post",
    type: "Academic",
    amount: "₹2,500 - ₹5,000/yr",
    category: "SC/ST",
    colorBadge: "bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950/40 dark:text-cyan-300",
    description: "Post-Matric scholarship for SC, ST & OBC students in Class XI & XII",
  },
  svmcm: {
    id: "svmcm",
    name: "Swami Vivekananda (SVMCM)",
    shortCode: "SVMCM",
    type: "Academic",
    amount: "₹1,000/mo (₹12,000/yr)",
    category: "Merit",
    colorBadge: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300",
    description: "Merit scholarship for Class XI & XII students with ≥60% marks in 10th Board Exam",
  },
  taruner_swapno: {
    id: "taruner_swapno",
    name: "Taruner Swapno (Tab/Phone)",
    shortCode: "Taruner Swapno",
    type: "Asset",
    amount: "₹10,000 (One-time)",
    category: "All",
    colorBadge: "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/40 dark:text-violet-300",
    description: "Digital learning smartphone/tablet grant for all Class XI & XII students",
  },
  sabooj_sathi: {
    id: "sabooj_sathi",
    name: "Sabooj Sarathi (Bicycle)",
    shortCode: "Sabooj Sarathi",
    type: "Asset",
    amount: "Free Bi-Cycle",
    category: "All",
    colorBadge: "bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/40 dark:text-teal-300",
    description: "Free bi-cycle for all students studying in Class IX, X, XI, and XII",
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
  const isMinority = isMinorityReligion(student.religion, student.minorityGroup);
  const marks = student.previousMarksPercent ?? 50; // default 50% if unrecorded

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
  // A. Aikyashree (Minority: Muslims, Christians, etc.) -> Requires >= 50%
  if (isMinority && marks >= 50) {
    eligibleIds.push("aikyashree");
  }

  // B. Sikshashree (SC & ST in Class V to VIII) -> Requires >= 50%
  if ((isSC || isST) && ["V", "VI", "VII", "VIII"].includes(cls) && marks >= 50) {
    eligibleIds.push("sikshashree");
  }

  // C. Medhashree (OBC in Class V to VIII) -> Requires >= 50%
  if (isOBC && ["V", "VI", "VII", "VIII"].includes(cls) && marks >= 50) {
    eligibleIds.push("medhashree");
  }

  // D. OASIS Pre-Matric (SC/ST in Class IX & X)
  if ((isSC || isST) && ["IX", "X"].includes(cls)) {
    eligibleIds.push("oasis_pre");
  }

  // E. OASIS Post-Matric (SC/ST/OBC in Class XI & XII)
  if ((isSC || isST || isOBC) && ["XI", "XII"].includes(cls)) {
    eligibleIds.push("oasis_post");
  }

  // F. Swami Vivekananda Merit-cum-Means (SVMCM) -> Class XI & XII with >= 60%
  if (["XI", "XII"].includes(cls) && marks >= 60) {
    eligibleIds.push("svmcm");
  }

  // -------------------------------------------------------------
  // 3. Asset & Free Learning Grants (Universal)
  // -------------------------------------------------------------
  // Taruner Swapno: Class XI & XII (₹10,000 Tab grant)
  if (["XI", "XII"].includes(cls)) {
    eligibleIds.push("taruner_swapno");
  }

  // Sabooj Sathi: Class IX, X, XI, XII (Free Bicycle)
  if (["IX", "X", "XI", "XII"].includes(cls)) {
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

  // Primary academic scholarship priority: SVMCM > Aikyashree / OASIS Post > Sikshashree / Medhashree / OASIS Pre
  let primaryAcademicScheme: ScholarshipSchemeMeta | null = null;
  if (academicSchemes.length > 0) {
    if (academicSchemes.some((s) => s.id === "svmcm")) {
      primaryAcademicScheme = SCHOLARSHIP_REGISTRY["svmcm"];
    } else if (academicSchemes.some((s) => s.id === "aikyashree")) {
      primaryAcademicScheme = SCHOLARSHIP_REGISTRY["aikyashree"];
    } else if (academicSchemes.some((s) => s.id === "oasis_post")) {
      primaryAcademicScheme = SCHOLARSHIP_REGISTRY["oasis_post"];
    } else if (academicSchemes.some((s) => s.id === "sikshashree")) {
      primaryAcademicScheme = SCHOLARSHIP_REGISTRY["sikshashree"];
    } else if (academicSchemes.some((s) => s.id === "medhashree")) {
      primaryAcademicScheme = SCHOLARSHIP_REGISTRY["medhashree"];
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
