"use client";

import { useQuery } from "@tanstack/react-query";
import { getDashboardStats } from "@/lib/data/students";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { sortClasses } from "@/lib/utils";

export function ClassStrengthChart() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: getDashboardStats,
  });

  if (isLoading || !stats) {
    return (
      <Card className="p-5 flex flex-col gap-3 rounded-2xl border bg-card/90 shadow-xs">
        <Skeleton className="h-4 w-36" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </Card>
    );
  }

  const sorted = sortClasses(Object.keys(stats.classWiseCounts));
  const chartData = sorted.map((cls) => ({
    class: `Class ${cls}`,
    students: stats.classWiseCounts[cls] ?? 0,
  }));

  return (
    <Card className="p-5 rounded-2xl border bg-card/90 shadow-xs">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-sm font-bold text-foreground">Class-wise Student Distribution</p>
          <p className="text-[11px] text-muted-foreground">Enrolment count per class (V to XII)</p>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart
          data={chartData}
          margin={{ top: 0, right: 8, left: -20, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis
            dataKey="class"
            tick={{ fontSize: 11 }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tick={{ fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
          />
          <Tooltip
            contentStyle={{
              borderRadius: "8px",
              fontSize: "12px",
              border: "1px solid hsl(var(--border))",
            }}
            cursor={{ fill: "hsl(var(--muted))" }}
          />
          <Bar dataKey="students" radius={[4, 4, 0, 0]} maxBarSize={40}>
            {chartData.map((_, idx) => (
              <Cell
                key={idx}
                fill={`hsl(${210 + idx * 15}, 80%, ${55 - idx * 2}%)`}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}
