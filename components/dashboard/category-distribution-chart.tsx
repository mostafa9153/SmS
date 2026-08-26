"use client";

import { useQuery } from "@tanstack/react-query";
import { getDashboardStats } from "@/lib/data/students";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { ArrowUpRight, Users2 } from "lucide-react";

const CATEGORY_COLORS: Record<string, { bg: string; fill: string; text: string; ring: string }> = {
  General: {
    fill: "#3b82f6", // Blue
    bg: "bg-blue-500/10",
    text: "text-blue-600 dark:text-blue-400",
    ring: "ring-blue-500/30",
  },
  OBC: {
    fill: "#8b5cf6", // Purple / Violet
    bg: "bg-purple-500/10",
    text: "text-purple-600 dark:text-purple-400",
    ring: "ring-purple-500/30",
  },
  SC: {
    fill: "#f59e0b", // Amber
    bg: "bg-amber-500/10",
    text: "text-amber-600 dark:text-amber-400",
    ring: "ring-amber-500/30",
  },
  ST: {
    fill: "#10b981", // Emerald
    bg: "bg-emerald-500/10",
    text: "text-emerald-600 dark:text-emerald-400",
    ring: "ring-emerald-500/30",
  },
};

const CustomTooltip = ({ active, payload, total }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0];
    const percent = total > 0 ? ((data.value / total) * 100).toFixed(1) : 0;
    return (
      <div className="rounded-xl border border-border/80 bg-background/95 backdrop-blur-md p-3 shadow-md text-xs">
        <p className="font-bold text-foreground flex items-center gap-1.5">
          <span
            className="h-2.5 w-2.5 rounded-full inline-block"
            style={{ backgroundColor: data.payload.fill }}
          />
          {data.name} Category
        </p>
        <p className="text-muted-foreground mt-1">
          Students: <span className="font-bold text-foreground font-mono">{data.value}</span>{" "}
          <span className="text-primary font-semibold">({percent}%)</span>
        </p>
      </div>
    );
  }
  return null;
};

export function CategoryDistributionChart() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: getDashboardStats,
  });

  if (isLoading || !stats) {
    return (
      <Card className="p-5 flex flex-col gap-3 rounded-2xl border bg-card/90 shadow-xs">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-52 w-full rounded-xl" />
      </Card>
    );
  }

  const categoryCounts = stats.categoryCounts || {
    General: 0,
    OBC: 0,
    SC: 0,
    ST: 0,
  };

  const totalStudents = stats.total || 1;

  const chartData = [
    { name: "General", value: categoryCounts.General || 0, fill: CATEGORY_COLORS.General.fill },
    { name: "OBC", value: categoryCounts.OBC || 0, fill: CATEGORY_COLORS.OBC.fill },
    { name: "SC", value: categoryCounts.SC || 0, fill: CATEGORY_COLORS.SC.fill },
    { name: "ST", value: categoryCounts.ST || 0, fill: CATEGORY_COLORS.ST.fill },
  ];

  return (
    <Card className="p-5 rounded-2xl border bg-card/90 shadow-xs flex flex-col justify-between h-full">
      {/* Card Header */}
      <div className="flex items-center justify-between mb-3 pb-1 border-b border-border/40">
        <div className="flex items-center gap-2">
          <div className="rounded-xl p-2 bg-blue-500/10 text-blue-600 ring-1 ring-blue-500/20">
            <Users2 className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-bold text-foreground">Social Category Distribution</p>
          </div>
        </div>
        <Link
          href="/students"
          className="text-xs text-primary font-semibold hover:underline flex items-center gap-0.5"
        >
          View All <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* Visual Ring Chart & Breakdown Side-by-Side */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center my-2">
        {/* Ring Chart */}
        <div className="sm:col-span-5 relative flex items-center justify-center min-h-[160px]">
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={45}
                outerRadius={68}
                paddingAngle={4}
                dataKey="value"
              >
                {chartData.map((entry) => (
                  <Cell key={entry.name} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip total={stats.total} />} />
            </PieChart>
          </ResponsiveContainer>
          {/* Inner Counter Badge */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-lg font-extrabold text-foreground font-mono leading-none">
              {stats.total}
            </span>
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mt-0.5">
              Total
            </span>
          </div>
        </div>

        {/* Detailed Breakdown Metric Bars */}
        <div className="sm:col-span-7 space-y-2.5">
          {chartData.map((cat) => {
            const count = cat.value;
            const percent = stats.total > 0 ? ((count / stats.total) * 100).toFixed(1) : "0";
            const theme = CATEGORY_COLORS[cat.name] || CATEGORY_COLORS.General;

            return (
              <Link
                key={cat.name}
                href={`/students?category=${cat.name}`}
                className="group flex flex-col gap-1 p-2 rounded-xl hover:bg-muted/50 transition-colors border border-transparent hover:border-border/60"
              >
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className={`h-2.5 w-2.5 rounded-full`} style={{ backgroundColor: cat.fill }} />
                    <span className="font-semibold text-foreground group-hover:text-primary transition-colors">
                      {cat.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 font-mono">
                    <span className="font-bold text-foreground">{count}</span>
                    <span className="text-xs text-muted-foreground">({percent}%)</span>
                  </div>
                </div>
                {/* Progress Visual Bar */}
                <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${percent}%`,
                      backgroundColor: cat.fill,
                    }}
                  />
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </Card>
  );
}
