"use client";

import { StatusBadge } from "@/components/students/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { CustomSelect } from "@/components/ui/custom-select";
import { cn } from "@/lib/utils";
import { ArrowRight, RotateCcw, Users } from "lucide-react";
import { OVERRIDE_STATUS_OPTIONS } from "@/components/students/promotion/constants";
import type { PromotionDeskState } from "./use-promotion-desk";

export function RosterTable({ desk }: { desk: PromotionDeskState }) {
  const { allDisplayedSelected, displayedStudents, evaluatedCohortWithRolls, handleClearSelection, handleResetOverride, handleSelectAllCohort, handleSetOverride, isLoading, selectedIds, toggleAll, toggleOne } = desk;
  return (
    <>
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-xl" />
          ))}
        </div>
      ) : displayedStudents.length === 0 ? (
        <EmptyState icon={Users} title="No students found matching current filters" className="rounded-2xl border bg-card" />
      ) : (
        <div className="rounded-2xl border bg-card overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/60 border-b text-[11px] font-bold text-muted-foreground uppercase">
                <tr>
                  <th className="pl-4 pr-2 py-3 w-8">
                    <input
                      type="checkbox"
                      checked={allDisplayedSelected}
                      onChange={toggleAll}
                      className="rounded accent-primary cursor-pointer"
                    />
                  </th>
                  <th className="px-3 py-3 w-16">Roll</th>
                  <th className="px-3 py-3">Student Profile</th>
                  <th className="px-3 py-3">Exam Performance</th>
                  <th className="px-3 py-3">Auto Status</th>
                  <th className="px-3 py-3">Target Transition</th>
                  <th className="px-3 py-3 w-20 text-center">Next Roll</th>
                  <th className="px-3 py-3 pr-4 text-right">Teacher Override</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {displayedStudents.map((item) => {
                  const s = item.student;
                  const isSelected = selectedIds.has(s.id);
                  const isOverridden = item.isOverridden;

                  return (
                    <tr
                      key={s.id}
                      className={cn(
                        "transition-colors",
                        isSelected ? "bg-primary/5 dark:bg-primary/10" : "hover:bg-muted/30"
                      )}
                    >
                      <td className="pl-4 pr-2 py-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleOne(s.id)}
                          className="rounded accent-primary cursor-pointer"
                        />
                      </td>

                      <td className="px-3 py-3 font-mono font-bold text-muted-foreground">
                        #{s.presentRoll}
                      </td>

                      <td className="px-3 py-3">
                        <div>
                          <p className="font-bold text-foreground text-xs">{s.name}</p>
                          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-mono mt-0.5">
                            <span>{s.schoolId || s.id.slice(0, 8)}</span>
                            {s.presentSemester && (
                              <span className="px-1.5 py-0.2 rounded bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 font-sans font-semibold">
                                {s.presentSemester}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="px-3 py-3">
                        {item.hasRecordedMarks ? (
                          <div>
                            <div className="flex items-center gap-1.5 font-bold">
                              <span>{item.marksObtained} / {item.fullMarks}</span>
                              <span className={cn(
                                "text-[10px] px-1.5 py-0.5 rounded font-mono",
                                item.percentage >= 35 ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300" : "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300"
                              )}>
                                {item.percentage}%
                              </span>
                            </div>
                            {item.failedSubjectNames.length > 0 && (
                              <p className="text-[10px] text-rose-600 dark:text-rose-400 mt-0.5 line-clamp-1">
                                Fail: {item.failedSubjectNames.join(", ")}
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="text-[10px] text-muted-foreground italic font-mono">
                            {item.autoEval.isAutoPass ? "RTE Auto-Pass" : "No marks entered"}
                          </span>
                        )}
                      </td>

                      <td className="px-3 py-3">
                        <StatusBadge status={item.autoEval.eligibleStatus} size="sm" />
                      </td>

                      <td className="px-3 py-3 font-medium">
                        <div className="flex items-center gap-1.5 text-xs">
                          <span className="text-muted-foreground font-mono">
                            {s.presentClass}
                            {s.presentSemester ? ` (${s.presentSemester})` : ""}
                          </span>
                          <ArrowRight className="h-3 w-3 text-muted-foreground/60 shrink-0" />
                          <span className={cn(
                            "font-bold",
                            item.targetStatus === "Promoted But Not Admitted" || item.targetStatus === "Continuing"
                              ? "text-emerald-700 dark:text-emerald-400"
                              : item.targetStatus === "Sent Up M.P." || item.targetStatus === "Passed Out"
                              ? "text-blue-700 dark:text-blue-400"
                              : "text-rose-700 dark:text-rose-400"
                          )}>
                            {item.targetClass}
                            {item.targetSemester ? ` (${item.targetSemester})` : ""}
                          </span>
                        </div>
                      </td>

                      <td className="px-3 py-3 text-center">
                        <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-lg bg-muted text-foreground font-mono font-bold text-xs border">
                          #{item.predictedRoll}
                        </span>
                      </td>

                      <td className="px-3 py-3 pr-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <CustomSelect
                            value={item.targetStatus}
                            onChange={(val) => handleSetOverride(s.id, val as any)}
                            className="w-[180px] text-xs h-8"
                            options={OVERRIDE_STATUS_OPTIONS}
                          />
                          {isOverridden && (
                            <button
                              onClick={() => handleResetOverride(s.id)}
                              title="Reset to Auto Evaluation"
                              className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-rose-600 transition-colors cursor-pointer border"
                            >
                              <RotateCcw className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="p-3 bg-muted/30 border-t flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <button
                onClick={handleSelectAllCohort}
                className="font-semibold text-primary hover:underline cursor-pointer"
              >
                Select All {evaluatedCohortWithRolls.length} Students
              </button>
              <span>•</span>
              <button
                onClick={handleClearSelection}
                className="font-semibold text-muted-foreground hover:underline cursor-pointer"
              >
                Deselect All
              </button>
            </div>
            <span>Showing {displayedStudents.length} of {evaluatedCohortWithRolls.length} students</span>
          </div>
        </div>
      )}
    </>
  );
}
