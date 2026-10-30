"use client";

import { RefreshCw, FileSpreadsheet, Layers, Lock, UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { showToast } from "@/components/ui/toast-banner";

import type { TeacherDashboardState } from "./use-teacher-dashboard";

export function QuickActionHub({ gen }: { gen: TeacherDashboardState }) {
  const { canMarksEntry, canNewAdmission, canReAdmission, router } = gen;
  return (
    <section className="p-4 sm:p-5 rounded-2xl bg-card border border-border/80 shadow-xs space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-emerald-500" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-foreground">
            Quick Faculty Tools
          </h2>
        </div>
        <span className="text-[11px] text-muted-foreground font-medium">Instant Shortcuts</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* 1. New Admission */}
        <button
          type="button"
          onClick={() => {
            if (!canNewAdmission) {
              showToast({
                type: "error",
                title: "Access Restricted",
                description: "Admin has not granted you access for New Admission.",
              });
              return;
            }
            router.push("/admission/new");
          }}
          className={cn(
            "p-3.5 rounded-xl border flex items-center justify-between text-left transition-all cursor-pointer group shadow-2xs",
            canNewAdmission
              ? "bg-muted/40 hover:bg-emerald-500/10 border-border/70 hover:border-emerald-500/40"
              : "bg-muted/20 border-border/40 opacity-70 hover:opacity-90"
          )}
        >
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "h-10 w-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105 shrink-0",
                canNewAdmission
                  ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                  : "bg-muted text-muted-foreground"
              )}
            >
              <UserPlus className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-foreground">New Admission</p>
              <p className="text-[10px] text-muted-foreground">Student Registration</p>
            </div>
          </div>
          {!canNewAdmission && (
            <span className="flex items-center gap-1 text-[10px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
              <Lock className="h-3 w-3" />
              Locked
            </span>
          )}
        </button>

        {/* 2. Re-Admission */}
        <button
          type="button"
          onClick={() => {
            if (!canReAdmission) {
              showToast({
                type: "error",
                title: "Access Restricted",
                description: "Admin has not granted you access for Re-Admission.",
              });
              return;
            }
            router.push("/admission/re");
          }}
          className={cn(
            "p-3.5 rounded-xl border flex items-center justify-between text-left transition-all cursor-pointer group shadow-2xs",
            canReAdmission
              ? "bg-muted/40 hover:bg-blue-500/10 border-border/70 hover:border-blue-500/40"
              : "bg-muted/20 border-border/40 opacity-70 hover:opacity-90"
          )}
        >
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "h-10 w-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105 shrink-0",
                canReAdmission
                  ? "bg-blue-500/15 text-blue-600 dark:text-blue-400"
                  : "bg-muted text-muted-foreground"
              )}
            >
              <RefreshCw className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-foreground">Re-Admission</p>
              <p className="text-[10px] text-muted-foreground">Class Upgrades</p>
            </div>
          </div>
          {!canReAdmission && (
            <span className="flex items-center gap-1 text-[10px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
              <Lock className="h-3 w-3" />
              Locked
            </span>
          )}
        </button>

        {/* 3. Marks Entry */}
        <button
          type="button"
          onClick={() => {
            if (!canMarksEntry) {
              showToast({
                type: "error",
                title: "Access Restricted",
                description: "Admin has not granted you access for Results & Marks Entry.",
              });
              return;
            }
            router.push("/results");
          }}
          className={cn(
            "p-3.5 rounded-xl border flex items-center justify-between text-left transition-all cursor-pointer group shadow-2xs",
            canMarksEntry
              ? "bg-muted/40 hover:bg-amber-500/10 border-border/70 hover:border-amber-500/40"
              : "bg-muted/20 border-border/40 opacity-70 hover:opacity-90"
          )}
        >
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "h-10 w-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105 shrink-0",
                canMarksEntry
                  ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                  : "bg-muted text-muted-foreground"
              )}
            >
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-foreground">Marks Entry</p>
              <p className="text-[10px] text-muted-foreground">Summative S1, S2, S3</p>
            </div>
          </div>
          {!canMarksEntry && (
            <span className="flex items-center gap-1 text-[10px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
              <Lock className="h-3 w-3" />
              Locked
            </span>
          )}
        </button>
      </div>
    </section>
  );
}
