"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface TeacherSummaryBadgesProps {
  totalStaffCount: number;
  totalAllottedLoad: number;
  totalSchoolSubjectPeriods: number;
  totalAssignedSubjects: number;
  totalSchoolSubjects: number;
}

export function TeacherSummaryBadges({
  totalStaffCount,
  totalAllottedLoad,
  totalSchoolSubjectPeriods,
  totalAssignedSubjects,
  totalSchoolSubjects,
}: TeacherSummaryBadgesProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-semibold text-foreground">Teaching Faculty</span>
      <Badge variant="secondary" className="text-[10px] font-mono font-medium">
        {totalStaffCount} Active Staff
      </Badge>

      <Badge
        variant="outline"
        className={cn(
          "text-[10px] font-mono font-semibold px-2 py-0.5 gap-1",
          totalAllottedLoad === totalSchoolSubjectPeriods && totalSchoolSubjectPeriods > 0
            ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-300/40"
            : totalAllottedLoad > totalSchoolSubjectPeriods && totalSchoolSubjectPeriods > 0
            ? "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-300/40"
            : "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-300/40"
        )}
      >
        Allotted: {totalAllottedLoad} / {totalSchoolSubjectPeriods} Subject Periods
      </Badge>

      <Badge
        variant="outline"
        className={cn(
          "text-[10px] font-mono font-semibold px-2 py-0.5 gap-1",
          totalAssignedSubjects === totalSchoolSubjects && totalSchoolSubjects > 0
            ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-300/40"
            : "bg-muted text-muted-foreground border-border"
        )}
      >
        Subjects: {totalAssignedSubjects} / {totalSchoolSubjects} Assigned
      </Badge>
    </div>
  );
}
