"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { SportsEvent, SportsParticipant } from "@/lib/sports/types";
import { useSchoolProfile } from "@/lib/utils/school-profile";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  SportsCallSheetPrintableView,
} from "@/components/sports/sports-call-sheet-printable";
import {
  SportsScoreSheetPrintableView,
} from "@/components/sports/sports-score-sheet-printable";
import {
  SportsChestBibPrintableView,
} from "@/components/sports/sports-chest-bib-printable";
import {
  SportsCertificatePrintableView,
} from "@/components/sports/sports-certificate-printable";
import {
  ArrowLeft,
  Printer,
  FileText,
  ClipboardList,
  Tag,
  Award,
  ZoomIn,
  ZoomOut,
  RotateCcw,
} from "lucide-react";

function SportsPrintStudioContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialEventId = searchParams.get("eventId") || "";
  const initialTab = searchParams.get("tab") || "call";

  const [selectedEventId, setSelectedEventId] = useState<string>(initialEventId);
  const [activeTab, setActiveTab] = useState<"call" | "score" | "bibs" | "certificates">(
    initialTab === "score"
      ? "score"
      : initialTab === "bibs"
      ? "bibs"
      : initialTab === "certificates"
      ? "certificates"
      : "call"
  );
  const [scale, setScale] = useState(0.9);
  const [selectedWinnerIndex, setSelectedWinnerIndex] = useState<number | "all">("all");

  const { profile: schoolProfile } = useSchoolProfile();

  // 1. Fetch All Events
  const { data: events = [], isLoading: isLoadingEvents } = useQuery<SportsEvent[]>({
    queryKey: ["sports-events"],
    queryFn: async () => {
      const res = await fetch("/api/sports/events");
      const json = await res.json();
      return json.data || [];
    },
  });

  // Set default event if none selected
  useEffect(() => {
    if (events.length > 0 && !selectedEventId) {
      setSelectedEventId(events[0].id);
    }
  }, [events, selectedEventId]);

  const currentEvent = events.find((e) => e.id === selectedEventId) || events[0];

  // 2. Fetch Participants for the selected event
  const { data: participants = [], isLoading: isLoadingParticipants } = useQuery<SportsParticipant[]>({
    queryKey: ["sports-participants", currentEvent?.id],
    queryFn: async () => {
      if (!currentEvent?.id) return [];
      const res = await fetch(`/api/sports/registrations?eventId=${currentEvent.id}`);
      const json = await res.json();
      return json.data || [];
    },
    enabled: Boolean(currentEvent?.id),
  });

  const winners = participants
    .filter((p) => p.rankPosition && p.rankPosition > 0)
    .sort((a, b) => (a.rankPosition || 99) - (b.rankPosition || 99));

  const certificatesToRender =
    selectedWinnerIndex === "all"
      ? winners
      : [winners[selectedWinnerIndex]].filter(Boolean);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="p-3 sm:p-5 space-y-3.5 max-w-[1700px] mx-auto print:p-0 print:m-0 print:max-w-none print:space-y-0">
      {/* Studio Header (Hidden in Print) */}
      <div className="print:hidden space-y-3 bg-card border rounded-2xl p-3 sm:p-4 shadow-xs">
        {/* Top Bar: Back + Event Selector + Print Button */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <Link
              href="/sports"
              className={cn(
                buttonVariants({ variant: "ghost", size: "icon" }),
                "h-8 w-8 shrink-0"
              )}
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <h1 className="text-base sm:text-lg font-bold tracking-tight shrink-0">Sports Print Studio</h1>

            {/* Select Game Dropdown */}
            <div className="flex-1 sm:max-w-xs min-w-0">
              <select
                value={currentEvent?.id || ""}
                onChange={(e) => {
                  setSelectedEventId(e.target.value);
                  router.replace(`/sports/print?eventId=${e.target.value}&tab=${activeTab}`);
                }}
                className="w-full h-9 rounded-xl border bg-background px-3 text-xs sm:text-sm font-semibold truncate focus:ring-2 focus:ring-primary/20 outline-none"
              >
                {events.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name} ({e.category}) - {e.participantCount || 0} Athletes
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2 justify-end">
            {/* Zoom Controls */}
            <div className="hidden sm:flex items-center border rounded-xl px-1 bg-background">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setScale((s) => Math.max(0.5, s - 0.1))}
              >
                <ZoomOut className="h-3.5 w-3.5" />
              </Button>
              <span className="text-[11px] font-mono px-1 w-10 text-center font-bold">
                {Math.round(scale * 100)}%
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setScale((s) => Math.min(1.3, s + 0.1))}
              >
                <ZoomIn className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setScale(0.9)}
              >
                <RotateCcw className="h-3 w-3" />
              </Button>
            </div>

            <Button onClick={handlePrint} className="h-9 gap-1.5 font-bold rounded-xl shadow-xs">
              <Printer className="h-4 w-4" />
              Print Sheet
            </Button>
          </div>
        </div>

        {/* Tab Switcher & Winner Filters */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 border-t">
          {/* Format Tabs */}
          <div className="grid grid-cols-4 sm:flex items-center border rounded-xl p-0.5 bg-muted/40 text-xs w-full sm:w-auto">
            <button
              onClick={() => setActiveTab("call")}
              className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                activeTab === "call" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <ClipboardList className="h-3.5 w-3.5" />
              <span className="truncate">Call Sheet</span>
            </button>
            <button
              onClick={() => setActiveTab("score")}
              className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                activeTab === "score" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <FileText className="h-3.5 w-3.5" />
              <span className="truncate">Score Sheet</span>
            </button>
            <button
              onClick={() => setActiveTab("bibs")}
              className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                activeTab === "bibs" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Tag className="h-3.5 w-3.5" />
              <span className="truncate">Jersey Bibs</span>
            </button>
            <button
              onClick={() => setActiveTab("certificates")}
              className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                activeTab === "certificates" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Award className="h-3.5 w-3.5 text-amber-500" />
              <span className="truncate">Certificates</span>
            </button>
          </div>

          {/* Sub-selectors for Certificates */}
          {activeTab === "certificates" && winners.length > 0 && (
            <div className="flex items-center gap-1 overflow-x-auto text-xs">
              <button
                onClick={() => setSelectedWinnerIndex("all")}
                className={`px-2.5 py-1 rounded-md font-bold whitespace-nowrap transition-colors ${
                  selectedWinnerIndex === "all" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                }`}
              >
                All Winners ({winners.length})
              </button>
              {winners.map((w, idx) => (
                <button
                  key={w.studentId}
                  onClick={() => setSelectedWinnerIndex(idx)}
                  className={`px-2 py-1 rounded-md font-semibold whitespace-nowrap transition-colors ${
                    selectedWinnerIndex === idx ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  }`}
                >
                  {w.rankPosition === 1 ? "🥇 1st" : w.rankPosition === 2 ? "🥈 2nd" : "🥉 3rd"}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Printable Preview Canvas */}
      <div
        id="printable-canvas"
        className="w-full flex justify-center py-4 bg-muted/15 border rounded-2xl overflow-x-auto custom-scrollbar print:p-0 print:m-0 print:border-none print:bg-transparent print:w-full print:block"
      >
        {!currentEvent ? (
          <div className="p-12 text-center text-muted-foreground">No events available to print.</div>
        ) : activeTab === "certificates" && winners.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            <Award className="h-10 w-10 mx-auto mb-2 text-muted-foreground/40" />
            <p className="font-bold">No podium winners declared for {currentEvent.name}.</p>
            <p className="text-xs mt-1">
              Please enter ranks on the{" "}
              <Link href={`/sports/${currentEvent.id}/results`} className="text-primary underline font-semibold">
                Scoring Page
              </Link>{" "}
              first.
            </p>
          </div>
        ) : (
          <div
            style={{ transform: `scale(${scale})`, transformOrigin: "top center" }}
            className="transition-transform duration-150 print:transform-none"
          >
            {activeTab === "call" ? (
              <SportsCallSheetPrintableView
                event={currentEvent}
                participants={participants}
                schoolProfile={schoolProfile}
              />
            ) : activeTab === "score" ? (
              <SportsScoreSheetPrintableView
                event={currentEvent}
                participants={participants}
                schoolProfile={schoolProfile}
              />
            ) : activeTab === "bibs" ? (
              <SportsChestBibPrintableView
                event={currentEvent}
                participants={participants}
                schoolProfile={schoolProfile}
              />
            ) : (
              <div className="space-y-6 print:space-y-0">
                {certificatesToRender.map((winner) => (
                  <SportsCertificatePrintableView
                    key={winner.studentId}
                    winner={winner}
                    event={currentEvent}
                    schoolProfile={schoolProfile}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function SportsPrintPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-muted-foreground">Loading Print Studio...</div>}>
      <SportsPrintStudioContent />
    </Suspense>
  );
}
