"use client";

import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { UserCheck, X } from "lucide-react";
import type { Student } from "@/lib/types";
import type { SportsConfig, SportsEvent } from "@/lib/sports/types";
import { apiFetch } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import { SPORTS_CLASS_OPTIONS, GENDER_LABEL } from "@/lib/sports/use-sports-events";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SearchInput } from "@/components/ui/search-input";
import { EmptyState } from "@/components/ui/empty-state";

interface StudentPickerProps {
  event: SportsEvent | undefined;
  enrolledStudentIds: Set<string>;
  studentEventCounts: Record<string, number>;
  config: SportsConfig;
  selectedIds: Set<string>;
  onSelectedIdsChange: (next: Set<string>) => void;
  onEnroll: () => void;
  isEnrolling: boolean;
  className?: string;
}

const genderMatches = (s: Student, eventGender?: string) =>
  eventGender === "Boys" ? s.gender === "Male" : eventGender === "Girls" ? s.gender === "Female" : true;

/** Class roster for one event: filter, select and enrol students. */
export function StudentPicker({
  event,
  enrolledStudentIds,
  studentEventCounts,
  config,
  selectedIds,
  onSelectedIdsChange,
  onEnroll,
  isEnrolling,
  className,
}: StudentPickerProps) {
  const [pickedClass, setPickedClass] = useState("");
  const [selectedSection, setSelectedSection] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [hideEnrolled, setHideEnrolled] = useState(false);

  const eligibleClasses = event?.eligibleClasses.length ? event.eligibleClasses : SPORTS_CLASS_OPTIONS;
  // Fall back to the first eligible class until the user picks one
  const selectedClass = event ? (eligibleClasses.includes(pickedClass) ? pickedClass : eligibleClasses[0]) : "";
  const eventGender = event?.gender;

  // Whole class in one request; sections are derived and filtered client-side
  const { data: classStudents = [], isLoading } = useQuery<Student[]>({
    queryKey: ["students", selectedClass],
    queryFn: () =>
      apiFetch<Student[]>(`/api/students?paginated=false&projection=summary&class=${encodeURIComponent(selectedClass)}`),
    enabled: Boolean(selectedClass),
  });

  const sectionOptions = useMemo(
    () =>
      Array.from(new Set(classStudents.map((s) => s.presentSection).filter(Boolean))).sort((a, b) =>
        String(a).localeCompare(String(b))
      ),
    [classStudents]
  );

  const filteredStudents = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return classStudents
      .filter((s) => {
        if (!genderMatches(s, eventGender)) return false;
        if (selectedSection !== "All" && s.presentSection !== selectedSection) return false;
        if (hideEnrolled && enrolledStudentIds.has(s.id)) return false;
        if (!q) return true;
        return s.name.toLowerCase().includes(q) || String(s.presentRoll).includes(q);
      })
      .sort((a, b) => (Number(a.presentRoll) || 0) - (Number(b.presentRoll) || 0));
  }, [classStudents, searchQuery, selectedSection, hideEnrolled, enrolledStudentIds, eventGender]);

  const limit = config.maxEventsPerStudent;
  const isBlocked = (studentId: string) =>
    limit > 0 && config.enforcementMode === "strict" && (studentEventCounts[studentId] || 0) >= limit;

  const selectable = filteredStudents.filter((s) => !enrolledStudentIds.has(s.id) && !isBlocked(s.id));
  const allSelected = selectable.length > 0 && selectable.every((s) => selectedIds.has(s.id));

  const toggle = (studentId: string) => {
    const next = new Set(selectedIds);
    if (next.has(studentId)) next.delete(studentId);
    else next.add(studentId);
    onSelectedIdsChange(next);
  };

  const toggleAll = () => {
    const next = new Set(selectedIds);
    if (allSelected) selectable.forEach((s) => next.delete(s.id));
    else selectable.forEach((s) => next.add(s.id));
    onSelectedIdsChange(next);
  };

  return (
    <Card className={cn("rounded-2xl p-3 gap-2.5 border shadow-2xs", className)}>
      <div className="flex items-center gap-2 flex-wrap">
        <Select
          value={selectedClass}
          onValueChange={(val) => {
            if (!val) return;
            setPickedClass(val);
            setSelectedSection("All");
          }}
        >
          <SelectTrigger size="sm" className="w-auto min-w-28">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {eligibleClasses.map((c) => (
              <SelectItem key={c} value={c}>
                Class {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={selectedSection} onValueChange={(val) => setSelectedSection(val || "All")}>
          <SelectTrigger size="sm" className="w-auto min-w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="All">All Sections</SelectItem>
            {sectionOptions.map((sec) => (
              <SelectItem key={sec} value={sec}>
                Section {sec}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {eventGender && eventGender !== "All" && (
          <span
            className={cn(
              "h-8 px-2.5 rounded-xl text-[11px] font-bold flex items-center",
              eventGender === "Boys"
                ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                : "bg-pink-500/10 text-pink-600 dark:text-pink-400"
            )}
          >
            {GENDER_LABEL[eventGender]}
          </span>
        )}
      </div>

      <SearchInput value={searchQuery} onChange={setSearchQuery} placeholder="Search name or roll..." size="sm" />

      <div className="flex items-center justify-between text-xs px-1">
        <label className="flex items-center gap-2 font-semibold cursor-pointer select-none">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={toggleAll}
            disabled={selectable.length === 0}
            className="h-4 w-4 rounded-md accent-primary"
          />
          Select all ({selectable.length})
        </label>
        <label className="flex items-center gap-1.5 text-muted-foreground cursor-pointer select-none">
          <input
            type="checkbox"
            checked={hideEnrolled}
            onChange={(e) => setHideEnrolled(e.target.checked)}
            className="h-3.5 w-3.5 accent-primary"
          />
          Hide enrolled
        </label>
      </div>

      <div className="h-[52vh] min-h-[320px] lg:h-[520px] overflow-y-auto border rounded-xl divide-y custom-scrollbar">
        {isLoading ? (
          <div className="p-8 text-center text-xs text-muted-foreground">Loading...</div>
        ) : filteredStudents.length === 0 ? (
          <EmptyState compact title="No students found." />
        ) : (
          filteredStudents.map((s) => {
            const isEnrolled = enrolledStudentIds.has(s.id);
            const isSelected = selectedIds.has(s.id);
            const registeredCount = studentEventCounts[s.id] || 0;
            const isLimitReached = limit > 0 && registeredCount >= limit;
            const isStrictBlocked = !isEnrolled && isBlocked(s.id);

            return (
              <div
                key={s.id}
                onClick={() => !isEnrolled && !isStrictBlocked && toggle(s.id)}
                className={cn(
                  "flex items-center justify-between gap-2 px-3 py-2.5 text-xs transition-colors select-none",
                  isEnrolled
                    ? "bg-muted/20 opacity-60 cursor-not-allowed"
                    : isStrictBlocked
                    ? "bg-rose-500/5 opacity-50 cursor-not-allowed"
                    : isSelected
                    ? "bg-primary/10 cursor-pointer"
                    : "hover:bg-muted/40 cursor-pointer"
                )}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <input
                    type="checkbox"
                    checked={isSelected || isEnrolled}
                    disabled={isEnrolled || isStrictBlocked}
                    onChange={() => {}}
                    className="h-4 w-4 rounded-md accent-primary shrink-0 pointer-events-none"
                  />
                  <span className="font-mono font-bold w-7 text-muted-foreground shrink-0">#{s.presentRoll}</span>
                  <div className="min-w-0">
                    <p className="font-bold truncate">{s.name}</p>
                    <span className="text-[10px] text-muted-foreground">
                      {s.presentClass}-{s.presentSection} • {s.gender}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {limit > 0 && !isEnrolled && registeredCount > 0 && (
                    <span
                      title="Games already joined"
                      className={cn(
                        "text-[10px] font-mono px-1.5 py-0.5 rounded-md",
                        isLimitReached
                          ? config.enforcementMode === "strict"
                            ? "bg-rose-500/15 text-rose-700 dark:text-rose-300 font-bold"
                            : "bg-amber-500/15 text-amber-700 dark:text-amber-300 font-bold"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {registeredCount}/{limit}
                    </span>
                  )}
                  {isEnrolled ? (
                    <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-bold">
                      Enrolled
                    </Badge>
                  ) : isStrictBlocked ? (
                    <Badge variant="destructive" className="text-[10px] font-bold">
                      Max
                    </Badge>
                  ) : null}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Sticky action bar */}
      <div className="sticky bottom-0 -mx-3 -mb-3 px-3 py-2.5 border-t bg-card flex items-center justify-between gap-2">
        {selectedIds.size > 0 ? (
          <button
            onClick={() => onSelectedIdsChange(new Set())}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
            Clear {selectedIds.size}
          </button>
        ) : (
          <span className="text-xs text-muted-foreground">Tap students to select</span>
        )}
        <Button
          onClick={onEnroll}
          disabled={selectedIds.size === 0 || isEnrolling}
          className="h-9 text-xs font-bold gap-1.5 rounded-xl shadow-2xs"
        >
          <UserCheck className="h-3.5 w-3.5" />
          {isEnrolling ? "Enrolling..." : `Enroll ${selectedIds.size || ""}`.trim()}
        </Button>
      </div>
    </Card>
  );
}
