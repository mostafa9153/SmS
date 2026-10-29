"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import type { SportsParticipant } from "@/lib/sports/types";
import { Save, Award, Wand2, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api/client";
import { toastWithUndo } from "@/lib/undo/client";
import { useSportsEvents, useSportsParticipants, useRefreshSports, getUnitSuffix, isLowerBetter } from "@/lib/sports/use-sports-events";
import { SportsEventHeader } from "@/components/sports/sports-event-header";
import { SearchInput } from "@/components/ui/search-input";

type ScoreRow = {
  trial1: string;
  trial2: string;
  trial3: string;
  bestScore: string;
  rankPosition: number | null;
  remarks: string;
};

const EMPTY_ROW: ScoreRow = { trial1: "", trial2: "", trial3: "", bestScore: "", rankPosition: null, remarks: "" };

const GRID_COLS = {
  field: "md:grid-cols-[36px_72px_minmax(150px,1fr)_repeat(3,72px)_84px_124px_minmax(100px,160px)]",
  track: "md:grid-cols-[36px_72px_minmax(150px,1fr)_100px_84px_124px_minmax(100px,200px)]",
  other: "md:grid-cols-[36px_72px_minmax(150px,1fr)_120px_124px_minmax(100px,220px)]",
} as const;

const RANK_STYLE: Record<number, string> = {
  1: "bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500",
  2: "bg-slate-500/20 text-slate-700 dark:text-slate-300 border-slate-500",
  3: "bg-orange-700/15 text-orange-800 dark:text-orange-300 border-orange-700",
};
const RANK_MEDAL: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };

const ordinal = (n: number) => {
  const suffix = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return `${n}${suffix[(v - 20) % 10] || suffix[v] || "th"}`;
};

const isPodium = (rank?: number | null) => !!rank && rank >= 1 && rank <= 3;

export default function SportsResultsPage() {
  const params = useParams();
  const eventId = params.id as string;
  return <SportsResultsView key={eventId} eventId={eventId} />;
}

