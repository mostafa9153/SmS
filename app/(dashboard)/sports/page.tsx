"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { SportsEvent, SportsCategory, SportsGender, ScoringType } from "@/lib/sports/types";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Trophy,
  Plus,
  Users,
  Printer,
  Medal,
  Search,
  Timer,
  Layers,
  Edit2,
  Trash2,
  ChevronRight,
  Filter,
  Sliders,
} from "lucide-react";
import { toast } from "sonner";
import { useSportsConfig } from "@/lib/sports/use-sports-config";
import { SportsRulesModal } from "@/components/sports/sports-rules-modal";

const CLASS_OPTIONS = ["V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];

export default function SportsDashboardPage() {
  const { config } = useSportsConfig();
  const [isRulesOpen, setIsRulesOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [selectedClass, setSelectedClass] = useState<string>("All");

  // Create Modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [category, setCategory] = useState<SportsCategory>("Track");
  const [gender, setGender] = useState<SportsGender>("All");
  const [eligibleClasses, setEligibleClasses] = useState<string[]>(CLASS_OPTIONS);
  const [scoringType, setScoringType] = useState<ScoringType>("Metric");
  const [measurementUnit, setMeasurementUnit] = useState<string>("Time (s)");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit Modal
  const [editingEvent, setEditingEvent] = useState<SportsEvent | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);

  // Delete Confirm Modal
  const [deletingEventId, setDeletingEventId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch events
  const { data: events = [], isLoading, refetch } = useQuery<SportsEvent[]>({
    queryKey: ["sports-events"],
    queryFn: async () => {
      const res = await fetch("/api/sports/events");
      const json = await res.json();
      return json.data || [];
    },
  });

  const filteredEvents = events.filter((e) => {
    const matchesSearch = e.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === "All" || e.category === selectedCategory;
    const matchesClass =
      selectedClass === "All" ||
      e.eligibleClasses.length === 0 ||
      e.eligibleClasses.includes(selectedClass);
    return matchesSearch && matchesCategory && matchesClass;
  });

  // Handle Create
  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Please enter an event name");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/sports/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          category,
          gender,
          eligibleClasses,
          scoringType,
          measurementUnit,
        }),
      });

      if (!res.ok) throw new Error("Failed to create event");
      toast.success("Sport event created successfully");
      setIsCreateOpen(false);
      setName("");
      refetch();
    } catch (err: any) {
      toast.error(err.message || "Failed to create event");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Edit
  const openEditModal = (event: SportsEvent) => {
    setEditingEvent(event);
    setName(event.name);
    setCategory(event.category);
    setGender(event.gender);
    setEligibleClasses(event.eligibleClasses || []);
    setScoringType(event.scoringType);
    setMeasurementUnit(event.measurementUnit || "Time (s)");
    setIsEditOpen(true);
  };

  // Handle Edit Submit
  const handleUpdateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEvent || !name.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/sports/events", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingEvent.id,
          name: name.trim(),
          category,
          gender,
          eligibleClasses,
          scoringType,
          measurementUnit,
        }),
      });

      if (!res.ok) throw new Error("Failed to update event");
      toast.success("Event updated successfully");
      setIsEditOpen(false);
      setEditingEvent(null);
      refetch();
    } catch (err: any) {
      toast.error(err.message || "Failed to update event");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Delete
  const handleDeleteEvent = async () => {
    if (!deletingEventId) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/sports/events?id=${deletingEventId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete event");
      toast.success("Event deleted successfully");
      setDeletingEventId(null);
      refetch();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete event");
    } finally {
      setIsDeleting(false);
    }
  };

  const toggleClassSelection = (cls: string) => {
    setEligibleClasses((prev) =>
      prev.includes(cls) ? prev.filter((c) => c !== cls) : [...prev, cls]
    );
  };

  const totalAthletes = events.reduce((sum, e) => sum + (e.participantCount || 0), 0);

  return (
    <div className="p-3 sm:p-5 md:p-6 space-y-4 max-w-7xl mx-auto pb-16">
      {/* Action Header - Mobile Optimized */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2.5 bg-primary/10 text-primary rounded-2xl shrink-0">
            <Trophy className="h-5 w-5 sm:h-6 sm:w-6" />
          </div>
          <h1 className="text-lg sm:text-xl font-bold tracking-tight">Sports & Athletics</h1>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsRulesOpen(true)}
            className="h-9 rounded-xl text-xs font-semibold gap-1.5 flex-1 sm:flex-none"
            title="Configure maximum games per student"
          >
            <Sliders className="h-4 w-4 text-primary" />
            <span>Rules</span>
            <span className="px-1.5 py-0.5 rounded-md bg-muted text-[10px] font-mono font-bold">
              {config.maxEventsPerStudent === 0 ? "Unlimited" : `Max ${config.maxEventsPerStudent}`}
            </span>
          </Button>

          <Link
            href="/sports/print"
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "h-9 rounded-xl text-xs font-semibold gap-1.5 flex-1 sm:flex-none"
            )}
          >
            <Printer className="h-4 w-4" />
            Print Studio
          </Link>

          <Button
            onClick={() => {
              setName("");
              setCategory("Track");
              setGender("All");
              setEligibleClasses(CLASS_OPTIONS);
              setScoringType("Metric");
              setMeasurementUnit("Time (s)");
              setIsCreateOpen(true);
            }}
            size="sm"
            className="h-9 rounded-xl text-xs font-bold gap-1.5 flex-1 sm:flex-none shadow-xs"
          >
            <Plus className="h-4 w-4" />
            New Event
          </Button>
        </div>
      </div>

      {/* Metrics Row - Mobile 2x2, Desktop 4x1 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5">
        <Card className="rounded-2xl p-3 sm:p-4 border shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-semibold text-muted-foreground uppercase">Events</span>
            <Trophy className="h-4 w-4 text-primary" />
          </div>
          <div className="text-xl sm:text-2xl font-black mt-1">{events.length}</div>
        </Card>

        <Card className="rounded-2xl p-3 sm:p-4 border shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-semibold text-muted-foreground uppercase">Track Races</span>
            <Timer className="h-4 w-4 text-blue-500" />
          </div>
          <div className="text-xl sm:text-2xl font-black mt-1">
            {events.filter((e) => e.category === "Track").length}
          </div>
        </Card>

        <Card className="rounded-2xl p-3 sm:p-4 border shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-semibold text-muted-foreground uppercase">Field Jumps/Throws</span>
            <Layers className="h-4 w-4 text-amber-500" />
          </div>
          <div className="text-xl sm:text-2xl font-black mt-1">
            {events.filter((e) => e.category === "Field").length}
          </div>
        </Card>

        <Card className="rounded-2xl p-3 sm:p-4 border shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-semibold text-muted-foreground uppercase">Athletes Enrolled</span>
            <Users className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="text-xl sm:text-2xl font-black mt-1">{totalAthletes}</div>
        </Card>
      </div>

      {/* Search & Category Filter Bar */}
      <div className="space-y-2 bg-card p-3 rounded-2xl border shadow-2xs">
        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search game name (e.g. 100m, Long Jump)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-9 text-xs sm:text-sm rounded-xl"
          />
        </div>

        {/* Filter Row: Category Pills + Class Select */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 pt-1 border-t">
          {/* Category Touch Pills */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 custom-scrollbar">
            {["All", "Track", "Field", "Fun"].map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`min-h-[32px] px-3 py-1 rounded-xl text-xs font-semibold transition-all whitespace-nowrap active:scale-95 border ${
                  selectedCategory === cat
                    ? "bg-primary text-primary-foreground border-primary shadow-xs"
                    : "bg-muted/40 text-muted-foreground border-transparent hover:bg-muted"
                }`}
              >
                {cat === "All" ? "All Sports" : cat}
              </button>
            ))}
          </div>

          {/* Class Dropdown */}
          <div className="flex items-center gap-1.5 self-end sm:self-auto text-xs">
            <span className="text-muted-foreground font-semibold">Class:</span>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="h-8 rounded-xl border bg-background px-2.5 text-xs font-semibold focus:ring-2 focus:ring-primary/20 outline-none"
            >
              <option value="All">All Classes</option>
              {CLASS_OPTIONS.map((c) => (
                <option key={c} value={c}>
                  Class {c}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Events Card Grid - Mobile First */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-48 rounded-2xl bg-muted/40 animate-pulse border" />
          ))}
        </div>
      ) : filteredEvents.length === 0 ? (
        <div className="border border-dashed rounded-2xl p-12 text-center text-muted-foreground text-xs sm:text-sm">
          No sports events found. Click <span className="font-bold text-foreground">"+ New Event"</span> to add one.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {filteredEvents.map((event) => (
            <div
              key={event.id}
              className="bg-card border rounded-2xl p-4 flex flex-col justify-between shadow-2xs hover:shadow-md transition-all duration-200"
            >
              <div>
                {/* Top Row: Event Name + Category Badge + Actions */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-base text-foreground truncate">{event.name}</h3>
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      <Badge
                        variant="secondary"
                        className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-md ${
                          event.category === "Track"
                            ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                            : event.category === "Field"
                            ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                            : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        }`}
                      >
                        {event.category}
                      </Badge>

                      <span className="text-[10px] text-muted-foreground font-semibold">
                        • {event.gender}
                      </span>
                    </div>
                  </div>

                  {/* Edit & Delete Buttons */}
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEditModal(event)}
                      className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground"
                      title="Edit Event"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeletingEventId(event.id)}
                      className="h-7 w-7 rounded-lg text-destructive hover:bg-destructive/10"
                      title="Delete Event"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                {/* Eligible Classes Chips */}
                <div className="flex items-center gap-1 flex-wrap mt-2.5">
                  <span className="text-[10px] text-muted-foreground font-semibold">Classes:</span>
                  {event.eligibleClasses.slice(0, 5).map((cls) => (
                    <span key={cls} className="text-[10px] bg-muted/60 px-1.5 py-0.5 rounded font-mono font-bold">
                      {cls}
                    </span>
                  ))}
                  {event.eligibleClasses.length > 5 && (
                    <span className="text-[10px] text-muted-foreground font-mono">
                      +{event.eligibleClasses.length - 5} more
                    </span>
                  )}
                </div>

                {/* Participant Count & Metric */}
                <div className="flex items-center justify-between text-xs text-muted-foreground border-t mt-3 pt-2">
                  <div className="flex items-center gap-1 font-semibold text-foreground">
                    <Users className="h-3.5 w-3.5 text-primary" />
                    <span>{event.participantCount || 0}</span> Participants
                  </div>
                  <span className="text-[11px] font-mono">{event.measurementUnit}</span>
                </div>
              </div>

              {/* Action Buttons Row */}
              <div className="grid grid-cols-3 gap-1.5 mt-3 pt-2 border-t">
                <Link
                  href={`/sports/${event.id}/enroll`}
                  className={cn(
                    buttonVariants({ variant: "outline", size: "sm" }),
                    "h-8 rounded-xl text-xs font-semibold"
                  )}
                >
                  <Users className="h-3.5 w-3.5 mr-1 text-primary" />
                  Enroll
                </Link>

                <Link
                  href={`/sports/print?eventId=${event.id}`}
                  className={cn(
                    buttonVariants({ variant: "outline", size: "sm" }),
                    "h-8 rounded-xl text-xs font-semibold"
                  )}
                >
                  <Printer className="h-3.5 w-3.5 mr-1 text-blue-500" />
                  Print
                </Link>

                <Link
                  href={`/sports/${event.id}/results`}
                  className={cn(
                    buttonVariants({ variant: "default", size: "sm" }),
                    "h-8 rounded-xl text-xs font-bold shadow-2xs"
                  )}
                >
                  <Medal className="h-3.5 w-3.5 mr-1" />
                  Score
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create New Event Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Add New Sport / Game</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCreateEvent} className="space-y-3.5 pt-2">
            <div className="space-y-1">
              <Label htmlFor="create-event-name">Event / Game Name</Label>
              <Input
                id="create-event-name"
                placeholder="e.g. 100m Sprint, Long Jump, Sack Race"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="rounded-xl"
                autoFocus
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="create-category">Category</Label>
                <select
                  id="create-category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value as SportsCategory)}
                  className="w-full h-9 rounded-xl border bg-background px-3 text-xs font-medium focus:ring-2 focus:ring-primary/20 outline-none"
                >
                  <option value="Track">Track (Running)</option>
                  <option value="Field">Field (Jump/Throw)</option>
                  <option value="Fun">Fun / Minor Game</option>
                  <option value="Team">Team Sport</option>
                </select>
              </div>

              <div className="space-y-1">
                <Label htmlFor="create-gender">Gender Target</Label>
                <select
                  id="create-gender"
                  value={gender}
                  onChange={(e) => setGender(e.target.value as SportsGender)}
                  className="w-full h-9 rounded-xl border bg-background px-3 text-xs font-medium focus:ring-2 focus:ring-primary/20 outline-none"
                >
                  <option value="All">All (Co-ed)</option>
                  <option value="Boys">Boys Only</option>
                  <option value="Girls">Girls Only</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="create-scoring">Scoring Mode</Label>
                <select
                  id="create-scoring"
                  value={scoringType}
                  onChange={(e) => setScoringType(e.target.value as ScoringType)}
                  className="w-full h-9 rounded-xl border bg-background px-3 text-xs font-medium focus:ring-2 focus:ring-primary/20 outline-none"
                >
                  <option value="Metric">Metric (Time/Trials)</option>
                  <option value="Rank_Only">Rank Only (1st, 2nd, 3rd)</option>
                </select>
              </div>

              <div className="space-y-1">
                <Label htmlFor="create-unit">Measurement Unit</Label>
                <select
                  id="create-unit"
                  value={measurementUnit}
                  onChange={(e) => setMeasurementUnit(e.target.value)}
                  className="w-full h-9 rounded-xl border bg-background px-3 text-xs font-medium focus:ring-2 focus:ring-primary/20 outline-none"
                >
                  <option value="Time (s)">Time (s)</option>
                  <option value="Distance (m)">Distance (m)</option>
                  <option value="Height (m)">Height (m)</option>
                  <option value="Points">Points</option>
                  <option value="None">None</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label>Eligible Classes</Label>
                <button
                  type="button"
                  onClick={() => setEligibleClasses(CLASS_OPTIONS)}
                  className="text-[11px] text-primary hover:underline font-semibold"
                >
                  Select All
                </button>
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {CLASS_OPTIONS.map((cls) => {
                  const isChecked = eligibleClasses.includes(cls);
                  return (
                    <button
                      type="button"
                      key={cls}
                      onClick={() => toggleClassSelection(cls)}
                      className={`py-1.5 px-2 text-xs font-mono rounded-xl border transition-colors ${
                        isChecked
                          ? "bg-primary text-primary-foreground border-primary font-bold shadow-2xs"
                          : "bg-muted/40 text-muted-foreground border-border hover:bg-muted"
                      }`}
                    >
                      Class {cls}
                    </button>
                  );
                })}
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)} className="rounded-xl">
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} className="rounded-xl font-bold">
                {isSubmitting ? "Saving..." : "Create Event"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Event Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Edit Sport / Game</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleUpdateEvent} className="space-y-3.5 pt-2">
            <div className="space-y-1">
              <Label htmlFor="edit-event-name">Event / Game Name</Label>
              <Input
                id="edit-event-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="rounded-xl"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="edit-category">Category</Label>
                <select
                  id="edit-category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value as SportsCategory)}
                  className="w-full h-9 rounded-xl border bg-background px-3 text-xs font-medium focus:ring-2 focus:ring-primary/20 outline-none"
                >
                  <option value="Track">Track (Running)</option>
                  <option value="Field">Field (Jump/Throw)</option>
                  <option value="Fun">Fun / Minor Game</option>
                  <option value="Team">Team Sport</option>
                </select>
              </div>

              <div className="space-y-1">
                <Label htmlFor="edit-gender">Gender Target</Label>
                <select
                  id="edit-gender"
                  value={gender}
                  onChange={(e) => setGender(e.target.value as SportsGender)}
                  className="w-full h-9 rounded-xl border bg-background px-3 text-xs font-medium focus:ring-2 focus:ring-primary/20 outline-none"
                >
                  <option value="All">All (Co-ed)</option>
                  <option value="Boys">Boys Only</option>
                  <option value="Girls">Girls Only</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="edit-scoring">Scoring Mode</Label>
                <select
                  id="edit-scoring"
                  value={scoringType}
                  onChange={(e) => setScoringType(e.target.value as ScoringType)}
                  className="w-full h-9 rounded-xl border bg-background px-3 text-xs font-medium focus:ring-2 focus:ring-primary/20 outline-none"
                >
                  <option value="Metric">Metric (Time/Trials)</option>
                  <option value="Rank_Only">Rank Only (1st, 2nd, 3rd)</option>
                </select>
              </div>

              <div className="space-y-1">
                <Label htmlFor="edit-unit">Measurement Unit</Label>
                <select
                  id="edit-unit"
                  value={measurementUnit}
                  onChange={(e) => setMeasurementUnit(e.target.value)}
                  className="w-full h-9 rounded-xl border bg-background px-3 text-xs font-medium focus:ring-2 focus:ring-primary/20 outline-none"
                >
                  <option value="Time (s)">Time (s)</option>
                  <option value="Distance (m)">Distance (m)</option>
                  <option value="Height (m)">Height (m)</option>
                  <option value="Points">Points</option>
                  <option value="None">None</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label>Eligible Classes</Label>
                <button
                  type="button"
                  onClick={() => setEligibleClasses(CLASS_OPTIONS)}
                  className="text-[11px] text-primary hover:underline font-semibold"
                >
                  Select All
                </button>
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {CLASS_OPTIONS.map((cls) => {
                  const isChecked = eligibleClasses.includes(cls);
                  return (
                    <button
                      type="button"
                      key={cls}
                      onClick={() => toggleClassSelection(cls)}
                      className={`py-1.5 px-2 text-xs font-mono rounded-xl border transition-colors ${
                        isChecked
                          ? "bg-primary text-primary-foreground border-primary font-bold shadow-2xs"
                          : "bg-muted/40 text-muted-foreground border-border hover:bg-muted"
                      }`}
                    >
                      Class {cls}
                    </button>
                  );
                })}
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)} className="rounded-xl">
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} className="rounded-xl font-bold">
                {isSubmitting ? "Updating..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={Boolean(deletingEventId)} onOpenChange={(open) => !open && setDeletingEventId(null)}>
        <DialogContent className="sm:max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle>Delete Sports Event</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground pt-1">
            Are you sure you want to delete this event? All participant registrations for this game will also be removed.
          </p>
          <DialogFooter className="pt-3">
            <Button variant="outline" onClick={() => setDeletingEventId(null)} className="rounded-xl">
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={isDeleting}
              onClick={handleDeleteEvent}
              className="rounded-xl font-bold"
            >
              {isDeleting ? "Deleting..." : "Delete Event"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rules & Limits Modal */}
      <SportsRulesModal open={isRulesOpen} onOpenChange={setIsRulesOpen} />
    </div>
  );
}
