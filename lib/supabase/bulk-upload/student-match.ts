import type { BulkStudentRow } from "./student-fields";

/**
 * Identifiers a sheet row is matched on, strongest first. Admission No is not one: schools reuse
 * it per class ("18" in seven classes), so it would merge different students into one.
 */
export const MATCH_KEYS = [
  { field: "pen", column: "pen", label: "PEN" },
  { field: "studentUniqueCode", column: "student_unique_code", label: "Banglar Shiksha ID" },
  { field: "schoolId", column: "school_id", label: "School ID" },
  { field: "aadhaar", column: "aadhaar", label: "Aadhaar" },
] as const;

export type MatchField = (typeof MATCH_KEYS)[number]["field"];

const PLACEHOLDER = /^(0+|NA|N\/A|N\.A\.?|NIL|NONE|NULL|-+|PENDING_RECORD)$/;

/** Comparable form of an identifier, or "" when the cell holds nothing usable. */
export function identityValue(field: MatchField, raw: unknown): string {
  if (raw === undefined || raw === null) return "";
  if (field === "aadhaar") {
    const digits = String(raw).replace(/\D/g, "");
    return digits.length === 12 ? digits : "";
  }
  const value = String(raw).trim().toUpperCase().replace(/\s+/g, " ");
  return PLACEHOLDER.test(value) ? "" : value;
}

/** Values to look a column up by: the stored text may differ in case from the sheet. */
export function lookupValues(rows: BulkStudentRow[], field: MatchField): string[] {
  const out = new Set<string>();
  for (const row of rows) {
    const value = identityValue(field, row[field]);
    if (!value) continue;
    out.add(value);
    out.add(value.toLowerCase());
    out.add(String(row[field]).trim());
  }
  return [...out];
}

export type StudentIndex<T> = Record<MatchField, Map<string, T[]>>;

/** Existing students by each identifier. A value shared by several students is kept as a list. */
export function buildIndex<T extends { id: string }>(students: T[]): StudentIndex<T> {
  const index = Object.fromEntries(MATCH_KEYS.map((k) => [k.field, new Map<string, T[]>()])) as StudentIndex<T>;
  const seen = new Set<string>();
  for (const s of students) {
    if (seen.has(s.id)) continue;
    seen.add(s.id);
    for (const { field, column } of MATCH_KEYS) {
      const value = identityValue(field, (s as Record<string, unknown>)[column]);
      if (!value) continue;
      const list = index[field].get(value) || [];
      list.push(s);
      index[field].set(value, list);
    }
  }
  return index;
}

export type MatchResult<T> =
  | { kind: "new" }
  | { kind: "match"; student: T; matchedBy: MatchField; conflict?: string }
  | { kind: "ambiguous"; reason: string };

const labelOf = (field: MatchField) => MATCH_KEYS.find((k) => k.field === field)!.label;

/**
 * Finds the existing student a row belongs to, trying PEN, Banglar Shiksha ID, School ID, then
 * Aadhaar. An identifier shared by several students is never used to pick one; if nothing else
 * matches, the row is ambiguous (never created as a new student, which would make a duplicate).
 */
export function matchRow<T extends { id: string }>(row: BulkStudentRow, index: StudentIndex<T>): MatchResult<T> {
  let ambiguous: string | undefined;
  let found: { student: T; field: MatchField } | undefined;
  let conflict: string | undefined;

  for (const { field } of MATCH_KEYS) {
    const value = identityValue(field, row[field]);
    if (!value) continue;
    const hits = index[field].get(value) || [];
    if (hits.length > 1) {
      ambiguous ??= `${labelOf(field)} "${value}" belongs to ${hits.length} students`;
      continue;
    }
    if (hits.length === 0) continue;
    if (!found) found = { student: hits[0], field };
    else if (hits[0].id !== found.student.id && !conflict) {
      conflict = `${labelOf(field)} points to a different student than ${labelOf(found.field)}`;
    }
  }

  if (found) return { kind: "match", student: found.student, matchedBy: found.field, conflict };
  if (ambiguous) return { kind: "ambiguous", reason: ambiguous };
  return { kind: "new" };
}

/** True when two names clearly belong to different people ("MD RAHIM SK" and "RAHIM SK" do not). */
export function namesDiffer(a: unknown, b: unknown): boolean {
  const words = (v: unknown) =>
    String(v ?? "")
      .toUpperCase()
      .replace(/[^A-Zঀ-৿]+/g, " ")
      .trim()
      .split(" ")
      .filter(Boolean);
  const x = words(a);
  const y = words(b);
  if (!x.length || !y.length) return false;
  const ys = new Set(y);
  const shared = x.filter((w) => ys.has(w)).length;
  return shared / Math.min(x.length, y.length) < 0.5;
}
