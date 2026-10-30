"use client";

import React from "react";
import { DAY_NAMES } from "@/lib/routine/types";
import { GripVertical, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { getCellOptions } from "@/lib/routine/routine-groups";
import { DAY_COLOR_THEMES, TIFFIN_BREAK_BORDER } from "@/components/routine/viewer/constants";
import { getSubjectShort } from "@/components/routine/viewer/labels";
import type { RoutineViewerState } from "./use-routine-viewer";

export function MasterDayRows({ viewer }: { viewer: RoutineViewerState }) {
  const { activeDays, dayClashes, displayedMasterClasses, dragOverPos, draggedPos, halfDays, handleCellSwap, isAllDaysMaster, masterDayIdx, maxHalfP, roomMap, routine, setDragOverPos, setDraggedPos, settings, subjectMap, teacherMap } = viewer;
  if (!routine) return null;
  return (
    <>
      {isAllDaysMaster ? (
        displayedMasterClasses.map((c) => {
          const classLimit = c.dailyPeriods || settings.periodsPerDay;
          return (
            <tr key={c.id} className="hover:bg-muted/20 transition-colors">
              <td className="py-2 px-2.5 text-left font-bold text-foreground bg-card border-r border-border print:border-black sticky left-0 z-20 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.15)] whitespace-nowrap w-40 min-w-[140px]">
                <div className="font-bold text-xs">{c.className} - {c.section}</div>
              </td>
              {activeDays.map((dIdx, dPos) => {
                const actDay = dIdx;
                const maxPForDay = halfDays.includes(actDay) ? maxHalfP : settings.periodsPerDay;
                const dayPeriods = halfDays.includes(actDay) ? maxHalfP : settings.periodsPerDay;
                const isLastDay = dPos === activeDays.length - 1;
                const theme = DAY_COLOR_THEMES[actDay % DAY_COLOR_THEMES.length];

                return Array.from({ length: dayPeriods }, (_, i) => i + 1).map((p) => {
                  const isGray = p > maxPForDay || p > classLimit;
                  const pPos = p - 1;
                  const cellData = isGray ? null : routine.grid[c.id]?.[dPos]?.[pPos];
                  const isSource = draggedPos?.classId === c.id && draggedPos?.dPos === dPos && draggedPos?.pPos === pPos;
                  const isTarget = dragOverPos?.classId === c.id && dragOverPos?.dPos === dPos && dragOverPos?.pPos === pPos;
                  const clashReason = dayClashes.get(`${c.id}_${dPos}_${pPos}`);
                  const isLastInDay = p === dayPeriods;
                  const isDayDivider = isLastInDay && !isLastDay;
                  const isBreakAfter = (settings.breaks || []).includes(p) && p < dayPeriods;
                  const cellBorderClass = isDayDivider
                    ? theme.dividerBorder
                    : isBreakAfter
                    ? TIFFIN_BREAK_BORDER
                    : "border-r border-border last:border-r-0";

                  if (isGray) {
                    return (
                      <td
                        key={`${dPos}_${p}`}
                        className={cn(
                          "py-1 px-0.5 border-border bg-muted/40 text-muted-foreground/30 print:bg-gray-50 print:border-black select-none font-mono text-center text-xs w-[60px] min-w-[55px] max-w-[65px] h-12 transition-colors",
                          theme.cellColBg,
                          cellBorderClass
                        )}
                      >
                        -
                      </td>
                    );
                  }

                  if (!cellData) {
                    return (
                      <td
                        key={`${dPos}_${p}`}
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.dataTransfer.dropEffect = "move";
                          if (dragOverPos?.classId !== c.id || dragOverPos?.dPos !== dPos || dragOverPos?.pPos !== pPos) {
                            setDragOverPos({ classId: c.id, dPos, pPos });
                          }
                        }}
                        onDragLeave={() => {
                          if (dragOverPos?.classId === c.id && dragOverPos?.dPos === dPos && dragOverPos?.pPos === pPos) {
                            setDragOverPos(null);
                          }
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          setDragOverPos(null);
                          setDraggedPos(null);
                          try {
                            const raw = e.dataTransfer.getData("application/json") || e.dataTransfer.getData("text/plain");
                            const data = JSON.parse(raw);
                            if (data?.classId) {
                              handleCellSwap(data.classId, data.dPos ?? dPos, data.pPos, c.id, dPos, pPos);
                            }
                          } catch (err) {
                            console.error("Drop parse error:", err);
                          }
                        }}
                        className={cn(
                          "py-1 px-0.5 border-border transition-all select-none print:border-black w-[60px] min-w-[55px] max-w-[65px] h-12",
                          theme.cellColBg,
                          cellBorderClass,
                          isTarget ? "bg-primary/20 ring-2 ring-inset ring-primary" : "text-muted-foreground/30 hover:bg-muted/30"
                        )}
                      >
                        <div className="h-full flex items-center justify-center text-xs font-mono">
                          {isTarget ? (
                            <span className="text-[9px] font-bold text-primary animate-pulse">Move</span>
                          ) : (
                            "·"
                          )}
                        </div>
                      </td>
                    );
                  }

                  const isGroupCell = Boolean(cellData.gid);
                  const cellOpts = getCellOptions(cellData);
                  const subj = subjectMap.get(cellData.sid);
                  const tch = teacherMap.get(cellData.tid);
                  const rm = cellData.rid ? roomMap.get(cellData.rid) : null;
                  const subShort = isGroupCell
                    ? cellOpts.map((o) => getSubjectShort(subjectMap.get(o.sid)?.name || "")).join(" | ")
                    : getSubjectShort(subj?.name || "");
                  const tchShort = isGroupCell
                    ? cellOpts
                        .map((o) => teacherMap.get(o.tid))
                        .map((t) => t?.shortName || t?.name || "?")
                        .join(" | ")
                    : tch?.shortName || tch?.name || "?";
                  const fullTooltip = isGroupCell
                    ? `${c.className} ${c.section} | ${DAY_NAMES[actDay]} Period ${p}\nGroup options:\n${cellOpts
                        .map((o) => {
                          const s = subjectMap.get(o.sid);
                          const t = teacherMap.get(o.tid);
                          const r = o.rid ? roomMap.get(o.rid) : null;
                          return `  • ${s?.name || "?"} — ${t?.name || "?"}${r ? ` [${r.name}]` : ""}`;
                        })
                        .join("\n")}${clashReason ? `\n${clashReason}` : ""}`
                    : `${c.className} ${c.section} | ${DAY_NAMES[actDay]} Period ${p}\nSubject: ${subj?.name || "?"}\nFaculty: ${tch?.name || "?"} (${tchShort})\n${rm ? `Room: ${rm.name}` : ""}${clashReason ? `\n${clashReason}` : ""}`;

                  return (
                    <td
                      key={`${dPos}_${p}`}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = "move";
                        if (dragOverPos?.classId !== c.id || dragOverPos?.dPos !== dPos || dragOverPos?.pPos !== pPos) {
                          setDragOverPos({ classId: c.id, dPos, pPos });
                        }
                      }}
                      onDragLeave={() => {
                        if (dragOverPos?.classId === c.id && dragOverPos?.dPos === dPos && dragOverPos?.pPos === pPos) {
                          setDragOverPos(null);
                        }
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        setDragOverPos(null);
                        setDraggedPos(null);
                        try {
                          const raw = e.dataTransfer.getData("application/json") || e.dataTransfer.getData("text/plain");
                          const data = JSON.parse(raw);
                          if (data?.classId) {
                            handleCellSwap(data.classId, data.dPos ?? dPos, data.pPos, c.id, dPos, pPos);
                          }
                        } catch (err) {
                          console.error("Drop parse error:", err);
                        }
                      }}
                      className={cn(
                        "py-0.5 px-0.5 border-border h-12 align-middle print:border-black transition-all w-[60px] min-w-[55px] max-w-[65px]",
                        theme.cellColBg,
                        cellBorderClass,
                        isTarget && "bg-primary/20 ring-2 ring-inset ring-primary scale-[1.02] shadow-xs z-10"
                      )}
                    >
                      <div
                        draggable={true}
                        title={fullTooltip}
                        onDragStart={(e) => {
                          setDraggedPos({ classId: c.id, dPos, pPos });
                          const payload = JSON.stringify({ classId: c.id, dPos, pPos });
                          e.dataTransfer.setData("application/json", payload);
                          e.dataTransfer.setData("text/plain", payload);
                          e.dataTransfer.effectAllowed = "move";
                        }}
                        onDragEnd={() => {
                          setDraggedPos(null);
                          setDragOverPos(null);
                        }}
                        className={cn(
                          "relative h-full w-full rounded p-1 flex flex-col justify-center items-center text-center border shadow-2xs transition-all cursor-grab active:cursor-grabbing select-none leading-none overflow-hidden",
                          cellData.lab
                            ? "bg-blue-500/10 border-blue-300 dark:border-blue-800"
                            : "bg-background border-border hover:border-primary/50",
                          isGroupCell && "bg-amber-100/40 dark:bg-amber-900/15 border-amber-300 dark:border-amber-800/60",
                          subj?.isHard && "border-t-2 border-t-amber-500",
                          clashReason && "border-destructive bg-destructive/15 ring-1 ring-destructive",
                          isSource && "opacity-30 scale-95 ring-1 ring-dashed ring-primary"
                        )}
                      >
                        {isGroupCell && (
                          <span className="absolute -top-0.5 -left-0.5 text-[7px] font-bold text-amber-700 dark:text-amber-400 bg-amber-200/70 dark:bg-amber-900/40 px-0.5 rounded-sm leading-none">
                            G
                          </span>
                        )}
                        <span className={cn(
                          "font-bold text-[10px] truncate max-w-full block leading-tight",
                          clashReason ? "text-destructive" : "text-foreground"
                        )}>
                          {subShort}
                        </span>
                        <span className="font-mono text-[9px] text-primary truncate max-w-full block mt-0.5 font-semibold">
                          {tchShort}
                        </span>
                      </div>
                    </td>
                  );
                });
              })}
            </tr>
          );
        })
      ) : (
        displayedMasterClasses.map((c) => {
          const dPos = masterDayIdx || 0;
          const actDay = activeDays[dPos];
          const maxPForDay = halfDays.includes(actDay)
            ? maxHalfP
            : settings.periodsPerDay;
          const classLimit = c.dailyPeriods || settings.periodsPerDay;

          return (
            <tr key={c.id} className="hover:bg-muted/20 transition-colors">
              <td className="py-3 px-3 text-left font-bold text-foreground bg-card border-r border-border print:border-black sticky left-0 z-20 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.15)] whitespace-nowrap">
                {c.className} - {c.section}
              </td>
              {Array.from({ length: settings.periodsPerDay }, (_, i) => i + 1).map((p) => {
                const isGray = p > maxPForDay || p > classLimit;
                const pPos = p - 1;
                const hasBreakAfter = settings.breaks.includes(p) && p < settings.periodsPerDay;
                const cellData = isGray ? null : routine.grid[c.id]?.[dPos]?.[pPos];
                const isSource = draggedPos?.classId === c.id && draggedPos?.dPos === dPos && draggedPos?.pPos === pPos;
                const isTarget = dragOverPos?.classId === c.id && dragOverPos?.dPos === dPos && dragOverPos?.pPos === pPos;
                const clashReason = dayClashes.get(`${c.id}_${dPos}_${pPos}`) || dayClashes.get(`${c.id}_${pPos}`);

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
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.dataTransfer.dropEffect = "move";
                          if (dragOverPos?.classId !== c.id || dragOverPos?.dPos !== dPos || dragOverPos?.pPos !== pPos) {
                            setDragOverPos({ classId: c.id, dPos, pPos });
                          }
                        }}
                        onDragLeave={() => {
                          if (dragOverPos?.classId === c.id && dragOverPos?.dPos === dPos && dragOverPos?.pPos === pPos) {
                            setDragOverPos(null);
                          }
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          setDragOverPos(null);
                          setDraggedPos(null);
                          try {
                            const raw = e.dataTransfer.getData("application/json") || e.dataTransfer.getData("text/plain");
                            const data = JSON.parse(raw);
                            if (data?.classId) {
                              handleCellSwap(data.classId, data.dPos ?? dPos, data.pPos, c.id, dPos, pPos);
                            }
                          } catch (err) {
                            console.error("Drop parse error:", err);
                          }
                        }}
                        className={cn(
                          "py-2 px-1.5 border-r border-border last:border-r-0 transition-all select-none print:border-black",
                          isTarget
                            ? "bg-primary/20 ring-2 ring-inset ring-primary"
                            : "text-muted-foreground/30 hover:bg-muted/30"
                        )}
                      >
                        <div className="h-16 flex items-center justify-center text-xs font-mono">
                          {isTarget ? (
                            <span className="text-[10px] font-bold text-primary animate-pulse">Move here</span>
                          ) : (
                            "·"
                          )}
                        </div>
                      </td>
                    ) : (
                      <td
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.dataTransfer.dropEffect = "move";
                          if (dragOverPos?.classId !== c.id || dragOverPos?.dPos !== dPos || dragOverPos?.pPos !== pPos) {
                            setDragOverPos({ classId: c.id, dPos, pPos });
                          }
                        }}
                        onDragLeave={() => {
                          if (dragOverPos?.classId === c.id && dragOverPos?.dPos === dPos && dragOverPos?.pPos === pPos) {
                            setDragOverPos(null);
                          }
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          setDragOverPos(null);
                          setDraggedPos(null);
                          try {
                            const raw = e.dataTransfer.getData("application/json") || e.dataTransfer.getData("text/plain");
                            const data = JSON.parse(raw);
                            if (data?.classId) {
                              handleCellSwap(data.classId, data.dPos ?? dPos, data.pPos, c.id, dPos, pPos);
                            }
                          } catch (err) {
                            console.error("Drop parse error:", err);
                          }
                        }}
                        className={cn(
                          "py-1.5 px-1.5 border-r border-border last:border-r-0 h-16 align-top print:border-black transition-all",
                          isTarget && "bg-primary/20 ring-2 ring-inset ring-primary scale-[1.02] shadow-sm z-10"
                        )}
                      >
                        {(() => {
                          const subj = subjectMap.get(cellData.sid);
                          const tch = teacherMap.get(cellData.tid);
                          const rm = cellData.rid ? roomMap.get(cellData.rid) : null;
                          return (
                            <div
                              draggable={true}
                              onDragStart={(e) => {
                                setDraggedPos({ classId: c.id, dPos, pPos });
                                const payload = JSON.stringify({ classId: c.id, dPos, pPos });
                                e.dataTransfer.setData("application/json", payload);
                                e.dataTransfer.setData("text/plain", payload);
                                e.dataTransfer.effectAllowed = "move";
                              }}
                              onDragEnd={() => {
                                setDraggedPos(null);
                                setDragOverPos(null);
                              }}
                              className={cn(
                                "h-full rounded-md p-1.5 flex flex-col justify-between text-left border shadow-2xs transition-all cursor-grab active:cursor-grabbing select-none group",
                                cellData.lab
                                  ? "bg-blue-500/10 border-blue-300 dark:border-blue-800"
                                  : "bg-background border-border hover:border-primary/50 hover:shadow-xs",
                                subj?.isHard && "border-l-4 border-l-amber-500",
                                clashReason && "border-destructive bg-destructive/10 ring-1 ring-destructive",
                                isSource && "opacity-30 scale-95 ring-2 ring-dashed ring-primary"
                              )}
                            >
                              <div className="flex items-start justify-between gap-1">
                                <span className="font-bold text-foreground text-[11px] truncate block leading-tight flex-1">
                                  {subj?.name || "?"} {cellData.lab ? "(Lab)" : ""}
                                </span>
                                {clashReason ? (
                                  <span
                                    title={clashReason}
                                    className="text-[9px] font-bold text-destructive flex items-center gap-0.5 bg-destructive/15 px-1 rounded shrink-0"
                                  >
                                    <AlertTriangle className="w-2.5 h-2.5" /> Clash
                                  </span>
                                ) : (
                                  <GripVertical className="w-2.5 h-2.5 text-muted-foreground/30 group-hover:text-muted-foreground shrink-0 mt-0.5" />
                                )}
                              </div>
                              <div className="flex items-center justify-between text-[10px] text-muted-foreground mt-1">
                                <span className={cn(
                                  "font-semibold font-mono",
                                  clashReason ? "text-destructive font-bold" : "text-primary"
                                )}>
                                  {tch?.shortName || tch?.name || "?"}
                                </span>
                                {rm && (
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
        })
      )}
    </>
  );
}
