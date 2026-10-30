"use client";



import type { RoutineAllotmentOverviewTabProps } from "@/components/routine/allotment-overview/props";
import { BalanceRibbon } from "@/components/routine/allotment-overview/balance-ribbon";
import { ControlBar } from "@/components/routine/allotment-overview/control-bar";
import { ClassAllotmentChart } from "@/components/routine/allotment-overview/class-allotment-chart";
import { FacultyWorkloadChart } from "@/components/routine/allotment-overview/faculty-workload-chart";
import { useRoutineAllotmentOverview } from "@/components/routine/allotment-overview/use-routine-allotment-overview";

export function RoutineAllotmentOverviewTab(props: RoutineAllotmentOverviewTabProps) {
  const ao = useRoutineAllotmentOverview(props);

  return (
    <div className="space-y-6 w-full animate-in fade-in duration-150">
      {/* 1. Global Balance Status Ribbon */}
      <BalanceRibbon ao={ao} />

      {/* 2. Control Bar: Search & Issue Filter */}
      <ControlBar ao={ao} />

      {/* 3. CHART 1: Class-wise Subject & Teacher Allotment Matrix */}
      <ClassAllotmentChart ao={ao} />

      {/* 4. CHART 2: Faculty Workload Cross-Check & Verification */}
      <FacultyWorkloadChart ao={ao} />
    </div>
  );
}
