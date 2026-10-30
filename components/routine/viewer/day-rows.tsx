"use client";

import React from "react";
import { DAY_NAMES } from "@/lib/routine/types";
import { cn } from "@/lib/utils";
import { getCellOptions, cellHasTeacher, cellHasRoom } from "@/lib/routine/routine-groups";

import type { RoutineViewerState } from "./use-routine-viewer";

export function DayRows({ viewer }: { viewer: RoutineViewerState }) {
  const { activeDays, classMap, classes, halfDays, maxHalfP, roomMap, routine, selectedClassId, selectedRoomId, selectedTeacherId, settings, subjectMap, teacherMap, viewMode } = viewer;
  if (!routine) return null;
  return (
    <>
      {activeDays.map((dIdx, dPos) => {
        const maxPForDay = halfDays.includes(dIdx)
          ? maxHalfP
          : settings.periodsPerDay;
        let entityLimit = settings.periodsPerDay;
        if (viewMode === "class") {
          const cl = classMap.get(selectedClassId);
          if (cl?.dailyPeriods) entityLimit = cl.dailyPeriods;
        }

        return (
          <tr key={dIdx} className="hover:bg-muted/20 transition-colors">
            <td className="py-3 px-3 text-left font-bold text-foreground bg-card border-r border-border print:border-black sticky left-0 z-20 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.15)] whitespace-nowrap">
              {DAY_NAMES[dIdx]} {halfDays.includes(dIdx) && "(Half)"}
            </td>
            {Array.from({ length: settings.periodsPerDay }, (_, i) => i + 1).map((p) => {
              const isGray = p > maxPForDay || p > entityLimit;
              const pPos = p - 1;
              const hasBreakAfter = settings.breaks.includes(p) && p < settings.periodsPerDay;

              let cellData = null;
              let associatedClassId = selectedClassId;

              if (!isGray) {
                if (viewMode === "class") {
                  cellData = routine.grid[selectedClassId]?.[dPos]?.[pPos];
                } else if (viewMode === "teacher") {
                  // Match any option carrying this teacher; a shared
                  // group cell is picked once (prefer the first match).
                  for (const c of classes) {
                    const cell = routine.grid[c.id]?.[dPos]?.[pPos];
                    if (!cell || !cellHasTeacher(cell, selectedTeacherId)) continue;
                    const opt = getCellOptions(cell).find((o) => o.tid === selectedTeacherId);
                    if (!opt) continue;
                    cellData = { ...cell, sid: opt.sid, tid: opt.tid, rid: opt.rid ?? null };
                    associatedClassId = c.id;
                    break;
                  }
                } else if (viewMode === "room") {
                  for (const c of classes) {
                    const cell = routine.grid[c.id]?.[dPos]?.[pPos];
                    if (!cell || !cellHasRoom(cell, selectedRoomId)) continue;
                    const opt = getCellOptions(cell).find((o) => (o.rid || null) === selectedRoomId);
                    if (!opt) continue;
                    cellData = { ...cell, sid: opt.sid, tid: opt.tid, rid: opt.rid ?? null };
                    associatedClassId = c.id;
                    break;
                  }
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
                  ) : !cellData ? (
                    <td
                      className="py-2 px-1.5 border-r border-border last:border-r-0 text-muted-foreground/30 print:border-black"
                    >
                      ·
                    </td>
                  ) : (
                    <td
                      className="py-1.5 px-1.5 border-r border-border last:border-r-0 h-16 align-top print:border-black"
                    >
                      {(() => {
                        const subj = subjectMap.get(cellData.sid);
                        const tch = teacherMap.get(cellData.tid);
                        const cls = classMap.get(associatedClassId);
                        const rm = cellData.rid ? roomMap.get(cellData.rid) : null;

                        const title1 = subj?.name || "?";
                        const title2 =
                          viewMode === "class"
                            ? tch?.shortName || tch?.name || "?"
                            : viewMode === "teacher"
                            ? `${cls?.className || "?"} ${cls?.section || ""}`
                            : `${cls?.className || "?"} ${cls?.section || ""} • ${tch?.shortName || tch?.name || ""}`;

                        return (
                          <div
                            className={cn(
                              "h-full rounded-md p-1.5 flex flex-col justify-between text-left border shadow-2xs transition-all",
                              cellData.lab
                                ? "bg-blue-500/10 border-blue-300 dark:border-blue-800"
                                : "bg-background border-border",
                              subj?.isHard && "border-l-4 border-l-amber-500"
                            )}
                          >
                            <span className="font-bold text-foreground text-[11px] truncate block leading-tight">
                              {title1} {cellData.lab ? "(Lab)" : ""}
                            </span>
                            <div className="flex items-center justify-between text-[10px] text-muted-foreground mt-1">
                              <span className="font-semibold text-primary font-mono">{title2}</span>
                              {rm && viewMode !== "room" && (
                                <span className="bg-amber-500/20 text-amber-800 dark:text-amber-300 px-1 py-0.2 rounded text-[9px] font-bold">
                                  {rm.name.split(" ")[0]}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })()}
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
      })}
    </>
  );
}
