"use client";

import { Edit } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { StatusBadge } from "@/components/students/status-badge";
import { Spinner } from "@/components/ui/spinner";
import { EmptyState } from "@/components/ui/empty-state";

import type { ResultsClientState } from "./use-results-client";

export function ClassSummaryView({ rc }: { rc: ResultsClientState }) {
  const { currentClassFullMarks, filteredResults, handleOpenEdit, isHs, isLoading, promotionPolicy, rankViewMode, renderRankBadge, summary } = rc;
  return (
    <div className="space-y-4">
      {/* Metric Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-2xs">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
            Total Enrolled
          </span>
          <div className="text-2xl font-mono font-extrabold text-foreground mt-1">
            {summary?.totalStudents || 0}
          </div>
        </div>

        <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-2xs">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
            Evaluated
          </span>
          <div className="text-2xl font-mono font-extrabold text-primary mt-1">
            {summary?.evaluatedCount || 0}{" "}
            <span className="text-xs font-normal text-muted-foreground">
              / {summary?.totalStudents || 0}
            </span>
          </div>
        </div>

        <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-2xs">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
            Highest Marks
          </span>
          <div className="text-2xl font-mono font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">
            {summary?.highestMarks || 0}{" "}
            <span className="text-xs font-normal text-muted-foreground">
              / {currentClassFullMarks}
            </span>
          </div>
        </div>

        <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-2xs">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
            Class Average
          </span>
          <div className="text-2xl font-mono font-extrabold text-blue-600 dark:text-blue-400 mt-1">
            {summary?.averageMarks || 0}{" "}
            <span className="text-xs font-normal text-muted-foreground">
              ({currentClassFullMarks > 0 ? (((summary?.averageMarks || 0) / currentClassFullMarks) * 100).toFixed(1) : 0}%)
            </span>
          </div>
        </div>
      </div>

      {/* Desktop Data Table */}
      <div className="hidden md:block rounded-2xl border border-border/80 bg-card/90 overflow-x-auto shadow-xs">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/60">
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground tracking-wider uppercase w-14">
                Roll
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground tracking-wider uppercase">
                Student Name
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground tracking-wider uppercase w-40">
                {isHs ? "Reg No / PEN" : "School ID / PEN"}
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground tracking-wider uppercase w-14">
                Sec
              </th>
              {isHs && (
                <th className="px-4 py-3 text-center text-xs font-semibold text-purple-700 dark:text-purple-300 tracking-wider uppercase w-16">
                  Sem
                </th>
              )}
              <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground tracking-wider uppercase">
                Total Obtained
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground tracking-wider uppercase">
                Percentage
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground tracking-wider uppercase">
                Grade
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground tracking-wider uppercase">
                Auto-Promotion Status
              </th>
              {(rankViewMode === "both" || rankViewMode === "section") && (
                <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground tracking-wider uppercase">
                  Sec Rank
                </th>
              )}
              {(rankViewMode === "both" || rankViewMode === "class") && (
                <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground tracking-wider uppercase">
                  Class Rank
                </th>
              )}
              <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground tracking-wider uppercase w-24">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {isLoading ? (
              <tr>
                <td colSpan={12} className="py-16 text-center text-muted-foreground">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Spinner className="h-6 w-6 text-primary" />
                    <span className="text-xs">Loading student summary…</span>
                  </div>
                </td>
              </tr>
            ) : filteredResults.length === 0 ? (
              <tr>
                <td colSpan={12} className="py-16 text-center text-muted-foreground text-xs">
                  No student records found.
                </td>
              </tr>
            ) : (
              filteredResults.map((r) => {
                const isEvaluated = r.marksObtained > 0;

                return (
                  <tr key={r.studentId} className="hover:bg-primary/[0.04] transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-foreground">
                      {r.roll}
                    </td>
                    <td className="px-4 py-3 font-semibold text-foreground">
                      {r.student?.name}
                    </td>
                    <td className="px-4 py-3 font-mono text-muted-foreground text-xs">
                      <div>
                        {isHs
                          ? (r.student?.boardRegistrationNo || <span className="text-muted-foreground/40 italic">—</span>)
                          : r.student?.schoolId}
                      </div>
                      {r.student?.pen && (
                        <div className="text-[10px] text-muted-foreground/70">PEN: {r.student.pen}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center font-semibold text-muted-foreground">
                      {r.section}
                    </td>
                    {isHs && (
                      <td className="px-4 py-3 text-center">
                        <Badge variant="outline" className="text-[10px] font-mono text-purple-700 dark:text-purple-300">
                          {r.student?.presentSemester || r.semester || "—"}
                        </Badge>
                      </td>
                    )}
                    <td className="px-4 py-3 text-right font-mono font-bold">
                      {isEvaluated ? (
                        <span>
                          {r.marksObtained}{" "}
                          <span className="text-[10px] text-muted-foreground font-normal">
                            / {r.fullMarks}
                          </span>
                        </span>
                      ) : (
                        <span className="text-muted-foreground/40 italic font-normal">Pending</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold">
                      {isEvaluated ? (
                        <span
                          className={cn(
                            r.percentage >= 60
                              ? "text-emerald-700 dark:text-emerald-400"
                              : r.percentage >= (promotionPolicy.subjectPassPercentage ?? promotionPolicy.minPassPercentage ?? 30)
                              ? "text-amber-700 dark:text-amber-400"
                              : "text-rose-600 dark:text-rose-400"
                          )}
                        >
                          {r.percentage}%
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {isEvaluated ? (
                        <Badge variant="outline" className="text-[10px] font-bold">
                          {r.grade ? r.grade.split(" ")[0] : "—"}
                        </Badge>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {isEvaluated && r.evaluatedStatus ? (
                        <StatusBadge status={r.evaluatedStatus} size="sm" />
                      ) : (
                        <span className="text-muted-foreground/40 italic text-[11px]">—</span>
                      )}
                    </td>
                    {(rankViewMode === "both" || rankViewMode === "section") && (
                      <td className="px-4 py-3 text-center">
                        {isEvaluated ? renderRankBadge(r.rankInSection) : "—"}
                      </td>
                    )}
                    {(rankViewMode === "both" || rankViewMode === "class") && (
                      <td className="px-4 py-3 text-center">
                        {isEvaluated ? renderRankBadge(r.rankInClass) : "—"}
                      </td>
                    )}
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleOpenEdit(r)}
                        className="inline-flex items-center gap-1 rounded-xl border border-border/80 px-2.5 py-1 text-xs font-semibold hover:bg-muted transition-colors cursor-pointer"
                      >
                        <Edit className="h-3 w-3 text-muted-foreground" />
                        <span>{isEvaluated ? "Edit All" : "Enter"}</span>
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Stacked Cards (<md) */}
      <div className="flex flex-col gap-2.5 md:hidden">
        {isLoading ? (
          <div className="rounded-2xl border bg-card p-8 text-center text-xs text-muted-foreground">
            <Spinner className="h-5 w-5 mx-auto mb-2 text-primary" />
            Loading summary…
          </div>
        ) : filteredResults.length === 0 ? (
          <EmptyState compact title="No students found." className="rounded-2xl border bg-card" />
        ) : (
          filteredResults.map((r) => {
            const isEvaluated = r.marksObtained > 0;
            return (
              <div key={r.studentId} className="rounded-2xl border border-border/80 bg-card p-3.5 shadow-2xs space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-xs font-bold text-foreground bg-muted px-2 py-0.5 rounded-lg">
                        Roll {r.roll}
                      </span>
                      <span className="font-bold text-xs text-foreground">{r.student?.name}</span>
                    </div>
                    <div className="text-[11px] font-mono text-muted-foreground">
                      {isHs
                        ? (r.student?.boardRegistrationNo ? `Reg: ${r.student.boardRegistrationNo}` : `ID: ${r.student?.schoolId}`)
                        : r.student?.schoolId}
                      {" • Sec "}{r.section}
                      {r.student?.presentSemester && ` • ${r.student.presentSemester}`}
                    </div>
                  </div>

                  <button
                    onClick={() => handleOpenEdit(r)}
                    className="inline-flex items-center gap-1 rounded-xl border border-border/80 px-2.5 py-1 text-xs font-semibold hover:bg-muted shrink-0"
                  >
                    <Edit className="h-3 w-3 text-muted-foreground" />
                    <span>{isEvaluated ? "Edit All" : "Enter"}</span>
                  </button>
                </div>

                <div className="flex items-center justify-between pt-2 border-t text-xs">
                  <div>
                    <span className="text-[10px] text-muted-foreground block">Marks / %</span>
                    <span className="font-mono font-bold">
                      {isEvaluated ? (
                        <>
                          {r.marksObtained} / {r.fullMarks}{" "}
                          <span className="text-primary font-normal">({r.percentage}%)</span>
                        </>
                      ) : (
                        <span className="text-muted-foreground/50 italic">Pending</span>
                      )}
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] text-muted-foreground block">Status</span>
                    {isEvaluated && r.evaluatedStatus ? (
                      <StatusBadge status={r.evaluatedStatus} size="sm" />
                    ) : (
                      <span className="text-muted-foreground/40 italic">—</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
