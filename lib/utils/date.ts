/**
 * School-local dates. The school runs on IST, but servers (Vercel) run on UTC and
 * `new Date().toISOString().slice(0, 10)` is the UTC date: before 05:30 IST it is still yesterday.
 * Use these instead of toISOString / toLocale* without a timeZone.
 */
const SCHOOL_TIME_ZONE = "Asia/Kolkata";

/** "YYYY-MM-DD" for `at` (default now) on the school's calendar. */
export function todayIST(at: Date = new Date()): string {
  // en-CA formats as YYYY-MM-DD
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: SCHOOL_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(at);
}

/** "hh:mm AM/PM" for `at` (default now) on the school's clock. */
export function nowTimeIST(at: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: SCHOOL_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(at);
}

/** "29/10/2026"-style date for `at` (default now) on the school's calendar. */
export function dateLabelIST(at: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-GB", { timeZone: SCHOOL_TIME_ZONE }).format(at);
}
