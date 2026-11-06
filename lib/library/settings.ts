import { z } from "zod";
import { gridProblems } from "./sticker-layout";
import type { BorrowerType, LoanRules } from "./types";

/**
 * The single row of library_settings.rules. Unknown or missing keys fall back
 * to the defaults, so an older row keeps working after a new setting is added.
 * The migration seeds the same values.
 */

const money = z.number().finite().min(0).max(99_999_999);
const days = z.number().int().min(0).max(3650);

const terms = z.object({
  maxBooks: z.number().int().min(0).max(100),
  loanDays: days.min(1),
  renewDays: days.min(1),
  maxRenews: z.number().int().min(0).max(50),
  renewWindowDays: days,
});

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const librarySettingsSchema = z.object({
  student: terms.default({ maxBooks: 2, loanDays: 14, renewDays: 7, maxRenews: 2, renewWindowDays: 3 }),
  staff: terms.default({ maxBooks: 5, loanDays: 30, renewDays: 14, maxRenews: 3, renewWindowDays: 5 }),
  finePerDay: money.default(1),
  graceDays: days.default(2),
  fineCap: money.nullable().default(50),
  renewWhenOverdue: z.boolean().default(false),
  blockThreshold: money.nullable().default(50),
  holidays: z.array(z.object({ from: isoDate, to: isoDate, label: z.string().max(100).optional() })).max(200).default([]),
  lostPolicy: z.enum(["price", "fixed"]).default("price"),
  processingFee: money.default(20),
  defaultLostAmount: money.default(150),
  tcMode: z.enum(["warn", "block", "off"]).default("block"),
  codePrefix: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{1,4}$/)
    .default("B"),
  sticker: z
    .object({
      cols: z.number().int().min(1).max(10),
      rows: z.number().int().min(1).max(30),
      widthMm: z.number().min(20).max(210),
      heightMm: z.number().min(10).max(297),
      gapXMm: z.number().min(0).max(50),
      gapYMm: z.number().min(0).max(50),
    })
    .default({ cols: 3, rows: 8, widthMm: 70, heightMm: 37, gapXMm: 0, gapYMm: 0 }),
});

export type LibrarySettings = z.infer<typeof librarySettingsSchema>;

export const DEFAULT_LIBRARY_SETTINGS: LibrarySettings = librarySettingsSchema.parse({});

/** Reads a stored row leniently: each invalid or missing key takes its default. */
export function parseLibrarySettings(raw: unknown): LibrarySettings {
  const source = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(librarySettingsSchema.shape) as (keyof LibrarySettings)[]) {
    const field = librarySettingsSchema.shape[key];
    const parsed = field.safeParse(source[key]);
    out[key] = parsed.success ? parsed.data : DEFAULT_LIBRARY_SETTINGS[key];
  }
  return out as LibrarySettings;
}

/** The terms snapshotted onto a loan at issue time (plan R7). */
export function loanRulesFor(settings: LibrarySettings, type: BorrowerType): LoanRules {
  const t = settings[type];
  return {
    loanDays: t.loanDays,
    finePerDay: settings.finePerDay,
    graceDays: settings.graceDays,
    fineCap: settings.fineCap,
    renewDays: t.renewDays,
    maxRenews: t.maxRenews,
    renewWhenOverdue: settings.renewWhenOverdue,
    renewWindowDays: t.renewWindowDays,
    lostPolicy: settings.lostPolicy,
    processingFee: settings.processingFee,
    defaultLostAmount: settings.defaultLostAmount,
  };
}

// ---------- editing (Settings page) ----------

/** Why a code prefix is not allowed, or null. Shown under the field as the user types (C8). */
export function prefixProblem(raw: string): string | null {
  const v = raw.trim();
  if (!v) return "Enter a prefix";
  if (!/^[A-Za-z]+$/.test(v)) return "English letters only";
  if (v.length > 4) return "At most 4 letters";
  return null;
}

export type SettingsErrors = Record<string, string>;

/**
 * Checks that depend on more than one field. Keys are field paths the form
 * puts the message under ("student.renewWindowDays", "holidays.2", "sticker").
 */
export function settingsProblems(s: LibrarySettings): SettingsErrors {
  const errors: SettingsErrors = {};
  const prefix = prefixProblem(s.codePrefix);
  if (prefix) errors.codePrefix = prefix;
  for (const type of ["student", "staff"] as const) {
    if (s[type].renewWindowDays > s[type].loanDays) errors[`${type}.renewWindowDays`] = "Cannot exceed loan days";
  }
  s.holidays.forEach((h, i) => {
    if (h.from > h.to) errors[`holidays.${i}`] = "Start is after end";
    else if (Number.isNaN(Date.parse(h.from)) || Number.isNaN(Date.parse(h.to))) errors[`holidays.${i}`] = "Invalid date";
  });
  const grid = gridProblems(s.sticker);
  if (grid.length) errors.sticker = grid.join(" · ");
  return errors;
}

export type SettingsCheck = { ok: true; settings: LibrarySettings } | { ok: false; errors: SettingsErrors };

const SETTING_KEYS = Object.keys(librarySettingsSchema.shape);

/** Strict check of a submitted settings object: every key must be present, nothing is silently defaulted. */
export function validateSettings(raw: unknown): SettingsCheck {
  if (raw && typeof raw === "object") {
    const missing = SETTING_KEYS.filter((k) => !(k in (raw as object)));
    if (missing.length) return { ok: false, errors: Object.fromEntries(missing.map((k) => [k, "Missing"])) };
  }
  const parsed = librarySettingsSchema.safeParse(raw);
  if (!parsed.success) {
    const errors: SettingsErrors = {};
    for (const issue of parsed.error.issues) errors[issue.path.join(".") || "_"] ??= "Invalid value";
    return { ok: false, errors };
  }
  const errors = settingsProblems(parsed.data);
  if (Object.keys(errors).length) return { ok: false, errors };
  return { ok: true, settings: { ...parsed.data, holidays: normalizeHolidays(parsed.data.holidays) } };
}

/**
 * Applies only the changed keys onto the current rules, then checks the result.
 * Two admins editing different settings do not overwrite each other.
 */
export function validateSettingsPatch(current: LibrarySettings, changes: unknown): SettingsCheck {
  if (!changes || typeof changes !== "object" || Array.isArray(changes)) return { ok: false, errors: { _: "Invalid value" } };
  const unknown = Object.keys(changes).filter((k) => !SETTING_KEYS.includes(k));
  if (unknown.length) return { ok: false, errors: Object.fromEntries(unknown.map((k) => [k, "Unknown setting"])) };
  return validateSettings({ ...current, ...(changes as object) });
}

/** The keys of `draft` that differ from `saved`. */
export function changedKeys(saved: LibrarySettings, draft: LibrarySettings): Partial<LibrarySettings> {
  const out: Record<string, unknown> = {};
  for (const key of SETTING_KEYS as (keyof LibrarySettings)[]) {
    if (JSON.stringify(saved[key]) !== JSON.stringify(draft[key])) out[key] = draft[key];
  }
  return out as Partial<LibrarySettings>;
}

/** Holidays in date order. */
export function normalizeHolidays(list: LibrarySettings["holidays"]): LibrarySettings["holidays"] {
  return [...list].sort((a, b) => a.from.localeCompare(b.from) || a.to.localeCompare(b.to));
}
