"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  GeneratedRoutine,
  RoutineSettings,
  RoutineClass,
  RoutineTeacher,
  RoutineSubject,
  RoutineRoom,
  DAY_NAMES,
} from "@/lib/routine/types";
import { Button } from "@/components/ui/button";
import {
  Printer,
  Calendar,
  Users,
  School,
  Building2,
  Coffee,
  FlaskConical,
  Sparkles,
  ArrowRight,
  Sliders,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getClassNumericRank } from "@/lib/ems/ems-config-loader";

interface RoutineViewerTabProps {
  routine: GeneratedRoutine | null;
  settings: RoutineSettings;
  classes: RoutineClass[];
  teachers: RoutineTeacher[];
  subjects: RoutineSubject[];
  rooms: RoutineRoom[];
}

type ViewMode = "master" | "class" | "teacher" | "room";

export function RoutineViewerTab({
  routine,
  settings,
  classes,
  teachers,
  subjects,
  rooms,
}: RoutineViewerTabProps) {
  const sortedClasses = useMemo(() => {
    return [...classes].sort((a, b) => {
      const rankA = getClassNumericRank(a.className);
      const rankB = getClassNumericRank(b.className);
      if (rankA !== rankB) return rankA - rankB;
      return a.section.localeCompare(b.section);
    });
  }, [classes]);

  const [viewMode, setViewMode] = useState<ViewMode>("master");
  const [masterDayIdx, setMasterDayIdx] = useState<number>(0);
  const [selectedClassId, setSelectedClassId] = useState<string>(sortedClasses[0]?.id || "");
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>(teachers[0]?.id || "");
  const [selectedRoomId, setSelectedRoomId] = useState<string>(rooms[0]?.id || "");

  const classMap = useMemo(() => new Map(classes.map((c) => [c.id, c])), [classes]);
  const teacherMap = useMemo(() => new Map(teachers.map((t) => [t.id, t])), [teachers]);
  const subjectMap = useMemo(() => new Map(subjects.map((s) => [s.id, s])), [subjects]);
  const roomMap = useMemo(() => new Map(rooms.map((r) => [r.id, r])), [rooms]);

  const activeDays = routine?.days || settings.workingDays;
  const halfDays = settings.halfDays || [];
  const maxHalfP = settings.halfDayPeriods || 4;

  // Auto-sync initial selections when data loads
  React.useEffect(() => {
    if (!selectedClassId && classes.length > 0) setSelectedClassId(classes[0].id);
  }, [classes, selectedClassId]);

  React.useEffect(() => {
    if (!selectedTeacherId && teachers.length > 0) setSelectedTeacherId(teachers[0].id);
  }, [teachers, selectedTeacherId]);

  React.useEffect(() => {
    if (!selectedRoomId && rooms.length > 0) setSelectedRoomId(rooms[0].id);
  }, [rooms, selectedRoomId]);

  const handlePrint = () => {
    window.print();
  };

  if (!routine || !routine.grid || Object.keys(routine.grid).length === 0) {
    return (
      <div className="bg-card border rounded-lg p-12 text-center shadow-xs w-full space-y-4">
        <div className="p-3 bg-muted rounded-full w-fit mx-auto">
          <Calendar className="h-8 w-8 text-muted-foreground" />
        </div>
        <div className="space-y-1">
          <h3 className="text-base font-semibold text-foreground">No Timetable Generated Yet</h3>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            Please run the constraint satisfaction solver from the Generator engine to create your school timetable.
          </p>
        </div>
        <div className="pt-2">
          <Link href="/routine/generate">
            <Button size="sm" className="h-8 text-xs font-semibold gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              Go to Routine Generator
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 w-full">
      {/* Top Toolbar (Hidden on print) */}
      <div className="print:hidden bg-card border rounded-lg p-3 shadow-xs flex flex-wrap items-center justify-between gap-3">
        {/* Mode Segmented Controls */}
        <div className="flex items-center bg-muted/70 p-1 rounded-lg text-xs font-semibold gap-1 border border-border/70 overflow-x-auto">
          <button
            type="button"
            onClick={() => setViewMode("master")}
            className={cn(
              "px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 whitespace-nowrap",
              viewMode === "master"
                ? "bg-background text-foreground shadow-xs font-bold"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Calendar className="h-3.5 w-3.5" />
            <span>Master (Day-wise)</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode("class")}
            className={cn(
              "px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 whitespace-nowrap",
              viewMode === "class"
                ? "bg-background text-foreground shadow-xs font-bold"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <School className="h-3.5 w-3.5" />
            <span>Class-wise</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode("teacher")}
            className={cn(
              "px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 whitespace-nowrap",
              viewMode === "teacher"
                ? "bg-background text-foreground shadow-xs font-bold"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Users className="h-3.5 w-3.5" />
            <span>Teacher-wise</span>
          </button>

          {rooms.length > 0 && (
            <button
              type="button"
              onClick={() => setViewMode("room")}
              className={cn(
                "px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 whitespace-nowrap",
                viewMode === "room"
                  ? "bg-background text-foreground shadow-xs font-bold"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Building2 className="h-3.5 w-3.5" />
              <span>Room-wise</span>
            </button>
          )}
        </div>

        {/* Dynamic Selector Dropdown & Print Button */}
        <div className="flex items-center gap-2">
          {viewMode === "master" && (
            <select
              value={masterDayIdx}
              onChange={(e) => setMasterDayIdx(parseInt(e.target.value, 10))}
              className="h-8 rounded-md border border-input bg-background px-3 text-xs font-semibold"
            >
              {activeDays.map((dIdx, pos) => (
                <option key={pos} value={pos}>
                  {DAY_NAMES[dIdx]} {halfDays.includes(dIdx) ? "(Half Day)" : ""}
                </option>
              ))}
            </select>
          )}

          {viewMode === "class" && (
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="h-8 rounded-md border border-input bg-background px-3 text-xs font-semibold"
            >
              {sortedClasses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.className} - {c.section}
                </option>
              ))}
            </select>
          )}

          {viewMode === "teacher" && (
            <select
              value={selectedTeacherId}
              onChange={(e) => setSelectedTeacherId(e.target.value)}
              className="h-8 rounded-md border border-input bg-background px-3 text-xs font-semibold"
            >
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.shortName || "-"})
                </option>
              ))}
            </select>
          )}

          {viewMode === "room" && (
            <select
              value={selectedRoomId}
              onChange={(e) => setSelectedRoomId(e.target.value)}
              className="h-8 rounded-md border border-input bg-background px-3 text-xs font-semibold"
            >
              {rooms.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} {r.isLab ? "(Lab)" : ""}
                </option>
              ))}
            </select>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={handlePrint}
            className="h-8 text-xs font-semibold gap-1.5 bg-background shadow-xs"
          >
            <Printer className="h-3.5 w-3.5" />
            Print Timetable
          </Button>
        </div>
      </div>

      {/* Printable Sheet Header (Only visible in Print view) */}
      <div className="hidden print:block text-center border-b pb-3 mb-4">
        <h1 className="text-xl font-bold uppercase tracking-tight">Academic Routine & Master Timetable</h1>
        <div className="text-xs text-muted-foreground font-semibold mt-0.5">
          {viewMode === "master" && `Master Schedule — ${DAY_NAMES[activeDays[masterDayIdx] || 0]}`}
          {viewMode === "class" && `Class Schedule — ${classMap.get(selectedClassId)?.className || ""} ${classMap.get(selectedClassId)?.section || ""}`}
          {viewMode === "teacher" && `Faculty Timetable — ${teacherMap.get(selectedTeacherId)?.name || ""} (${teacherMap.get(selectedTeacherId)?.shortName || ""})`}
          {viewMode === "room" && `Facility Timetable — ${roomMap.get(selectedRoomId)?.name || ""}`}
        </div>
      </div>

      {/* Timetable Grid Container */}
      <div className="bg-card border rounded-lg shadow-xs overflow-hidden print:border-black print:rounded-none">
        <style dangerouslySetInnerHTML={{ __html: `
          @media print {
            @page { size: landscape; margin: 8mm; }
            * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          }
        `}} />
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-center border-collapse">
            <thead>
              <tr className="bg-muted/70 border-b text-foreground font-semibold print:bg-gray-100 print:text-black">
                <th className="py-2.5 px-3 text-left border-r border-border print:border-black w-32 font-bold">
                  {viewMode === "master" ? "Class \\ Period" : "Day \\ Period"}
                </th>
                {Array.from({ length: settings.periodsPerDay }, (_, i) => i + 1).map((p) => {
                  const isBreak = settings.breaks.includes(p);
                  return (
                    <th
                      key={p}
                      className={cn(
                        "py-2.5 px-2 border-r last:border-r-0 border-border print:border-black min-w-[110px]",
                        isBreak && "bg-amber-500/20 text-amber-800 dark:text-amber-300 font-bold"
                      )}
                    >
                      {isBreak ? (
                        <div className="flex items-center justify-center gap-1">
                          <Coffee className="w-3 h-3 text-amber-600" />
                          <span>Recess</span>
                        </div>
                      ) : (
                        <span>Period {p}</span>
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-border print:divide-black">
              {/* MASTER VIEW (Day-wise: Rows = Classes) */}
              {viewMode === "master" && (
                <>
                  {sortedClasses.map((c) => {
                    const dPos = masterDayIdx || 0;
                    const actDay = activeDays[dPos];
                    const maxPForDay = halfDays.includes(actDay)
                      ? maxHalfP
                      : settings.periodsPerDay;
                    const classLimit = c.dailyPeriods || settings.periodsPerDay;
                    let pPos = 0;

                    return (
                      <tr key={c.id} className="hover:bg-muted/20 transition-colors">
                        <td className="py-3 px-3 text-left font-bold text-foreground bg-muted/30 border-r border-border print:border-black">
                          {c.className} - {c.section}
                        </td>
                        {Array.from({ length: settings.periodsPerDay }, (_, i) => i + 1).map((p) => {
                          const isBreak = settings.breaks.includes(p);
                          const isGray = p > maxPForDay || p > classLimit;

                          if (isGray) {
                            return (
                              <td
                                key={p}
                                className="py-2 px-1.5 border-r border-border last:border-r-0 bg-muted/40 text-muted-foreground/30 print:bg-gray-50 print:border-black select-none font-mono"
                              >
                                -
                              </td>
                            );
                          }

                          if (isBreak) {
                            return (
                              <td
                                key={p}
                                className="py-2 px-1.5 border-r border-border last:border-r-0 bg-amber-500/10 text-amber-700 dark:text-amber-400 font-semibold text-[10px] print:border-black"
                              >
                                Tiffin Break
                              </td>
                            );
                          }

                          const cellData = routine.grid[c.id]?.[dPos]?.[pPos];
                          pPos++;

                          if (!cellData) {
                            return (
                              <td
                                key={p}
                                className="py-2 px-1.5 border-r border-border last:border-r-0 text-muted-foreground/30 print:border-black"
                              >
                                ·
                              </td>
                            );
                          }

                          const subj = subjectMap.get(cellData.sid);
                          const tch = teacherMap.get(cellData.tid);
                          const rm = cellData.rid ? roomMap.get(cellData.rid) : null;

                          return (
                            <td
                              key={p}
                              className="py-1.5 px-1.5 border-r border-border last:border-r-0 h-16 align-top print:border-black"
                            >
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
                                  {subj?.name || "?"} {cellData.lab ? "(Lab)" : ""}
                                </span>
                                <div className="flex items-center justify-between text-[10px] text-muted-foreground mt-1">
                                  <span className="font-semibold text-primary font-mono">
                                    {tch?.shortName || tch?.name || "?"}
                                  </span>
                                  {rm && (
                                    <span className="bg-amber-500/20 text-amber-800 dark:text-amber-300 px-1 py-0.2 rounded text-[9px] font-bold">
                                      {rm.name.split(" ")[0]}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </>
              )}

              {/* CLASS-WISE / TEACHER-WISE / ROOM-WISE (Rows = Days) */}
              {viewMode !== "master" && (
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
                    let pPos = 0;

                    return (
                      <tr key={dIdx} className="hover:bg-muted/20 transition-colors">
                        <td className="py-3 px-3 text-left font-bold text-foreground bg-muted/30 border-r border-border print:border-black">
                          {DAY_NAMES[dIdx]} {halfDays.includes(dIdx) && "(Half)"}
                        </td>
                        {Array.from({ length: settings.periodsPerDay }, (_, i) => i + 1).map((p) => {
                          const isBreak = settings.breaks.includes(p);
                          const isGray = p > maxPForDay || p > entityLimit;

                          if (isGray) {
                            return (
                              <td
                                key={p}
                                className="py-2 px-1.5 border-r border-border last:border-r-0 bg-muted/40 text-muted-foreground/30 print:bg-gray-50 print:border-black select-none font-mono"
                              >
                                -
                              </td>
                            );
                          }

                          if (isBreak) {
                            return (
                              <td
                                key={p}
                                className="py-2 px-1.5 border-r border-border last:border-r-0 bg-amber-500/10 text-amber-700 dark:text-amber-400 font-semibold text-[10px] print:border-black"
                              >
                                Tiffin Break
                              </td>
                            );
                          }

                          let cellData = null;
                          let associatedClassId = selectedClassId;

                          if (viewMode === "class") {
                            cellData = routine.grid[selectedClassId]?.[dPos]?.[pPos];
                          } else if (viewMode === "teacher") {
                            classes.forEach((c) => {
                              const cell = routine.grid[c.id]?.[dPos]?.[pPos];
                              if (cell && cell.tid === selectedTeacherId) {
                                cellData = cell;
                                associatedClassId = c.id;
                              }
                            });
                          } else if (viewMode === "room") {
                            classes.forEach((c) => {
                              const cell = routine.grid[c.id]?.[dPos]?.[pPos];
                              if (cell && cell.rid === selectedRoomId) {
                                cellData = cell;
                                associatedClassId = c.id;
                              }
                            });
                          }

                          pPos++;

                          if (!cellData) {
                            return (
                              <td
                                key={p}
                                className="py-2 px-1.5 border-r border-border last:border-r-0 text-muted-foreground/30 print:border-black"
                              >
                                ·
                              </td>
                            );
                          }

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
                            <td
                              key={p}
                              className="py-1.5 px-1.5 border-r border-border last:border-r-0 h-16 align-top print:border-black"
                            >
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
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Workflow Navigation Footer */}
      <div className="print:hidden pt-4 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
        <Link href="/routine/generate">
          <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
            ← Back to Generator Engine
          </Button>
        </Link>
        <Link href="/routine">
          <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
            <Sliders className="w-3.5 h-3.5" />
            Adjust Setup Hub Configuration
          </Button>
        </Link>
      </div>
    </div>
  );
}

