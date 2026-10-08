"use client";

import React from "react";
import { RoutineSettings, DAY_NAMES } from "@/lib/routine/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface TeacherAvailabilityMatrixProps {
  settings: RoutineSettings;
  availSlots: Record<number, number[]>;
  togglePeriod: (dayIdx: number, period: number) => void;
  setPreset: (dayIdx: number, type: "all" | "morning" | "afternoon" | "none") => void;
}

export function TeacherAvailabilityMatrix({
  settings,
  availSlots,
  togglePeriod,
  setPreset,
}: TeacherAvailabilityMatrixProps) {
  return (
    <div className="space-y-2 pt-2 border-t">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-semibold text-foreground">Weekly Period Availability Matrix</Label>
        <Badge variant="outline" className="text-[10px] font-mono">
          {settings.workingDays.length} Working Days
        </Badge>
      </div>

      <div className="border rounded-md divide-y overflow-hidden text-xs bg-card">
        {settings.workingDays.map((dIdx) => {
          const dayPeriods = availSlots[dIdx] || [];
          const isHalf = settings.halfDays?.includes(dIdx);
          const maxP = isHalf ? settings.halfDayPeriods || 4 : settings.periodsPerDay;

          return (
            <div
              key={dIdx}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-2.5 hover:bg-muted/30 transition-colors"
            >
              <div className="flex items-center gap-2 sm:w-32">
                <span className="font-semibold text-xs text-foreground">{DAY_NAMES[dIdx]}</span>
                {isHalf && (
                  <Badge
                    variant="outline"
                    className="text-[9px] px-1 py-0 bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-300"
                  >
                    Half
                  </Badge>
                )}
              </div>

              {/* Period chips */}
              <div className="flex flex-wrap gap-1 flex-1">
                {Array.from({ length: settings.periodsPerDay }, (_, i) => i + 1).map((p) => {
                  const isSelected = dayPeriods.includes(p);
                  const isOverLimit = p > maxP;

                  if (isOverLimit) {
                    return (
                      <span
                        key={p}
                        className="px-2 py-0.5 rounded text-[10px] font-mono border bg-muted/40 text-muted-foreground/40 select-none"
                      >
                        -
                      </span>
                    );
                  }

                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => togglePeriod(dIdx, p)}
                      aria-label={`${DAY_NAMES[dIdx]} Period ${p} availability toggle`}
                      title={`${DAY_NAMES[dIdx]} Period ${p}`}
                      className={cn(
                        "px-2 py-0.5 rounded text-[11px] font-mono font-medium border transition-all select-none",
                        isSelected && "bg-primary text-primary-foreground border-primary shadow-xs font-bold",
                        !isSelected && "bg-muted/50 text-muted-foreground border-border hover:bg-muted"
                      )}
                    >
                      P{p}
                    </button>
                  );
                })}
              </div>

              {/* Quick presets */}
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setPreset(dIdx, "all")}
                  aria-label={`Set all periods for ${DAY_NAMES[dIdx]}`}
                  className="h-6 px-1.5 text-[10px] text-muted-foreground hover:text-foreground"
                >
                  All
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setPreset(dIdx, "morning")}
                  aria-label={`Set morning periods for ${DAY_NAMES[dIdx]}`}
                  className="h-6 px-1.5 text-[10px] text-muted-foreground hover:text-foreground"
                >
                  Morning
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setPreset(dIdx, "none")}
                  aria-label={`Clear all periods for ${DAY_NAMES[dIdx]}`}
                  className="h-6 px-1.5 text-[10px] text-destructive hover:bg-destructive/10"
                >
                  Clear
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
