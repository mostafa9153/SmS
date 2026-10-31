"use client";

import { AlertTriangle, CheckCircle2, Clock, Sun, Sunset, SlidersHorizontal } from "lucide-react";
import { Label } from "@/components/ui/label";
import { PeriodSlotMatrix } from "@/components/routine/period-slot-matrix";
import { cn } from "@/lib/utils";
import { SegmentedControl } from "@/components/ui/segmented-control";
import type { RoutineSubjectsState } from "./use-routine-subjects";

const WINDOWS = [
  { value: "any", label: "Anytime", icon: Clock },
  { value: "morning", label: "Morning", icon: Sun },
  { value: "afternoon", label: "Afternoon", icon: Sunset },
  { value: "custom", label: "Custom", icon: SlidersHorizontal },
] as const;

export function SubjectScheduleSection({ tab }: { tab: RoutineSubjectsState }) {
  const { settings, dlgWindow, dlgSlots, selectDlgWindow, selectDlgCustom, changeDlgSlots, schedule, maxPerDayChoices, setDlgMaxPerDay, dlgPeriodsPerWeek } = tab;
  const { stats, minPerDay, maxPerDay, blocked, shortBy } = schedule;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Label className="text-xs font-semibold">Time Window</Label>
        <SegmentedControl
          value={dlgWindow}
          onChange={(v) => (v === "custom" ? selectDlgCustom() : selectDlgWindow(v))}
          options={WINDOWS.map((w) => ({
            value: w.value,
            label: (
              <span className="flex items-center gap-1">
                <w.icon className="h-3 w-3" />
                {w.label}
              </span>
            ),
          }))}
        />
      </div>

      <PeriodSlotMatrix settings={settings} value={dlgSlots} onChange={changeDlgSlots} />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Label className="text-xs font-semibold whitespace-nowrap">Max / Day</Label>
          <SegmentedControl
            size="sm"
            value={String(maxPerDay)}
            onChange={(v) => setDlgMaxPerDay(Number(v))}
            options={maxPerDayChoices.map((n) => ({
              value: String(n),
              label: <span className="font-mono">{n}</span>,
              disabled: n < minPerDay,
            }))}
          />
        </div>

        <div
          className={cn(
            "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium",
            blocked
              ? "border-destructive/40 bg-destructive/10 text-destructive"
              : shortBy > 0
              ? "border-amber-400/50 bg-amber-500/10 text-amber-700 dark:text-amber-400"
              : "border-emerald-400/50 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
          )}
        >
          {shortBy > 0 ? <AlertTriangle className="h-3 w-3" /> : <CheckCircle2 className="h-3 w-3" />}
          <span className="font-mono">
            {stats.total} slots · {stats.openDays}d · fits {Math.min(stats.capacity, dlgPeriodsPerWeek)}/{dlgPeriodsPerWeek}
          </span>
        </div>
      </div>
    </div>
  );
}
