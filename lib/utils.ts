import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { StudentStatus } from "@/lib/types";

/** Tailwind class merger — the standard shadcn/ui pattern */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ── Status color mapping ─────────────────────────────────────
// Single source of truth for status colors.
// Used by: status badges, timeline dots, Recharts charts.
// Add a new status here — nowhere else.

export const STATUS_STYLES: Record<
  StudentStatus,
  { badge: string; dot: string; chart: string; label: string }
> = {
  Continuing: {
    badge: "bg-emerald-50 text-emerald-700 border border-emerald-200",
    dot: "bg-emerald-500",
    chart: "#10b981",
    label: "Continuing",
  },
  "Drop Out": {
    badge: "bg-rose-50 text-rose-700 border border-rose-200",
    dot: "bg-rose-500",
    chart: "#f43f5e",
    label: "Drop Out",
  },
  "Passed Out": {
    badge: "bg-sky-50 text-sky-700 border border-sky-200",
    dot: "bg-sky-500",
    chart: "#0ea5e9",
    label: "Passed Out",
  },
  "Sent Up M.P.": {
    badge: "bg-amber-50 text-amber-700 border border-amber-200",
    dot: "bg-amber-500",
    chart: "#f59e0b",
    label: "Sent Up M.P.",
  },
  "C.C.H.S.": {
    badge: "bg-purple-50 text-purple-700 border border-purple-200",
    dot: "bg-purple-500",
    chart: "#a855f7",
    label: "C.C.H.S.",
  },
};

/** Formats an ISO date string to a human-readable locale string */
export function formatDate(iso: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/** Masks an Aadhaar number: ••••-••••-1234 */
export function maskAadhaar(aadhaar?: string | null): string {
  if (!aadhaar) return "—";
  const cleaned = aadhaar.replace(/\s+/g, "").replace(/-/g, "");
  if (cleaned.length < 4) return "••••-••••-••••";
  return `••••-••••-${cleaned.slice(-4)}`;
}

/** Formats Aadhaar for display with spaces: 1234 5678 9012 */
export function formatAadhaar(aadhaar: string): string {
  if (!aadhaar) return "—";
  return aadhaar.replace(/(\d{4})(\d{4})(\d{4})/, "$1 $2 $3");
}

export const CLASS_ORDER = ["V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];

const CLASS_ORDER_MAP: Record<string, number> = {
  "V": 5, "5": 5,
  "VI": 6, "6": 6,
  "VII": 7, "7": 7,
  "VIII": 8, "8": 8,
  "IX": 9, "9": 9,
  "X": 10, "10": 10,
  "XI": 11, "11": 11,
  "XII": 12, "12": 12,
};

/** Returns numeric sequence rank for any class string */
export function getClassRank(className?: string | null): number {
  if (!className) return 999;
  const normalized = className.trim().toUpperCase().replace(/^CLASS\s+/i, "");
  if (normalized in CLASS_ORDER_MAP) {
    return CLASS_ORDER_MAP[normalized];
  }
  const parsed = parseInt(normalized, 10);
  if (!isNaN(parsed)) return parsed;
  return 999;
}

/** Sorts class names in curriculum order */
export function sortClasses(classes: string[]): string[] {
  return [...classes].sort(
    (a, b) => getClassRank(a) - getClassRank(b)
  );
}

/** 
 * Compares two student objects so they are ordered by:
 * Class (V -> VI -> VII -> VIII -> IX -> X -> XI -> XII)
 * then Section (A -> B -> C...)
 * then Roll (1 -> 2 -> 3...)
 * then Name as fallback
 */
export function compareStudentsByClassAndRoll(
  a: { presentClass?: string | null; presentSection?: string | null; presentRoll?: number | null; name?: string },
  b: { presentClass?: string | null; presentSection?: string | null; presentRoll?: number | null; name?: string }
): number {
  const rankA = getClassRank(a.presentClass);
  const rankB = getClassRank(b.presentClass);
  if (rankA !== rankB) return rankA - rankB;

  const secA = (a.presentSection || "").trim().toUpperCase();
  const secB = (b.presentSection || "").trim().toUpperCase();
  if (secA !== secB) return secA.localeCompare(secB);

  const rollA = a.presentRoll ?? 999999;
  const rollB = b.presentRoll ?? 999999;
  if (rollA !== rollB) return rollA - rollB;

  return (a.name || "").localeCompare(b.name || "");
}

/**
 * Calculates exact age in completed years from an ISO birthdate string (YYYY-MM-DD).
 * Accurately compares day and month against today's date.
 */
export function calculateExactAge(dobIso?: string | null): number | null {
  if (!dobIso) return null;
  const birthDate = new Date(dobIso);
  if (isNaN(birthDate.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

/**
 * Determines Kanyashree Prakalpa eligibility dynamically based on official WB Govt rules:
 * - "K2": Unmarried Female, Age >= 18
 * - "K1": Unmarried Female, 13 <= Age < 18
 * - null: Not eligible (Male, under 13, or no DOB)
 */
export function getKanyashreeCategory(student: { gender?: string | null; dob?: string | null }): "K2" | "K1" | null {
  if (student.gender !== "Female" || !student.dob) return null;
  const age = calculateExactAge(student.dob);
  if (age === null) return null;
  if (age >= 18) return "K2";
  if (age >= 13) return "K1";
  return null;
}
