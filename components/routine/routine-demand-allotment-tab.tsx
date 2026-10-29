"use client";

import type { RoutineDemandAllotmentTabProps } from "@/components/routine/demand-allotment/props";
import { calculateClassWeeklyCapacity } from "@/lib/routine/routine-helpers";

import { KpiRibbon } from "@/components/routine/demand-allotment/kpi-ribbon";
import { SearchFilterBar } from "@/components/routine/demand-allotment/search-filter-bar";
import { DemandTable } from "@/components/routine/demand-allotment/demand-table";
import { useRoutineDemandAllotment } from "@/components/routine/demand-allotment/use-routine-demand-allotment";

// Re-export for backward compatibility
export { calculateClassWeeklyCapacity };
export type { ClassAllotmentRow } from "@/components/routine/demand-allotment/types";

export function RoutineDemandAllotmentTab(props: RoutineDemandAllotmentTabProps) {
  const da = useRoutineDemandAllotment(props);

  return (
    <div className="space-y-4 w-full">
      {/* 1. Grand Total KPI Metric Ribbon */}
      <KpiRibbon da={da} />

      {/* 2. Search & Filter Bar */}
      <SearchFilterBar da={da} />

      {/* 3. Demand vs Allotment Master Table */}
      <DemandTable da={da} />
    </div>
  );
}
