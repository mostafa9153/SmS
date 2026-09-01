"use client";

import { useQuery } from "@tanstack/react-query";
import { getDashboardStats } from "@/lib/data/students";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import {
  HeartHandshake,
  GraduationCap,
  Sparkles,
  Award,
  ShieldAlert,
  Accessibility,
  ArrowUpRight,
  Smartphone,
  Bike,
  BookOpen,
} from "lucide-react";

export function WelfareSchemesVisual() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: getDashboardStats,
  });

  if (isLoading || !stats) {
    return (
      <Card className="p-5 flex flex-col gap-3 rounded-2xl border bg-card/90 shadow-xs">
        <Skeleton className="h-4 w-44" />
        <Skeleton className="h-52 w-full rounded-xl" />
      </Card>
    );
  }

  const welfare = (stats as any).welfareStats || {
    kanyashreeK1: 0,
    kanyashreeK2: 0,
    totalKanyashree: 0,
    shikshashree: 0,
    aikyashree: 0,
    medhashree: 0,
    tarunerSwapno: 0,
    saboojSarathi: 0,
    bpl: 0,
    cwsn: 0,
  };

  const totalGirls = stats.girls || 1;
  const totalStudents = stats.total || 1;

  const schemeItems = [
    {
      title: "Kanyashree (K1)",
      count: welfare.kanyashreeK1,
      icon: <Sparkles className="h-4 w-4 text-pink-600 dark:text-pink-400" />,
      accent: "bg-pink-500",
      percent: Math.min(100, Math.round((welfare.kanyashreeK1 / totalGirls) * 100)),
      link: "/students?scheme=kanyashree_k1",
    },
    {
      title: "Kanyashree (K2)",
      count: welfare.kanyashreeK2,
      icon: <Sparkles className="h-4 w-4 text-rose-600 dark:text-rose-400" />,
      accent: "bg-rose-500",
      percent: Math.min(100, Math.round((welfare.kanyashreeK2 / totalGirls) * 100)),
      link: "/students?scheme=kanyashree_k2",
    },
    {
      title: "Aikyashree",
      count: welfare.aikyashree,
      icon: <Award className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />,
      accent: "bg-emerald-500",
      percent: Math.min(100, Math.round((welfare.aikyashree / totalStudents) * 100)),
      link: "/students?scheme=aikyashree",
    },
    {
      title: "Sikshashree",
      count: welfare.shikshashree,
      icon: <GraduationCap className="h-4 w-4 text-amber-600 dark:text-amber-400" />,
      accent: "bg-amber-500",
      percent: Math.min(100, Math.round((welfare.shikshashree / totalStudents) * 100)),
      link: "/students?scheme=sikshashree",
    },
    {
      title: "Medhashree (OBC)",
      count: welfare.medhashree || 0,
      icon: <BookOpen className="h-4 w-4 text-orange-600 dark:text-orange-400" />,
      accent: "bg-orange-500",
      percent: Math.min(100, Math.round(((welfare.medhashree || 0) / totalStudents) * 100)),
      link: "/students?scheme=medhashree",
    },
    {
      title: "Taruner Swapno",
      count: welfare.tarunerSwapno || 0,
      icon: <Smartphone className="h-4 w-4 text-violet-600 dark:text-violet-400" />,
      accent: "bg-violet-500",
      percent: Math.min(100, Math.round(((welfare.tarunerSwapno || 0) / totalStudents) * 100)),
      link: "/students?scheme=taruner_swapno",
    },
    {
      title: "Sabooj Sarathi",
      count: welfare.saboojSarathi || 0,
      icon: <Bike className="h-4 w-4 text-teal-600 dark:text-teal-400" />,
      accent: "bg-teal-500",
      percent: Math.min(100, Math.round(((welfare.saboojSarathi || 0) / totalStudents) * 100)),
      link: "/students?scheme=sabooj_sathi",
    },
    {
      title: "BPL Beneficiaries",
      count: welfare.bpl,
      icon: <ShieldAlert className="h-4 w-4 text-purple-600 dark:text-purple-400" />,
      accent: "bg-purple-500",
      percent: Math.min(100, Math.round((welfare.bpl / totalStudents) * 100)),
      link: "/students?scheme=bpl",
    },
    {
      title: "CWSN / Divyangjan",
      count: welfare.cwsn,
      icon: <Accessibility className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />,
      accent: "bg-cyan-500",
      percent: Math.min(100, Math.round((welfare.cwsn / totalStudents) * 100)),
      link: "/students?scheme=cwsn",
    },
  ];

  return (
    <Card className="p-5 rounded-2xl border bg-card/90 shadow-xs flex flex-col justify-between h-full">
      {/* Card Header */}
      <div className="flex items-center justify-between mb-3 pb-1 border-b border-border/40">
        <div className="flex items-center gap-2">
          <div className="rounded-xl p-2 bg-pink-500/10 text-pink-600 ring-1 ring-pink-500/20">
            <HeartHandshake className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-bold text-foreground">Welfare & Schemes Overview</p>
          </div>
        </div>
        <Link
          href="/students"
          className="text-xs text-primary font-semibold hover:underline flex items-center gap-0.5"
        >
          View All <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* Grid of 6 Clean Scheme Metric Cards (Stretching to fill full height) */}
      <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 grid-rows-2 gap-3.5 min-h-[160px]">
        {schemeItems.map((item) => (
          <Link
            key={item.title}
            href={item.link}
            className="group flex flex-col justify-between p-3.5 sm:p-4 rounded-xl border bg-background/70 hover:bg-muted/60 hover:border-primary/40 transition-all duration-200 shadow-2xs hover:shadow-xs"
          >
            {/* Top row: Icon + Title */}
            <div className="flex items-center gap-2 min-w-0">
              <span className="p-1.5 rounded-lg bg-muted/80 group-hover:scale-110 transition-transform shrink-0">
                {item.icon}
              </span>
              <span className="text-xs font-bold text-foreground truncate group-hover:text-primary transition-colors">
                {item.title}
              </span>
            </div>

            {/* Middle: Prominent Count */}
            <div className="my-auto py-1 flex items-baseline justify-between">
              <span className="font-mono font-extrabold text-xl sm:text-2xl text-foreground tracking-tight">
                {item.count}
              </span>
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                Eligible
              </span>
            </div>

            {/* Bottom: Progress Bar */}
            <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden mt-auto">
              <div
                className={`h-full rounded-full transition-all duration-500 ${item.accent}`}
                style={{ width: `${Math.max(item.percent, item.count > 0 ? 10 : 0)}%` }}
              />
            </div>
          </Link>
        ))}
      </div>
    </Card>
  );
}
