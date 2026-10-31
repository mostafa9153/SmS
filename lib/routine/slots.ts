import type { RoutineSettings } from "./types";

/** dayIndex -> periods (1-indexed). A day missing from the map is unrestricted. */
export type SlotMap = Record<string, number[]>;

export type SlotWindow = "any" | "morning" | "afternoon" | "custom";

export function dayPeriodCap(settings: RoutineSettings, day: number): number {
  return settings.halfDays?.includes(day)
    ? Math.min(settings.halfDayPeriods || 4, settings.periodsPerDay)
    : settings.periodsPerDay;
}

/** Last period before tiffin, same rule as the solver. */
export function breakPeriod(settings: RoutineSettings): number {
  return settings.breaks?.length ? Math.min(...settings.breaks) : Math.floor(settings.periodsPerDay / 2);
}

function range(n: number): number[] {
  return Array.from({ length: n }, (_, i) => i + 1);
}

export function slotsForDay(slots: SlotMap | null | undefined, settings: RoutineSettings, day: number): number[] {
  const cap = dayPeriodCap(settings, day);
  const got = slots?.[String(day)];
  return (got ?? range(cap)).filter((p) => p >= 1 && p <= cap);
}

/** Full map for a time window over the working days. */
export function slotsFromWindow(window: Exclude<SlotWindow, "custom">, settings: RoutineSettings): SlotMap {
  const bp = breakPeriod(settings);
  const out: SlotMap = {};
  for (const d of settings.workingDays) {
    out[String(d)] = range(dayPeriodCap(settings, d)).filter((p) =>
      window === "morning" ? p <= bp : window === "afternoon" ? p > bp : true
    );
  }
  return out;
}

/** Drop stale days/periods; null when nothing is restricted. */
export function normalizeSlots(slots: SlotMap | null | undefined, settings: RoutineSettings): SlotMap | null {
  if (!slots) return null;
  const out: SlotMap = {};
  let restricted = false;
  for (const d of settings.workingDays) {
    const cap = dayPeriodCap(settings, d);
    const list = Array.from(new Set(slotsForDay(slots, settings, d))).sort((a, b) => a - b);
    if (list.length < cap) restricted = true;
    out[String(d)] = list;
  }
  return restricted ? out : null;
}

function sameSlots(a: SlotMap, b: SlotMap, settings: RoutineSettings): boolean {
  return settings.workingDays.every((d) => {
    const x = slotsForDay(a, settings, d);
    const y = slotsForDay(b, settings, d);
    return x.length === y.length && x.every((p, i) => p === y[i]);
  });
}

/** Which preset a map matches, or "custom". */
export function detectWindow(slots: SlotMap | null | undefined, settings: RoutineSettings): SlotWindow {
  if (!slots) return "any";
  for (const w of ["any", "morning", "afternoon"] as const) {
    if (sameSlots(slots, slotsFromWindow(w, settings), settings)) return w;
  }
  return "custom";
}

export function slotStats(slots: SlotMap | null | undefined, settings: RoutineSettings, maxPerDay: number) {
  let total = 0;
  let openDays = 0;
  let capacity = 0;
  for (const d of settings.workingDays) {
    const n = slotsForDay(slots, settings, d).length;
    total += n;
    if (n > 0) openDays += 1;
    capacity += Math.min(n, Math.max(1, maxPerDay));
  }
  return { total, openDays, capacity };
}
