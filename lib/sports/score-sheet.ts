import type { SportsParticipant } from "./types";

/** One athlete's editable result row on the score sheet. */
export type ScoreRow = {
  trial1: string;
  trial2: string;
  trial3: string;
  bestScore: string;
  rankPosition: number | null;
  remarks: string;
};

/** Field: three trials, best wins. Track: one time. Other: a typed score. */
export type ScoreMode = "field" | "track" | "other";

export const EMPTY_ROW: ScoreRow = { trial1: "", trial2: "", trial3: "", bestScore: "", rankPosition: null, remarks: "" };

export const RANK_STYLE: Record<number, string> = {
  1: "bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500",
  2: "bg-slate-500/20 text-slate-700 dark:text-slate-300 border-slate-500",
  3: "bg-orange-700/15 text-orange-800 dark:text-orange-300 border-orange-700",
};
export const RANK_MEDAL: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };

export const ordinal = (n: number) => {
  const suffix = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return `${n}${suffix[(v - 20) % 10] || suffix[v] || "th"}`;
};

export const isPodium = (rank?: number | null) => !!rank && rank >= 1 && rank <= 3;

const toNum = (v: string) => {
  const n = parseFloat(v);
  return isNaN(n) ? null : n;
};

export function rowsFromParticipants(participants: SportsParticipant[]): Record<string, ScoreRow> {
  const rows: Record<string, ScoreRow> = {};
  for (const p of participants) {
    rows[p.studentId] = {
      trial1: p.trial1 || "",
      trial2: p.trial2 || "",
      trial3: p.trial3 || "",
      bestScore: p.bestScore || "",
      rankPosition: p.rankPosition ?? null,
      remarks: p.remarks || "",
    };
  }
  return rows;
}

export function computeBest(row: ScoreRow, mode: ScoreMode, lowerBetter: boolean): string {
  if (mode === "field") {
    const vals = [row.trial1, row.trial2, row.trial3].map(toNum).filter((v): v is number => v !== null);
    if (vals.length === 0) return "";
    return String(lowerBetter ? Math.min(...vals) : Math.max(...vals));
  }
  if (mode === "track") {
    const n = toNum(row.trial1);
    return n === null ? "" : String(n);
  }
  return row.bestScore;
}

/** Every scored athlete gets a rank; equal scores share a rank (1, 1, 3). Unscored rows lose theirs. */
export function rankAll(studentIds: string[], scores: Record<string, ScoreRow>, lowerBetter: boolean): Record<string, ScoreRow> {
  const entries = studentIds
    .map((id) => ({ id, best: toNum(scores[id]?.bestScore ?? "") }))
    .filter((x): x is { id: string; best: number } => x.best !== null)
    .sort((a, b) => (lowerBetter ? a.best - b.best : b.best - a.best));

  const result: Record<string, ScoreRow> = {};
  for (const id in scores) result[id] = { ...scores[id], rankPosition: null };

  entries.forEach((entry, i) => {
    const tiedWithPrev = i > 0 && entries[i - 1].best === entry.best;
    const rank = tiedWithPrev ? result[entries[i - 1].id].rankPosition : i + 1;
    result[entry.id] = { ...result[entry.id], rankPosition: rank };
  });
  return result;
}
