"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { RoutineClass, RoutineSettings } from "@/lib/routine/types";
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
  Trash2,
  Check,
  School,
  Sparkles,
  Layers,
  CheckCheck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { getDynamicClassList, FALLBACK_CLASSES, getClassNumericRank } from "@/lib/ems/ems-config-loader";
import { isHsClass, parseSectionAndStream, formatSectionAndStream } from "@/lib/routine/routine-helpers";

interface RoutineClassesTabProps {
  classes: RoutineClass[];
  settings?: RoutineSettings;
  onSaveClass: (cls: { id?: string; className: string; section: string; dailyPeriods?: number | null }) => Promise<void>;
  onBatchSaveClasses?: (classesList: { id?: string; className: string; section: string; dailyPeriods?: number | null }[]) => Promise<void>;
  onDeleteClass: (id: string) => Promise<void>;
}

interface PresetClassItem {
  className: string;
  section: string;
  stream: string;
}

export function RoutineClassesTab({
  classes,
  settings,
  onSaveClass,
  onBatchSaveClasses,
  onDeleteClass,
}: RoutineClassesTabProps) {
  // Dynamic School Presets State
  const [presetClassesList, setPresetClassesList] = useState<ReturnType<typeof getDynamicClassList>>([]);

  useEffect(() => {
    const list = getDynamicClassList();
    setPresetClassesList(list && list.length > 0 ? list : FALLBACK_CLASSES);
  }, []);

  // Calculate Max weekly periods/classes for a class based on active schedule
  const calculateWeeklyPeriods = useCallback(
    (dailyP: number | null | undefined): number => {
      const globalP = settings?.periodsPerDay || 8;
      const dp = dailyP && dailyP > 0 ? dailyP : globalP;
      const workingDays = settings?.workingDays || [0, 1, 2, 3, 4, 5];
      const halfDays = settings?.halfDays || [5];
      const halfDayPeriods = settings?.halfDayPeriods || 4;

      let total = 0;
      workingDays.forEach((d) => {
        if (halfDays.includes(d)) {
          total += Math.min(dp, halfDayPeriods);
        } else {
          total += dp;
        }
      });
      return total;
    },
    [settings]
  );

  // Compute all preset combinations for each class
  const allPresetItems: PresetClassItem[] = React.useMemo(() => {
    const list = presetClassesList.length > 0 ? presetClassesList : FALLBACK_CLASSES;
    const items: PresetClassItem[] = [];

    list.forEach((c) => {
      const isHs = isHsClass(c.name, c.code);
      const secs = c.sections && c.sections.length > 0 ? c.sections : ["A", "B"];

      if (isHs) {
        const streams = ["Science", "Arts", "Commerce"];
        secs.forEach((s) => {
          streams.forEach((str) => {
            items.push({ className: c.name, section: s, stream: str });
          });
        });
      } else {
        secs.forEach((s) => {
          items.push({ className: c.name, section: s, stream: "General" });
        });
      }
    });

    return items;
  }, [presetClassesList]);

  // Check if a preset item is already configured in `classes`
  const isItemAdded = React.useCallback(
    (item: PresetClassItem) => {
      const targetSec = item.section.trim().toLowerCase();
      const targetStr = item.stream.trim().toLowerCase();
      const targetClass = item.className.trim().toLowerCase();

      return classes.some((c) => {
        if (c.className.trim().toLowerCase() !== targetClass) return false;
        const parsed = parseSectionAndStream(c.section);
        return (
          parsed.section.trim().toLowerCase() === targetSec &&
          parsed.stream.trim().toLowerCase() === targetStr
        );
      });
    },
    [classes]
  );

  // Available unadded preset items
  const unaddedPresetItems = React.useMemo(() => {
    return allPresetItems.filter((item) => !isItemAdded(item));
  }, [allPresetItems, isItemAdded]);

  // Available Classes in Dropdown (classes that have at least one unadded section/stream)
  const availableClasses = React.useMemo(() => {
    const classNames = Array.from(new Set(unaddedPresetItems.map((i) => i.className)));
    const list = presetClassesList.length > 0 ? presetClassesList : FALLBACK_CLASSES;
    return list.filter((c) => classNames.includes(c.name));
  }, [unaddedPresetItems, presetClassesList]);

  // Form State
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [selectedSection, setSelectedSection] = useState<string>("");
  const [selectedStream, setSelectedStream] = useState<string>("General");
  const [dailyPeriods, setDailyPeriods] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sorted Classes in ascending grade sequence (V -> VI -> ... -> XII) with strict deduplication
  const sortedClasses = React.useMemo(() => {
    const deduped: RoutineClass[] = [];
    const seen = new Set<string>();
    for (const c of classes) {
      const key = `${(c.className || "").trim().toLowerCase()}::${(c.section || "").trim().toLowerCase()}`;
      if (!seen.has(key)) {
        seen.add(key);
        deduped.push(c);
      }
    }

    return deduped.sort((a, b) => {
      const rankA = getClassNumericRank(a.className);
      const rankB = getClassNumericRank(b.className);
      if (rankA !== rankB) return rankA - rankB;

      const parsedA = parseSectionAndStream(a.section);
      const parsedB = parseSectionAndStream(b.section);

      const secCmp = parsedA.section.localeCompare(parsedB.section);
      if (secCmp !== 0) return secCmp;

      const streamOrder: Record<string, number> = {
        General: 1,
        Science: 2,
        Arts: 3,
        Commerce: 4,
        Vocational: 5,
      };
      const strOrderA = streamOrder[parsedA.stream] || 99;
      const strOrderB = streamOrder[parsedB.stream] || 99;
      if (strOrderA !== strOrderB) return strOrderA - strOrderB;

      return parsedA.stream.localeCompare(parsedB.stream);
    });
  }, [classes]);

  // Batch edit bar state
  const [batchPeriodVal, setBatchPeriodVal] = useState<string>("7");
  const [isBatchApplying, setIsBatchApplying] = useState(false);

  // Available Sections for currently selected class
  const availableSections = React.useMemo(() => {
    if (!selectedClass) return [];
    const itemsForClass = unaddedPresetItems.filter((i) => i.className === selectedClass);
    return Array.from(new Set(itemsForClass.map((i) => i.section)));
  }, [selectedClass, unaddedPresetItems]);

  // Available Streams for currently selected class & section
  const availableStreams = React.useMemo(() => {
    if (!selectedClass) return ["General"];
    const itemsForSec = unaddedPresetItems.filter(
      (i) => i.className === selectedClass && (!selectedSection || i.section === selectedSection)
    );
    const streams = Array.from(new Set(itemsForSec.map((i) => i.stream)));
    return streams.length > 0 ? streams : ["General"];
  }, [selectedClass, selectedSection, unaddedPresetItems]);

  // Synchronize dropdown selections when available options change
  useEffect(() => {
    if (availableClasses.length === 0) {
      setSelectedClass("");
      setSelectedSection("");
      setSelectedStream("General");
      return;
    }

    if (!selectedClass || !availableClasses.some((c) => c.name === selectedClass)) {
      setSelectedClass(availableClasses[0].name);
    }
  }, [availableClasses, selectedClass]);

  useEffect(() => {
    if (availableSections.length === 0) {
      setSelectedSection("");
      return;
    }

    if (!selectedSection || !availableSections.includes(selectedSection)) {
      setSelectedSection(availableSections[0]);
    }
  }, [availableSections, selectedSection]);

  useEffect(() => {
    if (availableStreams.length === 0) {
      setSelectedStream("General");
      return;
    }

    if (!selectedStream || !availableStreams.includes(selectedStream)) {
      setSelectedStream(availableStreams[0]);
    }
  }, [availableStreams, selectedStream]);

  // When class changes, adjust section & stream
  const handleClassChange = React.useCallback((newCls: string) => {
    setSelectedClass(newCls);
    const unaddedForNewCls = unaddedPresetItems.filter((i) => i.className === newCls);
    const newSecs = Array.from(new Set(unaddedForNewCls.map((i) => i.section)));
    const defaultSec = newSecs[0] || "";
    setSelectedSection(defaultSec);

    const newStreams = Array.from(
      new Set(unaddedForNewCls.filter((i) => i.section === defaultSec).map((i) => i.stream))
    );
    setSelectedStream(newStreams[0] || "General");
  }, [unaddedPresetItems]);

  const handleSectionChange = React.useCallback((newSec: string) => {
    setSelectedSection(newSec);
    const unaddedForNewSec = unaddedPresetItems.filter(
      (i) => i.className === selectedClass && i.section === newSec
    );
    const newStreams = Array.from(new Set(unaddedForNewSec.map((i) => i.stream)));
    setSelectedStream(newStreams[0] || "General");
  }, [unaddedPresetItems, selectedClass]);

  // Add Single Class
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClass.trim() || !selectedSection.trim()) return;

    setIsSubmitting(true);
    try {
      const combinedSection = formatSectionAndStream(selectedSection, selectedStream);
      await onSaveClass({
        className: selectedClass.trim(),
        section: combinedSection,
        dailyPeriods: dailyPeriods ? parseInt(dailyPeriods, 10) : null,
      });
      setDailyPeriods("");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Batch Apply to all classes
  const handleBatchApply = async () => {
    if (!onBatchSaveClasses && !onSaveClass) return;
    const parsed = batchPeriodVal ? parseInt(batchPeriodVal, 10) : null;
    setIsBatchApplying(true);
    try {
      const updates = classes.map((c) => ({
        id: c.id,
        className: c.className,
        section: c.section,
        dailyPeriods: parsed,
      }));

      if (onBatchSaveClasses) {
        await onBatchSaveClasses(updates);
      } else {
        for (const u of updates) {
          await onSaveClass(u);
        }
      }
    } finally {
      setIsBatchApplying(false);
    }
  };

  // Preset Auto-Loader: Auto-load all standard school classes
  const handleAutoLoadPresets = async () => {
    if (unaddedPresetItems.length === 0) return;

    setIsSubmitting(true);
    try {
      const sortedUnadded = [...unaddedPresetItems].sort((a, b) => {
        const rankA = getClassNumericRank(a.className);
        const rankB = getClassNumericRank(b.className);
        if (rankA !== rankB) return rankA - rankB;

        const secCmp = a.section.localeCompare(b.section);
        if (secCmp !== 0) return secCmp;

        const streamOrder: Record<string, number> = {
          General: 1,
          Science: 2,
          Arts: 3,
          Commerce: 4,
          Vocational: 5,
        };
        const strOrderA = streamOrder[a.stream] || 99;
        const strOrderB = streamOrder[b.stream] || 99;
        return strOrderA - strOrderB;
      });

      const newRows = sortedUnadded.map((m) => ({
        className: m.className,
        section: formatSectionAndStream(m.section, m.stream),
        dailyPeriods:
          m.className.includes("V") ||
          m.className.includes("VI") ||
          m.className.includes("VII") ||
          m.className.includes("VIII")
            ? 7
            : 8,
      }));

      if (onBatchSaveClasses) {
        await onBatchSaveClasses(newRows);
      } else {
        for (const r of newRows) {
          await onSaveClass(r);
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const isAllPresetsAdded = availableClasses.length === 0;

  return (
    <div className="space-y-4 w-full">
      {/* Top Controls: Preset Auto-Loader & Add Class Form Card */}
      <form onSubmit={handleAddSubmit} autoComplete="off" className="bg-card border rounded-lg p-4 shadow-xs space-y-3.5">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-2.5">
          <div className="flex items-center gap-2">
            <School className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold tracking-tight text-foreground">
              Add Class from School Presets
            </h2>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAutoLoadPresets}
            disabled={isSubmitting || isAllPresetsAdded}
            className="h-7 text-xs font-semibold gap-1.5 border-primary/30 text-primary hover:bg-primary/5 disabled:opacity-50"
          >
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            {isAllPresetsAdded ? "All Preset Classes Added" : "Auto-Sync All School Preset Classes"}
          </Button>
        </div>

        {/* Preset Dropdowns Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {/* 1. Class Dropdown */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Class / Standard *</Label>
            <Select
              value={selectedClass}
              onValueChange={(val) => val && handleClassChange(val)}
              disabled={isAllPresetsAdded}
            >
              <SelectTrigger className="h-8 text-xs font-medium bg-background">
                <SelectValue placeholder={isAllPresetsAdded ? "All Classes Added" : "Select Class"}>
                  {selectedClass || (isAllPresetsAdded ? "All Classes Added" : "Select Class")}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {availableClasses.map((c) => (
                  <SelectItem key={c.name} value={c.name} className="text-xs">
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 2. Section Dropdown */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Section *</Label>
            <Select
              value={selectedSection}
              onValueChange={(val) => val && handleSectionChange(val)}
              disabled={isAllPresetsAdded || availableSections.length === 0}
            >
              <SelectTrigger className="h-8 text-xs font-medium bg-background">
                <SelectValue placeholder={availableSections.length === 0 ? "No Sections" : "Select Section"}>
                  {selectedSection ? `Section ${selectedSection}` : availableSections.length === 0 ? "No Sections" : "Select Section"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {availableSections.map((s) => (
                  <SelectItem key={s} value={s} className="text-xs">
                    Section {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 3. Stream Dropdown */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Stream</Label>
            <Select
              value={selectedStream}
              onValueChange={(val) => val && setSelectedStream(val)}
              disabled={isAllPresetsAdded || (availableStreams.length <= 1 && availableStreams[0] === "General")}
            >
              <SelectTrigger className="h-8 text-xs font-medium bg-background">
                <SelectValue placeholder="Select Stream">
                  {selectedStream || "Select Stream"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {availableStreams.map((st) => (
                  <SelectItem key={st} value={st} className="text-xs">
                    {st}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 4. Daily Period Override */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Daily Periods (Optional)</Label>
            <Input
              type="number"
              min={1}
              max={14}
              placeholder="Global (e.g. 8)"
              value={dailyPeriods}
              onChange={(e) => setDailyPeriods(e.target.value)}
              className="h-8 text-xs font-medium"
              disabled={isAllPresetsAdded}
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-1">
          <Button
            type="submit"
            size="sm"
            disabled={isSubmitting || isAllPresetsAdded || !selectedClass.trim() || !selectedSection.trim()}
            className="h-8 text-xs font-semibold px-4"
          >
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Add Class Section
          </Button>
        </div>
      </form>

      {/* Classes Table Card with Batch Edit & In-Line Edit */}
      <div className="bg-card border rounded-lg shadow-xs overflow-hidden">
        {/* Table Header Toolbar */}
        <div className="px-4 py-2.5 bg-muted/40 border-b flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-foreground">Configured Classes</span>
            <Badge variant="secondary" className="text-[10px] font-mono">
              {sortedClasses.length} Total
            </Badge>
          </div>

          {/* Batch Edit Bar */}
          {sortedClasses.length > 0 && (
            <div className="flex items-center gap-2 bg-background border px-2.5 py-1 rounded-md text-xs">
              <Layers className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-[11px] font-medium text-muted-foreground">Batch Set Daily Periods:</span>
              <Input
                type="number"
                min={1}
                max={14}
                value={batchPeriodVal}
                onChange={(e) => setBatchPeriodVal(e.target.value)}
                className="h-6 w-14 text-xs font-mono px-1.5 py-0 text-center"
              />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleBatchApply}
                disabled={isBatchApplying || !batchPeriodVal}
                className="h-6 text-[11px] px-2 font-medium"
              >
                {isBatchApplying ? "Applying..." : "Apply to All"}
              </Button>
            </div>
          )}
        </div>

        {/* Classes Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-muted/20 border-b text-muted-foreground font-semibold">
                <th className="py-2.5 px-4 w-1/4">Class</th>
                <th className="py-2.5 px-4 w-1/6">Section</th>
                <th className="py-2.5 px-4 w-1/5">Stream</th>
                <th className="py-2.5 px-4">Daily Period Limit (In-line Edit)</th>
                <th className="py-2.5 px-4 w-36">Max Periods / Week</th>
                <th className="py-2.5 px-4 text-right w-16">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {classes.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-muted-foreground">
                    <School className="w-6 h-6 mx-auto mb-1 opacity-40" />
                    <span>No classes configured yet. Click &quot;Auto-Sync All School Preset Classes&quot; above.</span>
                  </td>
                </tr>
              ) : (
                sortedClasses.map((c) => (
                  <ClassTableRow
                    key={c.id}
                    cls={c}
                    calculateWeeklyPeriods={calculateWeeklyPeriods}
                    onSaveClass={onSaveClass}
                    onDeleteClass={onDeleteClass}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

interface ClassTableRowProps {
  cls: RoutineClass;
  calculateWeeklyPeriods: (dailyP: number | null | undefined) => number;
  onSaveClass: (cls: { id?: string; className: string; section: string; dailyPeriods?: number | null }) => Promise<void>;
  onDeleteClass: (id: string) => Promise<void>;
}

const ClassTableRow = React.memo(function ClassTableRow({
  cls,
  calculateWeeklyPeriods,
  onSaveClass,
  onDeleteClass,
}: ClassTableRowProps) {
  const [val, setVal] = useState<string>(cls.dailyPeriods ? String(cls.dailyPeriods) : "");
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    setVal(cls.dailyPeriods ? String(cls.dailyPeriods) : "");
  }, [cls.dailyPeriods]);

  const { section: secName, stream: strName } = parseSectionAndStream(cls.section);
  const currentNum = val && val.trim() !== "" ? parseInt(val.trim(), 10) : cls.dailyPeriods;
  const weeklyTotal = calculateWeeklyPeriods(currentNum);

  const handleBlur = async () => {
    const parsed = val && val.trim() !== "" ? parseInt(val.trim(), 10) : null;
    if (cls.dailyPeriods === parsed) return;

    try {
      await onSaveClass({
        id: cls.id,
        className: cls.className,
        section: cls.section,
        dailyPeriods: parsed,
      });
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 1500);
    } catch (err) {
      console.error("Inline save error:", err);
    }
  };

  return (
    <tr className="hover:bg-muted/30 transition-colors">
      <td className="py-2 px-4 font-semibold text-foreground">
        {cls.className}
      </td>
      <td className="py-2 px-4 font-medium text-foreground">
        <Badge variant="outline" className="text-[10px] font-mono">
          Sec {secName}
        </Badge>
      </td>
      <td className="py-2 px-4">
        {strName && strName !== "General" ? (
          <Badge className="text-[10px] bg-primary/10 text-primary border-primary/20 hover:bg-primary/15">
            {strName}
          </Badge>
        ) : (
          <span className="text-muted-foreground text-[11px]">General</span>
        )}
      </td>
      <td className="py-2 px-4">
        <div className="flex items-center gap-2">
          <Input
            type="number"
            min={1}
            max={14}
            placeholder="Global"
            value={val}
            onChange={(e) => setVal(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                (e.target as HTMLInputElement).blur();
              }
            }}
            className="h-7 w-20 text-xs font-mono px-2"
          />
          <span className="text-[11px] text-muted-foreground">periods/day</span>
          {isSaved && (
            <span className="inline-flex items-center text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 gap-0.5 animate-in fade-in">
              <CheckCheck className="w-3 h-3" /> Saved
            </span>
          )}
        </div>
      </td>
      <td className="py-2 px-4">
        <Badge
          variant="secondary"
          className="text-[11px] font-mono font-bold bg-muted/80 text-foreground border px-2 py-0.5"
        >
          {weeklyTotal} p/wk
        </Badge>
      </td>
      <td className="py-2 px-4 text-right">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onDeleteClass(cls.id)}
          className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </td>
    </tr>
  );
});
