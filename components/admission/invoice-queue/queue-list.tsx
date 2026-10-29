"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Printer, Users, CheckCheck, ChevronDown, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { getCandidateQueuedTime } from "./types";
import type { InvoiceQueueState } from "./use-invoice-queue";

export function QueueList({ queue }: { queue: InvoiceQueueState }) {
  const { displayedGroups, expandedGroupKeys, handleOneClickPrint, handleSingleStudentPrint, loadingApplications, loadingStudents, queueTab, toggleGroupExpand, viewMode } = queue;
  return (
  <div className="print:hidden">
    {loadingStudents || loadingApplications ? (
      <div className="p-12 text-center text-xs text-muted-foreground animate-pulse">
        Loading {queueTab === "new" ? "New Admission" : queueTab === "re" ? "Re-Admission" : "Admission"} invoice queue...
      </div>
    ) : displayedGroups.length === 0 ? (
      <div className="bg-card border rounded-3xl p-12 text-center space-y-3">
        <div
          className={cn(
            "h-14 w-14 rounded-full flex items-center justify-center mx-auto",
            queueTab === "new" ? "bg-emerald-500/10 text-emerald-600" : "bg-purple-500/10 text-purple-600"
          )}
        >
          <CheckCheck className="h-7 w-7" />
        </div>
        <h3 className="text-base font-bold text-foreground">
          No Pending Invoices in {queueTab === "new" ? "New Admission" : queueTab === "re" ? "Re-Admission" : "Queue"}
        </h3>
        <div className="pt-2 flex items-center justify-center gap-3">
          {queueTab === "new" ? (
            <Link
              href="/admission/new"
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all"
            >
              New Admission Wizard
            </Link>
          ) : (
            <Link
              href="/admission/re"
              className="px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold transition-all"
            >
              Re-admission Desk
            </Link>
          )}
        </div>
      </div>
    ) : viewMode === "list" ? (
      /* LIST VIEW */
      <div className="space-y-3">
        {displayedGroups.map((group) => {
          const isExpanded = expandedGroupKeys.has(group.key);
          const minRoll = group.students[0]?.presentRoll || 1;
          const maxRoll =
            group.students[group.students.length - 1]?.presentRoll || group.totalCount;

          const isNewAd = queueTab === "new" || group.students.some((s) => s.admissionSource === "new_admission");

          return (
            <div
              key={group.key}
              className="bg-card border border-border/80 rounded-2xl shadow-2xs hover:border-emerald-300 dark:hover:border-emerald-800 transition-all overflow-hidden"
            >
              <div className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5 min-w-0">
                  <div
                    className={cn(
                      "px-3.5 py-2 rounded-xl font-black text-sm sm:text-base shrink-0 border",
                      isNewAd
                        ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20"
                        : "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20"
                    )}
                  >
                    {group.class} - {group.section}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base sm:text-lg font-black text-foreground">
                        Class {group.class} - {group.section}{" "}
                        <span
                          className={cn(
                            isNewAd
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-purple-600 dark:text-purple-400"
                          )}
                        >
                          ({group.totalCount})
                        </span>
                      </h3>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        Ready
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      Rolls: #{minRoll} to #{maxRoll}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 shrink-0 self-end md:self-auto w-full md:w-auto">
                  <button
                    type="button"
                    onClick={() => toggleGroupExpand(group.key)}
                    className="text-xs font-semibold px-3 py-2 rounded-xl border hover:bg-muted text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>{isExpanded ? "Hide" : `Students (${group.totalCount})`}</span>
                    <ChevronDown
                      className={cn(
                        "h-3.5 w-3.5 transition-transform duration-200",
                        isExpanded && "rotate-180"
                      )}
                    />
                  </button>

                  <Button
                    onClick={() => handleOneClickPrint(group)}
                    className={cn(
                      "flex-1 md:flex-initial text-white font-bold text-xs sm:text-sm h-10 px-5 rounded-xl shadow-xs cursor-pointer flex items-center justify-center gap-2 transition-all hover:scale-[1.02]",
                      isNewAd
                        ? "bg-emerald-600 hover:bg-emerald-700"
                        : "bg-purple-600 hover:bg-purple-700"
                    )}
                  >
                    <Printer className="h-4 w-4" />
                    <span>Batch Print ({group.totalCount})</span>
                  </Button>
                </div>
              </div>

              {isExpanded && (
                <div className="border-t border-border/70 bg-muted/20 p-4 space-y-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                    {group.students.map((student) => {
                      const timeInfo = getCandidateQueuedTime(student);
                      const isNew = student.admissionSource === "new_admission";
                      return (
                        <div
                          key={student.id}
                          className="flex items-center justify-between p-3 rounded-xl bg-background border border-border/80 text-xs gap-2 shadow-2xs hover:border-emerald-300 dark:hover:border-emerald-800 transition-colors"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="font-mono font-bold text-[11px] w-6 text-muted-foreground shrink-0">
                              #{student.presentRoll}
                            </span>
                            <div className="truncate min-w-0">
                              <div className="flex items-center gap-1.5">
                                <p className="font-bold text-foreground truncate">{student.name}</p>
                                {isNew && (
                                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 shrink-0">
                                    New
                                  </span>
                                )}
                              </div>
                              <p className="text-[10px] text-muted-foreground font-mono truncate">
                                {student.schoolId || student.formNo || student.id.slice(0, 8)}
                              </p>
                              <span className="text-[9.5px] text-muted-foreground font-mono flex items-center gap-1 pt-0.5">
                                <Clock className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                                <span>{timeInfo.dateStr}, {timeInfo.timeStr}</span>
                              </span>
                            </div>
                          </div>
                          <div className="flex flex-col items-end shrink-0 gap-1.5">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleSingleStudentPrint(student)}
                              className={cn(
                                "h-7 px-2.5 text-[11px] font-bold rounded-lg gap-1 cursor-pointer",
                                isNew
                                  ? "hover:bg-emerald-50 text-emerald-700 border-emerald-200"
                                  : "hover:bg-purple-50 text-purple-700 border-purple-200"
                              )}
                            >
                              <Printer className="w-3 h-3" />
                              <span>Print</span>
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    ) : (
      /* GRID VIEW */
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {displayedGroups.map((group) => {
          const isNewAd = queueTab === "new" || group.students.some((s) => s.admissionSource === "new_admission");

          return (
            <div
              key={group.key}
              className="bg-card border border-border/80 rounded-3xl p-5 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between border-b pb-3.5 mb-3.5">
                  <span
                    className={cn(
                      "px-3 py-1 rounded-xl font-black text-sm border",
                      isNewAd
                        ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20"
                        : "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20"
                    )}
                  >
                    Class {group.class} - {group.section}
                  </span>
                  <span
                    className={cn(
                      "text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1",
                      isNewAd
                        ? "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40"
                        : "text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/40"
                    )}
                  >
                    <Users className="h-3.5 w-3.5" />
                    <span>({group.totalCount})</span>
                  </span>
                </div>

                <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1 custom-scrollbar">
                  {group.students.map((student) => {
                    const timeInfo = getCandidateQueuedTime(student);
                    return (
                      <div
                        key={student.id}
                        className="flex items-center justify-between text-xs py-2 px-2.5 rounded-xl bg-muted/40 hover:bg-muted/70 transition-colors gap-2"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-mono font-bold text-[10px] w-6 text-muted-foreground shrink-0">
                            #{student.presentRoll}
                          </span>
                          <div className="truncate min-w-0">
                            <span className="font-medium text-foreground truncate block">
                              {student.name}
                            </span>
                            <span className="text-[9.5px] text-muted-foreground font-mono flex items-center gap-1">
                              <Clock className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                              <span>{timeInfo.dateStr}, {timeInfo.timeStr}</span>
                            </span>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSingleStudentPrint(student)}
                          className={cn(
                            "h-6 px-2 text-[10px] font-bold rounded cursor-pointer",
                            isNewAd
                              ? "hover:bg-emerald-100 text-emerald-700"
                              : "hover:bg-purple-100 text-purple-700"
                          )}
                        >
                          <Printer className="w-3 h-3 mr-0.5" /> Print
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="mt-5 pt-4 border-t border-border/60">
                <Button
                  onClick={() => handleOneClickPrint(group)}
                  className={cn(
                    "w-full text-white font-bold text-xs h-10 rounded-xl shadow-xs cursor-pointer flex items-center justify-center gap-2",
                    isNewAd
                      ? "bg-emerald-600 hover:bg-emerald-700"
                      : "bg-purple-600 hover:bg-purple-700"
                  )}
                >
                  <Printer className="h-4 w-4" />
                  <span>Batch Print ({group.totalCount})</span>
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    )}
  </div>
  );
}
