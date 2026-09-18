"use client";

import React from "react";
import { ArrangementPattern } from "@/lib/ems/seat-arrangement-types";
import { Repeat, Sparkles, Check, Info } from "lucide-react";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface PatternSelectorProps {
  value: ArrangementPattern;
  onChange: (pattern: ArrangementPattern) => void;
  disabled?: boolean;
}

export function PatternSelector({
  value,
  onChange,
  disabled = false,
}: PatternSelectorProps) {
  const currentPattern = value === "FIXED_U" ? "FIXED_U" : "INTERLEAVED";

  return (
    <TooltipProvider delay={100}>
      <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* CARD 1: Interleaved (1:1 Ratio) */}
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange("INTERLEAVED")}
          className={cn(
            "w-full text-left p-3.5 sm:p-4 rounded-xl border-2 transition-all cursor-pointer flex items-center justify-between gap-3 select-none relative overflow-hidden group",
            currentPattern === "INTERLEAVED"
              ? "border-primary bg-primary/10 shadow-sm ring-1 ring-primary/30"
              : "border-border/70 bg-card/60 hover:bg-muted/60 hover:border-primary/40 text-muted-foreground"
          )}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={cn(
                "h-10 w-10 rounded-xl flex items-center justify-center shrink-0 border transition-colors",
                currentPattern === "INTERLEAVED"
                  ? "bg-primary text-primary-foreground border-primary shadow-xs"
                  : "bg-muted text-muted-foreground border-border/70 group-hover:text-foreground"
              )}
            >
              <Repeat className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={cn(
                    "text-sm font-bold tracking-tight",
                    currentPattern === "INTERLEAVED"
                      ? "text-foreground"
                      : "text-muted-foreground group-hover:text-foreground"
                  )}
                >
                  Interleaved Snake Loop
                </span>
                <span
                  className={cn(
                    "text-[10px] font-black px-1.5 py-0.5 rounded-md font-mono",
                    currentPattern === "INTERLEAVED"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  1:1 Ratio
                </span>

                <Tooltip>
                  <TooltipTrigger
                    type="button"
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex items-center justify-center p-0.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-background/80 transition-colors"
                  >
                    <Info className="h-3.5 w-3.5" />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs p-2.5 space-y-1 text-left shadow-xl">
                    <p className="font-bold text-[11px] text-primary">1:1 Equal Ratio Seating</p>
                    <p className="text-[10px] leading-relaxed text-background/90 dark:text-foreground/90">
                      Both classes share outer and center bench seats evenly across columns. Best when candidate counts in both classes are close.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>
          </div>

          {/* Right Active Indicator */}
          <div className="shrink-0">
            {currentPattern === "INTERLEAVED" ? (
              <div className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-xs">
                <Check className="h-3.5 w-3.5 stroke-[3]" />
              </div>
            ) : (
              <div className="h-6 w-6 rounded-full border-2 border-border/80 group-hover:border-primary/50" />
            )}
          </div>
        </button>

        {/* CARD 2: Fixed Outer U-Loop (2:1 Ratio) */}
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange("FIXED_U")}
          className={cn(
            "w-full text-left p-3.5 sm:p-4 rounded-xl border-2 transition-all cursor-pointer flex items-center justify-between gap-3 select-none relative overflow-hidden group",
            currentPattern === "FIXED_U"
              ? "border-amber-500 bg-amber-500/10 dark:bg-amber-950/25 shadow-sm ring-1 ring-amber-500/30"
              : "border-border/70 bg-card/60 hover:bg-muted/60 hover:border-amber-500/40 text-muted-foreground"
          )}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={cn(
                "h-10 w-10 rounded-xl flex items-center justify-center shrink-0 border transition-colors",
                currentPattern === "FIXED_U"
                  ? "bg-amber-600 text-white border-amber-600 shadow-xs"
                  : "bg-muted text-muted-foreground border-border/70 group-hover:text-foreground"
              )}
            >
              <Sparkles className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={cn(
                    "text-sm font-bold tracking-tight",
                    currentPattern === "FIXED_U"
                      ? "text-foreground"
                      : "text-muted-foreground group-hover:text-foreground"
                  )}
                >
                  Fixed Outer U-Loop
                </span>
                <span
                  className={cn(
                    "text-[10px] font-black px-1.5 py-0.5 rounded-md font-mono",
                    currentPattern === "FIXED_U"
                      ? "bg-amber-600 text-white"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  2:1 Ratio
                </span>

                <Tooltip>
                  <TooltipTrigger
                    type="button"
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex items-center justify-center p-0.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-background/80 transition-colors"
                  >
                    <Info className="h-3.5 w-3.5" />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs p-2.5 space-y-1 text-left shadow-xl">
                    <p className="font-bold text-[11px] text-amber-400">2:1 Fixed Ratio Seating</p>
                    <p className="text-[10px] leading-relaxed text-background/90 dark:text-foreground/90">
                      Class A takes both outer seats (S1 & S3) while Class B takes the center seat (S2). Best when Class A has roughly double the students of Class B.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>
          </div>

          {/* Right Active Indicator */}
          <div className="shrink-0">
            {currentPattern === "FIXED_U" ? (
              <div className="h-6 w-6 rounded-full bg-amber-600 text-white flex items-center justify-center shadow-xs">
                <Check className="h-3.5 w-3.5 stroke-[3]" />
              </div>
            ) : (
              <div className="h-6 w-6 rounded-full border-2 border-border/80 group-hover:border-amber-500/50" />
            )}
          </div>
        </button>
      </div>
    </TooltipProvider>
  );
}