function SportsResultsView({ eventId }: { eventId: string }) {
  const [scores, setScores] = useState<Record<string, ScoreRow>>({});
  const [savedSnapshot, setSavedSnapshot] = useState("{}");
  const [isSaving, setIsSaving] = useState(false);
  const [autoRank, setAutoRank] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [rankFilter, setRankFilter] = useState<"all" | "podium">("all");

  const { data: events = [] } = useSportsEvents();
  const refreshSports = useRefreshSports();
  const event = events.find((e) => e.id === eventId);
  const isField = event?.category === "Field";
  const isTrack = event?.category === "Track";
  const mode: keyof typeof GRID_COLS = isField ? "field" : isTrack ? "track" : "other";
  const unitSuffix = getUnitSuffix(event?.measurementUnit);
  const lowerBetter = isLowerBetter(event?.measurementUnit);
  const canAutoRank = event?.scoringType !== "Rank_Only" && event?.measurementUnit !== "None";

  const { data: participantsData, isLoading } = useSportsParticipants(eventId);
  const participants = useMemo(() => participantsData ?? [], [participantsData]);

  // Load server values whenever fresh data arrives (also after every save)
  const [loadedData, setLoadedData] = useState<SportsParticipant[] | undefined>(undefined);
  if (participantsData && participantsData !== loadedData) {
    const initial: Record<string, ScoreRow> = {};
    participantsData.forEach((p) => {
      initial[p.studentId] = {
        trial1: p.trial1 || "",
        trial2: p.trial2 || "",
        trial3: p.trial3 || "",
        bestScore: p.bestScore || "",
        rankPosition: p.rankPosition ?? null,
        remarks: p.remarks || "",
      };
    });
    setLoadedData(participantsData);
    setScores(initial);
    setSavedSnapshot(JSON.stringify(initial));
  }

  const isDirty = useMemo(() => JSON.stringify(scores) !== savedSnapshot, [scores, savedSnapshot]);

  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  const toNum = (v: string) => {
    const n = parseFloat(v);
    return isNaN(n) ? null : n;
  };

  const computeBest = (row: ScoreRow): string => {
    if (isField) {
      const vals = [row.trial1, row.trial2, row.trial3].map(toNum).filter((v): v is number => v !== null);
      if (vals.length === 0) return "";
      return String(lowerBetter ? Math.min(...vals) : Math.max(...vals));
    }
    if (isTrack) {
      const n = toNum(row.trial1);
      return n === null ? "" : String(n);
    }
    return row.bestScore;
  };

  // Every scored athlete gets a rank; equal scores share a rank (1, 1, 3)
  const rankAll = (scoreMap: Record<string, ScoreRow>): Record<string, ScoreRow> => {
    const entries = participants
      .map((p) => ({ id: p.studentId, best: toNum(scoreMap[p.studentId]?.bestScore ?? "") }))
      .filter((x): x is { id: string; best: number } => x.best !== null)
      .sort((a, b) => (lowerBetter ? a.best - b.best : b.best - a.best));

    const result: Record<string, ScoreRow> = {};
    for (const id in scoreMap) result[id] = { ...scoreMap[id], rankPosition: null };

    entries.forEach((entry, i) => {
      const tiedWithPrev = i > 0 && entries[i - 1].best === entry.best;
      const rank = tiedWithPrev ? result[entries[i - 1].id].rankPosition : i + 1;
      result[entry.id] = { ...result[entry.id], rankPosition: rank };
    });
    return result;
  };

  const updateScoreField = (studentId: string, field: keyof Omit<ScoreRow, "rankPosition">, value: string) => {
    setScores((prev) => {
      const updated: ScoreRow = { ...(prev[studentId] || EMPTY_ROW), [field]: value };
      if (field === "trial1" || field === "trial2" || field === "trial3") {
        updated.bestScore = computeBest(updated);
      }
      const next = { ...prev, [studentId]: updated };
      return field !== "remarks" && autoRank && canAutoRank ? rankAll(next) : next;
    });
  };

  // Manual rank pick switches auto-rank off so it isn't overwritten
  const updateRankField = (studentId: string, rank: number | null) => {
    if (autoRank && canAutoRank) setAutoRank(false);
    setScores((prev) => ({ ...prev, [studentId]: { ...(prev[studentId] || EMPTY_ROW), rankPosition: rank } }));
  };

  const toggleAutoRank = () => {
    const next = !autoRank;
    setAutoRank(next);
    if (next) setScores((prev) => rankAll(prev));
  };

  const handleDiscard = () => setScores(JSON.parse(savedSnapshot));

  const handleSaveResults = async () => {
    setIsSaving(true);
    try {
      const resultsPayload = Object.entries(scores).map(([studentId, data]) => ({ studentId, ...data }));
      const { undoId } = await apiFetch<{ undoId?: string }>("/api/sports/results", {
        method: "POST",
        json: { eventId, results: resultsPayload },
      });
      toastWithUndo("Results saved", undoId, refreshSports);
      await refreshSports();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save results");
    } finally {
      setIsSaving(false);
    }
  };

  const podium = useMemo(
    () =>
      participants
        .filter((p) => isPodium(scores[p.studentId]?.rankPosition))
        .sort((a, b) => (scores[a.studentId]!.rankPosition || 9) - (scores[b.studentId]!.rankPosition || 9)),
    [participants, scores]
  );

  const filteredParticipants = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return participants.filter((p) => {
      if (rankFilter === "podium" && !isPodium(scores[p.studentId]?.rankPosition)) return false;
      if (!q) return true;
      const haystack = [
        p.studentName,
        p.chestNumber,
        `#${p.chestNumber}`,
        p.schoolId,
        String(p.presentRoll ?? ""),
        `${p.presentClass}-${p.presentSection}`,
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [participants, searchQuery, rankFilter, scores]);

  // Enter → next athlete in the same column (Shift+Enter → previous)
  const handleCellKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, row: number, col: number) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    const target = document.querySelector<HTMLInputElement>(
      `[data-score-row="${row + (e.shiftKey ? -1 : 1)}"][data-score-col="${col}"]`
    );
    target?.focus();
    target?.select();
  };

  const cellInput = (
    p: SportsParticipant,
    row: number,
    col: number,
    field: "trial1" | "trial2" | "trial3" | "bestScore",
    label: string,
    placeholder: string
  ) => (
    <div className="min-w-0">
      <span className="md:hidden block text-[10px] font-semibold text-muted-foreground mb-0.5">{label}</span>
      <Input
        value={scores[p.studentId]?.[field] ?? ""}
        onChange={(e) => updateScoreField(p.studentId, field, e.target.value)}
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

  const winnersCount = podium.length;

  return (
    <div className="p-3 sm:p-5 md:p-6 space-y-4 max-w-7xl mx-auto pb-24">
      <SportsEventHeader
        event={event}
        events={events}
        active="score"
        actions={
          winnersCount > 0 ? (
            <Link
              href={`/sports/print?eventId=${eventId}&tab=certificates`}
              className={cn(buttonVariants({ variant: "outline", size: "sm" }), "h-8 rounded-xl text-xs font-semibold gap-1.5")}
            >
              <Award className="h-3.5 w-3.5 text-amber-500" />
              Certificates ({winnersCount})
            </Link>
          ) : undefined
        }
      />

      {/* Live podium */}
      {podium.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar">
          {podium.map((p) => {
            const rank = scores[p.studentId]!.rankPosition!;
            const best = scores[p.studentId]?.bestScore;
            return (
              <div
                key={p.studentId}
                className={cn("flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs shrink-0", RANK_STYLE[rank])}
              >
                <span className="text-base leading-none">{RANK_MEDAL[rank]}</span>
                <span className="font-bold uppercase truncate max-w-[140px]">{p.studentName}</span>
                {best && <span className="font-mono opacity-80">{best}{unitSuffix}</span>}
              </div>
            );
          })}
        </div>
      )}

      <Card className="rounded-2xl p-3 gap-3 border shadow-2xs">
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 justify-between">
          <SearchInput value={searchQuery} onChange={setSearchQuery} placeholder="Search name, chest #, roll, class..." size="sm" className="flex-1 sm:max-w-sm" />

          <div className="flex items-center gap-2 justify-between sm:justify-end">
            {canAutoRank && (
              <button
                type="button"
                onClick={toggleAutoRank}
                title="Rank top 3 automatically from best score"
                className={cn(
                  "h-8 px-2.5 rounded-xl border text-[11px] font-bold flex items-center gap-1.5 transition-colors",
                  autoRank
                    ? "bg-primary/10 text-primary border-primary/30"
                    : "bg-background text-muted-foreground hover:text-foreground"
                )}
              >
                <Wand2 className="h-3.5 w-3.5" />
                Auto-rank {autoRank ? "On" : "Off"}
              </button>
            )}
            <div className="inline-flex border rounded-xl p-0.5 bg-muted/40 text-[11px] font-semibold">
              {(["all", "podium"] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setRankFilter(f)}
                  className={cn(
                    "px-2.5 py-1 rounded-lg transition-colors",
                    rankFilter === f ? "bg-background shadow-2xs text-foreground font-bold" : "text-muted-foreground"
                  )}
                >
                  {f === "all" ? `All (${participants.length})` : `Podium (${winnersCount})`}
                </button>
              ))}
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-xs text-muted-foreground">Loading...</div>
        ) : participants.length === 0 ? (
          <div className="p-12 text-center text-xs text-muted-foreground">
            No athletes enrolled.{" "}
            <Link href={`/sports/${eventId}/enroll`} className="text-primary underline font-bold">
              Enroll students
            </Link>
          </div>
        ) : (
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
                {filteredParticipants.length === 0 ? (
                  <div className="p-8 text-center text-xs text-muted-foreground">No match.</div>
                ) : (
                  filteredParticipants.map((p, index) => {
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
                            <span className="px-2 py-0.5 rounded-lg bg-muted border font-mono font-black">
                              #{p.chestNumber}
                            </span>
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
                            onValueChange={(val) =>
                              updateRankField(p.studentId, val === "none" || !val ? null : parseInt(val, 10))
                            }
                          >
                            <SelectTrigger
                              size="sm"
                              className={cn("w-full font-bold", rank ? RANK_STYLE[rank] : "text-muted-foreground")}
                            >
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">No rank</SelectItem>
                              {participants.map((_, i) => (
                                <SelectItem key={i + 1} value={String(i + 1)}>
                                  {RANK_MEDAL[i + 1] ? `${RANK_MEDAL[i + 1]} ${ordinal(i + 1)}` : ordinal(i + 1)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Input
                            value={row.remarks}
                            onChange={(e) => updateScoreField(p.studentId, "remarks", e.target.value)}
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
        )}
      </Card>

      {/* Sticky save bar */}
      {participants.length > 0 && (
        <div className="sticky bottom-3 z-20">
          <div
            className={cn(
              "flex items-center justify-between gap-2 rounded-2xl border px-3 py-2 shadow-lg backdrop-blur transition-colors",
              isDirty ? "bg-card/95 border-primary/30" : "bg-card/80"
            )}
          >
            <span className="flex items-center gap-2 text-xs font-semibold">
              <span className={cn("h-2 w-2 rounded-full", isDirty ? "bg-amber-500 animate-pulse" : "bg-emerald-500")} />
              {isDirty ? "Unsaved changes" : "All saved"}
            </span>
            <div className="flex items-center gap-2">
              {isDirty && (
                <Button variant="ghost" size="sm" onClick={handleDiscard} className="h-8 rounded-xl text-xs gap-1.5">
                  <RotateCcw className="h-3.5 w-3.5" />
                  Discard
                </Button>
              )}
              <Button
                onClick={handleSaveResults}
                disabled={isSaving || !isDirty}
                size="sm"
                className="h-8 rounded-xl text-xs font-bold gap-1.5"
              >
                <Save className="h-3.5 w-3.5" />
                {isSaving ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
