"use client";

import { CheckCircle2, Clock, IndianRupee, UserCheck, CalendarX } from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";

import type { TeacherDashboardState } from "./use-teacher-dashboard";

export function MetricsBar({ gen }: { gen: TeacherDashboardState }) {
  const { absences, stats } = gen;
  return (
    <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
      <StatCard label="Re-Admissions" value={stats.readmissionsCount} icon={UserCheck} iconClassName="text-emerald-600 dark:text-emerald-400" />
      <StatCard label="Fee Collection" value={`₹${stats.totalCollected.toLocaleString()}`} icon={IndianRupee} iconClassName="text-teal-600 dark:text-teal-400" />
      <StatCard label="Tasks Pending" value={stats.tasksPending} icon={Clock} iconClassName="text-amber-600 dark:text-amber-400" />
      <StatCard label="Tasks Finished" value={stats.tasksCompleted} icon={CheckCircle2} iconClassName="text-indigo-600 dark:text-indigo-400" />
      <StatCard
        label={`Leave Days (${new Date().getFullYear()})`}
        value={absences
          .filter((a) => new Date(a.start_date).getFullYear() === new Date().getFullYear())
          .reduce((acc, a) => acc + (a.dates?.length || 1), 0)}
        icon={CalendarX}
        iconClassName="text-rose-600 dark:text-rose-400"
        valueClassName="text-rose-600 dark:text-rose-400"
      />
    </section>
  );
}
