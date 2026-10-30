export const CLASS_LADDER = ["V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"] as const;

type LadderClass = (typeof CLASS_LADDER)[number];

const ROMAN_BY_NUMBER: Record<string, LadderClass> = {
  "5": "V", "6": "VI", "7": "VII", "8": "VIII",
  "9": "IX", "10": "X", "11": "XI", "12": "XII",
};

export function normalizeClass(value: string | number | null | undefined): LadderClass | null {
  if (value === null || value === undefined) return null;
  const cleaned = String(value).trim().replace(/^class\s+/i, "").toUpperCase();
  if ((CLASS_LADDER as readonly string[]).includes(cleaned)) return cleaned as LadderClass;
  return ROMAN_BY_NUMBER[cleaned] ?? null;
}

export function classVariations(value: string | number | null | undefined): string[] {
  const roman = normalizeClass(value);
  if (!roman) return value ? [String(value).trim()] : [];
  const number = Object.keys(ROMAN_BY_NUMBER).find((k) => ROMAN_BY_NUMBER[k] === roman)!;
  return [roman, number, `Class ${roman}`, `Class ${number}`];
}

// Class a student passing the exam moves to. XII has no next class (Passed Out).
export function getNextClass(value: string | number | null | undefined): LadderClass | null {
  const roman = normalizeClass(value);
  if (!roman) return null;
  const idx = CLASS_LADDER.indexOf(roman);
  return CLASS_LADDER[idx + 1] ?? null;
}

// Classes a promotion result may legally place a student in: same class (detained / sent up /
// failed / in-place semester) or the next one.
export function getAllowedTargetClasses(value: string | number | null | undefined): LadderClass[] {
  const roman = normalizeClass(value);
  if (!roman) return [];
  const next = getNextClass(roman);
  return next ? [roman, next] : [roman];
}

export function isLegalClassTransition(
  from: string | number | null | undefined,
  to: string | number | null | undefined
): boolean {
  const target = normalizeClass(to);
  return !!target && getAllowedTargetClasses(from).includes(target);
}

const EXIT_STATUSES = ["Passed Out", "TC Out", "Sent Up M.P.", "Sent Up H.S."] as const;

export function isExitStatus(status: string | null | undefined): boolean {
  return !!status && (EXIT_STATUSES as readonly string[]).includes(status);
}
