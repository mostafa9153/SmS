"use client";

import Link from "next/link";
import { BookOpen, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

import type { TeacherDashboardState } from "./use-teacher-dashboard";

export function AssignedDuties({ gen }: { gen: TeacherDashboardState }) {
  const { classes, handleOpenFullRoutine } = gen;
  return (
    <section className="p-4 sm:p-5 rounded-2xl bg-card border border-border/80 shadow-xs space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-1">
        <div className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-emerald-500" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-foreground">
            My Class &amp; Subject Responsibilities
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold border border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Synced with Routine · {new Date().getFullYear()}
          </span>
        </div>
      </div>

      {classes.length === 0 ? (
        <div className="py-2 text-xs text-muted-foreground flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <p className="italic">
            No class duties mapped in routine for this academic year yet. Once assigned in Routine, your responsibilities will automatically appear here.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={handleOpenFullRoutine}
            className="h-7 text-xs rounded-xl self-start sm:self-auto cursor-pointer"
          >
            View Full Routine
          </Button>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2.5">
          {classes.map((cls) => (
            <div
              key={cls.id}
              className="px-3.5 py-2 rounded-xl bg-muted/50 border border-border/70 flex items-center gap-2.5 text-xs shadow-2xs hover:border-emerald-500/40 transition-all"
            >
              <span
                className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                  cls.roleType === "CLASS_TEACHER"
                    ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20"
                    : "bg-blue-500/15 text-blue-700 dark:text-blue-400 border border-blue-500/20"
                }`}
              >
                {cls.roleType === "CLASS_TEACHER" ? "Class Teacher" : "Subject Teacher"}
              </span>
              <span className="font-bold text-foreground">
                Class {cls.className} ({cls.section})
              </span>
              {cls.subject && (
                <span className="text-[11px] text-muted-foreground font-normal">
                  · {cls.subject}
                </span>
              )}
              {cls.periodsPerWeek && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-background border border-border/60 text-muted-foreground font-semibold">
                  {cls.periodsPerWeek} per/wk
                </span>
              )}
              <Link
                href={`/student-attendance?class=${encodeURIComponent(cls.className)}&section=${encodeURIComponent(cls.section)}`}
                title="Take Attendance for this class"
                className="ml-0.5 p-1 rounded-md hover:bg-emerald-500/10 text-muted-foreground hover:text-emerald-600 transition-colors"
              >
                <UserCheck className="h-3.5 w-3.5" />
              </Link>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
