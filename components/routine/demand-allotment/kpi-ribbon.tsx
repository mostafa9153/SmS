"use client";

import { Badge } from "@/components/ui/badge";
import { Scale, TrendingUp, AlertTriangle, CheckCircle2, BookOpen, Users } from "lucide-react";

import type { DemandAllotmentState } from "./use-routine-demand-allotment";

export function KpiRibbon({ da }: { da: DemandAllotmentState }) {
  const { grandTotals } = da;
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <div className="bg-card border rounded-lg p-3.5 shadow-xs flex flex-col justify-between">
        <div className="flex items-center justify-between gap-1">
          <span className="text-xs font-semibold text-muted-foreground">Total Period Demand</span>
          <BookOpen className="w-4 h-4 text-primary" />
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-xl font-bold font-mono text-foreground">{grandTotals.totalDemand}</span>
          <span className="text-xs text-muted-foreground font-mono">p/wk</span>
        </div>
        <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground border-t pt-1.5">
          <span>Class Capacity:</span>
          <span className="font-mono font-semibold text-foreground">{grandTotals.totalCapacity} p/wk</span>
        </div>
      </div>

      <div className="bg-card border rounded-lg p-3.5 shadow-xs flex flex-col justify-between">
        <div className="flex items-center justify-between gap-1">
          <span className="text-xs font-semibold text-muted-foreground">Workload Allotted</span>
          <Users className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-xl font-bold font-mono text-foreground">{grandTotals.totalAssigned}</span>
          <span className="text-xs text-muted-foreground font-mono">p/wk</span>
        </div>
        <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground border-t pt-1.5">
          <span>Faculty Capacity:</span>
          <span className="font-mono font-semibold text-foreground">{grandTotals.totalFacultyCapacity} p/wk</span>
        </div>
      </div>

      <div className="bg-card border rounded-lg p-3.5 shadow-xs flex flex-col justify-between">
        <div className="flex items-center justify-between gap-1">
          <span className="text-xs font-semibold text-muted-foreground">Allotment Fulfillment</span>
          <TrendingUp className="w-4 h-4 text-emerald-600" />
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-xl font-bold font-mono text-emerald-700 dark:text-emerald-400">
            {grandTotals.fulfillmentPercent}%
          </span>
          <span className="text-[11px] text-muted-foreground">satisfied</span>
        </div>
        <div className="mt-1 w-full bg-muted rounded-full h-1.5 overflow-hidden">
          <div
            className="bg-emerald-600 h-full rounded-full transition-all duration-300"
            style={{ width: `${grandTotals.fulfillmentPercent}%` }}
          />
        </div>
      </div>

      <div className="bg-card border rounded-lg p-3.5 shadow-xs flex flex-col justify-between">
        <div className="flex items-center justify-between gap-1">
          <span className="text-xs font-semibold text-muted-foreground">Schedule Health</span>
          <Scale className="w-4 h-4 text-primary" />
        </div>
        <div className="mt-2 flex items-baseline gap-1.5">
          <Badge
            variant={
              grandTotals.underAllottedCount === 0 && grandTotals.overCapacityCount === 0
                ? "secondary"
                : "destructive"
            }
            className="text-xs font-semibold gap-1"
          >
            {grandTotals.underAllottedCount === 0 && grandTotals.overCapacityCount === 0 ? (
              <>
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                <span>100% Balanced</span>
              </>
            ) : (
              <>
                <AlertTriangle className="w-3 h-3" />
                <span>{grandTotals.underAllottedCount} Pending</span>
              </>
            )}
          </Badge>
        </div>
        <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground border-t pt-1.5">
          <span>Balanced Sections:</span>
          <span className="font-mono font-semibold text-foreground">
            {grandTotals.balancedCount} / {grandTotals.totalRows}
          </span>
        </div>
      </div>
    </div>
  );
}
