/**
 * Scanned-code handling for the library desk: cleaning what a scanner types,
 * telling copy codes from people, and the timing helpers that separate a
 * scanner burst from a person typing.
 */

/**
 * Trim, drop control and invisible characters (scanners add CR/LF/Tab; pasted
 * codes can carry zero-width or no-break spaces), upper-case. Leading zeros are kept.
 */
export function normalizeScan(raw: string): string {
  return (
    raw
      // eslint-disable-next-line no-control-regex -- stripping scanner control characters is the point
      .replace(/[\u0000-\u001f\u007f​-‏⁠﻿]/g, "")
      .replace(/ /g, " ")
      .trim()
      .toUpperCase()
  );
}

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function copyCodePattern(prefix: string): RegExp {
  return new RegExp(`^(${escapeRegExp(prefix.toUpperCase())}\\d{4,})-(\\d+)$`);
}

/** "B0045-3" with prefix "B": the prefix, at least 4 digits, a dash, the copy number. */
export function isCopyCode(code: string, prefix: string): boolean {
  return copyCodePattern(prefix).test(code);
}

export function parseCopyCode(code: string, prefix: string): { bookCode: string; copyNo: number } | null {
  const m = copyCodePattern(prefix).exec(code);
  return m ? { bookCode: m[1], copyNo: Number(m[2]) } : null;
}

type Hit = { id: string };
export type ScanMatch = { kind: "copy" | "student" | "staff"; id: string };
export type ResolvedScan = ScanMatch | { kind: "ambiguous"; options: ScanMatch[] } | { kind: "unknown" };

/**
 * Pick what a code means from the exact-match lookups, in priority order:
 * copy code → School ID → PEN → staff unique_id. Several matches at the first
 * level that has any is "ambiguous": the desk never guesses between people.
 */
export function resolveScan(lookups: { copies: Hit[]; bySchoolId: Hit[]; byPen: Hit[]; staff: Hit[] }): ResolvedScan {
  const levels: [ScanMatch["kind"], Hit[]][] = [
    ["copy", lookups.copies],
    ["student", lookups.bySchoolId],
    ["student", lookups.byPen],
    ["staff", lookups.staff],
  ];
  for (const [kind, hits] of levels) {
    // The same row returned twice is still one person.
    const ids = [...new Set(hits.map((h) => h.id))];
    if (ids.length === 1) return { kind, id: ids[0] };
    if (ids.length > 1) return { kind: "ambiguous", options: ids.map((id) => ({ kind, id })) };
  }
  return { kind: "unknown" };
}

export type ScanDiagnosis =
  | { match: true; normalized: string }
  | { match: false; normalized: string; hint: "leading_zeros" | "length" }
  | { match: false; normalized: string; hint: "keyboard_layout" | "different"; position: number; expected: string; got: string };

/**
 * Scanner test (Settings): compare what the scanner typed with the code that
 * should have arrived and say why they differ.
 */
export function diagnoseScan(typed: string, expectedRaw: string): ScanDiagnosis {
  const normalized = normalizeScan(typed);
  const expected = normalizeScan(expectedRaw);
  if (normalized === expected) return { match: true, normalized };
  if (/^0+/.test(expected) && expected.replace(/^0+/, "") === normalized) {
    return { match: false, normalized, hint: "leading_zeros" };
  }
  if (normalized.length !== expected.length && (expected.startsWith(normalized) || normalized.startsWith(expected))) {
    return { match: false, normalized, hint: "length" };
  }
  let position = 0;
  while (position < Math.min(normalized.length, expected.length) && normalized[position] === expected[position]) position++;
  const want = expected[position] ?? "";
  const got = normalized[position] ?? "";
  const symbol = (c: string) => c !== "" && !/[A-Z0-9]/.test(c);
  return {
    match: false,
    normalized,
    hint: symbol(want) || symbol(got) ? "keyboard_layout" : "different",
    position,
    expected: want,
    got,
  };
}

/**
 * Returns an `accept(code, nowMs)` that rejects a code seen within the last
 * `windowMs`, even with other codes in between (A, B, A). Every sighting,
 * accepted or not, restarts that code's window, so a scanner beeping three
 * times still counts once. Time is passed in so it is testable.
 */
export function createScanDebouncer(windowMs: number): (code: string, nowMs: number) => boolean {
  const lastSeen = new Map<string, number>();
  return (code, nowMs) => {
    for (const [c, at] of lastSeen) if (nowMs - at >= windowMs) lastSeen.delete(c);
    const seenRecently = lastSeen.has(code);
    lastSeen.set(code, nowMs);
    return !seenRecently;
  };
}

/** Max gap between keystrokes from a scanner; people type far slower. */
export const SCANNER_MAX_GAP_MS = 50;
const SCANNER_MIN_CHARS = 4;

/** True when keystroke times (ms) look like a scanner: enough characters, all close together. */
export function isScannerBurst(timesMs: readonly number[], maxGapMs = SCANNER_MAX_GAP_MS): boolean {
  if (timesMs.length < SCANNER_MIN_CHARS) return false;
  for (let i = 1; i < timesMs.length; i++) {
    if (timesMs[i] - timesMs[i - 1] > maxGapMs) return false;
  }
  return true;
}

const VISIBLE: Record<string, string> = { "\r": "⏎CR", "\n": "⏎LF", "\t": "⇥Tab", " ": "·" };

/**
 * What a scanner really typed, with the characters you cannot see made
 * visible (Settings "Scanner test"): CR/LF/Tab, spaces and other control or
 * zero-width characters as <U+XXXX>.
 */
export function showInvisible(raw: string): string {
  let out = "";
  for (const ch of raw) {
    const code = ch.codePointAt(0)!;
    if (VISIBLE[ch]) out += `[${VISIBLE[ch]}]`;
    else if (code < 0x20 || code === 0x7f || (code >= 0x200b && code <= 0x200f) || code === 0x2060 || code === 0xfeff || code === 0xa0)
      out += `[U+${code.toString(16).toUpperCase().padStart(4, "0")}]`;
    else out += ch;
  }
  return out;
}

/** The diagnosis in words, for the Scanner test (Bengali, as the desk is). */
export function describeDiagnosis(d: ScanDiagnosis): string {
  if (d.match) return "Matched";
  switch (d.hint) {
    case "leading_zeros":
      return "Leading zeros lost. The scanner or Excel is treating it as a number.";
    case "length":
      return "Characters missing or extra. Check the scanner prefix/suffix or a cut code.";
    case "keyboard_layout":
      return `Character ${d.position + 1}: expected "${d.expected}", got "${d.got}". Scanner keyboard layout does not match.`;
    default:
      return `Character ${d.position + 1} differs: expected "${d.expected}", got "${d.got}".`;
  }
}
