"use client";

import React from "react";
import { DAY_NAMES } from "@/lib/routine/types";
import { Coffee } from "lucide-react";
import { cn } from "@/lib/utils";
import { DAY_COLOR_THEMES, TIFFIN_BREAK_BORDER } from "@/components/routine/viewer/constants";
import type { RoutineViewerState } from "./use-routine-viewer";

export function GridHead({ viewer }: { viewer: RoutineViewerState }) {
  const { activeDays, halfDays, isAllDaysMaster, maxHalfP, settings, viewMode } = viewer;
  return (
    <thead className="sticky top-0 z-30 shadow-2xs">
      {isAllDaysMaster ? (
        <>
          <tr className="bg-muted border-b text-foreground font-semibold print:bg-gray-100 print:text-black">
            <th
              rowSpan={2}
              className="py-2.5 px-3 text-left border-r border-b border-border print:border-black w-40 min-w-[140px] font-bold sticky top-0 left-0 z-40 bg-muted shadow-[2px_2px_4px_-2px_rgba(0,0,0,0.15)]"
            >
              {viewMode === "master" ? "Class \\ Day" : "Teacher \\ Day"}
            </th>
            {activeDays.map((dIdx, dPos) => {
              const isHalf = halfDays.includes(dIdx);
              const dayPeriods = isHalf ? maxHalfP : settings.periodsPerDay;
              const isLastDay = dPos === activeDays.length - 1;
              const theme = DAY_COLOR_THEMES[dIdx % DAY_COLOR_THEMES.length];
              return (
                <th
                  key={dIdx}
                  colSpan={dayPeriods}
                  className={cn(
                    "py-1.5 px-2 text-center border-b font-bold sticky top-0 z-30 backdrop-blur-xs transition-colors",
                    theme.headerBg,
                    theme.headerText,
                    theme.headerBorder,
                    !isLastDay ? theme.dividerBorder : "border-r border-border print:border-black"
                  )}
                >
                  <div className="flex items-center justify-center gap-1.5">
                    <span className="font-bold">{DAY_NAMES[dIdx]}</span>
                    {isHalf && (
                      <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                        (Half)
                      </span>
                    )}
                  </div>
                </th>
              );
            })}
          </tr>
          <tr className="bg-muted/95 border-b text-foreground font-semibold print:bg-gray-50 print:text-black">
            {activeDays.map((dIdx, dPos) => {
              const isHalf = halfDays.includes(dIdx);
              const dayPeriods = isHalf ? maxHalfP : settings.periodsPerDay;
              const isLastDay = dPos === activeDays.length - 1;
              const theme = DAY_COLOR_THEMES[dIdx % DAY_COLOR_THEMES.length];
              return Array.from({ length: dayPeriods }, (_, i) => i + 1).map((p) => {
                const isLastInDay = p === dayPeriods;
                const isBreakAfter = (settings.breaks || []).includes(p) && p < dayPeriods;
                return (
                  <th
                    key={`${dIdx}_${p}`}
                    title={isBreakAfter ? `P${p} (Tiffin follows)` : `P${p}`}
                    className={cn(
                      "py-1 px-0.5 border-b border-border print:border-black text-[10px] font-semibold text-center w-[60px] min-w-[55px] max-w-[65px] sticky top-[33px] z-30 backdrop-blur-xs transition-colors",
                      theme.subHeaderBg,
                      theme.headerText,
                      isLastInDay && !isLastDay
                        ? theme.dividerBorder
                        : isBreakAfter
                        ? TIFFIN_BREAK_BORDER
                        : "border-r border-border print:border-black"
                    )}
                  >
                    P{p}
                  </th>
                );
              });
            })}
          </tr>
        </>
      ) : (
        <tr className="bg-muted border-b text-foreground font-semibold print:bg-gray-100 print:text-black">
          <th className="py-2.5 px-3 text-left border-r border-border print:border-black w-36 font-bold sticky top-0 left-0 z-40 bg-muted shadow-[2px_2px_4px_-2px_rgba(0,0,0,0.15)]">
            {viewMode === "master"
              ? "Class \\ Period"
              : viewMode === "master-teacher"
              ? "Teacher \\ Period"
              : "Day \\ Period"}
          </th>
          {Array.from({ length: settings.periodsPerDay }, (_, i) => i + 1).map((p) => {
            const hasBreakAfter = settings.breaks.includes(p) && p < settings.periodsPerDay;
            return (
              <React.Fragment key={p}>
                <th className="py-2.5 px-2 border-r last:border-r-0 border-border print:border-black min-w-[110px] sticky top-0 z-30 bg-muted/95 backdrop-blur-xs">
                  <span>Period {p}</span>
                </th>
                {hasBreakAfter && (
                  <th className="py-2.5 px-2 !border-x-2 !border-x-foreground/50 dark:!border-x-foreground/40 print:!border-black print:!border-x-2 border-b border-border min-w-[70px] bg-amber-500/15 text-amber-800 dark:text-amber-300 font-bold sticky top-0 z-30 backdrop-blur-xs">
                    <div className="flex items-center justify-center gap-1">
                      <Coffee className="w-3 h-3 text-amber-600" />
                      <span>Recess</span>
                    </div>
                  </th>
                )}
              </React.Fragment>
            );
          })}
        </tr>
      )}
    </thead>
  );
}
