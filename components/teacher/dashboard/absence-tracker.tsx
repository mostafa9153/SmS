"use client";

import { CheckCircle2, CalendarX, History } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";

import type { TeacherDashboardState } from "./use-teacher-dashboard";

export function AbsenceTracker({ gen }: { gen: TeacherDashboardState }) {
  const { absences, setIsMarkAbsenceOpen, setTrackerFilterMonth, setTrackerFilterYear, trackerFilterMonth, trackerFilterYear } = gen;
  return (
    <section className="p-4 sm:p-5 rounded-2xl bg-card border border-border/80 shadow-xs space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/60">
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 text-rose-500" />
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-foreground">
              My Absence &amp; Leave Records
            </h2>
            <p className="text-[11px] text-muted-foreground">
              Track your monthly and yearly leave history. Preserved across academic years.
            </p>
          </div>
        </div>

        {/* Filters: Year & Month */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-muted/40 p-1 rounded-xl border border-border/60">
            <label className="text-[10px] font-bold text-muted-foreground uppercase px-1.5">Year:</label>
            <select
              value={trackerFilterYear}
              onChange={(e) => setTrackerFilterYear(Number(e.target.value))}
              className="h-7 text-xs bg-transparent border-0 font-bold text-foreground cursor-pointer focus:outline-none"
            >
              {[
                new Date().getFullYear() + 1,
                new Date().getFullYear(),
                new Date().getFullYear() - 1,
                new Date().getFullYear() - 2,
              ].map((y) => (
                <option key={y} value={y} className="bg-card text-foreground">
                  {y}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1 bg-muted/40 p-1 rounded-xl border border-border/60">
            <label className="text-[10px] font-bold text-muted-foreground uppercase px-1.5">Month:</label>
            <select
              value={trackerFilterMonth}
              onChange={(e) => setTrackerFilterMonth(e.target.value)}
              className="h-7 text-xs bg-transparent border-0 font-bold text-foreground cursor-pointer focus:outline-none"
            >
              <option value="ALL" className="bg-card text-foreground">All Months</option>
              {[
                { val: "1", label: "Jan" },
                { val: "2", label: "Feb" },
                { val: "3", label: "Mar" },
                { val: "4", label: "Apr" },
                { val: "5", label: "May" },
                { val: "6", label: "Jun" },
                { val: "7", label: "Jul" },
                { val: "8", label: "Aug" },
                { val: "9", label: "Sep" },
                { val: "10", label: "Oct" },
                { val: "11", label: "Nov" },
                { val: "12", label: "Dec" },
              ].map((m) => (
                <option key={m.val} value={m.val} className="bg-card text-foreground">
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsMarkAbsenceOpen(true)}
            className="h-8 px-3 rounded-xl border-rose-500/30 text-rose-600 dark:text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 text-xs font-semibold gap-1 cursor-pointer"
          >
            <CalendarX className="h-3.5 w-3.5" />
            <span>+ New Leave</span>
          </Button>
        </div>
      </div>

      {/* Absence Table */}
      {(() => {
        const filteredAbsences = absences.filter((a) => {
          const d = new Date(a.start_date);
          const matchYear = d.getFullYear() === trackerFilterYear;
          const matchMonth =
            trackerFilterMonth === "ALL" || d.getMonth() + 1 === Number(trackerFilterMonth);
          return matchYear && matchMonth;
        });

        const totalLeaveDaysFiltered = filteredAbsences.reduce(
          (acc, a) => acc + (a.dates?.length || 1),
          0
        );

        if (filteredAbsences.length === 0) {
          return (
            <EmptyState
              compact
              icon={CheckCircle2}
              title={`No leave records for ${trackerFilterMonth === "ALL" ? `year ${trackerFilterYear}` : "the selected period"}`}
            />
          );
        }

        return (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
              <span>
                Showing <strong className="text-foreground">{filteredAbsences.length}</strong> record(s)
              </span>
              <span className="font-semibold text-rose-600 dark:text-rose-400">
                Total Absence: <strong className="text-base">{totalLeaveDaysFiltered}</strong> Days
              </span>
            </div>

            <div className="overflow-x-auto border border-border/70 rounded-2xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/40 border-b border-border/70 text-[11px] text-muted-foreground">
                  <tr>
                    <th className="p-3 font-semibold">Date Range</th>
                    <th className="p-3 font-semibold">Days Count</th>
                    <th className="p-3 font-semibold">All Dates</th>
                    <th className="p-3 font-semibold">Reason</th>
                    <th className="p-3 font-semibold text-right">Recorded On</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40 text-foreground">
                  {filteredAbsences.map((ab) => {
                    const daysCount = ab.dates?.length || 1;
                    return (
                      <tr key={ab.id} className="hover:bg-muted/25 transition-colors">
                        <td className="p-3 font-bold text-rose-600 dark:text-rose-400 whitespace-nowrap">
                          {ab.start_date === ab.end_date
                            ? ab.start_date
                            : `${ab.start_date} → ${ab.end_date}`}
                        </td>
                        <td className="p-3 font-bold">
                          <span className="px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-700 dark:text-rose-300 text-[11px]">
                            {daysCount} {daysCount === 1 ? "Day" : "Days"}
                          </span>
                        </td>
                        <td className="p-3 text-muted-foreground text-[11px]">
                          {ab.dates && ab.dates.length > 0 ? (
                            <div className="flex flex-wrap gap-1 max-w-xs">
                              {ab.dates.map((d) => (
                                <span
                                  key={d}
                                  className="px-1.5 py-0.5 rounded bg-muted/60 text-[10px] font-medium"
                                >
                                  {d}
                                </span>
                              ))}
                            </div>
                          ) : (
                            ab.start_date
                          )}
                        </td>
                        <td className="p-3 font-medium text-foreground">{ab.reason || "—"}</td>
                        <td className="p-3 text-right text-muted-foreground text-[11px] whitespace-nowrap">
                          {new Date(ab.created_at).toLocaleDateString([], {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      })()}
    </section>
  );
}
