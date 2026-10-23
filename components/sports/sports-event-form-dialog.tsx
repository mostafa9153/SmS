"use client";

import React, { useState } from "react";
import { toast } from "sonner";
import { SportsEvent, SportsCategory, SportsGender, ScoringType } from "@/lib/sports/types";
import { SPORTS_CLASS_OPTIONS } from "@/lib/sports/use-sports-events";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const DEFAULT_UNIT_BY_CATEGORY: Record<SportsCategory, string> = {
  Track: "Time (s)",
  Field: "Distance (m)",
  Fun: "None",
  Team: "Points",
};

interface SportsEventFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event?: SportsEvent | null; // null/undefined = create mode
  onSaved: () => void;
}

export function SportsEventFormDialog(props: SportsEventFormDialogProps) {
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-2xl">
        {/* Remount on every open so fields start from the current event */}
        {props.open && <SportsEventForm key={props.event?.id ?? "new"} {...props} />}
      </DialogContent>
    </Dialog>
  );
}

function SportsEventForm({ onOpenChange, event, onSaved }: SportsEventFormDialogProps) {
  const isEdit = Boolean(event);
  const [name, setName] = useState(event?.name || "");
  const [category, setCategory] = useState<SportsCategory>(event?.category || "Track");
  const [gender, setGender] = useState<SportsGender>(event?.gender || "All");
  const [eligibleClasses, setEligibleClasses] = useState<string[]>(
    event?.eligibleClasses?.length ? event.eligibleClasses : SPORTS_CLASS_OPTIONS
  );
  const [scoringType, setScoringType] = useState<ScoringType>(event?.scoringType || "Metric");
  const [measurementUnit, setMeasurementUnit] = useState<string>(event?.measurementUnit || "Time (s)");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCategoryChange = (next: SportsCategory) => {
    setCategory(next);
    // Keep the unit sensible for the category when creating
    if (!isEdit) setMeasurementUnit(DEFAULT_UNIT_BY_CATEGORY[next]);
  };

  const toggleClass = (cls: string) => {
    setEligibleClasses((prev) => (prev.includes(cls) ? prev.filter((c) => c !== cls) : [...prev, cls]));
  };

  const allSelected = eligibleClasses.length === SPORTS_CLASS_OPTIONS.length;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Please enter an event name");
      return;
    }
    if (eligibleClasses.length === 0) {
      toast.error("Select at least one class");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/sports/events", {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(isEdit ? { id: event!.id } : {}),
          name: name.trim(),
          category,
          gender,
          eligibleClasses,
          scoringType,
          measurementUnit,
        }),
      });
      if (!res.ok) throw new Error(isEdit ? "Failed to update event" : "Failed to create event");
      toast.success(isEdit ? "Event updated" : "Event created");
      onOpenChange(false);
      onSaved();
    } catch (err: any) {
      toast.error(err.message || "Failed to save event");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Event" : "New Event"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3.5 pt-1">
          <div className="space-y-1">
            <Label htmlFor="event-name">Name</Label>
            <Input
              id="event-name"
              placeholder="e.g. 100m Sprint"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded-xl"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="event-category">Category</Label>
              <Select value={category} onValueChange={(val) => handleCategoryChange((val || "Track") as SportsCategory)}>
                <SelectTrigger id="event-category" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Track">Track (Running)</SelectItem>
                  <SelectItem value="Field">Field (Jump/Throw)</SelectItem>
                  <SelectItem value="Fun">Fun / Minor Game</SelectItem>
                  <SelectItem value="Team">Team Sport</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Gender</Label>
              <div className="grid grid-cols-3 gap-1 p-0.5 border rounded-xl bg-muted/40 h-9">
                {(["All", "Boys", "Girls"] as SportsGender[]).map((g) => (
                  <button
                    type="button"
                    key={g}
                    onClick={() => setGender(g)}
                    className={cn(
                      "rounded-lg text-xs font-semibold transition-colors",
                      gender === g ? "bg-background shadow-2xs text-foreground" : "text-muted-foreground"
                    )}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="event-scoring">Scoring</Label>
              <Select value={scoringType} onValueChange={(val) => setScoringType((val || "Metric") as ScoringType)}>
                <SelectTrigger id="event-scoring" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Metric">Metric (Time/Trials)</SelectItem>
                  <SelectItem value="Rank_Only">Rank Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="event-unit">Unit</Label>
              <Select value={measurementUnit} onValueChange={(val) => setMeasurementUnit(val || "None")}>
                <SelectTrigger id="event-unit" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Time (s)">Time (s)</SelectItem>
                  <SelectItem value="Distance (m)">Distance (m)</SelectItem>
                  <SelectItem value="Height (m)">Height (m)</SelectItem>
                  <SelectItem value="Points">Points</SelectItem>
                  <SelectItem value="None">None</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label>Classes</Label>
              <button
                type="button"
                onClick={() => setEligibleClasses(allSelected ? [] : SPORTS_CLASS_OPTIONS)}
                className="text-[11px] text-primary hover:underline font-semibold"
              >
                {allSelected ? "Clear" : "Select All"}
              </button>
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {SPORTS_CLASS_OPTIONS.map((cls) => {
                const isChecked = eligibleClasses.includes(cls);
                return (
                  <button
                    type="button"
                    key={cls}
                    onClick={() => toggleClass(cls)}
                    className={cn(
                      "py-1.5 px-2 text-xs font-mono rounded-xl border transition-colors",
                      isChecked
                        ? "bg-primary text-primary-foreground border-primary font-bold shadow-2xs"
                        : "bg-muted/40 text-muted-foreground border-border hover:bg-muted"
                    )}
                  >
                    {cls}
                  </button>
                );
              })}
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl">
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="rounded-xl font-bold">
              {isSubmitting ? "Saving..." : isEdit ? "Save Changes" : "Create Event"}
            </Button>
          </DialogFooter>
        </form>
    </>
  );
}
