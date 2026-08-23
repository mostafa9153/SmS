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

/** Masks an Aadhaar number: XXXX-XXXX-1234 */
export function maskAadhaar(aadhaar: string): string {
  if (!aadhaar || aadhaar.length < 4) return "••••-••••-••••";
  const last4 = aadhaar.slice(-4);
  return `XXXX-XXXX-${last4}`;
}

/** Formats Aadhaar for display with spaces: 1234 5678 9012 */
export function formatAadhaar(aadhaar: string): string {
  if (!aadhaar) return "—";
  return aadhaar.replace(/(\d{4})(\d{4})(\d{4})/, "$1 $2 $3");
}

const CLASS_ORDER = ["V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];

/** Sorts class names in curriculum order */
export function sortClasses(classes: string[]): string[] {
  return [...classes].sort(
    (a, b) => CLASS_ORDER.indexOf(a) - CLASS_ORDER.indexOf(b)
  );
}
