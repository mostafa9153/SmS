"use client";

import { Badge } from "@/components/ui/badge";
import { AlertTriangle, School } from "lucide-react";
import { cn } from "@/lib/utils";

import type { AllotmentOverviewState } from "./use-routine-allotment-overview";

export function ClassAllotmentChart({ ao }: { ao: AllotmentOverviewState }) {
  const { distinctSubjectNames, filterClass, filteredClassMatrix, grandTotalShowingPeriods, selectedTeacherObj } = ao;
  return (
    <div className="bg-card border rounded-xl shadow-xs overflow-hidden space-y-0">
      <div className="px-4 py-3 border-b bg-muted/20 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2.5">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <School className="w-4 h-4 text-primary" />
            Class-wise Subject & Teacher Allotment Matrix
          </h3>
          {selectedTeacherObj && (
            <Badge variant="secondary" className="font-mono text-xs font-semibold gap-1.5 bg-primary/10 text-primary border-primary/20">
              <span>{selectedTeacherObj.name} ({selectedTeacherObj.teacherCode})</span>
              <span>•</span>
              <span>{grandTotalShowingPeriods}P</span>
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-3 text-[11px] text-muted-foreground font-medium">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Allocated
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-500"></span> Missing Quota
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-rose-500"></span> Over Allotted
          </span>
        </div>
      </div>

      {/* Matrix Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="bg-muted/40 border-b text-muted-foreground font-semibold text-[11px]">
              <th className="py-2.5 px-3 text-left font-bold text-foreground sticky left-0 bg-muted/90 backdrop-blur-xs z-10 w-28 border-r">
                Class & Sec
              </th>
              {distinctSubjectNames.map((subName) => (
                <th key={subName} className="py-2.5 px-2.5 text-center font-bold text-foreground whitespace-nowrap min-w-[110px] border-r">
                  {subName}
                </th>
              ))}
              <th className="py-2.5 px-3 text-center font-bold text-primary sticky right-0 bg-muted/90 backdrop-blur-xs z-10 w-24">
                Total Periods
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {filteredClassMatrix.length === 0 ? (
              <tr>
                <td colSpan={distinctSubjectNames.length + 2} className="py-8 text-center text-muted-foreground italic">
                  {selectedTeacherObj
                    ? `No classes found for ${selectedTeacherObj.name} (${selectedTeacherObj.teacherCode})${filterClass !== "all" ? ` in ${filterClass}` : ""}.`
                    : "No matching classes found."}
                </td>
              </tr>
            ) : (
              filteredClassMatrix.map((row) => {
                const rowTeacherPeriods = selectedTeacherObj
                  ? Object.values(row.cells).reduce((acc, c) => {
                      const matching = c.teachers.filter(
                        (t) =>
                          t.teacherId === selectedTeacherObj.teacherId ||
                          t.teacherCode.toUpperCase() === selectedTeacherObj.teacherCode.toUpperCase()
                      );
                      return acc + matching.reduce((s, t) => s + t.periods, 0);
                    }, 0)
                  : row.totalClassAssigned;

                return (
                  <tr key={row.classId} className="hover:bg-muted/30 transition-colors">
                    {/* Class & Section Header */}
                    <td className="py-2 px-3 font-bold font-mono text-foreground sticky left-0 bg-card/95 backdrop-blur-xs z-10 border-r flex items-center gap-1.5">
                      <span>{row.label}</span>
                      {!selectedTeacherObj && row.hasIssues && (
                        <span title="Has unallotted or mismatched subjects" className="inline-flex shrink-0">
                          <AlertTriangle className="w-3 h-3 text-amber-500" />
                        </span>
                      )}
                    </td>

                    {/* Subject Cells */}
                    {distinctSubjectNames.map((subName) => {
                      const cell = row.cells[subName];
                      if (!cell || (cell.demandPeriods === 0 && cell.assignedPeriods === 0)) {
                        return (
                          <td key={subName} className="py-2 px-2 text-center text-muted-foreground/40 font-mono border-r">
                            —
                          </td>
                        );
                      }

                      const cellTeachers = selectedTeacherObj
                        ? cell.teachers.filter(
                            (t) =>
                              t.teacherId === selectedTeacherObj.teacherId ||
                              t.teacherCode.toUpperCase() === selectedTeacherObj.teacherCode.toUpperCase()
                          )
                        : cell.teachers;

                      if (selectedTeacherObj && cellTeachers.length === 0) {
                        return (
                          <td key={subName} className="py-2 px-2 text-center text-muted-foreground/30 font-mono border-r">
                            —
                          </td>
                        );
                      }

                      const isMissing = !selectedTeacherObj && cell.status === "missing";
                      const isOverflow = !selectedTeacherObj && cell.status === "overflow";

                      return (
                        <td
                          key={subName}
                          className={cn(
                            "py-2 px-2 text-center border-r transition-all group relative",
                            selectedTeacherObj
                              ? "bg-primary/5 hover:bg-primary/10"
                              : isMissing
                              ? "bg-amber-500/10 hover:bg-amber-500/20 ring-1 ring-inset ring-amber-500/30"
                              : isOverflow
                              ? "bg-rose-500/10 hover:bg-rose-500/20 ring-1 ring-inset ring-rose-500/30"
                              : ""
                          )}
                          title={`${subName} (${row.label})\nDemand: ${cell.demandPeriods} p/wk\nAssigned: ${cellTeachers.reduce((s, t) => s + t.periods, 0)} p/wk\n${cellTeachers.map((t) => `${t.teacherName} (${t.teacherCode}): ${t.periods}p`).join("\n")}${isMissing ? `\n⚠️ Missing ${cell.missingCount} periods!` : ""}`}
                        >
                          <div className="flex flex-col items-center justify-center gap-0.5">
                            {cellTeachers.length > 0 ? (
                              <div className="flex flex-wrap items-center justify-center gap-1">
                                {cellTeachers.map((t, tIdx) => (
                                  <span
                                    key={tIdx}
                                    className={cn(
                                      "inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-mono font-bold transition-transform hover:scale-105",
                                      isMissing
                                        ? "bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30"
                                        : isOverflow
                                        ? "bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-500/30"
                                        : "bg-primary/10 text-primary border border-primary/20"
                                    )}
                                  >
                                    {t.teacherCode} ({t.periods})
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/15 px-1.5 py-0.5 rounded border border-amber-500/30 font-mono">
                                ⚠️ 0/{cell.demandPeriods}
                              </span>
                            )}

                            {isMissing && cellTeachers.length > 0 && (
                              <span className="text-[9px] font-bold text-amber-600 dark:text-amber-400 font-mono">
                                (-{cell.missingCount}p)
                              </span>
                            )}
                            {isOverflow && (
                              <span className="text-[9px] font-bold text-rose-600 dark:text-rose-400 font-mono">
                                (+{cell.overflowCount}p)
                              </span>
                            )}
                          </div>
                        </td>
                      );
                    })}

                    {/* Total Periods Column */}
                    <td className="py-2 px-3 text-center font-bold font-mono text-primary sticky right-0 bg-card/95 backdrop-blur-xs z-10">
                      <span className={cn(
                        "px-2 py-0.5 rounded-md",
                        !selectedTeacherObj && row.totalClassAssigned !== row.totalClassDemand
                          ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                          : "bg-primary/10 text-primary"
                      )}>
                        {rowTeacherPeriods}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
          {/* Footer Summary Row */}
          <tfoot>
            <tr className="bg-muted/60 border-t-2 border-border font-bold text-foreground text-xs">
              <td className="py-2.5 px-3 sticky left-0 bg-muted/95 backdrop-blur-xs z-10 border-r font-mono">
                Total
              </td>
              {distinctSubjectNames.map((subName) => {
                const colTotal = filteredClassMatrix.reduce((sum, r) => {
                  const cell = r.cells[subName];
                  if (!cell) return sum;
                  if (!selectedTeacherObj) return sum + (cell.assignedPeriods || 0);
                  const matching = cell.teachers.filter(
                    (t) =>
                      t.teacherId === selectedTeacherObj.teacherId ||
                      t.teacherCode.toUpperCase() === selectedTeacherObj.teacherCode.toUpperCase()
                  );
                  return sum + matching.reduce((s, t) => s + t.periods, 0);
                }, 0);
                return (
                  <td key={subName} className="py-2.5 px-2.5 text-center font-mono border-r">
                    {colTotal > 0 ? colTotal : "—"}
                  </td>
                );
              })}
              <td className="py-2.5 px-3 text-center font-mono text-primary sticky right-0 bg-muted/95 backdrop-blur-xs z-10 text-sm">
                {grandTotalShowingPeriods}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
