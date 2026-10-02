"use client";

import React from "react";
import { RoutineSettings } from "@/lib/routine/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Check,
  X,
  AlertTriangle,
  SlidersHorizontal,
  BookOpen,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface TeacherEditorFormProps {
  isSubmitting: boolean;
  editingTeacherId: string | null;
  teacherName: string;
  shortName: string;
  primarySubject: string;
  customPrimarySubject: string;
  classTeacherOf: string;
  classTeacherFirstPeriods: number;
  maxPeriods: number;
  selectedClasses: string[];
  classSubjectsMap: Record<string, string[]>;
  sectionSubjectsMap: Record<string, string[]>;
  classSectionsMap: Record<string, string[]>;
  classPeriodsMap: Record<string, number>;
  activeSectionTab: Record<string, string>;
  availSlots: Record<number, number[]>;
  presetClasses: any[];
  staffList: { id: string; full_name: string; designation?: string }[];
  selectableStaffList: { id: string; full_name: string; designation?: string }[];
  unaddedStaff: { id: string; full_name: string; designation?: string }[];
  selectedStaffId: string;
  selectedStaffLabel: string;
  availableSubjectOptions: string[];
  availableClassOptions: { id: string; label: string; className: string; section: string }[];
  currentClassTeacherMap: Record<string, { id: string; name: string }>;
  conflictTeacher: { id: string; name: string } | null;
  classSubjectsDictionary: Record<string, string[]>;
  settings: RoutineSettings;
  onSave: (e: React.FormEvent) => void;
  onCancel: () => void;
  onStaffDropdownChange: (staffId: string) => void;
  onCustomNameChange: (name: string) => void;
  setShortName: (shortName: string) => void;
  setPrimarySubject: (val: string) => void;
  setCustomPrimarySubject: (val: string) => void;
  setClassTeacherOf: (val: string) => void;
  setClassTeacherFirstPeriods: (val: number) => void;
  setMaxPeriods: (val: number) => void;
  onToggleClass: (clsName: string) => void;
  onToggleSubjectForSection: (clsName: string, sec: string, subName: string) => void;
  onToggleAllSubjectsForSection: (clsName: string, sec: string) => void;
  onSubjectPeriodChange: (clsName: string, sec: string, subName: string, val: string) => void;
  onSetActiveSectionTab: (clsName: string, sec: string) => void;
  onSelectSection: (clsName: string, sec: string) => void;
  onTogglePeriod: (dayIdx: number, p: number) => void;
  onSetPreset: (dayIdx: number, type: "all" | "morning" | "afternoon" | "none") => void;
  getClassSections: (clsName: string) => string[];
  getSectionSubjects: (clsName: string, sec: string) => string[];
  getSubjectPeriod: (clsName: string, sec: string, subName: string) => number;
  getSubjectAllocationStats: (clsName: string, sec: string, subName: string) => {
    totalDemand: number;
    otherAssigned: number;
    remaining: number;
    isFullyBooked: boolean;
    otherTeachers: { teacherName: string; shortName: string; periods: number }[];
  };
  calculateSectionTotalPeriods: (clsName: string, sec: string) => number;
}

