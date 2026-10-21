"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { SportsEvent, SportsParticipant } from "@/lib/sports/types";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  ArrowLeft,
  Medal,
  Save,
  Printer,
  Award,
  Search,
  X,
} from "lucide-react";
import { toast } from "sonner";

export default function SportsResultsPage() {
  const params = useParams();
  const eventId = params.id as string;
  const router = useRouter();

  const [scores, setScores] = useState<
    Record<
      string,
      {
        trial1: string;
        trial2: string;
        trial3: string;
        bestScore: string;
        rankPosition: number | null;
        remarks: string;
      }
    >
  >({});
  const [isSaving, setIsSaving] = useState(false);

  // 1. Fetch Event
  const { data: events = [] } = useQuery<SportsEvent[]>({
    queryKey: ["sports-events"],
    queryFn: async () => {
      const res = await fetch("/api/sports/events");
      const json = await res.json();
      return json.data || [];
    },
  });

  const event = events.find((e) => e.id === eventId);
  const isField = event?.category === "Field";
  const isTrack = event?.category === "Track";

  // 2. Fetch Participants
  const {
    data: participants = [],
    isLoading,
    refetch,
  } = useQuery<SportsParticipant[]>({
    queryKey: ["sports-participants", eventId],
    queryFn: async () => {
      const res = await fetch(`/api/sports/registrations?eventId=${eventId}`);
      const json = await res.json();
      return json.data || [];
    },
  });

  // Initialize form state
  useEffect(() => {
    if (participants.length > 0) {
      const initial: typeof scores = {};
      participants.forEach((p) => {
        initial[p.studentId] = {
          trial1: p.trial1 || "",
          trial2: p.trial2 || "",
          trial3: p.trial3 || "",
          bestScore: p.bestScore || "",
          rankPosition: p.rankPosition ?? null,
          remarks: p.remarks || "",
        };
      });
      setScores(initial);
    }
  }, [participants]);

  const updateScoreField = (
    studentId: string,
    field: "trial1" | "trial2" | "trial3" | "bestScore" | "remarks",
    value: string
  ) => {
    setScores((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [field]: value,
      },
    }));
  };

  const updateRankField = (studentId: string, rank: number | null) => {
    setScores((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        rankPosition: rank,
      },
    }));
  };

  const handleSaveResults = async () => {
    setIsSaving(true);
    try {
      const resultsPayload = Object.entries(scores).map(([studentId, data]) => ({
        studentId,
        trial1: data.trial1,
        trial2: data.trial2,
        trial3: data.trial3,
        bestScore: data.bestScore,
        rankPosition: data.rankPosition,
        remarks: data.remarks,
      }));

      const res = await fetch("/api/sports/results", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId,
          results: resultsPayload,
        }),
      });

      if (!res.ok) throw new Error("Failed to save results");
      toast.success("Event results and podium ranks saved successfully");
      refetch();
    } catch (err: any) {
      toast.error(err.message || "Failed to save results");
    } finally {
      setIsSaving(false);
    }
  };

  const winnersCount = Object.values(scores).filter((s) => s.rankPosition && s.rankPosition > 0).length;

  const [searchQuery, setSearchQuery] = useState("");
  const [rankFilter, setRankFilter] = useState<"all" | "podium">("all");

  const filteredParticipants = useMemo(() => {
    return participants.filter((p) => {
      const q = searchQuery.toLowerCase().trim();
      const studentScore = scores[p.studentId];

      if (rankFilter === "podium") {
        const rank = studentScore?.rankPosition;
        if (!rank || rank <= 0) return false;
      }

      if (!q) return true;

      const chest = (p.chestNumber || "").toLowerCase();
      const name = (p.studentName || "").toLowerCase();
      const schoolId = (p.schoolId || "").toLowerCase();
      const roll = String(p.presentRoll ?? "").toLowerCase();
      const cls = String(p.presentClass ?? "").toLowerCase();
      const sec = String(p.presentSection ?? "").toLowerCase();
      const classSec = `class ${cls}-${sec}`.toLowerCase();

      return (
        name.includes(q) ||
        chest.includes(q) ||
        `#${chest}`.includes(q) ||
        roll === q ||
        `#${roll}` === q ||
        roll.includes(q) ||
        schoolId.includes(q) ||
        cls.includes(q) ||
        sec.includes(q) ||
        classSec.includes(q)
      );
    });
  }, [participants, searchQuery, rankFilter, scores]);

  return (
    <div className="p-3 sm:p-5 md:p-6 space-y-4 max-w-7xl mx-auto pb-16">
      {/* Header - Mobile Friendly */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3">
        <div className="flex items-center gap-2.5">
          <Link
            href="/sports"
            className={cn(
              buttonVariants({ variant: "ghost", size: "icon" }),
              "h-8 w-8 rounded-xl shrink-0"
            )}
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base sm:text-lg font-bold tracking-tight truncate">Ground Scoring & Podium</h1>
              {event && (
                <Badge variant="outline" className="text-[10px] font-bold px-2 py-0.5 rounded-md">
                  {event.name} ({event.category})
                </Badge>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto flex-wrap">
          <Link
            href={`/sports/print?eventId=${eventId}&tab=score`}
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "h-8 sm:h-9 rounded-xl text-xs font-semibold gap-1.5"
            )}
          >
            <Printer className="h-3.5 w-3.5" />
            Score Sheet
          </Link>

          {winnersCount > 0 && (
            <Link
              href={`/sports/print?eventId=${eventId}&tab=certificates`}
              className={cn(
                buttonVariants({ variant: "secondary", size: "sm" }),
                "h-8 sm:h-9 rounded-xl text-xs font-bold gap-1.5"
              )}
            >
              <Award className="h-3.5 w-3.5 text-amber-500" />
              Certificates ({winnersCount})
            </Link>
          )}

          <Button
            onClick={handleSaveResults}
            disabled={isSaving}
            size="sm"
            className="h-8 sm:h-9 rounded-xl text-xs font-bold gap-1.5 shadow-2xs"
          >
            <Save className="h-3.5 w-3.5" />
            {isSaving ? "Saving..." : "Save Results"}
          </Button>
        </div>
      </div>

      {/* Main Scoring Table Card */}
      <Card className="rounded-2xl p-3.5 border shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-2.5 mb-2.5">
          <div className="flex items-center gap-2">
            <Medal className="h-4 w-4 text-primary" />
            <span className="font-bold text-sm">Athletes & Score Entry</span>
            <span className="text-xs font-semibold text-muted-foreground">
              ({participants.length})
            </span>
          </div>
          <span className="text-xs text-muted-foreground font-mono">
            Metric: {event?.measurementUnit || "Rank"}
          </span>
        </div>

        {/* Search & Filter Bar */}
        {participants.length > 0 && (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 mb-3">
            <div className="relative flex-1 max-w-sm sm:max-w-md">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search athlete by name, chest #, roll, class..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-8 h-8 text-xs rounded-xl bg-background"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 text-xs self-end sm:self-auto">
              {searchQuery.trim() !== "" && (
                <span className="text-[11px] font-medium text-muted-foreground">
                  Showing {filteredParticipants.length} of {participants.length}
                </span>
              )}
              <div className="inline-flex border rounded-xl p-0.5 bg-muted/40 text-[11px] font-semibold">
                <button
                  type="button"
                  onClick={() => setRankFilter("all")}
                  className={`px-2.5 py-0.5 rounded-lg transition-colors ${
                    rankFilter === "all"
                      ? "bg-background shadow-2xs text-foreground font-bold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  All ({participants.length})
                </button>
                <button
                  type="button"
                  onClick={() => setRankFilter("podium")}
                  className={`px-2.5 py-0.5 rounded-lg transition-colors flex items-center gap-1 ${
                    rankFilter === "podium"
                      ? "bg-background shadow-2xs text-foreground font-bold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Podium ({winnersCount})
                </button>
              </div>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="p-12 text-center text-xs text-muted-foreground">Loading participants...</div>
        ) : participants.length === 0 ? (
          <div className="p-12 text-center text-xs text-muted-foreground italic">
            No participants enrolled in this game yet.{" "}
            <Link href={`/sports/${eventId}/enroll`} className="text-primary underline font-bold">
              Enroll students first
            </Link>
            .
          </div>
        ) : (
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b bg-muted/40 font-semibold">
                  <th className="p-2 w-10 text-center">Sl.</th>
                  <th className="p-2 w-20 text-center font-mono">Chest #</th>
                  <th className="p-2 min-w-[140px]">Athlete Name</th>
                  <th className="p-2 w-24">Class & Sec</th>
                  {isField ? (
                    <>
                      <th className="p-2 w-20 text-center">Trial 1 (m)</th>
                      <th className="p-2 w-20 text-center">Trial 2 (m)</th>
                      <th className="p-2 w-20 text-center">Trial 3 (m)</th>
                      <th className="p-2 w-24 text-center font-bold">Best Score</th>
                    </>
                  ) : isTrack ? (
                    <>
                      <th className="p-2 w-24 text-center">Timing (s)</th>
                      <th className="p-2 w-24 text-center font-bold">Best Time</th>
                    </>
                  ) : (
                    <th className="p-2 w-28 text-center">Score / Note</th>
                  )}
                  <th className="p-2 w-36 text-center font-bold">Podium Rank</th>
                  <th className="p-2 w-36">Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredParticipants.length === 0 ? (
                  <tr>
                    <td
                      colSpan={isField ? 10 : isTrack ? 8 : 7}
                      className="p-8 text-center text-xs text-muted-foreground"
                    >
                      No athletes found matching &quot;{searchQuery}&quot;.
                    </td>
                  </tr>
                ) : (
                  filteredParticipants.map((p, index) => {
                    const studentScore = scores[p.studentId] || {
                      trial1: "",
                      trial2: "",
                      trial3: "",
                      bestScore: "",
                      rankPosition: null,
                      remarks: "",
                    };

                    return (
                      <tr key={p.studentId} className="hover:bg-muted/30">
                        <td className="p-2 text-center font-mono text-muted-foreground">{index + 1}</td>
                        <td className="p-2 text-center font-mono font-black text-xs">
                          <span className="px-2 py-0.5 rounded-lg bg-muted border">#{p.chestNumber}</span>
                        </td>
                        <td className="p-2">
                          <p className="font-bold text-foreground uppercase">{p.studentName}</p>
                          <span className="text-[10px] text-muted-foreground font-mono">#{p.schoolId}</span>
                        </td>
                        <td className="p-2 font-medium">
                          Class {p.presentClass}-{p.presentSection} (#{p.presentRoll})
                        </td>

                        {isField ? (
                          <>
                            <td className="p-1.5 text-center">
                              <Input
                                value={studentScore.trial1}
                                onChange={(e) => updateScoreField(p.studentId, "trial1", e.target.value)}
                                placeholder="4.10"
                                className="h-7 text-xs text-center font-mono rounded-lg"
                              />
                            </td>
                            <td className="p-1.5 text-center">
                              <Input
                                value={studentScore.trial2}
                                onChange={(e) => updateScoreField(p.studentId, "trial2", e.target.value)}
                                placeholder="4.25"
                                className="h-7 text-xs text-center font-mono rounded-lg"
                              />
                            </td>
                            <td className="p-1.5 text-center">
                              <Input
                                value={studentScore.trial3}
                                onChange={(e) => updateScoreField(p.studentId, "trial3", e.target.value)}
                                placeholder="4.30"
                                className="h-7 text-xs text-center font-mono rounded-lg"
                              />
                            </td>
                            <td className="p-1.5 text-center">
                              <Input
                                value={studentScore.bestScore}
                                onChange={(e) => updateScoreField(p.studentId, "bestScore", e.target.value)}
                                placeholder="4.30m"
                                className="h-7 text-xs text-center font-mono font-bold bg-muted/40 rounded-lg"
                              />
                            </td>
                          </>
                        ) : isTrack ? (
                          <>
                            <td className="p-1.5 text-center">
                              <Input
                                value={studentScore.trial1}
                                onChange={(e) => updateScoreField(p.studentId, "trial1", e.target.value)}
                                placeholder="12.4s"
                                className="h-7 text-xs text-center font-mono rounded-lg"
                              />
                            </td>
                            <td className="p-1.5 text-center">
                              <Input
                                value={studentScore.bestScore}
                                onChange={(e) => updateScoreField(p.studentId, "bestScore", e.target.value)}
                                placeholder="12.4s"
                                className="h-7 text-xs text-center font-mono font-bold bg-muted/40 rounded-lg"
                              />
                            </td>
                          </>
                        ) : (
                          <td className="p-1.5 text-center">
                            <Input
                              value={studentScore.bestScore}
                              onChange={(e) => updateScoreField(p.studentId, "bestScore", e.target.value)}
                              placeholder="Points / Notes"
                              className="h-7 text-xs text-center rounded-lg"
                            />
                          </td>
                        )}

                        <td className="p-1.5 text-center">
                          <select
                            value={studentScore.rankPosition === null ? "" : String(studentScore.rankPosition)}
                            onChange={(e) =>
                              updateRankField(
                                p.studentId,
                                e.target.value === "" ? null : parseInt(e.target.value, 10)
                              )
                            }
                            className={`h-7 w-full rounded-lg border px-2 text-xs font-bold outline-none ${
                              studentScore.rankPosition === 1
                                ? "bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500"
                                : studentScore.rankPosition === 2
                                ? "bg-slate-500/20 text-slate-700 dark:text-slate-300 border-slate-500"
                                : studentScore.rankPosition === 3
                                ? "bg-amber-800/20 text-amber-900 dark:text-amber-200 border-amber-800"
                                : "bg-background text-foreground"
                            }`}
                          >
                            <option value="">No Rank</option>
                            <option value="1">🥇 1st Place</option>
                            <option value="2">🥈 2nd Place</option>
                            <option value="3">🥉 3rd Place</option>
                          </select>
                        </td>

                        <td className="p-1.5">
                          <Input
                            value={studentScore.remarks}
                            onChange={(e) => updateScoreField(p.studentId, "remarks", e.target.value)}
                            placeholder="Optional notes"
                            className="h-7 text-xs rounded-lg"
                          />
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
