"use client";

import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/ui/stat-card";
import { AlertTriangle, CheckCircle2 } from "lucide-react";

import type { AllotmentOverviewState } from "./use-routine-allotment-overview";

export function BalanceRibbon({ ao }: { ao: AllotmentOverviewState }) {
  const { grandTotalDemand, grandTotalTeacherLoad, isSystemBalanced, totalMissingPeriods, totalOverloadedTeachers } = ao;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
      <StatCard
        label="Total Subject Demand"
        value={<>{grandTotalDemand} <span className="text-xs font-normal text-muted-foreground">p/wk</span></>}
      />
      <StatCard
        label="Total Faculty Allotment"
        value={<>{grandTotalTeacherLoad} <span className="text-xs font-normal text-muted-foreground">p/wk</span></>}
        valueClassName="text-primary"
      />
      <StatCard
        label="Unallocated Deficit"
        value={<>{totalMissingPeriods} <span className="text-xs font-normal text-muted-foreground">periods missing</span></>}
        valueClassName={totalMissingPeriods > 0 ? "text-amber-500" : "text-emerald-500"}
      />
      <StatCard
        label="Cross-Check Health"
        value={
          isSystemBalanced ? (
            <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 gap-1 text-xs font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5" /> 100% Balanced
            </Badge>
          ) : (
            <Badge variant="destructive" className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 gap-1 text-xs font-semibold">
              <AlertTriangle className="w-3.5 h-3.5" />
              {totalMissingPeriods > 0
                ? `${totalMissingPeriods}p Unallotted`
                : totalOverloadedTeachers > 0
                ? `${totalOverloadedTeachers} Overloaded`
                : "Mismatch"}
            </Badge>
          )
        }
      />
    </div>
  );
}
