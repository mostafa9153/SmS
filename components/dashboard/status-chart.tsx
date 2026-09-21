"use client";

import { useQuery } from "@tanstack/react-query";
import { getDashboardStats } from "@/lib/data/students";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { STATUS_STYLES } from "@/lib/utils";
import type { StudentStatus } from "@/lib/types";
import Link from "next/link";
import { PieChart as PieChartIcon, ArrowUpRight } from "lucide-react";

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-xl border border-border/80 bg-background/95 backdrop-blur-md p-3 shadow-md text-xs">
        <p className="font-bold text-foreground">{payload[0].name}</p>
        <p className="text-muted-foreground mt-0.5">
          Students: <span className="font-bold text-primary">{payload[0].value}</span>
        </p>
      </div>
    );
  }
  return null;
};

export function StatusChart() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: getDashboardStats,
  });

  if (isLoading || !stats) {
    return (
      <div className="glass-panel rounded-3xl p-5 sm:p-6 border border-border/60 dark:border-white/10 flex flex-col gap-3 shadow-sm dark:shadow-none">
        <Skeleton className="h-4 w-32 bg-muted/80 dark:bg-white/10" />
        <Skeleton className="h-56 w-full rounded-2xl bg-muted/80 dark:bg-white/10" />
      </div>
    );
  }

  const chartData = (
    Object.entries(stats.statusCounts || {}) as [StudentStatus, number][]
  )
    .filter(([, count]) => count > 0)
    .map(([status, count]) => ({
      name: status,
      value: count,
      color: STATUS_STYLES[status]?.chart || "#64748b",
    }));

  return (
    <div className="glass-panel rounded-3xl p-5 sm:p-6 border border-border/60 dark:border-white/10 shadow-sm dark:shadow-none flex flex-col justify-between h-full transition-all duration-300 hover:border-emerald-500/30">
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-border/40">
        <div className="flex items-center gap-2.5">
          <div className="rounded-xl p-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <PieChartIcon className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-bold text-foreground">Enrolment Status Breakdown</p>
            <p className="text-[10px] text-muted-foreground">Continuing vs transferred & dropout</p>
          </div>
        </div>
        <Link
          href="/students"
          className="text-xs text-primary font-semibold hover:underline flex items-center gap-0.5 group"
        >
          View All <ArrowUpRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
        </Link>
      </div>

      <div className="flex-1 w-full min-h-[220px] flex items-center justify-center my-auto">
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={85}
              paddingAngle={3}
              dataKey="value"
            >
              {chartData.map((entry) => (
                <Cell key={entry.name} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend
              iconType="circle"
              iconSize={8}
              formatter={(value) => (
                <span className="text-xs text-muted-foreground">{value}</span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
