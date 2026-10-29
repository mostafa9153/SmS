"use client";

import React, { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Award, RotateCcw, Save, Wand2 } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SearchInput } from "@/components/ui/search-input";
import { cn } from "@/lib/utils";
import { useSportsEvents, useSportsParticipants, getUnitSuffix, isLowerBetter } from "@/lib/sports/use-sports-events";
import { useScoreSheet } from "@/lib/sports/use-score-sheet";
import { RANK_MEDAL, RANK_STYLE, isPodium, type ScoreMode } from "@/lib/sports/score-sheet";
import { SportsEventHeader } from "@/components/sports/sports-event-header";
import { ScoreTable } from "@/components/sports/results/score-table";

export default function SportsResultsPage() {
  const params = useParams();
  const eventId = params.id as string;
  return <SportsResultsView key={eventId} eventId={eventId} />;
}

function SportsResultsView({ eventId }: { eventId: string }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [rankFilter, setRankFilter] = useState<"all" | "podium">("all");

  const { data: events = [] } = useSportsEvents();
  const event = events.find((e) => e.id === eventId);
  const mode: ScoreMode = event?.category === "Field" ? "field" : event?.category === "Track" ? "track" : "other";
  const unitSuffix = getUnitSuffix(event?.measurementUnit);
  const canAutoRank = event?.scoringType !== "Rank_Only" && event?.measurementUnit !== "None";

  const { data: participantsData, isLoading } = useSportsParticipants(eventId);
  const sheet = useScoreSheet({
    eventId,
    participantsData,
    mode,
    lowerBetter: isLowerBetter(event?.measurementUnit),
    canAutoRank,
  });
  const { participants, scores, podium } = sheet;

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

  return (
    <div className="p-3 sm:p-5 md:p-6 space-y-4 max-w-7xl mx-auto pb-24">
      <SportsEventHeader
        event={event}
        events={events}
        active="score"
        actions={
          podium.length > 0 ? (
            <Link
              href={`/sports/print?eventId=${eventId}&tab=certificates`}
              className={cn(buttonVariants({ variant: "outline", size: "sm" }), "h-8 rounded-xl text-xs font-semibold gap-1.5")}
            >
              <Award className="h-3.5 w-3.5 text-amber-500" />
              Certificates ({podium.length})
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
                onClick={sheet.toggleAutoRank}
                title="Rank top 3 automatically from best score"
                className={cn(
                  "h-8 px-2.5 rounded-xl border text-[11px] font-bold flex items-center gap-1.5 transition-colors",
                  sheet.autoRank
                    ? "bg-primary/10 text-primary border-primary/30"
                    : "bg-background text-muted-foreground hover:text-foreground"
                )}
              >
                <Wand2 className="h-3.5 w-3.5" />
                Auto-rank {sheet.autoRank ? "On" : "Off"}
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
                  {f === "all" ? `All (${participants.length})` : `Podium (${podium.length})`}
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
          <ScoreTable
            rows={filteredParticipants}
            totalCount={participants.length}
            scores={scores}
            mode={mode}
            unitSuffix={unitSuffix}
            onScore={sheet.updateScore}
            onRank={sheet.updateRank}
          />
        )}
      </Card>

      {/* Sticky save bar */}
      {participants.length > 0 && (
        <div className="sticky bottom-3 z-20">
          <div
            className={cn(
              "flex items-center justify-between gap-2 rounded-2xl border px-3 py-2 shadow-lg backdrop-blur transition-colors",
              sheet.isDirty ? "bg-card/95 border-primary/30" : "bg-card/80"
            )}
          >
            <span className="flex items-center gap-2 text-xs font-semibold">
              <span className={cn("h-2 w-2 rounded-full", sheet.isDirty ? "bg-amber-500 animate-pulse" : "bg-emerald-500")} />
              {sheet.isDirty ? "Unsaved changes" : "All saved"}
            </span>
            <div className="flex items-center gap-2">
              {sheet.isDirty && (
                <Button variant="ghost" size="sm" onClick={sheet.discard} className="h-8 rounded-xl text-xs gap-1.5">
                  <RotateCcw className="h-3.5 w-3.5" />
                  Discard
                </Button>
              )}
              <Button
                onClick={sheet.save}
                disabled={sheet.isSaving || !sheet.isDirty}
                size="sm"
                className="h-8 rounded-xl text-xs font-bold gap-1.5"
              >
                <Save className="h-3.5 w-3.5" />
                {sheet.isSaving ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
