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
      <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i} className="p-4 space-y-2 rounded-2xl">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-7 w-12" />
          </Card>
        ))}
      </div>
    );
  }

  const cards = [
    {
      label: "Total Enrolled",
      value: stats.total,
      icon: <Users className="h-4 w-4" />,
      color: "text-blue-600 dark:text-blue-400 bg-blue-500/10 ring-1 ring-blue-500/20",
      borderHover: "hover:border-blue-500/40",
    },
    {
      label: "Boys",
      value: stats.boys,
      icon: <UserRound className="h-4 w-4" />,
      color: "text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 ring-1 ring-indigo-500/20",
      borderHover: "hover:border-indigo-500/40",
    },
    {
      label: "Girls",
      value: stats.girls,
      icon: <UserRound className="h-4 w-4" />,
      color: "text-pink-600 dark:text-pink-400 bg-pink-500/10 ring-1 ring-pink-500/20",
      borderHover: "hover:border-pink-500/40",
    },
    {
      label: "Continuing",
      value: stats.statusCounts["Continuing"] ?? 0,
      icon: <TrendingUp className="h-4 w-4" />,
      color: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 ring-1 ring-emerald-500/20",
      borderHover: "hover:border-emerald-500/40",
    },
    {
      label: "Drop Out",
      value: stats.statusCounts["Drop Out"] ?? 0,
      icon: <TrendingDown className="h-4 w-4" />,
      color: "text-rose-600 dark:text-rose-400 bg-rose-500/10 ring-1 ring-rose-500/20",
      borderHover: "hover:border-rose-500/40",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-5">
      {cards.map((card) => (
        <Card
          key={card.label}
          className={`p-4 rounded-2xl border bg-card/90 backdrop-blur-xs transition-all duration-300 hover:-translate-y-1 hover:shadow-md cursor-pointer ${card.borderHover}`}
        >
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-muted-foreground tracking-tight">
              {card.label}
            </p>
            <span className={`rounded-xl p-2 transition-transform duration-300 group-hover:scale-110 ${card.color}`}>
              {card.icon}
            </span>
          </div>
          <p className="text-2xl font-bold tracking-tight text-foreground font-mono">{card.value}</p>
        </Card>
      ))}
    </div>
  );
}
