"use client";

import { Users, GraduationCap, Briefcase, UserCheck } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

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
  const cards = [
    {
      label: "Total Staff",
      value: total,
      subtext: "Registered employees",
      icon: <Users className="h-4 w-4" />,
      color: "text-blue-600 dark:text-blue-400 bg-blue-500/10 ring-1 ring-blue-500/20",
      borderHover: "hover:border-blue-500/40",
    },
    {
      label: "Teaching Staff",
      value: teachingCount,
      subtext: "Faculty & Instructors",
      icon: <GraduationCap className="h-4 w-4" />,
      color: "text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 ring-1 ring-indigo-500/20",
      borderHover: "hover:border-indigo-500/40",
    },
    {
      label: "Non-Teaching Staff",
      value: nonTeachingCount,
      subtext: "Admin & Support staff",
      icon: <Briefcase className="h-4 w-4" />,
      color: "text-purple-600 dark:text-purple-400 bg-purple-500/10 ring-1 ring-purple-500/20",
      borderHover: "hover:border-purple-500/40",
    },
    {
      label: "Active On Duty",
      value: activeCount,
      subtext: `${total > 0 ? Math.round((activeCount / total) * 100) : 0}% operational`,
      icon: <UserCheck className="h-4 w-4" />,
      color: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 ring-1 ring-emerald-500/20",
      borderHover: "hover:border-emerald-500/40",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      {cards.map((c) => (
        <Card
          key={c.label}
          className={cn(
            "p-3.5 sm:p-4 rounded-2xl border bg-card/90 backdrop-blur-xs transition-all duration-200 hover:shadow-xs",
            c.borderHover
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">{c.label}</span>
            <div className={cn("p-1.5 rounded-xl", c.color)}>
              {c.icon}
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-bold font-mono tracking-tight text-foreground">
              {c.value}
            </span>
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground/80 truncate">
            {c.subtext}
          </p>
        </Card>
      ))}
    </div>
  );
}
