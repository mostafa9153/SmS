import { todayIST } from "@/lib/utils/date";

/**
 * Calendar year on the school's clock. The fallback academic year when
 * `admission_settings.current_academic_year` is not available.
 */
export function currentYearIST(at: Date = new Date()): number {
  return Number(todayIST(at).slice(0, 4));
}

/** Session years for a dropdown, newest first: `ahead` years after `current` down to `back` years before. */
export function sessionYears(current: number | string, back = 2, ahead = 0): string[] {
  const year = Number(current) || currentYearIST();
  return Array.from({ length: back + ahead + 1 }, (_, i) => String(year + ahead - i));
}

/** "2026-27" for 2026. */
export function sessionLabel(year: number | string): string {
  const y = Number(year) || currentYearIST();
  return `${y}-${String((y + 1) % 100).padStart(2, "0")}`;
}
