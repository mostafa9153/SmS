"use client";

import { useState } from "react";
import { SecondarySessionTab } from "./secondary-session-tab";
import { HigherSecondarySessionTab } from "./higher-secondary-session-tab";
import { School, GraduationCap, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

export default function AcademicSessionClient() {
  const [activeSection, setActiveSection] = useState<"secondary" | "higher_secondary">("secondary");

  return (
    <div className="w-full space-y-5">
      {/* Premium Segmented Switcher Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-muted/40 p-2 sm:p-2.5 rounded-2xl border border-border/70 shadow-2xs">
        {/* Toggle Buttons */}
        <div className="inline-flex p-1 bg-background/90 dark:bg-muted/80 rounded-xl border border-border/80 shadow-inner w-full md:w-auto gap-1">
          <button
            type="button"
            onClick={() => setActiveSection("secondary")}
            className={cn(
              "flex-1 md:flex-initial flex items-center justify-center sm:justify-start gap-2.5 px-4 sm:px-6 py-2.5 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer select-none",
              activeSection === "secondary"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            )}
          >
            <School className={cn("h-4 w-4 shrink-0", activeSection === "secondary" ? "text-primary-foreground" : "text-primary")} />
            <div className="text-left">
              <span className="block leading-tight">Secondary Section</span>
              <span className={cn("text-[10px] font-normal block leading-tight opacity-85", activeSection === "secondary" ? "text-primary-foreground/90" : "text-muted-foreground")}>
                Classes V – X
              </span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setActiveSection("higher_secondary")}
            className={cn(
              "flex-1 md:flex-initial flex items-center justify-center sm:justify-start gap-2.5 px-4 sm:px-6 py-2.5 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer select-none",
              activeSection === "higher_secondary"
                ? "bg-indigo-600 dark:bg-indigo-500 text-white shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            )}
          >
            <GraduationCap className={cn("h-4 w-4 shrink-0", activeSection === "higher_secondary" ? "text-white" : "text-indigo-600 dark:text-indigo-400")} />
            <div className="text-left">
              <span className="block leading-tight">Higher Secondary</span>
              <span className={cn("text-[10px] font-normal block leading-tight opacity-85", activeSection === "higher_secondary" ? "text-white/90" : "text-muted-foreground")}>
                Classes XI – XII
              </span>
            </div>
          </button>
        </div>

        {/* Section Context Info Badge */}
        <div className="flex items-center gap-2 self-start md:self-auto px-1">
          {activeSection === "secondary" ? (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900/40 text-xs font-medium">
              <Calendar className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
              <span>Standard Academic Year • <strong>January to December</strong></span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-900/40 text-xs font-medium">
              <Calendar className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
              <span>H.S. Academic Year • <strong>April Session</strong></span>
            </div>
          )}
        </div>
      </div>

      {/* Tab Content Display */}
      <div className="transition-opacity duration-200">
        {activeSection === "secondary" ? (
          <SecondarySessionTab />
        ) : (
          <HigherSecondarySessionTab />
        )}
      </div>
    </div>
  );
}
