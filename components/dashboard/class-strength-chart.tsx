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

const COLORS = [
  "#2563eb", // Blue
  "#4f46e5", // Indigo
  "#7c3aed", // Violet
  "#db2777", // Pink
  "#e11d48", // Rose
  "#059669", // Emerald
  "#0891b2", // Cyan
  "#d97706", // Amber
];

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-xl border border-border/80 bg-background/95 backdrop-blur-md p-3 shadow-md text-xs">
        <p className="font-bold text-foreground">{payload[0].payload.class}</p>
        <p className="text-muted-foreground mt-0.5">
          Students: <span className="font-bold text-primary">{payload[0].value}</span>
        </p>
      </div>
    );
  }
  return null;
};

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

  const sorted = sortClasses(Object.keys(stats.classWiseCounts || {}));
  const chartData = sorted.map((cls) => ({
    class: `Class ${cls}`,
    students: stats.classWiseCounts?.[cls] ?? 0,
  }));

  return (
    <Card className="p-5 rounded-2xl border bg-card/90 shadow-xs">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-bold text-foreground">Class-wise Student Distribution</p>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart
          data={chartData}
          margin={{ top: 0, right: 8, left: -20, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis
            dataKey="class"
            tick={{ fontSize: 11, fill: "#64748b" }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "#64748b" }}
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(0, 0, 0, 0.03)" }} />
          <Bar dataKey="students" radius={[4, 4, 0, 0]} maxBarSize={40}>
            {chartData.map((_, idx) => (
              <Cell
                key={idx}
                fill={COLORS[idx % COLORS.length]}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}
