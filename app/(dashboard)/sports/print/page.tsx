"use client";

import React, { useState, useEffect, useMemo, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { SportsParticipant } from "@/lib/sports/types";
import { useSchoolProfile } from "@/lib/utils/school-profile";
import { Button, buttonVariants } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { SportsCallSheetPrintableView } from "@/components/sports/sports-call-sheet-printable";
import { SportsScoreSheetPrintableView } from "@/components/sports/sports-score-sheet-printable";
import { SportsChestBibPrintableView } from "@/components/sports/sports-chest-bib-printable";
import { SportsCertificatePrintableView, CertificateTemplate } from "@/components/sports/sports-certificate-printable";
import { useSportsEvents, SPORTS_CLASS_OPTIONS } from "@/lib/sports/use-sports-events";
import { ArrowLeft, Printer, FileText, ClipboardList, Tag, Award, ZoomIn, ZoomOut } from "lucide-react";

type DocTab = "bibs" | "call" | "score" | "certificates";

const DOCS: { key: DocTab; label: string; icon: React.ElementType; perEvent: boolean }[] = [
  { key: "bibs", label: "Jersey Bibs", icon: Tag, perEvent: false },
  { key: "call", label: "Call Sheet", icon: ClipboardList, perEvent: true },
  { key: "score", label: "Score Sheet", icon: FileText, perEvent: true },
  { key: "certificates", label: "Certificates", icon: Award, perEvent: true },
];

function parseTab(value: string | null): DocTab {
  return value === "bibs" || value === "score" || value === "certificates" ? value : value === "call" ? "call" : "bibs";
}

function SportsPrintStudioContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [selectedEventId, setSelectedEventId] = useState<string>(searchParams.get("eventId") || "");
  const [activeTab, setActiveTab] = useState<DocTab>(
    // An eventId in the URL means the user came from an event → default to its call sheet
    searchParams.get("tab") ? parseTab(searchParams.get("tab")) : searchParams.get("eventId") ? "call" : "bibs"
  );
  const [scale, setScale] = useState(0.9);
  const [selectedWinnerIndex, setSelectedWinnerIndex] = useState<number | "all">("all");
  const [bibClass, setBibClass] = useState<string>("All");
  const [certTemplate, setCertTemplate] = useState<CertificateTemplate>("classic");

  const { profile: schoolProfile } = useSchoolProfile();
  const { data: events = [] } = useSportsEvents();

  const currentEvent = events.find((e) => e.id === selectedEventId) || events[0];
  const currentEventId = currentEvent?.id || "";
  const activeDoc = DOCS.find((d) => d.key === activeTab)!;

  // Keep the URL shareable
  useEffect(() => {
    const qs = new URLSearchParams({ tab: activeTab });
    if (activeDoc.perEvent && currentEventId) qs.set("eventId", currentEventId);
    router.replace(`/sports/print?${qs.toString()}`, { scroll: false });
  }, [activeTab, currentEventId, activeDoc.perEvent, router]);

  const { data: participants = [], isLoading: isLoadingParticipants } = useQuery<SportsParticipant[]>({
    queryKey: ["sports-participants", currentEvent?.id],
    queryFn: async () => {
      const res = await fetch(`/api/sports/registrations?eventId=${currentEvent!.id}`);
      const json = await res.json();
      return json.data || [];
    },
    enabled: Boolean(currentEvent?.id),
  });

  // One master bib per athlete, listing every event they joined
  const { data: allAthletes = [], isLoading: isLoadingAthletes } = useQuery<SportsParticipant[]>({
    queryKey: ["sports-all-athletes"],
    queryFn: async () => {
      const res = await fetch("/api/sports/athletes");
      const json = await res.json();
      return json.data || [];
    },
  });

  const bibClassOptions = useMemo(() => {
    const present = new Set(allAthletes.map((a) => a.presentClass));
    return SPORTS_CLASS_OPTIONS.filter((c) => present.has(c));
  }, [allAthletes]);

  const bibParticipants = useMemo(
    () =>
      [...(bibClass === "All" ? allAthletes : allAthletes.filter((a) => a.presentClass === bibClass))].sort(
        (a, b) => (parseInt(a.chestNumber, 10) || 0) - (parseInt(b.chestNumber, 10) || 0)
      ),
    [allAthletes, bibClass]
  );

  const winners = participants
    .filter((p) => p.rankPosition && p.rankPosition > 0)
    .sort((a, b) => (a.rankPosition || 99) - (b.rankPosition || 99));

  const certificatesToRender =
    selectedWinnerIndex === "all" ? winners : [winners[selectedWinnerIndex]].filter(Boolean);

  const docCount = (key: DocTab): number | undefined => {
    if (key === "bibs") return allAthletes.length;
    if (!currentEvent) return undefined;
    if (key === "certificates") return winners.length;
    return participants.length;
  };

  const isLoadingDoc = activeTab === "bibs" ? isLoadingAthletes : isLoadingParticipants;
  const isEmpty =
    activeTab === "bibs"
      ? bibParticipants.length === 0
      : activeTab === "certificates"
      ? winners.length === 0
      : participants.length === 0;

  const switchTab = (key: DocTab) => {
    setActiveTab(key);
    setSelectedWinnerIndex("all");
  };

  const selectClass =
    "w-full h-9 rounded-xl border bg-background px-3 text-xs font-semibold focus:ring-2 focus:ring-primary/20 outline-none";

  const docButton = (d: (typeof DOCS)[number]) => {
    const Icon = d.icon;
    const isActive = activeTab === d.key;
    const count = docCount(d.key);
    return (
      <button
        key={d.key}
        onClick={() => switchTab(d.key)}
        className={cn(
          "w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs font-semibold transition-colors border",
          isActive
            ? "bg-primary text-primary-foreground border-primary shadow-xs"
            : "bg-background border-transparent hover:bg-muted text-foreground"
        )}
      >
        <Icon className={cn("h-4 w-4 shrink-0", !isActive && d.key === "certificates" && "text-amber-500")} />
        <span className="truncate flex-1 text-left">{d.label}</span>
        {count !== undefined && (
          <span
            className={cn(
              "text-[10px] font-mono px-1.5 rounded-full",
              isActive ? "bg-primary-foreground/20" : "bg-muted text-muted-foreground"
            )}
          >
            {count}
          </span>
        )}
      </button>
    );
  };

  return (
    <div className="p-3 sm:p-5 max-w-[1700px] mx-auto grid grid-cols-1 lg:grid-cols-[250px_1fr] gap-4 items-start print:block print:p-0 print:m-0 print:max-w-none">
      {/* Control panel */}
      <aside className="print:hidden lg:sticky lg:top-4 space-y-3 bg-card border rounded-2xl p-3 shadow-2xs">
        <div className="flex items-center gap-2">
          <Link href="/sports" className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "h-8 w-8 rounded-xl shrink-0")}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <h1 className="text-base font-bold tracking-tight">Print Studio</h1>
        </div>

        <div className="space-y-1">
          <p className="px-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">All athletes</p>
          {DOCS.filter((d) => !d.perEvent).map(docButton)}
        </div>

        <div className="space-y-1">
          <p className="px-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Per event</p>
          <div className="grid grid-cols-3 lg:grid-cols-1 gap-1">{DOCS.filter((d) => d.perEvent).map(docButton)}</div>
        </div>

        {/* Contextual options */}
        <div className="space-y-2 border-t pt-3">
          {activeDoc.perEvent ? (
            <Select
              value={currentEvent?.id || ""}
              onValueChange={(val) => {
                setSelectedEventId(val || "");
                setSelectedWinnerIndex("all");
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {events.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.name} ({e.participantCount || 0})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Select value={bibClass} onValueChange={(val) => setBibClass(val || "All")}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Classes ({allAthletes.length})</SelectItem>
                {bibClassOptions.map((c) => (
                  <SelectItem key={c} value={c}>
                    Class {c} ({allAthletes.filter((a) => a.presentClass === c).length})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {activeTab === "certificates" && (
            <div className="space-y-1.5">
              <p className="px-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Template</p>
              <div className="grid grid-cols-2 gap-1">
                {(
                  [
                    { key: "classic", label: "Classic" },
                    { key: "ornate", label: "Ornate" },
                  ] as { key: CertificateTemplate; label: string }[]
                ).map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => setCertTemplate(key)}
                    className={cn(
                      "px-2 py-1.5 rounded-lg text-[11px] font-semibold border transition-colors",
                      certTemplate === key
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background border-border text-muted-foreground hover:bg-muted"
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {activeTab === "certificates" && winners.length > 1 && (
            <div className="flex flex-wrap gap-1">
              <button
                onClick={() => setSelectedWinnerIndex("all")}
                className={cn(
                  "px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors",
                  selectedWinnerIndex === "all" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                )}
              >
                All
              </button>
              {winners.map((w, idx) => (
                <button
                  key={w.studentId}
                  onClick={() => setSelectedWinnerIndex(idx)}
                  title={w.studentName}
                  className={cn(
                    "px-2 py-1 rounded-lg text-[11px] font-semibold transition-colors",
                    selectedWinnerIndex === idx ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  )}
                >
                  {w.rankPosition === 1 ? "🥇" : w.rankPosition === 2 ? "🥈" : "🥉"} {w.studentName.split(" ")[0]}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 border-t pt-3">
          <div className="hidden sm:flex items-center border rounded-xl bg-background">
            <Button variant="ghost" size="icon" className="h-8 w-7" onClick={() => setScale((s) => Math.max(0.5, s - 0.1))}>
              <ZoomOut className="h-3.5 w-3.5" />
            </Button>
            <button
              onClick={() => setScale(0.9)}
              title="Reset zoom"
              className="text-[11px] font-mono w-10 text-center font-bold flex items-center justify-center gap-0.5"
            >
              {Math.round(scale * 100)}%
            </button>
            <Button variant="ghost" size="icon" className="h-8 w-7" onClick={() => setScale((s) => Math.min(1.3, s + 0.1))}>
              <ZoomIn className="h-3.5 w-3.5" />
            </Button>
          </div>
          <Button
            onClick={() => window.print()}
            disabled={isEmpty || isLoadingDoc}
            className="h-9 flex-1 gap-1.5 font-bold rounded-xl shadow-xs"
          >
            <Printer className="h-4 w-4" />
            Print
          </Button>
        </div>
      </aside>

      {/* Preview canvas */}
      <div
        id="printable-canvas"
        className="min-w-0 w-full flex justify-center py-4 bg-muted/15 border rounded-2xl overflow-x-auto custom-scrollbar print:p-0 print:m-0 print:border-none print:bg-transparent print:w-full print:block"
      >
        {isLoadingDoc ? (
          <div className="p-12 text-center text-xs text-muted-foreground">Loading...</div>
        ) : activeDoc.perEvent && !currentEvent ? (
          <div className="p-12 text-center text-sm text-muted-foreground">No events yet.</div>
        ) : isEmpty ? (
          <div className="p-12 text-center text-sm text-muted-foreground space-y-2">
            <p className="font-semibold">
              {activeTab === "bibs"
                ? "No enrolled athletes."
                : activeTab === "certificates"
                ? `No podium ranks for ${currentEvent?.name}.`
                : `No athletes in ${currentEvent?.name}.`}
            </p>
            {currentEvent && activeTab !== "bibs" && (
              <Link
                href={`/sports/${currentEvent.id}/${activeTab === "certificates" ? "results" : "enroll"}`}
                className="text-xs text-primary underline font-semibold"
              >
                {activeTab === "certificates" ? "Open Score" : "Open Enroll"}
              </Link>
            )}
          </div>
        ) : (
          <div
            style={{ transform: `scale(${scale})`, transformOrigin: "top center" }}
            className="transition-transform duration-150 print:transform-none"
          >
            {activeTab === "bibs" ? (
              <SportsChestBibPrintableView participants={bibParticipants} schoolProfile={schoolProfile} />
            ) : activeTab === "call" ? (
              <SportsCallSheetPrintableView event={currentEvent!} participants={participants} schoolProfile={schoolProfile} />
            ) : activeTab === "score" ? (
              <SportsScoreSheetPrintableView event={currentEvent!} participants={participants} schoolProfile={schoolProfile} />
            ) : (
              <div className="space-y-6 print:space-y-0">
                {certificatesToRender.map((winner) => (
                  <SportsCertificatePrintableView
                    key={winner.studentId}
                    winner={winner}
                    event={currentEvent!}
                    schoolProfile={schoolProfile}
                    template={certTemplate}
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
    <Suspense fallback={<div className="p-8 text-center text-xs text-muted-foreground">Loading...</div>}>
      <SportsPrintStudioContent />
    </Suspense>
  );
}
