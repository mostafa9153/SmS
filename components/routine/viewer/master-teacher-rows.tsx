"use client";

import React from "react";
import { RoutineClass, DAY_NAMES } from "@/lib/routine/types";
import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { getCellOptions, cellHasTeacher } from "@/lib/routine/routine-groups";
import { DAY_COLOR_THEMES, TIFFIN_BREAK_BORDER } from "@/components/routine/viewer/constants";
import { getClassShort, getSubjectShort } from "@/components/routine/viewer/labels";
import type { RoutineViewerState } from "./use-routine-viewer";

export function MasterTeacherRows({ viewer }: { viewer: RoutineViewerState }) {
  const { activeDays, classes, displayedMasterTeachers, halfDays, isAllDaysMaster, masterDayIdx, maxHalfP, roomMap, routine, settings, subjectMap } = viewer;
  if (!routine) return null;
  return (
    <>
      {isAllDaysMaster ? (
        displayedMasterTeachers.map((tch) => {
          return (
            <tr key={tch.id} className="hover:bg-muted/20 transition-colors">
              <td className="py-2 px-2.5 text-left font-bold text-foreground bg-card border-r border-border print:border-black sticky left-0 z-20 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.15)] whitespace-nowrap w-40 min-w-[140px]">
                <div className="font-bold text-xs truncate max-w-[130px]">{tch.name}</div>
                <div className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                  <span className="font-mono font-semibold text-primary">{tch.shortName || "-"}</span>
                  {tch.primarySubject && (
                    <span className="truncate max-w-[80px] text-muted-foreground font-normal">
                      • {tch.primarySubject}
                    </span>
                  )}
                </div>
              </td>
              {activeDays.map((dIdx, dPos) => {
                const isHalf = halfDays.includes(dIdx);
                const dayPeriods = isHalf ? maxHalfP : settings.periodsPerDay;
                const isLastDay = dPos === activeDays.length - 1;
                const theme = DAY_COLOR_THEMES[dIdx % DAY_COLOR_THEMES.length];

                return Array.from({ length: dayPeriods }, (_, i) => i + 1).map((p) => {
                  const pPos = p - 1;
                  const isLastInDay = p === dayPeriods;
                  const isDayDivider = isLastInDay && !isLastDay;
                  const isBreakAfter = (settings.breaks || []).includes(p) && p < dayPeriods;
                  const cellBorderClass = isDayDivider
                    ? theme.dividerBorder
                    : isBreakAfter
                    ? TIFFIN_BREAK_BORDER
                    : "border-r border-border last:border-r-0";
                  const assigned: { c: RoutineClass; cell: any; opt: { sid: string; tid: string; rid?: string | null } }[] = [];
                  const seenGroupUnits = new Set<string | number>();
                  for (const c of classes) {
                    const cell = routine.grid[c.id]?.[dPos]?.[pPos];
                    if (!cell || !cellHasTeacher(cell, tch.id)) continue;
                    // De-dupe shared group cells (pooled across sections).
                    if (cell.gid) {
                      const key = cell.gid;
                      if (seenGroupUnits.has(key)) continue;
                      seenGroupUnits.add(key);
                    }
                    const matchedOpt = getCellOptions(cell).find((o) => o.tid === tch.id);
                    if (!matchedOpt) continue;
                    assigned.push({ c, cell, opt: matchedOpt });
                  }

                  if (assigned.length === 0) {
                    return (
                      <td
                        key={`${dPos}_${p}`}
                        className={cn(
                          "py-1 px-0.5 border-border text-muted-foreground/30 hover:bg-muted/30 transition-all select-none print:border-black w-[60px] min-w-[55px] max-w-[65px] h-12 text-center",
                          theme.cellColBg,
                          cellBorderClass
                        )}
                      >
                        <div className="h-full flex items-center justify-center text-xs font-mono text-muted-foreground/25">
                          -
                        </div>
                      </td>
                    );
                  }

                  return (
                    <td
                      key={`${dPos}_${p}`}
                      className={cn(
                        "py-0.5 px-0.5 border-border h-12 align-middle print:border-black transition-all w-[60px] min-w-[55px] max-w-[65px]",
                        theme.cellColBg,
                        cellBorderClass
                      )}
                    >
                      {assigned.map(({ c, cell, opt }, aIdx) => {
                        const subj = subjectMap.get(opt.sid);
                        const rm = opt.rid ? roomMap.get(opt.rid) : null;
                        const hasClash = assigned.length > 1;
                        const clsShort = getClassShort(c.className, c.section);
                        const subShort = getSubjectShort(subj?.name || "");
                        const fullTooltip = `Teacher: ${tch.name} (${tch.shortName})\nDay: ${DAY_NAMES[dIdx]}, Period ${p}\nClass: ${c.className} ${c.section}\nSubject: ${subj?.name || "?"}\n${rm ? `Room: ${rm.name}` : ""}${hasClash ? "\nWARNING: Teacher is double-booked!" : ""}`;

                        return (
                          <div
                            key={aIdx}
                            title={fullTooltip}
                            className={cn(
                              "h-full w-full rounded p-1 flex flex-col justify-center items-center text-center border shadow-2xs select-none leading-none overflow-hidden",
                              cell.lab
                                ? "bg-blue-500/10 border-blue-300 dark:border-blue-800"
                                : "bg-background border-border",
                              subj?.isHard && "border-t-2 border-t-amber-500",
                              hasClash && "border-destructive bg-destructive/15 ring-1 ring-destructive"
                            )}
                          >
                            <span className={cn(
                              "font-bold text-[10px] truncate max-w-full block leading-tight",
                              hasClash ? "text-destructive" : "text-foreground"
                            )}>
                              {clsShort}
                            </span>
                            <span className="font-semibold text-[9px] text-primary truncate max-w-full block mt-0.5">
                              {subShort}
                            </span>
                          </div>
                        );
                      })}
                    </td>
                  );
                });
              })}
            </tr>
          );
        })
      ) : (
        displayedMasterTeachers.map((tch) => {
          const dPos = masterDayIdx || 0;
          const actDay = activeDays[dPos];
          const maxPForDay = halfDays.includes(actDay)
            ? maxHalfP
            : settings.periodsPerDay;

          return (
            <tr key={tch.id} className="hover:bg-muted/20 transition-colors">
              <td className="py-2.5 px-3 text-left font-bold text-foreground bg-card border-r border-border print:border-black sticky left-0 z-20 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.15)] whitespace-nowrap">
                <div className="font-bold text-foreground text-xs leading-tight">
                  {tch.name}
                </div>
                <div className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                  <span className="font-mono font-semibold text-primary">{tch.shortName || "-"}</span>
                  {tch.primarySubject && (
                    <span className="truncate max-w-[90px] text-muted-foreground font-normal">
                      • {tch.primarySubject}
                    </span>
                  )}
                </div>
              </td>
              {Array.from({ length: settings.periodsPerDay }, (_, i) => i + 1).map((p) => {
                const isGray = p > maxPForDay;
                const pPos = p - 1;
                const hasBreakAfter = settings.breaks.includes(p) && p < settings.periodsPerDay;

                const assigned: { c: RoutineClass; cell: any; opt: { sid: string; tid: string; rid?: string | null } }[] = [];
                const seenGroupUnits2 = new Set<string | number>();
                if (!isGray) {
                  for (const c of classes) {
                    const cell = routine.grid[c.id]?.[dPos]?.[pPos];
                    if (!cell || !cellHasTeacher(cell, tch.id)) continue;
                    if (cell.gid) {
                      if (seenGroupUnits2.has(cell.gid)) continue;
                      seenGroupUnits2.add(cell.gid);
                    }
                    const matchedOpt = getCellOptions(cell).find((o) => o.tid === tch.id);
                    if (!matchedOpt) continue;
                    assigned.push({ c, cell, opt: matchedOpt });
                  }
                }

                return (
                  <React.Fragment key={p}>
                    {isGray ? (
                      <td
                        className="py-2 px-1.5 border-r border-border last:border-r-0 bg-muted/40 text-muted-foreground/30 print:bg-gray-50 print:border-black select-none font-mono"
                      >
                        -
                      </td>
                    ) : assigned.length === 0 ? (
                      <td
                        className="py-2 px-1.5 border-r border-border last:border-r-0 text-muted-foreground/30 hover:bg-muted/30 transition-all select-none print:border-black"
                      >
                        <div className="h-16 flex items-center justify-center text-xs font-mono text-muted-foreground/25">
                          -
                        </div>
                      </td>
                    ) : (
                      <td
                        className="py-1.5 px-1.5 border-r border-border last:border-r-0 h-16 align-top print:border-black transition-all"
                      >
                        {assigned.map(({ c, cell, opt }, aIdx) => {
                          const subj = subjectMap.get(opt.sid);
                          const rm = opt.rid ? roomMap.get(opt.rid) : null;
                          // Multiple classes = clash only when NOT a shared group cell.
                          const hasClash = assigned.length > 1 && !cell.gid;

                          return (
                            <div
                              key={aIdx}
                              className={cn(
                                "h-full rounded-md p-1.5 flex flex-col justify-between text-left border shadow-2xs select-none",
                                cell.lab
                                  ? "bg-blue-500/10 border-blue-300 dark:border-blue-800"
                                  : "bg-background border-border",
                                subj?.isHard && "border-l-4 border-l-amber-500",
                                hasClash && "border-destructive bg-destructive/10 ring-1 ring-destructive"
                              )}
                            >
                              <div className="flex items-start justify-between gap-1">
                                <span className="font-bold text-foreground text-[11px] truncate block leading-tight flex-1">
                                  {c.className} - {c.section}
                                </span>
                                {hasClash && (
                                  <span
                                    title="Faculty double-booked in this period!"
                                    className="text-[9px] font-bold text-destructive flex items-center gap-0.5 bg-destructive/15 px-1 rounded shrink-0"
                                  >
                                    <AlertTriangle className="w-2.5 h-2.5" /> Clash
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center justify-between text-[10px] text-muted-foreground mt-1">
                                <span className="font-semibold text-primary truncate max-w-[85px]">
                                  {subj?.name || "?"} {cell.lab ? "(Lab)" : ""}
                                </span>
                                {rm && (
                                  <span className="bg-amber-500/20 text-amber-800 dark:text-amber-300 px-1 py-0.2 rounded text-[9px] font-bold">
                                    {rm.name.split(" ")[0]}
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </td>
                    )}
                    {hasBreakAfter && (
                      <td
                        className={cn(
                          "py-2 px-1 !border-x-2 !border-x-foreground/50 dark:!border-x-foreground/40 print:!border-black print:!border-x-2 text-center font-semibold text-[10px] select-none",
                          p >= maxPForDay
                            ? "bg-muted/30 text-muted-foreground/30"
                            : "bg-amber-500/10 text-amber-700 dark:text-amber-400"
                        )}
                      >
                        {p < maxPForDay ? "Tiffin" : "-"}
                      </td>
                    )}
                  </React.Fragment>
                );
              })}
            </tr>
          );
        })
      )}
    </>
  );
}
