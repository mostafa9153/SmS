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
  Accessibility,
  ArrowUpRight,
  Bike,
  BookOpen,
  Landmark,
} from "lucide-react";

export function WelfareSchemesVisual() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: getDashboardStats,
  });

  if (isLoading || !stats) {
    return (
      <div className="glass-panel rounded-3xl p-5 sm:p-6 border border-border/60 dark:border-white/10 flex flex-col gap-3 shadow-sm dark:shadow-none">
        <Skeleton className="h-4 w-44 bg-muted/80 dark:bg-white/10" />
        <Skeleton className="h-56 w-full rounded-2xl bg-muted/80 dark:bg-white/10" />
      </div>
    );
  }

  const welfare = (stats as any).welfareStats || {
    kanyashreeK1: 0,
    kanyashreeK2: 0,
    totalKanyashree: 0,
    shikshashree: 0,
    oasis: 0,
    nsp: 0,
    svmcm: 0,
    saboojSarathi: 0,
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
      title: "Sikshashree",
      count: welfare.shikshashree,
      icon: <GraduationCap className="h-4 w-4 text-blue-600 dark:text-blue-400" />,
      accent: "bg-blue-500",
      percent: Math.min(100, Math.round((welfare.shikshashree / totalStudents) * 100)),
      link: "/students?scheme=sikshashree",
    },
    {
      title: "OASIS (SC/ST/OBC)",
      count: welfare.oasis || 0,
      icon: <Landmark className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />,
      accent: "bg-indigo-500",
      percent: Math.min(100, Math.round(((welfare.oasis || 0) / totalStudents) * 100)),
      link: "/students?scheme=oasis",
    },
    {
      title: "NSP (Minority)",
      count: welfare.nsp || 0,
      icon: <Award className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />,
      accent: "bg-emerald-500",
      percent: Math.min(100, Math.round(((welfare.nsp || 0) / totalStudents) * 100)),
      link: "/students?scheme=nsp",
    },
    {
      title: "SVMCM (Muslim)",
      count: welfare.svmcm || 0,
      icon: <GraduationCap className="h-4 w-4 text-purple-600 dark:text-purple-400" />,
      accent: "bg-purple-500",
      percent: Math.min(100, Math.round(((welfare.svmcm || 0) / totalStudents) * 100)),
      link: "/students?scheme=svmcm",
    },
    {
      title: "Sarathi",
      count: welfare.saboojSarathi || 0,
      icon: <Bike className="h-4 w-4 text-teal-600 dark:text-teal-400" />,
      accent: "bg-teal-500",
      percent: Math.min(100, Math.round(((welfare.saboojSarathi || 0) / totalStudents) * 100)),
      link: "/students?scheme=sabooj_sathi",
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
    <div className="glass-panel rounded-3xl p-5 sm:p-6 border border-border/60 dark:border-white/10 shadow-sm dark:shadow-none flex flex-col justify-between h-full transition-all duration-300 hover:border-pink-500/30">
      {/* Card Header */}
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-border/40">
        <div className="flex items-center gap-2.5">
          <div className="rounded-xl p-2 bg-pink-500/10 text-pink-600 dark:text-pink-400 border border-pink-500/20">
            <HeartHandshake className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-bold text-foreground">Welfare & Schemes Overview</p>
            <p className="text-[10px] text-muted-foreground">State & central benefit coverages</p>
          </div>
        </div>
        <Link
          href="/students"
          className="text-xs text-primary font-semibold hover:underline flex items-center gap-0.5 group"
        >
          View All <ArrowUpRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
        </Link>
      </div>

      {/* Grid of Clean Scheme Metric Cards */}
      <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-3 min-h-[160px] pt-1">
        {schemeItems.map((item) => (
          <Link
            key={item.title}
            href={item.link}
            className="group flex flex-col justify-between p-3 rounded-2xl border border-border/60 dark:border-white/5 bg-card/70 dark:bg-white/[0.03] hover:bg-muted/80 dark:hover:bg-white/[0.08] hover:border-primary/40 transition-all duration-200 shadow-2xs hover:shadow-xs active:scale-[0.98]"
          >
            {/* Top row: Icon + Title */}
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="p-1 rounded-lg bg-muted/80 dark:bg-white/10 group-hover:scale-110 transition-transform shrink-0">
                {item.icon}
              </span>
              <span className="text-[11px] font-bold text-foreground truncate group-hover:text-primary transition-colors">
                {item.title}
              </span>
            </div>

            {/* Middle: Prominent Count */}
            <div className="my-auto py-1.5 flex items-baseline justify-between">
              <span className="font-mono font-extrabold text-xl text-foreground tracking-tight">
                {item.count}
              </span>
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                Eligible
              </span>
            </div>

            {/* Bottom: Progress Bar */}
            <div className="h-1.5 w-full bg-muted dark:bg-white/10 rounded-full overflow-hidden mt-auto">
              <div
                className={`h-full rounded-full transition-all duration-500 ${item.accent}`}
                style={{ width: `${Math.max(item.percent, item.count > 0 ? 10 : 0)}%` }}
              />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
