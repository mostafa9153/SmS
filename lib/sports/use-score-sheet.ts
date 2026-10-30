"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api/client";
import { toastWithUndo } from "@/lib/undo/client";
import { useRefreshSports } from "./use-sports-events";
import { EMPTY_ROW, computeBest, isPodium, rankAll, rowsFromParticipants, type ScoreMode, type ScoreRow } from "./score-sheet";
import type { SportsParticipant } from "./types";

interface Options {
  eventId: string;
  participantsData: SportsParticipant[] | undefined;
  mode: ScoreMode;
  lowerBetter: boolean;
  canAutoRank: boolean;
}

/** Score-sheet state: edits, auto-rank, dirty tracking and save. */
export function useScoreSheet({ eventId, participantsData, mode, lowerBetter, canAutoRank }: Options) {
  const [scores, setScores] = useState<Record<string, ScoreRow>>({});
  const [savedSnapshot, setSavedSnapshot] = useState("{}");
  const [isSaving, setIsSaving] = useState(false);
  const [autoRank, setAutoRank] = useState(true);
  const refreshSports = useRefreshSports();
  const participants = useMemo(() => participantsData ?? [], [participantsData]);
  const ids = useMemo(() => participants.map((p) => p.studentId), [participants]);

  // Load server values whenever fresh data arrives (also after every save)
  const [loadedData, setLoadedData] = useState<SportsParticipant[] | undefined>(undefined);
  if (participantsData && participantsData !== loadedData) {
    const initial = rowsFromParticipants(participantsData);
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

  const updateScore = (studentId: string, field: keyof Omit<ScoreRow, "rankPosition">, value: string) => {
    setScores((prev) => {
      const updated: ScoreRow = { ...(prev[studentId] || EMPTY_ROW), [field]: value };
      if (field === "trial1" || field === "trial2" || field === "trial3") {
        updated.bestScore = computeBest(updated, mode, lowerBetter);
      }
      const next = { ...prev, [studentId]: updated };
      return field !== "remarks" && autoRank && canAutoRank ? rankAll(ids, next, lowerBetter) : next;
    });
  };

  // Manual rank pick switches auto-rank off so it isn't overwritten
  const updateRank = (studentId: string, rank: number | null) => {
    if (autoRank && canAutoRank) setAutoRank(false);
    setScores((prev) => ({ ...prev, [studentId]: { ...(prev[studentId] || EMPTY_ROW), rankPosition: rank } }));
  };

  const toggleAutoRank = () => {
    const next = !autoRank;
    setAutoRank(next);
    if (next) setScores((prev) => rankAll(ids, prev, lowerBetter));
  };

  const discard = () => setScores(JSON.parse(savedSnapshot));

  const save = async () => {
    setIsSaving(true);
    try {
      const results = Object.entries(scores).map(([studentId, data]) => ({ studentId, ...data }));
      const { undoId } = await apiFetch<{ undoId?: string }>("/api/sports/results", {
        method: "POST",
        json: { eventId, results },
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

  return { participants, scores, isDirty, isSaving, autoRank, podium, updateScore, updateRank, toggleAutoRank, discard, save };
}
