"use client";

import React, { useState, useMemo, useEffect } from "react";
import { RoutineSubject, RoutineClass } from "@/lib/routine/types";
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
  Plus,
  Edit2,
  Trash2,
  Check,
  X,
  BookOpen,
  Sparkles,
  FlaskConical,
  Clock,
  School,
  Layers,
  ArrowRight,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  getDynamicClassList,
  FALLBACK_CLASSES,
  getClassNumericRank,
  getDatabaseSubjectsForClass,
} from "@/lib/ems/ems-config-loader";

interface RoutineSubjectsTabProps {
  subjects: RoutineSubject[];
  classes?: RoutineClass[];
  onSaveSubject: (subj: {
    id?: string;
    name: string;
    className?: string | null;
    classId?: string | null;
    isHard?: boolean;
    isLab?: boolean;
    timePref?: "any" | "morning" | "afternoon";
    allowMultiplePerDay?: boolean;
    maxPerDay?: number | null;
    periodsPerWeek?: number | null;
  }) => Promise<void>;
  onDeleteSubject: (id: string) => Promise<void>;
}

export function RoutineSubjectsTab({
  subjects,
  classes = [],
  onSaveSubject,
  onDeleteSubject,
}: RoutineSubjectsTabProps) {
  // Available distinct classes sorted in standard grade sequence
  const availableClasses = useMemo(() => {
    if (classes.length > 0) {
      const distinctNames = Array.from(new Set(classes.map((c) => c.className)));
      return distinctNames.sort((a, b) => getClassNumericRank(a) - getClassNumericRank(b));
    }
    const dynamicList = getDynamicClassList();
    const list = dynamicList && dynamicList.length > 0 ? dynamicList : FALLBACK_CLASSES;
    return list
      .map((c) => c.name)
      .sort((a, b) => getClassNumericRank(a) - getClassNumericRank(b));
  }, [classes]);

  // Active Class Tab Selection (e.g. "Class V", "Class VI", etc. or "all")
  const [activeClass, setActiveClass] = useState<string>(availableClasses[0] || "Class V");

  // Keep activeClass synchronized when classes change
  useEffect(() => {
    if (
      availableClasses.length > 0 &&
      activeClass !== "all" &&
      !availableClasses.includes(activeClass)
    ) {
      setActiveClass(availableClasses[0]);
    }
  }, [availableClasses, activeClass]);

  // Form State
  const [name, setName] = useState("");
  const [periodsPerWeek, setPeriodsPerWeek] = useState<number>(5);
  const [isLab, setIsLab] = useState(false);
  const [timePref, setTimePref] = useState<"any" | "morning" | "afternoon">("any");
  const [allowMulti, setAllowMulti] = useState(false);
  const [maxPerDay, setMaxPerDay] = useState<number>(2);
  const [editId, setEditId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Target class for form creation
  const targetClassForForm = activeClass === "all" ? availableClasses[0] || "Class V" : activeClass;

  // Preset subjects for the currently active class
  const activeClassPresets = useMemo(() => {
    if (activeClass === "all") return [];
    return getDatabaseSubjectsForClass(activeClass);
  }, [activeClass]);

  // Number of configured subjects per class
  const classSubjectCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    availableClasses.forEach((cls) => {
      const clsLower = cls.toLowerCase();
      const presets = new Set(getDatabaseSubjectsForClass(cls).map((sub) => sub.toLowerCase()));
      const count = subjects.filter(
        (s) =>
          (s.className && s.className.toLowerCase() === clsLower) ||
          (!s.className && presets.has(s.name.toLowerCase()))
      ).length;
      counts[cls] = count;
    });
    return counts;
  }, [subjects, availableClasses]);

  // Filtered subjects for the active class view
  const currentClassSubjects = useMemo(() => {
    if (activeClass === "all") return subjects;
    const clsLower = activeClass.toLowerCase();
    const presets = new Set(getDatabaseSubjectsForClass(activeClass).map((sub) => sub.toLowerCase()));
    return subjects.filter(
      (s) =>
        (s.className && s.className.toLowerCase() === clsLower) ||
        (!s.className && presets.has(s.name.toLowerCase()))
    );
  }, [subjects, activeClass]);

  // Handle choosing a preset subject chip
  const handleSelectPresetChip = (subName: string) => {
    setName(subName);
    const lower = subName.toLowerCase();
    if (lower.includes("lab") || lower.includes("practical")) {
      setIsLab(true);
      setPeriodsPerWeek(2);
    } else if (lower.includes("physical education") || lower.includes("work education")) {
      setIsLab(false);
      setPeriodsPerWeek(2);
    } else {
      setIsLab(false);
      setPeriodsPerWeek(5);
    }
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    try {
      await onSaveSubject({
        id: editId || undefined,
        name: name.trim(),
        className: targetClassForForm,
        isHard: false,
        isLab,
        timePref,
        allowMultiplePerDay: allowMulti,
        maxPerDay: allowMulti ? Number(maxPerDay) || 2 : 1,
        periodsPerWeek: Number(periodsPerWeek) || 5,
      });
      setName("");
      setPeriodsPerWeek(5);
      setIsLab(false);
      setTimePref("any");
      setAllowMulti(false);
      setMaxPerDay(2);
      setEditId(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Auto-Sync Preset Subjects for Active Class
  const handleSyncActiveClass = async () => {
    if (activeClass === "all") {
      await handleSyncAllClasses();
      return;
    }

    const clsLower = activeClass.toLowerCase();
    const existing = new Set(
      subjects
        .filter((s) => !s.className || s.className.toLowerCase() === clsLower)
        .map((s) => s.name.trim().toLowerCase())
    );

    const presets = getDatabaseSubjectsForClass(activeClass);
    const toAdd = presets.filter((p) => !existing.has(p.trim().toLowerCase()));

    if (toAdd.length === 0) return;

    setIsSyncing(true);
    try {
      for (const subName of toAdd) {
        const lower = subName.toLowerCase();
        const isLabSubject = lower.includes("lab") || lower.includes("practical");
        const isLightSub = lower.includes("physical education") || lower.includes("work education");
        await onSaveSubject({
          name: subName,
          className: activeClass,
          isHard: false,
          isLab: isLabSubject,
          timePref: "any",
          allowMultiplePerDay: false,
          maxPerDay: 1,
          periodsPerWeek: isLabSubject || isLightSub ? 2 : 5,
        });
      }
    } finally {
      setIsSyncing(false);
    }
  };

  // Auto-Sync All Classes Presets
  const handleSyncAllClasses = async () => {
    const existingKeys = new Set(
      subjects.map((s) => `${(s.className || "").toLowerCase()}::${s.name.trim().toLowerCase()}`)
    );

    const toAdd: { className: string; subjectName: string }[] = [];
    availableClasses.forEach((cls) => {
      const subs = getDatabaseSubjectsForClass(cls);
      subs.forEach((sub) => {
        const key = `${cls.toLowerCase()}::${sub.trim().toLowerCase()}`;
        if (!existingKeys.has(key)) {
          toAdd.push({ className: cls, subjectName: sub.trim() });
          existingKeys.add(key);
        }
      });
    });

    if (toAdd.length === 0) return;

    setIsSyncing(true);
    try {
      for (const item of toAdd) {
        const lower = item.subjectName.toLowerCase();
        const isLabSubject = lower.includes("lab") || lower.includes("practical");
        const isLightSub = lower.includes("physical education") || lower.includes("work education");
        await onSaveSubject({
          name: item.subjectName,
          className: item.className,
          isHard: false,
          isLab: isLabSubject,
          timePref: "any",
          allowMultiplePerDay: false,
          maxPerDay: 1,
          periodsPerWeek: isLabSubject || isLightSub ? 2 : 5,
        });
      }
    } finally {
      setIsSyncing(false);
    }
  };

  const handleEdit = (s: RoutineSubject) => {
    setEditId(s.id);
    setName(s.name);
    setPeriodsPerWeek(s.periodsPerWeek || (s.isLab ? 2 : 5));
    if (s.className && availableClasses.includes(s.className)) {
      setActiveClass(s.className);
    }
    setIsLab(s.isLab);
    setTimePref(s.timePref || "any");
    setAllowMulti(s.allowMultiplePerDay);
    setMaxPerDay(s.maxPerDay && s.maxPerDay >= 2 ? s.maxPerDay : 2);
  };

  const handleCancel = () => {
    setEditId(null);
    setName("");
    setPeriodsPerWeek(5);
    setIsLab(false);
    setTimePref("any");
    setAllowMulti(false);
    setMaxPerDay(2);
  };

  return (
    <div className="space-y-4 w-full">
      {/* 1. Class Segmented Switcher Tabs */}
      <div className="bg-card border rounded-lg p-2.5 shadow-xs">
        <div className="flex items-center justify-between gap-2 pb-2 mb-2 border-b">
          <div className="flex items-center gap-2">
            <School className="w-4 h-4 text-primary" />
            <span className="text-xs font-bold text-foreground">Select Class to Manage Curriculum</span>
          </div>

          <div className="flex items-center gap-1.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleSyncAllClasses}
              disabled={isSyncing || isSubmitting}
              className="h-7 text-xs font-medium gap-1 text-muted-foreground hover:text-foreground"
            >
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              <span>Auto-Sync All Classes</span>
            </Button>
          </div>
        </div>

        {/* Horizontal Class Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {availableClasses.map((cls) => {
            const isActive = activeClass === cls;
            const count = classSubjectCounts[cls] || 0;
            return (
              <button
                key={cls}
                type="button"
                onClick={() => {
                  setActiveClass(cls);
                  if (editId) handleCancel();
                }}
                className={cn(
                  "px-3 py-1.5 rounded-md flex items-center gap-2 whitespace-nowrap transition-all select-none border text-xs font-semibold",
                  isActive
                    ? "bg-primary text-primary-foreground border-primary shadow-xs font-bold"
                    : "bg-background text-muted-foreground border-border hover:bg-muted/70 hover:text-foreground"
                )}
              >
                <span>{cls}</span>
                <Badge
                  variant={isActive ? "secondary" : "outline"}
                  className={cn(
                    "text-[10px] px-1.5 py-0 font-mono font-bold leading-tight",
                    isActive
                      ? "bg-primary-foreground/20 text-primary-foreground border-transparent"
                      : count > 0
                      ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-300"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {count}
                </Badge>
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => {
              setActiveClass("all");
              if (editId) handleCancel();
            }}
            className={cn(
              "px-3 py-1.5 rounded-md flex items-center gap-2 whitespace-nowrap transition-all select-none border text-xs font-semibold",
              activeClass === "all"
                ? "bg-primary text-primary-foreground border-primary shadow-xs font-bold"
                : "bg-background text-muted-foreground border-border hover:bg-muted/70 hover:text-foreground"
            )}
          >
            <span>All Classes</span>
            <Badge
              variant={activeClass === "all" ? "secondary" : "outline"}
              className={cn(
                "text-[10px] px-1.5 py-0 font-mono font-bold leading-tight",
                activeClass === "all"
                  ? "bg-primary-foreground/20 text-primary-foreground border-transparent"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {subjects.length}
            </Badge>
          </button>
        </div>
      </div>

      {/* 2. Active Class Configurator Form */}
      <form onSubmit={handleSubmit} autoComplete="off" className="bg-card border rounded-lg p-4 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-2.5">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold tracking-tight text-foreground">
              {editId
                ? `Edit Subject for ${targetClassForForm}`
                : `Configure Subject for ${targetClassForForm}`}
            </h2>
          </div>

          {activeClass !== "all" && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleSyncActiveClass}
              disabled={isSyncing || isSubmitting}
              className="h-7 text-xs font-semibold gap-1.5 border-primary/30 text-primary hover:bg-primary/5"
            >
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              {isSyncing ? "Syncing..." : `Auto-Sync ${activeClass} Presets`}
            </Button>
          )}
        </div>

        {/* Preset Subject Chips for Active Class */}
        {activeClass !== "all" && (
          <div className="p-3 bg-muted/25 border rounded-md space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-foreground">
                {activeClass} Curriculum Presets
              </span>
              <span className="text-[11px] text-muted-foreground font-medium">
                Click chip to load
              </span>
            </div>

            <div className="flex flex-wrap gap-1.5 items-center">
              {activeClassPresets.length === 0 ? (
                <span className="text-xs text-muted-foreground italic">
                  No preset subjects configured for {activeClass}.
                </span>
              ) : (
                activeClassPresets.map((sub) => {
                  const isAlreadyAdded = currentClassSubjects.some(
                    (s) => s.name.trim().toLowerCase() === sub.trim().toLowerCase()
                  );
                  const isCurrent = name.trim().toLowerCase() === sub.trim().toLowerCase();

                  return (
                    <button
                      key={sub}
                      type="button"
                      onClick={() => handleSelectPresetChip(sub)}
                      className={cn(
                        "px-2.5 py-1 rounded text-xs font-medium border transition-all select-none flex items-center gap-1",
                        isCurrent
                          ? "bg-primary text-primary-foreground border-primary shadow-2xs font-semibold"
                          : isAlreadyAdded
                          ? "bg-muted/50 text-muted-foreground/80 border-border hover:bg-muted"
                          : "bg-background text-foreground border-border hover:border-primary/50 hover:bg-primary/5"
                      )}
                    >
                      {isCurrent && <Check className="w-3 h-3 text-primary-foreground" />}
                      <span>{sub}</span>
                      {isAlreadyAdded && !isCurrent && (
                        <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-mono">
                          (Added)
                        </span>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Form Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5 items-end">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Subject Name *</Label>
            <Input
              type="text"
              placeholder="e.g. Mathematics, Bengali, Science"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-9 text-xs font-medium"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Periods / Week *</Label>
            <Input
              type="number"
              min={1}
              max={18}
              value={periodsPerWeek}
              onChange={(e) => setPeriodsPerWeek(parseInt(e.target.value, 10) || 1)}
              className="h-9 text-xs font-mono font-semibold"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Period Format</Label>
            <Select
              value={isLab ? "lab" : "single"}
              onValueChange={(val) => setIsLab(val === "lab")}
            >
              <SelectTrigger className="h-9 text-xs font-medium bg-background">
                <SelectValue placeholder="Period Format">
                  {isLab ? "Practical Lab (2 Consec. Slots)" : "Single Period (1 Slot)"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="single" className="text-xs">
                  Single Period (1 Slot)
                </SelectItem>
                <SelectItem value="lab" className="text-xs">
                  Practical Lab (2 Consec. Slots)
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Time Window Preference</Label>
            <Select
              value={timePref}
              onValueChange={(val) => val && setTimePref(val as "any" | "morning" | "afternoon")}
            >
              <SelectTrigger className="h-9 text-xs font-medium bg-background">
                <SelectValue placeholder="Time Window">
                  {timePref === "morning"
                    ? "Morning Preference (Before Tiffin)"
                    : timePref === "afternoon"
                    ? "Afternoon Preference (After Tiffin)"
                    : "Flexible (Anytime during the day)"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any" className="text-xs">
                  Flexible (Anytime during the day)
                </SelectItem>
                <SelectItem value="morning" className="text-xs">
                  Morning Preference (Before Tiffin)
                </SelectItem>
                <SelectItem value="afternoon" className="text-xs">
                  Afternoon Preference (After Tiffin)
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Multi-Period Day Policy with Numeric Max Limit */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2.5 border-t">
          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 text-xs font-medium cursor-pointer select-none">
              <input
                type="checkbox"
                checked={allowMulti}
                onChange={(e) => setAllowMulti(e.target.checked)}
                className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
              />
              <span>Allow multiple periods in the same day for {targetClassForForm}</span>
            </label>

            {allowMulti && (
              <div className="flex items-center gap-2 pl-2 border-l border-border">
                <Label className="text-xs font-medium text-foreground whitespace-nowrap">
                  Max Periods / Day:
                </Label>
                <div className="w-28">
                  <Select
                    value={String(maxPerDay)}
                    onValueChange={(val) => setMaxPerDay(Number(val) || 2)}
                  >
                    <SelectTrigger className="h-7 text-xs font-semibold bg-background">
                      <SelectValue placeholder="Limit">{maxPerDay} Periods</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2" className="text-xs">
                        2 Periods / day
                      </SelectItem>
                      <SelectItem value="3" className="text-xs">
                        3 Periods / day
                      </SelectItem>
                      <SelectItem value="4" className="text-xs">
                        4 Periods / day
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {editId && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCancel}
                className="h-8 text-xs px-3"
              >
                <X className="h-3.5 w-3.5 mr-1" />
                Cancel
              </Button>
            )}
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting || !name.trim()}
              className="h-8 text-xs font-semibold px-4"
            >
              {editId ? (
                <>
                  <Check className="h-3.5 w-3.5 mr-1.5" />
                  Save Changes
                </>
              ) : (
                <>
                  <Plus className="h-3.5 w-3.5 mr-1.5" />
                  Add to {targetClassForForm}
                </>
              )}
            </Button>
          </div>
        </div>
      </form>

      {/* 3. Subjects Table for Active Class */}
      <div className="bg-card border rounded-lg shadow-xs overflow-hidden">
        <div className="px-4 py-2.5 bg-muted/40 border-b flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-foreground">
              {activeClass === "all"
                ? "All Configured Subjects"
                : `${activeClass} Curriculum Subjects`}
            </span>
            <Badge variant="secondary" className="text-[10px] font-mono font-bold">
              {currentClassSubjects.length} Subjects
            </Badge>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-muted/20 border-b text-muted-foreground font-semibold">
                <th className="py-2.5 px-4">Subject Name</th>
                {activeClass === "all" && <th className="py-2.5 px-4">Class</th>}
                <th className="py-2.5 px-4">Weekly Load</th>
                <th className="py-2.5 px-4">Period Format</th>
                <th className="py-2.5 px-4">Time Preference</th>
                <th className="py-2.5 px-4">Daily Policy</th>
                <th className="py-2.5 px-4 text-right w-20">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {currentClassSubjects.length === 0 ? (
                <tr>
                  <td
                    colSpan={activeClass === "all" ? 7 : 6}
                    className="py-8 text-center text-muted-foreground"
                  >
                    <BookOpen className="w-6 h-6 mx-auto mb-1 opacity-40" />
                    <span>
                      {activeClass === "all"
                        ? "No subjects created yet."
                        : `No subjects configured yet for ${activeClass}. Click 'Auto-Sync ${activeClass} Presets' above.`}
                    </span>
                  </td>
                </tr>
              ) : (
                currentClassSubjects.map((s) => (
                  <tr key={s.id} className="hover:bg-muted/30 transition-colors">
                    <td className="py-2.5 px-4 font-semibold text-foreground">{s.name}</td>
                    {activeClass === "all" && (
                      <td className="py-2.5 px-4">
                        <Badge variant="outline" className="text-[10px] font-semibold bg-background">
                          {s.className || "All Classes"}
                        </Badge>
                      </td>
                    )}
                    <td className="py-2.5 px-4 font-mono font-semibold text-foreground">
                      <Badge variant="secondary" className="text-[10px] font-mono font-bold">
                        {s.periodsPerWeek || 5} p/wk
                      </Badge>
                    </td>
                    <td className="py-2.5 px-4">
                      {s.isLab ? (
                        <Badge
                          variant="secondary"
                          className="text-[10px] bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-200 gap-1 font-medium"
                        >
                          <FlaskConical className="w-2.5 h-2.5 text-blue-600" />
                          Lab (Double Slot)
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-[11px]">Single Slot</span>
                      )}
                    </td>
                    <td className="py-2.5 px-4 capitalize text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3 opacity-60" />
                        <span>
                          {s.timePref === "morning"
                            ? "Morning Preference"
                            : s.timePref === "afternoon"
                            ? "Afternoon Preference"
                            : "Flexible"}
                        </span>
                      </div>
                    </td>
                    <td className="py-2.5 px-4 text-muted-foreground">
                      {s.allowMultiplePerDay ? (
                        <Badge
                          variant="outline"
                          className="text-[10px] bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-200 font-semibold"
                        >
                          Max {s.maxPerDay || 2} / Day
                        </Badge>
                      ) : (
                        <span className="text-[11px]">Max 1 / Day</span>
                      )}
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(s)}
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onDeleteSubject(s.id)}
                          className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
