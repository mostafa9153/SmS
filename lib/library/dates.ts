import { todayIST } from "@/lib/utils/date";
import type { Holiday } from "./types";

/**
 * Library calendar maths on "YYYY-MM-DD" strings. Dates are handled as UTC
 * midnights so no local time zone can shift a day; "today" comes from the
 * school's IST calendar.
 */

const DAY_MS = 86_400_000;
/** Longest stretch we search for a working day (guards against a year of holidays). */
const MAX_SCAN_DAYS = 400;

function toMs(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

function fromMs(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

/** Today on the school's (IST) calendar. */
export function libraryToday(at: Date = new Date()): string {
  return todayIST(at);
}

export function addDays(iso: string, days: number): string {
  return fromMs(toMs(iso) + days * DAY_MS);
}

/** Calendar days from `a` to `b` (negative when `b` is earlier). */
export function daysBetween(a: string, b: string): number {
  return Math.round((toMs(b) - toMs(a)) / DAY_MS);
}

export function isSunday(iso: string): boolean {
  return new Date(toMs(iso)).getUTCDay() === 0;
}

export function isHoliday(iso: string, holidays: readonly Holiday[]): boolean {
  return holidays.some((h) => {
    const [from, to] = h.from <= h.to ? [h.from, h.to] : [h.to, h.from];
    return iso >= from && iso <= to;
  });
}

export function isWorkingDay(iso: string, holidays: readonly Holiday[]): boolean {
  return !isSunday(iso) && !isHoliday(iso, holidays);
}

/** `iso` itself when it is a working day, otherwise the next one. */
export function nextWorkingDay(iso: string, holidays: readonly Holiday[]): string {
  let day = iso;
  for (let i = 0; i < MAX_SCAN_DAYS; i++) {
    if (isWorkingDay(day, holidays)) return day;
    day = addDays(day, 1);
  }
  throw new Error(`No working day within ${MAX_SCAN_DAYS} days of ${iso}; check the holiday list.`);
}

/** Working days in (start, end]: start excluded, end included. 0 when end <= start. */
export function workingDaysBetween(start: string, end: string, holidays: readonly Holiday[]): number {
  const span = daysBetween(start, end);
  let count = 0;
  for (let i = 1; i <= span; i++) {
    if (isWorkingDay(addDays(start, i), holidays)) count++;
  }
  return count;
}
