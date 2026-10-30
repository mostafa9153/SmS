"use client";

import { Users, CheckCircle2, IndianRupee, AlertCircle, ClipboardList } from "lucide-react";
import { StatCardsGridSkeleton } from "@/components/ui/skeleton-loaders";
import { StatCard } from "@/components/ui/stat-card";

import type { TeacherManagementState } from "./use-teacher-management";

export function StatsAndAlerts({ tm }: { tm: TeacherManagementState }) {
  const { errorMsg, loading, performance, successMsg, tasks, teachers } = tm;
  return (
    <>
      {loading && teachers.length === 0 ? (
        <div className="py-2 mb-6"><StatCardsGridSkeleton count={4} /></div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard label="Total Teachers" value={teachers.length} icon={Users} iconClassName="text-blue-600 dark:text-blue-400" />
          <StatCard label="Active Accounts" value={teachers.filter(t => t.hasLogin).length} icon={CheckCircle2} iconClassName="text-emerald-600 dark:text-emerald-400" />
          <StatCard label="Tasks Assigned" value={tasks.length} icon={ClipboardList} iconClassName="text-amber-600 dark:text-amber-400" />
          <StatCard
            label="Total Collections"
            value={`₹${performance.reduce((sum, p) => sum + Number(p.total_fees_collected || 0), 0).toLocaleString()}`}
            icon={IndianRupee}
            iconClassName="text-indigo-600 dark:text-indigo-400"
          />
        </div>
      )}

      {/* Feedback Alerts */}
      {errorMsg && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}
    </>
  );
}
