"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { SportsEvent, SportsParticipant } from "@/lib/sports/types";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Trophy, Plus, Users, Printer, Medal, Search, Edit2, Trash2, Sliders, ClipboardCheck, ListChecks, X } from "lucide-react";
import { toast } from "sonner";
import { useSportsConfig } from "@/lib/sports/use-sports-config";
import {
  useSportsEvents,
  SPORTS_CLASS_OPTIONS,
  getEventStatus,
  EVENT_STATUS_META,
  CATEGORY_BADGE_CLASS,
  GENDER_LABEL,
  formatClassRange,
} from "@/lib/sports/use-sports-events";
import { SportsRulesModal } from "@/components/sports/sports-rules-modal";
import { SportsEventFormDialog } from "@/components/sports/sports-event-form-dialog";

const CATEGORIES = ["All", "Track", "Field", "Fun", "Team"] as const;

export default function SportsDashboardPage() {
  const { config } = useSportsConfig();
  const [isRulesOpen, setIsRulesOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [selectedClass, setSelectedClass] = useState<string>("All");

  const [formOpen, setFormOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<SportsEvent | null>(null);

  const [deletingEvent, setDeletingEvent] = useState<SportsEvent | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const { data: events = [], isLoading, refetch } = useSportsEvents();

  // Unique athletes (one per student, across all events)
  const { data: allAthletes = [] } = useQuery<SportsParticipant[]>({
    queryKey: ["sports-all-athletes"],
    queryFn: async () => {
      const res = await fetch("/api/sports/athletes");
      const json = await res.json();
      return json.data || [];
    },
  });

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

  const handleDeleteEvent = async () => {
    if (!deletingEvent) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/sports/events?id=${deletingEvent.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete event");
      toast.success("Event deleted");
      setDeletingEvent(null);
      refetch();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete event");
    } finally {
      setIsDeleting(false);
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-primary/10 text-primary rounded-xl shrink-0">
            <Trophy className="h-5 w-5" />
          </div>
          <h1 className="text-lg sm:text-xl font-bold tracking-tight">Sports & Athletics</h1>
        </div>

        <div className="grid grid-cols-3 sm:flex items-center gap-2">
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
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <Card key={s.label} className="rounded-2xl px-3.5 py-3 border shadow-2xs flex-row items-center gap-3">
              <div className="p-2 rounded-xl bg-muted/60 shrink-0">
                <Icon className={cn("h-4 w-4", s.color)} />
              </div>
              <div className="min-w-0">
                <div className="text-lg sm:text-xl font-black leading-none">{s.value}</div>
                <div className="text-[11px] font-semibold text-muted-foreground mt-1 truncate">{s.label}</div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center gap-2 bg-card p-2.5 rounded-2xl border shadow-2xs">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search events..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-9 text-sm rounded-xl"
          />
        </div>

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
        <div className="border border-dashed rounded-2xl p-10 text-center text-sm text-muted-foreground space-y-3">
          <p>{hasFilters ? "No events match these filters." : "No events yet."}</p>
          {hasFilters ? (
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
            <Button size="sm" className="rounded-xl gap-1.5" onClick={openCreate}>
              <Plus className="h-3.5 w-3.5" />
              New Event
            </Button>
          )}
        </div>
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
                      onClick={() => setDeletingEvent(event)}
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
        onSaved={() => refetch()}
      />

      {/* Delete Confirmation */}
      <Dialog open={Boolean(deletingEvent)} onOpenChange={(open) => !open && setDeletingEvent(null)}>
        <DialogContent className="sm:max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle>Delete {deletingEvent?.name}?</DialogTitle>
          </DialogHeader>
          {(deletingEvent?.participantCount || 0) > 0 && (
            <p className="text-xs text-destructive font-semibold">
              {deletingEvent?.participantCount} registrations and their scores will be removed.
            </p>
          )}
          <DialogFooter className="pt-2">
            <Button variant="outline" onClick={() => setDeletingEvent(null)} className="rounded-xl">
              Cancel
            </Button>
            <Button variant="destructive" disabled={isDeleting} onClick={handleDeleteEvent} className="rounded-xl font-bold">
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <SportsRulesModal open={isRulesOpen} onOpenChange={setIsRulesOpen} />
    </div>
  );
}
