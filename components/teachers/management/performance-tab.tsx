"use client";

import { Users, IndianRupee, Download, Trophy, TrendingUp, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/ui/stat-card";

import type { TeacherManagementState } from "./use-teacher-management";

export function PerformanceTab({ tm }: { tm: TeacherManagementState }) {
  const { activeTab, handleExportCSV, handleViewTeacherLogs, performance } = tm;
  return (
    <>
      {activeTab === "performance" && (() => {
        const totalSchoolCollected = performance.reduce((sum, p) => sum + Number(p.total_fees_collected || 0), 0);
        const totalSchoolReadmissions = performance.reduce((sum, p) => sum + Number(p.total_readmissions || 0), 0);
        const totalSchoolMarksheets = performance.reduce((sum, p) => sum + Number(p.total_marksheets || 0), 0);
        const topCollector = performance.length > 0 ? performance[0] : null;

        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* Visual KPI Aggregate Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
              <StatCard label="Total Faculty Collections" value={`₹${totalSchoolCollected.toLocaleString()}`} icon={IndianRupee} iconClassName="text-emerald-600 dark:text-emerald-400" />
              <StatCard label="Total Re-Admissions" value={totalSchoolReadmissions} icon={Users} iconClassName="text-blue-600 dark:text-blue-400" />
              <StatCard label="Marksheets Created" value={totalSchoolMarksheets} icon={TrendingUp} iconClassName="text-amber-600 dark:text-amber-400" />
              <StatCard
                label={`Top Collector · ₹${Number(topCollector?.total_fees_collected || 0).toLocaleString()}`}
                value={topCollector?.teacher_name || "N/A"}
                icon={Trophy}
                iconClassName="text-indigo-600 dark:text-indigo-400"
                valueClassName="text-base sm:text-lg truncate"
              />
            </div>

            {/* Visual Contribution Leaderboard */}
            <div className="p-5 rounded-2xl bg-card border border-border/80 space-y-4 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/60 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <Trophy className="h-4 w-4 text-amber-500" />
                    Faculty Collection & Performance Breakdown
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Visual percentage contribution of each teacher to total school fee collections.
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleExportCSV}
                  disabled={performance.length === 0}
                  className="h-8 rounded-xl text-xs gap-1.5 cursor-pointer self-start sm:self-auto"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Export CSV</span>
                </Button>
              </div>

              {performance.length === 0 ? (
                <p className="text-xs text-muted-foreground italic py-6 text-center">
                  No performance records recorded for this session.
                </p>
              ) : (
                <div className="space-y-3.5">
                  {performance.map((p, idx) => {
                    const collected = Number(p.total_fees_collected || 0);
                    const pct = totalSchoolCollected > 0 ? Math.round((collected / totalSchoolCollected) * 100) : 0;

                    return (
                      <div
                        key={p.teacher_id}
                        className="p-3.5 rounded-2xl bg-muted/30 border border-border/60 hover:bg-muted/50 transition-colors space-y-2.5"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex items-center gap-3">
                            <span className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                              idx === 0 ? "bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30" :
                              idx === 1 ? "bg-slate-300/40 text-slate-700 dark:text-slate-200 border border-slate-400/30" :
                              idx === 2 ? "bg-amber-700/20 text-amber-800 dark:text-amber-500 border border-amber-700/30" :
                              "bg-muted text-muted-foreground"
                            }`}>
                              #{idx + 1}
                            </span>
                            <div>
                              <p className="text-xs font-bold text-foreground">{p.teacher_name}</p>
                              <p className="text-[10px] text-muted-foreground">{p.designation || "Teaching Staff"}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 self-end sm:self-auto">
                            <div className="text-right">
                              <p className="text-sm font-extrabold text-foreground">₹{collected.toLocaleString()}</p>
                              <p className="text-[10px] text-muted-foreground">{pct}% of school total</p>
                            </div>

                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleViewTeacherLogs(p.teacher_id, p.teacher_name)}
                              className="h-7 px-2.5 text-[10px] rounded-lg gap-1 cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                            >
                              <Eye className="h-3 w-3" />
                              <span>Inspect Logs</span>
                            </Button>
                          </div>
                        </div>

                        {/* Visual Progress Bar */}
                        <div className="space-y-1">
                          <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                            <div
                              className="bg-gradient-to-r from-emerald-500 via-teal-500 to-indigo-500 h-full rounded-full transition-all duration-500"
                              style={{ width: `${Math.max(pct, 2)}%` }}
                            />
                          </div>
                          <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-0.5">
                            <div className="flex items-center gap-2">
                              <span className="px-1.5 py-0.2 rounded bg-background border border-border/80 text-foreground font-semibold">
                                {p.total_readmissions} Re-Admissions
                              </span>
                              <span className="px-1.5 py-0.2 rounded bg-background border border-border/80 text-foreground font-semibold">
                                {p.total_marksheets} Marksheets
                              </span>
                              <span className="px-1.5 py-0.2 rounded bg-background border border-border/80 text-foreground font-semibold">
                                {p.tasks_completed} Tasks Done
                              </span>
                            </div>
                            <span className="font-bold text-foreground">{pct}% Contribution</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Detailed Table for Auditing */}
            <div className="border border-border/80 rounded-2xl overflow-hidden bg-card/60">
              <div className="p-3 bg-muted/40 border-b border-border/60">
                <h4 className="text-xs font-bold text-foreground">Detailed Financial & Operational Records</h4>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-border bg-muted/80 backdrop-blur-md text-muted-foreground font-semibold sticky top-0 z-10 shadow-sm">
                      <th className="p-3">Rank</th>
                      <th className="p-3">Teacher</th>
                      <th className="p-3">Designation</th>
                      <th className="p-3 text-center">Re-Admissions</th>
                      <th className="p-3 text-center">Marksheets</th>
                      <th className="p-3 text-center">Tasks</th>
                      <th className="p-3 text-right">Total Fees Collected</th>
                      <th className="p-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {performance.map((p, idx) => (
                      <tr key={p.teacher_id} className="hover:bg-muted/50 transition-colors duration-200">
                        <td className="p-3 font-bold text-muted-foreground text-[11px]">#{idx + 1}</td>
                        <td className="p-3 font-bold text-foreground">{p.teacher_name}</td>
                        <td className="p-3 text-muted-foreground">{p.designation || "Teaching Staff"}</td>
                        <td className="p-3 text-center font-semibold text-foreground">{p.total_readmissions}</td>
                        <td className="p-3 text-center text-foreground">{p.total_marksheets}</td>
                        <td className="p-3 text-center">
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-[10px]">
                            {p.tasks_completed} done
                          </span>
                        </td>
                        <td className="p-3 text-right font-extrabold text-foreground">
                          ₹{Number(p.total_fees_collected).toLocaleString()}
                        </td>
                        <td className="p-3 text-center">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleViewTeacherLogs(p.teacher_id, p.teacher_name)}
                            className="h-6 text-[10px] text-primary hover:text-primary-foreground hover:bg-primary cursor-pointer"
                          >
                            Logs
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      })()}
    </>
  );
}
