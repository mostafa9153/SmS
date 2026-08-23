"use client";

import { useQuery } from "@tanstack/react-query";
import { getDashboardStats } from "@/lib/data/students";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, UserRound, TrendingDown, TrendingUp, GraduationCap } from "lucide-react";
import { STATUS_STYLES } from "@/lib/utils";

export function StatCards() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: getDashboardStats,
  });

  if (isLoading || !stats) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i} className="p-4 space-y-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-7 w-12" />
          </Card>
        ))}
      </div>
    );
  }

  const cards = [
    {
      label: "Total Students",
      value: stats.total,
      icon: <Users className="h-4 w-4" />,
      color: "text-blue-600 bg-blue-50",
    },
    {
      label: "Boys",
      value: stats.boys,
      icon: <UserRound className="h-4 w-4" />,
      color: "text-indigo-600 bg-indigo-50",
    },
    {
      label: "Girls",
      value: stats.girls,
      icon: <UserRound className="h-4 w-4" />,
      color: "text-pink-600 bg-pink-50",
    },
    {
      label: "Continuing",
      value: stats.statusCounts["Continuing"] ?? 0,
      icon: <TrendingUp className="h-4 w-4" />,
      color: `text-emerald-700 bg-emerald-50`,
    },
    {
      label: "Drop Out",
      value: stats.statusCounts["Drop Out"] ?? 0,
      icon: <TrendingDown className="h-4 w-4" />,
      color: `text-rose-700 bg-rose-50`,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {cards.map((card) => (
        <Card key={card.label} className="p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-medium text-muted-foreground">
              {card.label}
            </p>
            <span className={`rounded-md p-1.5 ${card.color}`}>
              {card.icon}
            </span>
          </div>
          <p className="text-2xl font-bold tracking-tight">{card.value}</p>
        </Card>
      ))}
    </div>
  );
}
