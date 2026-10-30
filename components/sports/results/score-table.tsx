"use client";

import React from "react";
import type { SportsParticipant } from "@/lib/sports/types";
import { EMPTY_ROW, RANK_MEDAL, RANK_STYLE, ordinal, type ScoreMode, type ScoreRow } from "@/lib/sports/score-sheet";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const GRID_COLS: Record<ScoreMode, string> = {
  field: "md:grid-cols-[36px_72px_minmax(150px,1fr)_repeat(3,72px)_84px_124px_minmax(100px,160px)]",
  track: "md:grid-cols-[36px_72px_minmax(150px,1fr)_100px_84px_124px_minmax(100px,200px)]",
  other: "md:grid-cols-[36px_72px_minmax(150px,1fr)_120px_124px_minmax(100px,220px)]",
};

type ScoreField = "trial1" | "trial2" | "trial3" | "bestScore";

interface ScoreTableProps {
  rows: SportsParticipant[];
  /** All participants: the rank dropdown offers one place per athlete. */
  totalCount: number;
  scores: Record<string, ScoreRow>;
  mode: ScoreMode;
  unitSuffix: string;
  onScore: (studentId: string, field: keyof Omit<ScoreRow, "rankPosition">, value: string) => void;
  onRank: (studentId: string, rank: number | null) => void;
}

// Enter → next athlete in the same column (Shift+Enter → previous)
function handleCellKeyDown(e: React.KeyboardEvent<HTMLInputElement>, row: number, col: number) {
  if (e.key !== "Enter") return;
  e.preventDefault();
  const target = document.querySelector<HTMLInputElement>(
    `[data-score-row="${row + (e.shiftKey ? -1 : 1)}"][data-score-col="${col}"]`
  );
  target?.focus();
  target?.select();
}

/** Score entry grid: a table on desktop, stacked cards on mobile. */
export function ScoreTable({ rows, totalCount, scores, mode, unitSuffix, onScore, onRank }: ScoreTableProps) {
  const cellInput = (p: SportsParticipant, row: number, col: number, field: ScoreField, label: string, placeholder: string) => (
    <div className="min-w-0">
      <span className="md:hidden block text-[10px] font-semibold text-muted-foreground mb-0.5">{label}</span>
      <Input
        value={scores[p.studentId]?.[field] ?? ""}
        onChange={(e) => onScore(p.studentId, field, e.target.value)}
        onKeyDown={(e) => handleCellKeyDown(e, row, col)}
        onFocus={(e) => e.target.select()}
        data-score-row={row}
        data-score-col={col}
        inputMode={field === "bestScore" && mode === "other" ? "text" : "decimal"}
        placeholder={placeholder}
        className="h-8 text-xs text-center font-mono rounded-lg"
      />
    </div>
  );

  const bestCell = (best: string, label: string) => (
    <div className="min-w-0">
      <span className="md:hidden block text-[10px] font-semibold text-muted-foreground mb-0.5">{label}</span>
      <div
        className={cn(
          "h-8 text-xs font-mono font-bold rounded-lg flex items-center justify-center px-2 border select-none",
          best
            ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20"
            : "bg-muted/40 text-muted-foreground border-transparent"
        )}
      >
        {best ? `${best}${unitSuffix}` : "—"}
      </div>
    </div>
  );

  return (
    <div className="border rounded-xl overflow-x-auto custom-scrollbar">
      <div className="md:min-w-[860px]">
        {/* Column header (desktop) */}
        <div
          className={cn(
            "hidden md:grid gap-2 px-3 py-2 bg-muted/40 border-b text-[11px] font-semibold text-muted-foreground items-center",
            GRID_COLS[mode]
          )}
        >
          <span className="text-center">#</span>
          <span className="text-center">Chest</span>
          <span>Athlete</span>
          {mode === "field" && (
            <>
              <span className="text-center">Trial 1</span>
              <span className="text-center">Trial 2</span>
              <span className="text-center">Trial 3</span>
              <span className="text-center font-bold text-foreground">Best</span>
            </>
          )}
          {mode === "track" && (
            <>
              <span className="text-center">Time</span>
              <span className="text-center font-bold text-foreground">Best</span>
            </>
          )}
          {mode === "other" && <span className="text-center">Score</span>}
          <span className="text-center font-bold text-foreground">Rank</span>
          <span>Remarks</span>
        </div>

        <div className="divide-y">
          {rows.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted-foreground">No match.</div>
          ) : (
            rows.map((p, index) => {
              const row = scores[p.studentId] || EMPTY_ROW;
              const rank = row.rankPosition;

              return (
                <div
                  key={p.studentId}
                  className={cn(
                    "flex flex-col gap-2 p-3 md:grid md:gap-2 md:items-center md:px-3 md:py-2 text-xs hover:bg-muted/20",
                    GRID_COLS[mode],
                    rank && "bg-amber-500/[0.03]"
                  )}
                >
                  {/* Identity */}
                  <div className="flex items-center gap-2 md:contents">
                    <span className="hidden md:block text-center font-mono text-muted-foreground">{index + 1}</span>
                    <span className="md:text-center shrink-0">
                      <span className="px-2 py-0.5 rounded-lg bg-muted border font-mono font-black">#{p.chestNumber}</span>
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold uppercase truncate">{p.studentName}</p>
                      <span className="text-[10px] text-muted-foreground">
                        {p.presentClass}-{p.presentSection} • Roll {p.presentRoll}
                      </span>
                    </div>
                  </div>

                  {/* Scores */}
                  <div
                    className={cn(
                      "grid gap-2 md:contents",
                      mode === "field" ? "grid-cols-4" : mode === "track" ? "grid-cols-2" : "grid-cols-1"
                    )}
                  >
                    {mode === "field" && (
                      <>
                        {cellInput(p, index, 0, "trial1", "Trial 1", "—")}
                        {cellInput(p, index, 1, "trial2", "Trial 2", "—")}
                        {cellInput(p, index, 2, "trial3", "Trial 3", "—")}
                        {bestCell(row.bestScore, "Best")}
                      </>
                    )}
                    {mode === "track" && (
                      <>
                        {cellInput(p, index, 0, "trial1", "Time", "0.00")}
                        {bestCell(row.bestScore, "Best")}
                      </>
                    )}
                    {mode === "other" && cellInput(p, index, 0, "bestScore", "Score", "—")}
                  </div>

                  {/* Rank + remarks */}
                  <div className="grid grid-cols-2 gap-2 md:contents">
                    <Select
                      value={rank === null ? "none" : String(rank)}
                      onValueChange={(val) => onRank(p.studentId, val === "none" || !val ? null : parseInt(val, 10))}
                    >
                      <SelectTrigger size="sm" className={cn("w-full font-bold", rank ? RANK_STYLE[rank] : "text-muted-foreground")}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No rank</SelectItem>
                        {Array.from({ length: totalCount }, (_, i) => (
                          <SelectItem key={i + 1} value={String(i + 1)}>
                            {RANK_MEDAL[i + 1] ? `${RANK_MEDAL[i + 1]} ${ordinal(i + 1)}` : ordinal(i + 1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      value={row.remarks}
                      onChange={(e) => onScore(p.studentId, "remarks", e.target.value)}
                      placeholder="Remarks"
                      className="h-8 text-xs rounded-lg"
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
