"use client";

import React, { useState } from "react";
import { ArrangementPattern } from "@/lib/ems/seat-arrangement-types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ShieldCheck,
  Info,
  Repeat,
  Sparkles,
  CheckCircle2,
  GitFork,
  Check,
} from "lucide-react";
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
    <div className="rounded-2xl border border-border/70 bg-gradient-to-r from-card via-card/95 to-primary/[0.02] p-3 sm:p-3.5 shadow-2xs transition-all flex flex-col md:flex-row md:items-center justify-between gap-3">
      {/* Left: Section Header */}
      <div className="flex items-center gap-2.5">
        <div className="h-8.5 w-8.5 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20 shadow-2xs">
          <ShieldCheck className="h-4 w-4 text-primary" />
        </div>
        <div>
          <h4 className="text-xs sm:text-sm font-bold tracking-tight text-foreground">
            Seating Strategy
          </h4>
          <p className="text-[11px] text-muted-foreground">
            {currentPattern === "FIXED_U"
              ? "Outer desks (S1 & S3) = Class A • Center desk (S2) = Class B (2:1 Ratio)"
              : "Columns alternate Outer vs Center roles between classes (1:1 Ratio)"}
          </p>
        </div>
      </div>

      {/* Right: Clean Segmented Strategy Buttons */}
      <div className="inline-flex items-center p-1 rounded-xl bg-muted/70 border border-border/70 shadow-inner shrink-0 self-start md:self-auto gap-1">
        {/* BUTTON 1: Interleaved (1:1) */}
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange("INTERLEAVED")}
          className={cn(
            "px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 select-none",
            currentPattern === "INTERLEAVED"
              ? "bg-primary text-primary-foreground shadow-xs"
              : "text-muted-foreground hover:text-foreground hover:bg-background/50"
          )}
        >
          <Repeat className="h-3 w-3" />
          <span>Interleaved (1:1)</span>
        </button>

        {/* BUTTON 2: Fixed Outer U-Loop (2:1) */}
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange("FIXED_U")}
          className={cn(
            "px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 select-none",
            currentPattern === "FIXED_U"
              ? "bg-amber-600 text-white shadow-xs"
              : "text-muted-foreground hover:text-foreground hover:bg-background/50"
          )}
        >
          <Sparkles className="h-3 w-3" />
          <span>Fixed Outer U-Loop (2:1)</span>
        </button>
      </div>
    </div>
  );
}
