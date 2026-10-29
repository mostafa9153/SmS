"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle2, AlertCircle, School, Users, ChevronDown, ChevronRight, Atom, Briefcase, Palette } from "lucide-react";
import { cn } from "@/lib/utils";
import { ClassAllotmentRow } from "@/components/routine/demand-allotment/types";
import { isSubSubFullyAllotted } from "@/components/routine/demand-allotment/helpers";

export interface AllotmentRowItemProps {
  row: ClassAllotmentRow;
  isExpanded: boolean;
  onToggleExpand: (id: string) => void;
}

export const AllotmentRowItem = React.memo(function AllotmentRowItem({
  row,
  isExpanded,
  onToggleExpand,
}: AllotmentRowItemProps) {
  const percent =
    row.demandPeriods > 0
      ? Math.min(100, Math.round((row.assignedPeriods / row.demandPeriods) * 100))
      : 100;

  return (
    <React.Fragment>
      <tr
        onClick={() => onToggleExpand(row.classId)}
        className="hover:bg-muted/30 transition-colors cursor-pointer select-none"
      >
        <td className="py-2.5 px-3 text-center text-muted-foreground">
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-primary" />
          ) : (
            <ChevronRight className="w-4 h-4 opacity-60" />
          )}
        </td>
        <td className="py-2.5 px-4 font-bold text-foreground">
          <div className="flex items-center gap-1.5">
            <School className="w-3.5 h-3.5 text-primary opacity-80" />
            <span>{row.className}</span>
            <Badge variant="outline" className="text-[10px] font-mono px-1 py-0">
              Sec {row.section}
            </Badge>
          </div>
        </td>
        <td className="py-2.5 px-4">
          {row.isHs && row.stream ? (
            row.stream === "Science" ? (
              <Badge variant="outline" className="text-[10px] font-semibold bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-200 gap-1">
                <Atom className="w-2.5 h-2.5" />
                Science
              </Badge>
            ) : row.stream === "Commerce" ? (
              <Badge variant="outline" className="text-[10px] font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-200 gap-1">
                <Briefcase className="w-2.5 h-2.5" />
                Commerce
              </Badge>
            ) : (
              <Badge variant="outline" className="text-[10px] font-semibold bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-200 gap-1">
                <Palette className="w-2.5 h-2.5" />
                Arts
              </Badge>
            )
          ) : (
            <span className="text-muted-foreground text-[11px]">General</span>
          )}
        </td>
        <td className="py-2.5 px-4 text-center font-mono font-medium text-foreground">
          {row.subjectsCount}
        </td>
        <td className="py-2.5 px-4 text-center">
          <Badge variant="outline" className="font-mono text-xs font-bold bg-background text-foreground">
            {row.capacityPeriods} p/wk
          </Badge>
        </td>
        <td className="py-2.5 px-4 text-center">
          <div className="inline-flex items-center gap-1">
            <Badge variant="secondary" className="font-mono text-xs font-bold">
              {row.demandPeriods} p/wk
            </Badge>
            {row.demandPeriods > row.capacityPeriods && (
              <Badge variant="destructive" className="text-[9px] px-1 py-0 font-mono" title={`Exceeds week capacity of ${row.capacityPeriods} periods`}>
                &gt;{row.capacityPeriods}
              </Badge>
            )}
          </div>
        </td>
        <td className="py-2.5 px-4 text-center">
          <Badge
            variant={row.assignedPeriods >= row.demandPeriods ? "secondary" : "outline"}
            className={cn(
              "font-mono text-xs font-bold",
              row.assignedPeriods >= row.demandPeriods
                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-200"
                : "text-amber-700 dark:text-amber-400 border-amber-300"
            )}
          >
            {row.assignedPeriods} p/wk
          </Badge>
        </td>
        <td className="py-2.5 px-4">
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground">
              <span>{percent}% Allotted</span>
              <span>
                {row.assignedPeriods}/{row.demandPeriods} p
              </span>
            </div>
            <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-200",
                  percent >= 100
                    ? "bg-emerald-600"
                    : percent >= 75
                    ? "bg-blue-600"
                    : "bg-amber-500"
                )}
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>
        </td>
        <td className="py-2.5 px-4 text-right">
          {row.status === "balanced" && (
            <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-semibold gap-1">
              <CheckCircle2 className="w-3 h-3" />
              Balanced
            </Badge>
          )}
          {row.status === "under_allotted" && (
            <Badge variant="outline" className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-300 text-[10px] font-semibold gap-1">
              <AlertTriangle className="w-3 h-3 text-amber-600" />
              Short {row.demandPeriods - row.assignedPeriods}p
            </Badge>
          )}
          {row.status === "over_capacity" && (
            <Badge variant="destructive" className="text-[10px] font-semibold gap-1">
              <AlertCircle className="w-3 h-3" />
              Over {row.demandPeriods - row.capacityPeriods}p
            </Badge>
          )}
          {row.status === "deficit" && (
            <Badge variant="outline" className="text-[10px] font-semibold text-blue-600 border-blue-200">
              Excess +{row.assignedPeriods - row.demandPeriods}p
            </Badge>
          )}
        </td>
      </tr>

      {/* Expandable Subject-by-Subject Breakdown Drawer */}
      {isExpanded && (
        <tr className="bg-muted/15 border-b">
          <td colSpan={9} className="p-3 pl-10">
            <div className="border rounded-md bg-card overflow-hidden">
              <div className="px-3 py-1.5 bg-muted/40 border-b flex items-center justify-between text-xs font-semibold text-foreground">
                <span>
                  {row.className} (Sec {row.section}
                  {row.stream ? ` - ${row.stream}` : ""}) Subject Demand Breakdown
                </span>
                <span className="text-[11px] text-muted-foreground font-mono">
                  {row.subjectList.length} Subjects Configured
                </span>
              </div>
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-muted/10 border-b text-[11px] text-muted-foreground font-semibold">
                    <th className="py-1.5 px-3">Subject</th>
                    <th className="py-1.5 px-3">Type</th>
                    <th className="py-1.5 px-3 text-center">Required Demand</th>
                    <th className="py-1.5 px-3">Assigned Faculty</th>
                    <th className="py-1.5 px-3 text-center">Assigned Load</th>
                    <th className="py-1.5 px-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {row.subjectList.map((sub) => {
                    return (
                      <tr key={sub.id} className="hover:bg-muted/20">
                        <td className="py-1.5 px-3 font-semibold text-foreground">
                          {sub.name}
                        </td>
                        <td className="py-1.5 px-3">
                          {sub.isCommon ? (
                            <Badge variant="outline" className="text-[9px] px-1 py-0 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-200">
                              Common Core
                            </Badge>
                          ) : sub.stream ? (
                            <Badge variant="outline" className="text-[9px] px-1 py-0">
                              {sub.stream}
                            </Badge>
                          ) : (
                            <span className="text-[11px] text-muted-foreground">General</span>
                          )}
                        </td>
                        <td className="py-1.5 px-3 text-center font-mono font-bold">
                          {sub.periods} p/wk
                        </td>
                        <td className="py-1.5 px-3">
                          {sub.assignedTeachers && sub.assignedTeachers.length > 0 ? (
                            <div className="flex flex-wrap items-center gap-1.5">
                              {sub.assignedTeachers.map((t) => (
                                <span
                                  key={t.teacherId}
                                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-muted/60 border text-[11px] font-medium"
                                  title={`${t.name}: ${t.periods} periods/wk`}
                                >
                                  <Users className="w-3 h-3 text-primary opacity-70" />
                                  <span>{t.name}</span>
                                  <Badge
                                    variant="outline"
                                    className="font-mono text-[9px] px-1 py-0 font-bold bg-background text-primary border-primary/30"
                                  >
                                    {t.periods}p
                                  </Badge>
                                </span>
                              ))}
                            </div>
                          ) : sub.assignedTeacher ? (
                            <span className="font-medium text-foreground flex items-center gap-1">
                              <Users className="w-3 h-3 text-primary opacity-70" />
                              {sub.assignedTeacher}
                            </span>
                          ) : (
                            <span className="text-destructive text-[11px] italic font-medium">
                              Unassigned
                            </span>
                          )}
                        </td>
                        <td className="py-1.5 px-3 text-center font-mono font-semibold">
                          {sub.assignedPeriods} p/wk
                        </td>
                        <td className="py-1.5 px-3 text-right">
                          {isSubSubFullyAllotted(sub) ? (
                            <span className="text-emerald-700 dark:text-emerald-400 font-semibold text-[11px] flex items-center justify-end gap-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              Allotted
                            </span>
                          ) : (
                            <span className="text-amber-700 dark:text-amber-400 font-semibold text-[11px] flex items-center justify-end gap-1">
                              <AlertTriangle className="w-3 h-3 text-amber-600" />
                              Pending
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </td>
        </tr>
      )}
    </React.Fragment>
  );
});
