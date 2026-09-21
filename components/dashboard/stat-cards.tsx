"use client";

import { useQuery } from "@tanstack/react-query";
import { getDashboardStats } from "@/lib/data/students";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, TrendingDown, TrendingUp, ShieldCheck, Scale } from "lucide-react";
import { cn } from "@/lib/utils";

export function StatCards() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: getDashboardStats,
  });

  if (isLoading || !stats) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-6">
        <div className="col-span-2 glass-panel rounded-3xl p-5 space-y-3 border border-border/60 dark:border-white/10">
          <Skeleton className="h-4 w-28 bg-muted/80 dark:bg-white/10" />
          <Skeleton className="h-9 w-24 bg-muted/80 dark:bg-white/10" />
          <div className="flex gap-2">
            <Skeleton className="h-6 w-20 rounded-full bg-muted/80 dark:bg-white/10" />
            <Skeleton className="h-6 w-20 rounded-full bg-muted/80 dark:bg-white/10" />
          </div>
        </div>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="glass-panel rounded-3xl p-4 space-y-2 border border-border/60 dark:border-white/10">
            <Skeleton className="h-3 w-16 bg-muted/80 dark:bg-white/10" />
            <Skeleton className="h-7 w-12 bg-muted/80 dark:bg-white/10" />
          </div>
        ))}
      </div>
    );
  }

  const total = stats.total || 0;
  const boys = stats.boys || 0;
  const girls = stats.girls || 0;
  const continuing = stats.statusCounts?.["Continuing"] ?? 0;
  const dropOut = stats.statusCounts?.["Drop Out"] ?? 0;
  const withAadhaar = stats.welfareStats?.withAadhaar ?? 0;

  const boysPct = total > 0 ? Math.round((boys / total) * 100) : 0;
  const girlsPct = total > 0 ? Math.round((girls / total) * 100) : 0;
  const continuingPct = total > 0 ? Math.round((continuing / total) * 100) : 0;
  const aadhaarPct = total > 0 ? Math.round((withAadhaar / total) * 100) : 0;

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-6">
      {/* 1. Bento Hero Card: Total Enrolled with Neon Cyber Amber Highlight (2 cols) */}
      <div className="col-span-2 glass-panel rounded-3xl p-5 border border-border/60 dark:border-white/10 relative overflow-hidden transition-all duration-300 hover:border-amber-500/40 dark:hover:border-[#FACC15]/40 shadow-sm dark:shadow-none hover:shadow-md dark:hover:shadow-[0_0_25px_rgba(250,204,21,0.18)] group">
        <div className="absolute -top-10 -right-10 w-28 h-28 bg-amber-500/10 dark:bg-[#FACC15]/15 rounded-full blur-2xl pointer-events-none group-hover:scale-125 transition-transform" />

        <div className="flex items-center justify-between mb-3 relative z-10">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-amber-600 dark:bg-[#FACC15] shadow-sm dark:shadow-[0_0_8px_#FACC15] animate-pulse" />
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Total Enrolled Students
            </p>
          </div>
          <div className="h-8 w-8 rounded-xl bg-amber-500/15 dark:bg-[#FACC15]/10 border border-amber-500/35 dark:border-[#FACC15]/30 flex items-center justify-center text-amber-800 dark:text-[#FACC15]">
            <Users className="h-4 w-4" />
          </div>
        </div>

        <div className="relative z-10">
          <p className="text-3xl sm:text-4xl font-black tracking-tight text-foreground font-mono">
            {total.toLocaleString()}
          </p>

          {/* Quick Demographics Pills */}
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-700 dark:text-blue-400 text-xs font-bold">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-500 dark:bg-blue-400" />
              <span>Boys: {boys.toLocaleString()}</span>
              <span className="text-[10px] text-blue-700/80 dark:text-blue-400/80 font-mono">({boysPct}%)</span>
            </div>

            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-pink-500/10 border border-pink-500/20 text-pink-700 dark:text-pink-400 text-xs font-bold">
              <span className="h-1.5 w-1.5 rounded-full bg-pink-500 dark:bg-pink-400" />
              <span>Girls: {girls.toLocaleString()}</span>
              <span className="text-[10px] text-pink-700/80 dark:text-pink-400/80 font-mono">({girlsPct}%)</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Continuing Active Card with Neon Emerald Highlight (1 col) */}
      <div className="col-span-1 glass-panel rounded-3xl p-4 sm:p-5 border border-border/60 dark:border-white/10 relative overflow-hidden transition-all duration-300 hover:border-emerald-500/40 dark:hover:border-[#10B981]/40 shadow-sm dark:shadow-none hover:shadow-md dark:hover:shadow-[0_0_20px_rgba(16,185,129,0.18)] group">
        <div className="absolute -top-8 -right-8 w-20 h-20 bg-emerald-500/10 dark:bg-[#10B981]/15 rounded-full blur-xl pointer-events-none group-hover:scale-125 transition-transform" />

        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold text-muted-foreground tracking-tight">Continuing</p>
          <div className="h-7 w-7 rounded-lg bg-emerald-500/10 dark:bg-[#10B981]/10 border border-emerald-500/30 dark:border-[#10B981]/30 flex items-center justify-center text-emerald-600 dark:text-[#10B981]">
            <TrendingUp className="h-3.5 w-3.5" />
          </div>
        </div>

        <p className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground font-mono">
          {continuing.toLocaleString()}
        </p>
        <p className="text-[11px] font-bold text-emerald-700 dark:text-[#10B981] mt-1 flex items-center gap-1">
          <span>{continuingPct}% Active Rate</span>
        </p>
      </div>

      {/* 3. Gender Parity Ratio (1 col) */}
      <div className="col-span-1 glass-panel rounded-3xl p-4 sm:p-5 border border-border/60 dark:border-white/10 relative overflow-hidden transition-all duration-300 hover:border-sky-500/40 shadow-sm dark:shadow-none hover:shadow-md dark:hover:shadow-[0_0_20px_rgba(56,189,248,0.18)] group">
        <div className="absolute -top-8 -right-8 w-20 h-20 bg-sky-500/10 dark:bg-sky-500/15 rounded-full blur-xl pointer-events-none group-hover:scale-125 transition-transform" />

        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold text-muted-foreground tracking-tight">Gender Parity</p>
          <div className="h-7 w-7 rounded-lg bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-600 dark:text-sky-400">
            <Scale className="h-3.5 w-3.5" />
          </div>
        </div>

        <div className="flex items-baseline gap-1">
          <span className="text-2xl sm:text-3xl font-bold tracking-tight text-blue-600 dark:text-blue-400 font-mono">{boysPct}</span>
          <span className="text-sm font-bold text-muted-foreground font-mono">:</span>
          <span className="text-2xl sm:text-3xl font-bold tracking-tight text-pink-600 dark:text-pink-400 font-mono">{girlsPct}</span>
        </div>
        <p className="text-[11px] font-semibold text-muted-foreground mt-1">
          Boys vs Girls %
        </p>
      </div>

      {/* 4. Drop Out / At-Risk Monitoring (1 col) */}
      <div className="col-span-1 glass-panel rounded-3xl p-4 sm:p-5 border border-border/60 dark:border-white/10 relative overflow-hidden transition-all duration-300 hover:border-rose-500/40 shadow-sm dark:shadow-none hover:shadow-md dark:hover:shadow-[0_0_20px_rgba(244,63,94,0.18)] group">
        <div className="absolute -top-8 -right-8 w-20 h-20 bg-rose-500/10 dark:bg-rose-500/15 rounded-full blur-xl pointer-events-none group-hover:scale-125 transition-transform" />

        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold text-muted-foreground tracking-tight">Drop Out</p>
          <div className="h-7 w-7 rounded-lg bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-600 dark:text-rose-400">
            <TrendingDown className="h-3.5 w-3.5" />
          </div>
        </div>

        <p className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground font-mono">
          {dropOut.toLocaleString()}
        </p>
        <p className="text-[11px] font-semibold text-rose-600 dark:text-rose-400/90 mt-1">
          At-Risk Tracking
        </p>
      </div>

      {/* 5. Aadhaar / UIDAI Compliance (1 col) */}
      <div className="col-span-1 glass-panel rounded-3xl p-4 sm:p-5 border border-border/60 dark:border-white/10 relative overflow-hidden transition-all duration-300 hover:border-indigo-500/40 shadow-sm dark:shadow-none hover:shadow-md dark:hover:shadow-[0_0_20px_rgba(99,102,241,0.18)] group">
        <div className="absolute -top-8 -right-8 w-20 h-20 bg-indigo-500/10 dark:bg-indigo-500/15 rounded-full blur-xl pointer-events-none group-hover:scale-125 transition-transform" />

        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold text-muted-foreground tracking-tight">Aadhaar Linked</p>
          <div className="h-7 w-7 rounded-lg bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
            <ShieldCheck className="h-3.5 w-3.5" />
          </div>
        </div>

        <p className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground font-mono">
          {withAadhaar.toLocaleString()}
        </p>
        <p className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 mt-1">
          {aadhaarPct}% Verified
        </p>
      </div>
    </div>
  );
}
