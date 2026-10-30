"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import type { SportsEvent } from "@/lib/sports/types";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trophy, Plus, Users, Printer, Medal, Edit2, Trash2, Sliders, ClipboardCheck, ListChecks, X } from "lucide-react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api/client";
import { toastWithUndo } from "@/lib/undo/client";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { useAcademicYear } from "@/lib/hooks/use-academic-year";
import { useSportsConfig } from "@/lib/sports/use-sports-config";
import {
  useSportsEvents,
  useSportsAthletes,
  useRefreshSports,
  SPORTS_CLASS_OPTIONS,
  getEventStatus,
  EVENT_STATUS_META,
  CATEGORY_BADGE_CLASS,
  GENDER_LABEL,
  formatClassRange,
} from "@/lib/sports/use-sports-events";
import { SportsRulesModal } from "@/components/sports/sports-rules-modal";
import { SportsEventFormDialog } from "@/components/sports/sports-event-form-dialog";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { SearchInput } from "@/components/ui/search-input";
import { EmptyState } from "@/components/ui/empty-state";

const CATEGORIES = ["All", "Track", "Field", "Fun", "Team"] as const;

export default function SportsDashboardPage() {
  const { config } = useSportsConfig();
  const [isRulesOpen, setIsRulesOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [selectedClass, setSelectedClass] = useState<string>("All");

  const [formOpen, setFormOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<SportsEvent | null>(null);

  const [isAddingPresets, setIsAddingPresets] = useState(false);
  const confirm = useConfirm();
  const academicYear = useAcademicYear();
  const refreshSports = useRefreshSports();

  const { data: events = [], isLoading } = useSportsEvents();
  // Unique athletes (one per student, across all events)
  const { data: allAthletes = [] } = useSportsAthletes();

  const filteredEvents = useMemo(
    () =>
      events.filter((e) => {
        const matchesSearch = e.name.toLowerCase().includes(searchTerm.toLowerCase().trim());
        const matchesCategory = selectedCategory === "All" || e.category === selectedCategory;
        const matchesClass =
          selectedClass === "All" || e.eligibleClasses.length === 0 || e.eligibleClasses.includes(selectedClass);
        return matchesSearch && matchesCategory && matchesClass;
      }),
    [events, searchTerm, selectedCategory, selectedClass]
  );

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { All: events.length };
    events.forEach((e) => (counts[e.category] = (counts[e.category] || 0) + 1));
    return counts;
  }, [events]);

  const totalRegistrations = events.reduce((sum, e) => sum + (e.participantCount || 0), 0);
  const completedEvents = events.filter((e) => getEventStatus(e) === "completed").length;
  const hasFilters = searchTerm.trim() !== "" || selectedCategory !== "All" || selectedClass !== "All";

  const openCreate = () => {
    setEditingEvent(null);
    setFormOpen(true);
  };

  const openEdit = (event: SportsEvent) => {
    setEditingEvent(event);
    setFormOpen(true);
  };

  const handleDeleteEvent = async (event: SportsEvent) => {
    const ok = await confirm({
      title: `Delete ${event.name}?`,
      description: event.participantCount ? `${event.participantCount} registrations and their scores will be removed.` : undefined,
      destructive: true,
    });
    if (!ok) return;
    try {
      const { undoId } = await apiFetch<{ undoId?: string }>(`/api/sports/events?id=${event.id}`, { method: "DELETE" });
      toastWithUndo("Event deleted", undoId, refreshSports);
      refreshSports();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete event");
    }
  };

  const handleAddPresets = async () => {
    setIsAddingPresets(true);
    try {
      const { added } = await apiFetch<{ added: number }>("/api/sports/events", { method: "POST", json: { preset: true, academicYear } });
      toast.success(added ? `Added ${added} standard events` : "Standard events already added");
      refreshSports();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add events");
    } finally {
      setIsAddingPresets(false);
    }
  };

  const stats = [
    { label: "Events", value: events.length, icon: Trophy, color: "text-primary" },
    { label: "Athletes", value: allAthletes.length, icon: Users, color: "text-emerald-500" },
    { label: "Registrations", value: totalRegistrations, icon: ListChecks, color: "text-blue-500" },
    { label: "Podium Set", value: `${completedEvents}/${events.length}`, icon: ClipboardCheck, color: "text-amber-500" },
  ];

  return (
    <div className="p-3 sm:p-5 md:p-6 space-y-4 max-w-7xl mx-auto pb-16">
      <PageHeader
        icon={Trophy}
        title="Sports & Athletics"
        actionsClassName="grid grid-cols-3 sm:flex"
        actions={
          <>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsRulesOpen(true)}
            className="h-9 rounded-xl text-xs font-semibold gap-1.5"
          >
            <Sliders className="h-4 w-4 text-primary" />
            <span>Rules</span>
            <span className="hidden sm:inline px-1.5 py-0.5 rounded-md bg-muted text-[10px] font-mono font-bold">
              {config.maxEventsPerStudent === 0 ? "∞" : `Max ${config.maxEventsPerStudent}`}
            </span>
          </Button>
          <Link
            href="/sports/print"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }), "h-9 rounded-xl text-xs font-semibold gap-1.5")}
          >
            <Printer className="h-4 w-4" />
            <span className="sm:hidden">Print</span>
            <span className="hidden sm:inline">Print Studio</span>
          </Link>
          <Button onClick={openCreate} size="sm" className="h-9 rounded-xl text-xs font-bold gap-1.5 shadow-xs">
            <Plus className="h-4 w-4" />
            <span className="sm:hidden">New</span>
            <span className="hidden sm:inline">New Event</span>
          </Button>
          </>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        {stats.map((s) => (
          <StatCard key={s.label} label={s.label} value={s.value} icon={s.icon} iconClassName={s.color} />
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center gap-2 bg-card p-2.5 rounded-2xl border shadow-2xs">
        <SearchInput value={searchTerm} onChange={setSearchTerm} placeholder="Search events..." className="flex-1 min-w-0" />

        <div className="flex items-center gap-2 justify-between">
          <div className="flex items-center gap-1 overflow-x-auto custom-scrollbar">
            {CATEGORIES.filter((c) => c === "All" || categoryCounts[c]).map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={cn(
                  "h-8 px-3 rounded-xl text-xs font-semibold transition-all whitespace-nowrap active:scale-95 border flex items-center gap-1.5",
                  selectedCategory === cat
                    ? "bg-primary text-primary-foreground border-primary shadow-xs"
                    : "bg-muted/40 text-muted-foreground border-transparent hover:bg-muted"
                )}
              >
                {cat}
                <span className="text-[10px] font-mono opacity-70">{categoryCounts[cat] || 0}</span>
              </button>
            ))}
          </div>

          <Select value={selectedClass} onValueChange={(val) => setSelectedClass(val || "All")}>
            <SelectTrigger className="h-8 w-auto shrink-0 rounded-xl px-2.5">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Classes</SelectItem>
              {SPORTS_CLASS_OPTIONS.map((c) => (
                <SelectItem key={c} value={c}>
                  Class {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Event Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-44 rounded-2xl bg-muted/40 animate-pulse border" />
          ))}
        </div>
      ) : filteredEvents.length === 0 ? (
        <EmptyState
          icon={Trophy}
          className="border border-dashed rounded-2xl"
          title={hasFilters ? "No events match these filters." : "No events yet."}
          action={hasFilters ? (
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl gap-1.5"
              onClick={() => {
                setSearchTerm("");
                setSelectedCategory("All");
                setSelectedClass("All");
              }}
            >
              <X className="h-3.5 w-3.5" />
              Clear filters
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="rounded-xl gap-1.5" disabled={isAddingPresets} onClick={handleAddPresets}>
                <ListChecks className="h-3.5 w-3.5" />
                {isAddingPresets ? "Adding..." : "Add standard events"}
              </Button>
              <Button size="sm" className="rounded-xl gap-1.5" onClick={openCreate}>
                <Plus className="h-3.5 w-3.5" />
                New Event
              </Button>
            </div>
          )}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredEvents.map((event) => {
            const status = EVENT_STATUS_META[getEventStatus(event)];
            const participants = event.participantCount || 0;
            const scored = Math.min(event.scoredCount || 0, participants);
            const progress = participants > 0 ? Math.round((scored / participants) * 100) : 0;

            return (
              <div
                key={event.id}
                className="group bg-card border rounded-2xl p-4 flex flex-col gap-3 shadow-2xs hover:shadow-md hover:border-primary/30 transition-all"
              >
                {/* Title row */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="font-bold text-base truncate">{event.name}</h3>
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap text-[10px] font-semibold">
                      <span
                        className={cn(
                          "uppercase font-bold px-2 py-0.5 rounded-md",
                          CATEGORY_BADGE_CLASS[event.category] || "bg-muted"
                        )}
                      >
                        {event.category}
                      </span>
                      <span className="text-muted-foreground">{GENDER_LABEL[event.gender] || event.gender}</span>
                      <span className="text-muted-foreground">•</span>
                      <span className="text-muted-foreground">{formatClassRange(event.eligibleClasses)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-0.5 shrink-0 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEdit(event)}
                      className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground"
                      title="Edit"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteEvent(event)}
                      className="h-7 w-7 rounded-lg text-destructive hover:bg-destructive/10"
                      title="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                {/* Progress */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1 font-semibold">
                      <Users className="h-3.5 w-3.5 text-primary" />
                      {participants} {participants === 1 ? "athlete" : "athletes"}
                    </span>
                    <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-md", status.className)}>
                      {status.label}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden" title={`${scored}/${participants} scored`}>
                    <div
                      className={cn(
                        "h-full rounded-full transition-all",
                        progress === 100 ? "bg-emerald-500" : "bg-primary"
                      )}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>

                {/* Actions */}
                <div className="grid grid-cols-2 gap-1.5 mt-auto">
                  <Link
                    href={`/sports/${event.id}/enroll`}
                    className={cn(buttonVariants({ variant: "outline", size: "sm" }), "h-9 rounded-xl text-xs font-semibold")}
                  >
                    <Users className="h-3.5 w-3.5 mr-1 text-primary" />
                    Enroll
                  </Link>
                  <Link
                    href={`/sports/${event.id}/results`}
                    className={cn(
                      buttonVariants({ variant: participants > 0 ? "default" : "secondary", size: "sm" }),
                      "h-9 rounded-xl text-xs font-bold"
                    )}
                  >
                    <Medal className="h-3.5 w-3.5 mr-1" />
                    Score
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <SportsEventFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        event={editingEvent}
        onSaved={refreshSports}
      />

      <SportsRulesModal open={isRulesOpen} onOpenChange={setIsRulesOpen} />
    </div>
  );
}
