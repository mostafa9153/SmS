/**
 * Library check on TC Out (plan T12, T-b). Pure: the route fetches dues and
 * settings, this decides. Mode comes from library settings `tcMode`.
 */

export type TcMode = "warn" | "block" | "off";

export interface StudentDues {
  studentId: string;
  name: string;
  openBooks: number;
  balance: number;
}

export type TcGate =
  | { kind: "allow"; dues: StudentDues[]; override: boolean }
  | { kind: "blocked"; dues: StudentDues[] }
  | { kind: "forbidden"; dues: StudentDues[] }
  | { kind: "bad_reason"; dues: StudentDues[] };

export const hasDues = (d: StudentDues) => d.openBooks > 0 || d.balance > 0;

/** Override reason: trimmed, 5..300 chars, else null. */
export function cleanOverrideReason(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const r = raw.trim();
  return r.length >= 5 && r.length <= 300 ? r : null;
}

/**
 * - off: no check.
 * - warn: allowed; dues come back so the caller can show them.
 * - block: refused (409) unless an Admin sends an override reason. Anyone
 *   else sending an override gets 403.
 */
export function tcGate(input: {
  mode: TcMode;
  dues: StudentDues[];
  role: string;
  overrideReason?: unknown;
}): TcGate {
  const owing = input.dues.filter(hasDues);
  if (input.mode === "off" || owing.length === 0) return { kind: "allow", dues: [], override: false };
  if (input.mode === "warn") return { kind: "allow", dues: owing, override: false };

  const wantsOverride = input.overrideReason !== undefined && input.overrideReason !== null && input.overrideReason !== "";
  if (!wantsOverride) return { kind: "blocked", dues: owing };
  if (input.role !== "Admin") return { kind: "forbidden", dues: owing };
  if (cleanOverrideReason(input.overrideReason) === null) return { kind: "bad_reason", dues: owing };
  return { kind: "allow", dues: owing, override: true };
}
