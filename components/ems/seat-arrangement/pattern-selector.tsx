"use client";

import React from "react";
import { ArrangementPattern } from "@/lib/ems/seat-arrangement-types";
import { Repeat, Sparkles } from "lucide-react";
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
    <div className="w-full grid grid-cols-2 gap-2 sm:gap-3 p-1.5 rounded-2xl bg-muted/60 border border-border/70 shadow-inner">
      {/* BUTTON 1: Interleaved (1:1) */}
      <button
        type="button"
        disabled={disabled}
        title="Interleaved Snake Loop (1:1 Ratio) — Columns alternate roles between classes"
        onClick={() => onChange("INTERLEAVED")}
        className={cn(
          "w-full py-2 sm:py-2.5 px-3 sm:px-4 text-xs sm:text-sm font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 select-none",
          currentPattern === "INTERLEAVED"
            ? "bg-primary text-primary-foreground shadow-sm scale-[1.01]"
            : "text-muted-foreground hover:text-foreground hover:bg-background/70"
        )}
      >
        <Repeat className="h-4 w-4 shrink-0" />
        <span className="truncate">Interleaved (1:1)</span>
      </button>

      {/* BUTTON 2: Fixed Outer U-Loop (2:1) */}
      <button
        type="button"
        disabled={disabled}
        title="Fixed Outer U-Loop (2:1 Ratio) — S1 & S3 outer desks are Class A, S2 center desk is Class B"
        onClick={() => onChange("FIXED_U")}
        className={cn(
          "w-full py-2 sm:py-2.5 px-3 sm:px-4 text-xs sm:text-sm font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 select-none",
          currentPattern === "FIXED_U"
            ? "bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-sm scale-[1.01]"
            : "text-muted-foreground hover:text-foreground hover:bg-background/70"
        )}
      >
        <Sparkles className="h-4 w-4 shrink-0" />
        <span className="truncate">Fixed Outer U-Loop (2:1)</span>
      </button>
    </div>
  );
}


