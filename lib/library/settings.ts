import { z } from "zod";
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