export function TeacherEditorForm({
  isSubmitting,
  editingTeacherId,
  teacherName,
  shortName,
  primarySubject,
  customPrimarySubject,
  classTeacherOf,
  classTeacherFirstPeriods,
  maxPeriods,
  selectedClasses,
  classSubjectsMap,
  classSectionsMap,
  classPeriodsMap,
  activeSectionTab,
  availSlots,
  presetClasses,
  staffList,
  selectableStaffList,
  unaddedStaff,
  selectedStaffId,
  selectedStaffLabel,
  availableSubjectOptions,
  availableClassOptions,
  currentClassTeacherMap,
  conflictTeacher,
  classSubjectsDictionary,
  settings,
  onSave,
  onCancel,
  onStaffDropdownChange,
  onCustomNameChange,
  setShortName,
  setPrimarySubject,
  setCustomPrimarySubject,
  setClassTeacherOf,
  setClassTeacherFirstPeriods,
  setMaxPeriods,
  onToggleClass,
  onToggleSubjectForSection,
  onToggleAllSubjectsForSection,
  onSubjectPeriodChange,
  onSetActiveSectionTab,
  onSelectSection,
  onTogglePeriod,
  onSetPreset,
  getClassSections,
  getSectionSubjects,
  getSubjectPeriod,
  getSubjectAllocationStats,
  calculateSectionTotalPeriods,
}: TeacherEditorFormProps) {
  return (
    <form
      onSubmit={onSave}
      autoComplete="off"
      className="space-y-4"
    >
      <div className="flex items-center justify-between border-b pb-2.5">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-semibold tracking-tight text-foreground">
            {editingTeacherId && !unaddedStaff.some((s) => s.id === editingTeacherId)
              ? `Edit Faculty: ${teacherName}`
              : "Select & Configure Faculty Member"}
          </h2>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onCancel}
          aria-label="Close teacher editor"
          className="h-7 w-7 p-0"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Row 1: Teacher Selection & Initials (2 fields) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* 1. Saved Teacher Dropdown Selection */}
        <div className="space-y-1.5 sm:col-span-2">
          <Label className="text-xs font-semibold">Select Teacher from Staff *</Label>
          {staffList.length > 0 ? (
            <Select
              value={selectedStaffId}
              onValueChange={(val) => val && onStaffDropdownChange(val)}
            >
              <SelectTrigger className="h-8 text-xs font-medium bg-background" aria-label="Select teacher from staff">
                <SelectValue placeholder="Select Teacher">
                  {selectedStaffLabel}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {selectableStaffList.length > 0 ? (
                  selectableStaffList.map((s) => (
                    <SelectItem key={s.id} value={s.id} className="text-xs">
                      {s.full_name} {s.designation ? `(${s.designation})` : ""}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="__none__" disabled className="text-xs">
                    All School Staff Added
                  </SelectItem>
                )}
                <SelectItem value="__custom__" className="text-xs font-medium text-primary">
                  + Custom Teacher (Manual Name)
                </SelectItem>
              </SelectContent>
            </Select>
          ) : (
            <Input
              type="text"
              placeholder="e.g. Ananya Kayal"
              value={teacherName}
              onChange={(e) => onCustomNameChange(e.target.value)}
              className="h-8 text-xs font-medium"
              required
            />
          )}
        </div>

        {/* Custom Teacher Name field if __custom__ selected, else Initials */}
        {selectedStaffId === "__custom__" ? (
          <div className="space-y-1.5 sm:col-span-1">
            <Label className="text-xs font-semibold">Custom Teacher Name *</Label>
            <Input
              type="text"
              placeholder="Enter full name"
              value={teacherName}
              onChange={(e) => onCustomNameChange(e.target.value)}
              className="h-8 text-xs font-medium"
              required
            />
          </div>
        ) : (
          <div className="space-y-1.5 sm:col-span-1">
            <Label className="text-xs font-semibold">Short Code / Initials *</Label>
            <Input
              type="text"
              placeholder="e.g. AK, RM"
              maxLength={6}
              value={shortName}
              onChange={(e) => setShortName(e.target.value.toUpperCase())}
              className="h-8 text-xs font-mono font-bold uppercase"
              required
            />
          </div>
        )}
      </div>

      {/* Row 2: Primary Subject, Class Teacher Of, (1st Period Quota if CT), Max Periods / Week */}
      <div
        className={cn(
          "grid grid-cols-1 gap-3",
          classTeacherOf && classTeacherOf !== "__none__"
            ? "sm:grid-cols-2 lg:grid-cols-4"
            : "sm:grid-cols-3"
        )}
      >
        {/* 3. Primary Subject / Specialization */}
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold">Primary Subject</Label>
          <Select
            value={primarySubject || "__none__"}
            onValueChange={(val) => {
              if (!val || val === "__none__") {
                setPrimarySubject("");
              } else {
                setPrimarySubject(val);
              }
            }}
          >
            <SelectTrigger className="h-8 text-xs font-medium bg-background" aria-label="Select primary subject">
              <SelectValue placeholder="Select Subject">
                {primarySubject === "__custom__"
                  ? "Custom Subject..."
                  : primarySubject || "-- None / General --"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__" className="text-xs text-muted-foreground">
                -- None / General --
              </SelectItem>
              {availableSubjectOptions.map((subj) => (
                <SelectItem key={subj} value={subj} className="text-xs">
                  {subj}
                </SelectItem>
              ))}
              <SelectItem value="__custom__" className="text-xs font-medium text-primary">
                + Custom Subject...
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* 4. Class Teacher Assignment */}
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold">Class Teacher Of</Label>
          <Select
            value={classTeacherOf || "__none__"}
            onValueChange={(val) => setClassTeacherOf(val || "")}
          >
            <SelectTrigger className="h-8 text-xs bg-background font-medium" aria-label="Class teacher of">
              <SelectValue placeholder="Select Class">
                {classTeacherOf && classTeacherOf !== "__none__"
                  ? classTeacherOf
                  : "-- Not Assigned --"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__" className="text-xs text-muted-foreground">
                -- Not a Class Teacher --
              </SelectItem>
              {availableClassOptions.map((c) => {
                const ctInfo = currentClassTeacherMap[c.label];
                const isAnotherTeacher =
                  ctInfo &&
                  (!editingTeacherId || ctInfo.id !== editingTeacherId) &&
                  ctInfo.name.trim().toLowerCase() !== teacherName.trim().toLowerCase();
                const isCurrent =
                  ctInfo &&
                  ((editingTeacherId && ctInfo.id === editingTeacherId) ||
                    ctInfo.name.trim().toLowerCase() === teacherName.trim().toLowerCase());

                return (
                  <SelectItem key={c.id || c.label} value={c.label} className="text-xs">
                    <div className="flex items-center justify-between gap-2 w-full">
                      <span>{c.label}</span>
                      {isAnotherTeacher && (
                        <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium ml-1">
                          (CT: {ctInfo.name})
                        </span>
                      )}
                      {isCurrent && (
                        <span className="text-[10px] text-primary font-medium ml-1">
                          (Current)
                        </span>
                      )}
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>

        {/* 4b. 1st Period in CT Class (Only shown when Class Teacher is assigned) */}
        {classTeacherOf && classTeacherOf !== "__none__" && (
          <div className="space-y-1.5 animate-in fade-in duration-150">
            <Label className="text-xs font-semibold text-primary flex items-center justify-between">
              <span>CT 1st Periods / Wk</span>
              <span className="text-[10px] text-muted-foreground font-normal">(Default 3)</span>
            </Label>
            <Input
              type="number"
              min={1}
              max={6}
              value={classTeacherFirstPeriods}
              onChange={(e) => setClassTeacherFirstPeriods(parseInt(e.target.value, 10) || 1)}
              className="h-8 text-xs font-mono font-bold border-primary/40 bg-primary/5 focus:bg-background"
              required
            />
          </div>
        )}

        {/* 5. Max periods limit */}
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold">Max Periods / Week</Label>
          <Input
            type="number"
            min={1}
            max={48}
            value={maxPeriods}
            onChange={(e) => setMaxPeriods(parseInt(e.target.value, 10) || 24)}
            className="h-8 text-xs font-mono font-medium"
          />
        </div>
      </div>

      {/* Conflict Warning if class is already assigned to another teacher */}
      {conflictTeacher && (
        <div className="p-2.5 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs flex items-center gap-2 animate-in fade-in duration-150">
          <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <span>
            <strong>Warning:</strong> &quot;{classTeacherOf}&quot; is already assigned to <strong>{conflictTeacher.name}</strong> as Class Teacher. Saving will reassign this class to {teacherName || "this teacher"}.
          </span>
        </div>
      )}

      {/* Custom Subject Input if __custom__ selected */}
      {primarySubject === "__custom__" && (
        <div className="p-2.5 bg-muted/40 border rounded-md space-y-1 max-w-sm">
          <Label className="text-xs font-medium">Enter Custom Subject Name *</Label>
          <Input
            type="text"
            placeholder="e.g. Sanskrit, Statistics"
            value={customPrimarySubject}
            onChange={(e) => setCustomPrimarySubject(e.target.value)}
            className="h-8 text-xs bg-background"
            required
          />
        </div>
      )}

      {/* Class & Subject Eligibility Setup */}
      <div className="space-y-2.5 pt-1 border-t">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-primary" />
            <Label className="text-xs font-semibold text-foreground">
              Eligible Classes & Preset Subjects
            </Label>
          </div>
          <span className="text-[11px] text-muted-foreground font-medium">
            {selectedClasses.length} Classes Selected
          </span>
        </div>

        {/* Class Selection Pills */}
        <div className="flex flex-wrap gap-1.5 p-2 bg-muted/30 border rounded-lg">
          {presetClasses.map((c) => {
            const isSelected = selectedClasses.includes(c.name);
            const subCount = (classSubjectsMap[c.name] || []).length;
            const secCount = (classSectionsMap[c.name] || getClassSections(c.name)).length;
            const periodLoad = classPeriodsMap[c.name];
            return (
              <button
                key={c.name}
                type="button"
                onClick={() => onToggleClass(c.name)}
                aria-label={`Toggle class ${c.name}`}
                className={cn(
                  "px-2.5 py-1 rounded-md text-xs font-semibold border transition-all flex items-center gap-1.5 select-none",
                  isSelected
                    ? "bg-primary text-primary-foreground border-primary shadow-xs"
                    : "bg-background text-muted-foreground border-border hover:bg-muted/60"
                )}
              >
                <span>{c.name}</span>
                {isSelected && (
                  <Badge
                    variant="secondary"
                    className="text-[9px] px-1 py-0 bg-primary-foreground/20 text-primary-foreground border-transparent font-mono"
                  >
                    {secCount} Sec • {subCount} Sub {periodLoad ? `• ${periodLoad}p` : ""}
                  </Badge>
                )}
              </button>
            );
          })}
        </div>

        {/* Subject, Section & Period Panels for Each Selected Class */}
        {selectedClasses.length > 0 && (
          <div className="space-y-3 pt-1">
            {presetClasses
              .filter((c) => selectedClasses.includes(c.name))
              .map((c) => {
                const availableSubs = classSubjectsDictionary[c.name] || [];
                const allSecs = getClassSections(c.name);
                const selectedSecs = classSectionsMap[c.name] || allSecs;
                const allSecsSelected =
                  allSecs.length > 0 && selectedSecs.length === allSecs.length;
                const currentActiveSec =
                  activeSectionTab[c.name] || (allSecs.length > 1 ? "ALL" : allSecs[0] || "A");

                const classTotalPeriods = selectedSecs.reduce(
                  (sum, sec) => sum + calculateSectionTotalPeriods(c.name, sec),
                  0
                );

                return (
                  <div
                    key={c.name}
                    className="p-3 bg-card border rounded-lg space-y-3 shadow-xs"
                  >
                    {/* Class Header: Name & Auto Total Workload */}
                    <div className="flex items-center justify-between border-b pb-2">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className="font-bold text-xs text-foreground font-mono bg-background"
                        >
                          {c.name}
                        </Badge>
                        <span className="text-[11px] text-muted-foreground">
                          {selectedSecs.length} Active {selectedSecs.length === 1 ? "Section" : "Sections"}
                        </span>
                      </div>

                      <Badge
                        variant="secondary"
                        className="font-mono text-xs font-bold text-primary bg-primary/10 border-primary/20"
                      >
                        Class Total: {classTotalPeriods} p/wk
                      </Badge>
                    </div>

                    {/* Section Selection Bar & Switcher */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-foreground">
                          Configure Section ({c.name}):
                        </span>
                        <span className="text-[10px] text-muted-foreground font-mono">
                          Click to switch
                        </span>
                      </div>

                      {/* Clean Segmented Tab Buttons */}
                      <div className="flex flex-wrap gap-1.5 p-1 bg-muted/30 rounded-lg border">
                        {allSecs.length > 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              onSetActiveSectionTab(c.name, "ALL");
                              if (!allSecsSelected) {
                                onSelectSection(c.name, "ALL");
                              }
                            }}
                            aria-label={`Configure all sections for ${c.name}`}
                            className={cn(
                              "px-3 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer select-none",
                              currentActiveSec === "ALL"
                                ? "bg-primary text-primary-foreground shadow-xs font-bold ring-1 ring-primary/40"
                                : "bg-background text-foreground hover:bg-muted/80 border border-transparent hover:border-border"
                            )}
                          >
                            {currentActiveSec === "ALL" && (
                              <Check className="w-3.5 h-3.5 text-primary-foreground" />
                            )}
                            <span>All Sections</span>
                            <Badge
                              variant="secondary"
                              className={cn(
                                "text-[10px] font-mono px-1.5 py-0 font-bold",
                                currentActiveSec === "ALL"
                                  ? "bg-primary-foreground text-primary"
                                  : "bg-muted text-muted-foreground"
                              )}
                            >
                              {classTotalPeriods} p/wk
                            </Badge>
                          </button>
                        )}

                        {allSecs.map((sec) => {
                          const isFocused = currentActiveSec === sec;
                          const secLoad = calculateSectionTotalPeriods(c.name, sec);

                          return (
                            <button
                              key={sec}
                              type="button"
                              onClick={() => {
                                onSetActiveSectionTab(c.name, sec);
                                onSelectSection(c.name, sec);
                              }}
                              aria-label={`Configure section ${sec} for ${c.name}`}
                              className={cn(
                                "px-3 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer select-none",
                                isFocused
                                  ? "bg-primary text-primary-foreground shadow-xs font-bold ring-1 ring-primary/40"
                                  : "bg-background text-foreground hover:bg-muted/80 border border-transparent hover:border-border"
                              )}
                            >
                              {isFocused && (
                                <Check className="w-3.5 h-3.5 text-primary-foreground" />
                              )}
                              <span>Sec {sec}</span>
                              <Badge
                                variant="secondary"
                                className={cn(
                                  "text-[10px] font-mono px-1.5 py-0 font-bold",
                                  isFocused
                                    ? "bg-primary-foreground text-primary"
                                    : "bg-muted text-muted-foreground"
                                )}
                              >
                                {secLoad} p/wk
                              </Badge>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Subjects for the Active Section or All Sections */}
                    {selectedSecs.includes(currentActiveSec) || (currentActiveSec === "ALL" && selectedSecs.length > 0) ? (
                      <div className="space-y-2 pt-2 border-t bg-muted/15 -mx-3 -mb-3 p-3 rounded-b-lg">
                        <div className="flex flex-wrap items-center justify-between gap-1.5">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px] font-semibold text-foreground">
                              {currentActiveSec === "ALL" ? "Subjects for All Sections:" : `Subjects for Sec ${currentActiveSec}:`}
                            </span>
                            <Badge variant="outline" className="text-[10px] font-mono font-bold bg-background">
                              {getSectionSubjects(c.name, currentActiveSec).length} Selected • {currentActiveSec === "ALL" ? classTotalPeriods : calculateSectionTotalPeriods(c.name, currentActiveSec)} p/wk
                            </Badge>
                          </div>

                          <div className="flex items-center gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => onToggleAllSubjectsForSection(c.name, currentActiveSec)}
                              className="h-5 text-[10px] px-1.5 text-primary hover:bg-primary/10"
                            >
                              {getSectionSubjects(c.name, currentActiveSec).length === availableSubs.length &&
                              availableSubs.length > 0
                                ? "Deselect All"
                                : "Select All"}
                            </Button>
                          </div>
                        </div>

                        {/* Subject Pills with live quota breakdown and inline editable p/wk */}
                        <div className="flex flex-wrap gap-2 pt-0.5">
                          {availableSubs.length === 0 ? (
                            <span className="text-xs text-muted-foreground italic">
                              No subjects configured for this class in School Settings.
                            </span>
                          ) : (
                            availableSubs.map((sub) => {
                              const secSubs = getSectionSubjects(c.name, currentActiveSec);
                              const isSubActive = secSubs.includes(sub);
                              const subPeriod = getSubjectPeriod(c.name, currentActiveSec, sub);
                              const stats = getSubjectAllocationStats(c.name, currentActiveSec, sub);
                              const isOverflow = isSubActive && subPeriod > stats.remaining;
                              const overflowAmount = subPeriod - stats.remaining;

                              return (
                                <div
                                  key={sub}
                                  className={cn(
                                    "inline-flex flex-col sm:flex-row items-stretch sm:items-center rounded-lg border text-xs transition-all p-1 gap-1",
                                    isSubActive
                                      ? isOverflow
                                        ? "bg-card border-rose-500/60 shadow-2xs text-foreground ring-1 ring-rose-500/30"
                                        : "bg-card border-primary/50 shadow-2xs text-foreground ring-1 ring-primary/20"
                                      : "bg-muted/30 text-muted-foreground border-border hover:bg-muted/60"
                                  )}
                                >
                                  <button
                                    type="button"
                                    onClick={() =>
                                      onToggleSubjectForSection(c.name, currentActiveSec, sub)
                                    }
                                    aria-label={`Toggle subject ${sub}`}
                                    className={cn(
                                      "px-2 py-1 text-left font-medium flex items-center gap-1.5 select-none transition-colors",
                                      isSubActive ? "text-primary font-semibold" : "text-foreground/80 hover:text-foreground"
                                    )}
                                  >
                                    <div
                                      className={cn(
                                        "w-3.5 h-3.5 rounded-sm border flex items-center justify-center transition-colors shrink-0",
                                        isSubActive
                                          ? "bg-primary border-primary text-primary-foreground"
                                          : "border-muted-foreground/50 bg-background"
                                      )}
                                    >
                                      {isSubActive && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                                    </div>
                                    <div className="flex flex-col">
                                      <span className="font-semibold text-xs leading-tight">{sub}</span>
                                      <div className="flex items-center gap-1 mt-0.5">
                                        {stats.isFullyBooked ? (
                                          <span className="text-[9.5px] px-1 py-0 rounded bg-muted text-muted-foreground border border-border font-mono">
                                            Full ({stats.otherTeachers.map((t) => `${t.shortName}: ${t.periods}p`).join(", ")})
                                          </span>
                                        ) : stats.otherAssigned > 0 ? (
                                          <span className="text-[9.5px] px-1 py-0 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 font-mono">
                                            {stats.otherAssigned}/{stats.totalDemand} ({stats.otherTeachers.map((t) => `${t.shortName}:${t.periods}p`).join(",")}) • {stats.remaining} Rem
                                          </span>
                                        ) : (
                                          <span className="text-[9.5px] px-1 py-0 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-mono">
                                            0/{stats.totalDemand} • {stats.remaining} Free
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </button>

                                  {isSubActive && (
                                    <div className="flex items-center justify-between sm:justify-start gap-1.5 px-2 py-0.5 border-t sm:border-t-0 sm:border-l border-border/80 bg-muted/20 rounded">
                                      <div className="flex items-center gap-1">
                                        <Input
                                          type="number"
                                          min={1}
                                          max={20}
                                          value={subPeriod}
                                          onChange={(e) =>
                                            onSubjectPeriodChange(
                                              c.name,
                                              currentActiveSec,
                                              sub,
                                              e.target.value
                                            )
                                          }
                                          className={cn(
                                            "h-6 w-11 text-[11px] font-mono font-bold px-1 text-center bg-background",
                                            isOverflow
                                              ? "border-rose-500 text-rose-500 focus:ring-rose-500"
                                              : "border-primary/40 text-foreground"
                                          )}
                                          title={`Weekly periods for ${sub}${currentActiveSec === "ALL" ? " across all sections" : ` in Sec ${currentActiveSec}`}`}
                                          aria-label={`Weekly periods for ${sub}`}
                                        />
                                        <span className="text-[10px] text-muted-foreground font-mono font-medium">
                                          p/wk
                                        </span>
                                      </div>

                                      {isOverflow && (
                                        <Badge
                                          variant="destructive"
                                          className="text-[9px] px-1 py-0 gap-0.5 bg-rose-500/15 text-rose-500 border border-rose-500/30 hover:bg-rose-500/20 font-bold"
                                          title="Assigned periods exceed remaining unallocated demand"
                                        >
                                          <AlertTriangle className="w-2.5 h-2.5" />
                                          +{overflowAmount} Over
                                        </Badge>
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="p-2.5 bg-muted/20 border border-dashed rounded text-center text-xs text-muted-foreground">
                        Select a section above to configure its subjects and weekly period load.
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        )}
      </div>

      <div className="flex justify-end gap-2 pt-2 border-t">
        <Button type="button" variant="outline" size="sm" onClick={onCancel} className="h-8 text-xs">
          Cancel
        </Button>
        <Button
          type="submit"
          size="sm"
          disabled={isSubmitting || !teacherName.trim()}
          className="h-8 text-xs font-semibold px-4"
        >
          <Check className="h-3.5 w-3.5 mr-1.5" />
          Save Teacher & Qualifications
        </Button>
      </div>
    </form>
  );
}
