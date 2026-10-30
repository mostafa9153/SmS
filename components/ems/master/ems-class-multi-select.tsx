"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { cn } from "@/lib/utils";
import { EMS_ELIGIBLE_CLASSES } from "@/lib/ems/types";
import { Badge } from "@/components/ui/badge";
import { Check, ChevronDown } from "lucide-react";
import { getClassNumericRank } from "@/lib/ems/ems-config-loader";
import { normalizeClassCode } from "@/lib/ems/seat-arrangement-algorithm";


export function EmsClassMultiSelect({
  selectedClasses,
  onChange,
}: {
  selectedClasses: string[];
  onChange: (classes: string[]) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Normalize selected classes to clean base Roman codes (e.g. "V-A" -> "V")
  const normalizedSelected = useMemo(() => {
    return Array.from(
      new Set(
        selectedClasses
          .map((c: string) => normalizeClassCode(c))
          .filter(Boolean)
      )
    );
  }, [selectedClasses]);

  // If caller provided un-normalized items (e.g. from legacy state "V-A"), sanitize immediately
  useEffect(() => {
    if (
      selectedClasses.length > 0 &&
      (selectedClasses.length !== normalizedSelected.length ||
        selectedClasses.some((c: string, i: number) => c !== normalizedSelected[i]))
    ) {
      onChange(normalizedSelected);
    }
  }, [selectedClasses, normalizedSelected, onChange]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const toggleClass = (code: string) => {
    const norm = normalizeClassCode(code);
    if (normalizedSelected.includes(norm)) {
      onChange(normalizedSelected.filter((c: string) => c !== norm));
    } else {
      const combined = [...normalizedSelected, norm].sort(
        (a: string, b: string) => getClassNumericRank(a) - getClassNumericRank(b)
      );
      onChange(combined);
    }
  };

  const displayText =
    normalizedSelected.length === 0
      ? "Select Classes *"
      : normalizedSelected.length <= 3
      ? normalizedSelected.map((c: string) => `Class ${c}`).join(", ")
      : `${normalizedSelected.length} Classes (${normalizedSelected.join(", ")})`;

  return (
    <div className="relative w-full" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full h-10 px-3 py-2 rounded-xl border border-input bg-background text-left text-xs transition-all flex items-center justify-between gap-2 shadow-2xs hover:border-primary/50 focus:outline-hidden focus:ring-2 focus:ring-primary/20 cursor-pointer",
          isOpen && "ring-2 ring-primary/20 border-primary"
        )}
      >
        <span
          className={cn(
            "truncate",
            normalizedSelected.length === 0
              ? "text-muted-foreground font-normal"
              : "font-semibold text-foreground"
          )}
        >
          {displayText}
        </span>
        <div className="flex items-center gap-1.5 shrink-0">
          {normalizedSelected.length > 0 && (
            <Badge variant="secondary" className="text-[10px] font-mono font-bold px-1.5 py-0 h-5">
              {normalizedSelected.length}
            </Badge>
          )}
          <ChevronDown
            className={cn(
              "h-4 w-4 text-muted-foreground transition-transform",
              isOpen && "rotate-180 text-primary"
            )}
          />
        </div>
      </button>

      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-50 rounded-2xl border border-border bg-popover/95 p-2 shadow-2xl backdrop-blur-md animate-in fade-in-0 zoom-in-95 space-y-2">
          {/* Quick presets */}
          <div className="flex items-center gap-1 flex-wrap pb-1.5 border-b border-border/60">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-1">
              Quick:
            </span>
            <button
              type="button"
              onClick={() => onChange(["V", "VI", "VII", "VIII", "IX"])}
              className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-muted hover:bg-primary/10 hover:text-primary transition-colors cursor-pointer"
            >
              V–IX (Junior)
            </button>
            <button
              type="button"
              onClick={() => onChange(["V", "VI", "VII", "VIII", "IX", "X"])}
              className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-muted hover:bg-primary/10 hover:text-primary transition-colors cursor-pointer"
            >
              V–X (Secondary)
            </button>
            <button
              type="button"
              onClick={() => onChange(["XI"])}
              className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-muted hover:bg-primary/10 hover:text-primary transition-colors cursor-pointer"
            >
              Class XI
            </button>
            <button
              type="button"
              onClick={() => onChange([...EMS_ELIGIBLE_CLASSES])}
              className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-muted hover:bg-primary/10 hover:text-primary transition-colors cursor-pointer"
            >
              All (V–XI)
            </button>
            <button
              type="button"
              onClick={() => onChange([])}
              className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-muted hover:bg-destructive/10 hover:text-destructive transition-colors cursor-pointer ml-auto"
            >
              Clear
            </button>
          </div>

          {/* Classes Checklist */}
          <div className="grid grid-cols-2 gap-1 max-h-56 overflow-y-auto p-0.5">
            {EMS_ELIGIBLE_CLASSES.map((cls) => {
              const isSelected = normalizedSelected.includes(cls);
              return (
                <button
                  key={cls}
                  type="button"
                  onClick={() => toggleClass(cls)}
                  className={cn(
                    "flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer text-left",
                    isSelected
                      ? "bg-primary/10 text-primary border border-primary/30"
                      : "hover:bg-muted/60 text-foreground border border-transparent"
                  )}
                >
                  <span>Class {cls}</span>
                  {isSelected ? (
                    <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                  ) : (
                    <div className="h-3.5 w-3.5 rounded border border-border/80 shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
