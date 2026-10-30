"use client";

import { Users, GraduationCap, Briefcase, UserCheck } from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";

interface StaffStatsCardsProps {
  total: number;
  teachingCount: number;
  nonTeachingCount: number;
  activeCount: number;
}

export function StaffStatsCards({
  total,
  teachingCount,
  nonTeachingCount,
  activeCount,
}: StaffStatsCardsProps) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      <StatCard label="Total Staff" value={total} icon={Users} iconClassName="text-blue-600 dark:text-blue-400" />
      <StatCard label="Teaching Staff" value={teachingCount} icon={GraduationCap} iconClassName="text-indigo-600 dark:text-indigo-400" />
      <StatCard label="Non-Teaching Staff" value={nonTeachingCount} icon={Briefcase} iconClassName="text-purple-600 dark:text-purple-400" />
      <StatCard
        label="Active On Duty"
        value={activeCount}
        hint={`${total > 0 ? Math.round((activeCount / total) * 100) : 0}% of staff`}
        icon={UserCheck}
        iconClassName="text-emerald-600 dark:text-emerald-400"
      />
    </div>
  );
}
