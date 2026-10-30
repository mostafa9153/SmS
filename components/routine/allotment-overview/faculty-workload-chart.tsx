"use client";

import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { shortSubject } from "@/components/routine/allotment-overview/helpers";
import type { AllotmentOverviewState } from "./use-routine-allotment-overview";

export function FacultyWorkloadChart({ ao }: { ao: AllotmentOverviewState }) {
  const { filteredTeacherLoads, grandTotalTeacherLoad, teachers } = ao;
  return (
    <div className="bg-card border rounded-xl shadow-xs overflow-hidden space-y-0">
      <div className="px-4 py-3 border-b bg-muted/20 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" />
            Faculty Workload Cross-Check & Verification
          </h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Cross-verify total weekly periods allocated per teacher to ensure balanced faculty workload before routine generation.
          </p>
        </div>

        <Badge variant="outline" className="font-mono text-xs font-bold text-foreground bg-background">
          {teachers.length} Faculty Members
        </Badge>
      </div>

      {/* Teacher Load Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="bg-muted/40 border-b text-muted-foreground font-semibold text-[11px]">
              <th className="py-2.5 px-3 text-left font-bold text-foreground w-28 border-r">
                Teacher Code
              </th>
              <th className="py-2.5 px-3 text-left font-bold text-foreground min-w-[150px] border-r">
                Faculty Name
              </th>
              <th className="py-2.5 px-3 text-left font-bold text-foreground min-w-[120px] border-r">
                Primary Subject
              </th>
              <th className="py-2.5 px-3 text-left font-bold text-foreground border-r">
                Assigned Classes & Periods
              </th>
              <th className="py-2.5 px-4 text-center font-bold text-primary w-28">
                Total Workload
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {filteredTeacherLoads.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-muted-foreground italic">
                  No matching faculty records found.
                </td>
              </tr>
            ) : (
              filteredTeacherLoads.map((t) => {
                const isOverloaded = t.status === "overloaded";
                const isIdle = t.status === "idle";

                return (
                  <tr
                    key={t.teacherId}
                    className={cn(
                      "hover:bg-muted/30 transition-colors",
                      isOverloaded
                        ? "bg-rose-500/5 hover:bg-rose-500/10"
                        : isIdle
                        ? "bg-amber-500/5 hover:bg-amber-500/10"
                        : ""
                    )}
                  >
                    {/* Teacher Code */}
                    <td className="py-2.5 px-3 font-mono font-bold text-primary border-r">
                      <span className="px-2 py-0.5 rounded bg-primary/10 border border-primary/20">
                        {t.teacherCode}
                      </span>
                    </td>

                    {/* Full Name & Short Name */}
                    <td className="py-2.5 px-3 font-semibold text-foreground border-r">
                      <div className="flex items-center gap-1.5">
                        <span>{t.name}</span>
                        {t.shortName && t.shortName !== t.teacherCode && (
                          <span className="text-[10px] text-muted-foreground font-mono font-normal">
                            ({t.shortName})
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Primary Subject */}
                    <td className="py-2.5 px-3 text-foreground/90 border-r">
                      <Badge variant="outline" className="text-[10px] font-medium bg-background">
                        {t.primarySubject}
                      </Badge>
                    </td>

                    {/* Assigned Classes List */}
                    <td className="py-2.5 px-3 border-r">
                      {t.assignedClasses.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5 items-center">
                          {t.assignedClasses.map((ac, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-mono bg-muted/60 border border-border text-foreground"
                              title={`${ac.subject} in ${ac.label} (${ac.periods} periods/week)`}
                            >
                              <span className="font-semibold">{ac.label}</span>
                              <span className="text-muted-foreground">{shortSubject(ac.subject)}</span>
                              <span className="text-primary font-bold">({ac.periods})</span>
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-amber-500 text-[11px] font-medium flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" /> No classes assigned
                        </span>
                      )}
                    </td>

                    {/* Total Assigned Periods vs Max */}
                    <td className="py-2.5 px-4 text-center border-l">
                      <div className="flex flex-col items-center justify-center gap-0.5">
                        <span
                          className={cn(
                            "text-sm font-bold font-mono px-2 py-0.5 rounded-md",
                            isOverloaded
                              ? "bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30"
                              : isIdle
                              ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                              : "bg-primary/10 text-primary"
                          )}
                        >
                          {t.totalAssignedPeriods}
                        </span>
                        <span className="text-[9.5px] text-muted-foreground font-mono">
                          max {t.maxPeriods}p
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
          {/* Footer Grand Total */}
          <tfoot>
            <tr className="bg-muted/60 border-t-2 border-border font-bold text-foreground text-xs">
              <td colSpan={4} className="py-2.5 px-3 text-left font-semibold">
                Grand Total Faculty Workload
              </td>
              <td className="py-2.5 px-4 text-center font-mono text-primary text-sm font-bold">
                {grandTotalTeacherLoad}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
