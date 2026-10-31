"use client";

import React from "react";
import { Coffee } from "lucide-react";
import { DAY_NAMES, type RoutineSettings } from "@/lib/routine/types";
import { type SlotMap, breakPeriod, dayPeriodCap, slotsForDay } from "@/lib/routine/slots";
import { cn } from "@/lib/utils";

interface PeriodSlotMatrixProps {
  settings: RoutineSettings;
  value: SlotMap | null;
  onChange: (next: SlotMap) => void;
  className?: string;
}

/** Day × period toggle grid with a tiffin gap. Click a day or a period header to flip the whole row/column. */
export function PeriodSlotMatrix({ settings, value, onChange, className }: PeriodSlotMatrixProps) {
  const P = settings.periodsPerDay;
  const bp = Math.min(breakPeriod(settings), P);
  const days = [...settings.workingDays].sort((a, b) => a - b);
  const periods = Array.from({ length: P }, (_, i) => i + 1);

  const full = (): SlotMap => Object.fromEntries(days.map((d) => [String(d), slotsForDay(value, settings, d)]));
  const commit = (next: SlotMap) => {
    for (const k of Object.keys(next)) next[k] = [...new Set(next[k])].sort((a, b) => a - b);
    onChange(next);
  };

  const toggleCell = (d: number, p: number) => {
    const next = full();
    const list = next[String(d)];
    next[String(d)] = list.includes(p) ? list.filter((x) => x !== p) : [...list, p];
    commit(next);
  };

  const toggleRow = (d: number) => {
    const next = full();
    const cap = dayPeriodCap(settings, d);
    next[String(d)] = next[String(d)].length === cap ? [] : periods.filter((p) => p <= cap);
    commit(next);
  };

  const toggleCol = (p: number) => {
    const next = full();
    const usable = days.filter((d) => p <= dayPeriodCap(settings, d));
    const allOn = usable.every((d) => next[String(d)].includes(p));
    for (const d of usable) {
      const list = next[String(d)].filter((x) => x !== p);
      next[String(d)] = allOn ? list : [...list, p];
    }
    commit(next);
  };

  const hasGap = bp >= 1 && bp < P;
  const cols = hasGap
    ? `2.75rem repeat(${bp}, minmax(0, 1fr)) 0.875rem repeat(${P - bp}, minmax(0, 1fr))`
    : `2.75rem repeat(${P}, minmax(0, 1fr))`;

  const cellsFor = (key: string, render: (p: number) => React.ReactNode, gap: React.ReactNode) =>
    periods.flatMap((p) =>
      hasGap && p === bp ? [render(p), <React.Fragment key={`${key}-gap`}>{gap}</React.Fragment>] : [render(p)]
    );

  return (
    <div className={cn("rounded-xl border bg-card p-2 sm:p-3", className)}>
      <div className="grid gap-1" style={{ gridTemplateColumns: cols }}>
        <span />
        {cellsFor("h", (p) => (
          <button
            key={`h-${p}`}
            type="button"
            onClick={() => toggleCol(p)}
            aria-label={`Toggle period ${p} on every day`}
            className="h-6 rounded-md text-[10px] font-mono font-semibold text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            P{p}
          </button>
        ), (
          <span className="flex items-center justify-center text-amber-500" title="Tiffin">
            <Coffee className="h-3 w-3" />
          </span>
        ))}

        {days.map((d) => {
          const cap = dayPeriodCap(settings, d);
          const open = slotsForDay(value, settings, d);
          const isHalf = settings.halfDays?.includes(d);
          return (
            <React.Fragment key={d}>
              <button
                type="button"
                onClick={() => toggleRow(d)}
                aria-label={`Toggle all periods on ${DAY_NAMES[d]}`}
                className={cn(
                  "h-8 rounded-md text-[11px] font-semibold text-left pl-1.5 flex items-center gap-1 hover:bg-muted transition-colors",
                  open.length === 0 ? "text-muted-foreground/60" : "text-foreground"
                )}
              >
                {DAY_NAMES[d].slice(0, 3)}
                {isHalf && <span className="h-1.5 w-1.5 rounded-full bg-amber-500" title="Half day" />}
              </button>
              {cellsFor(String(d), (p) => {
                if (p > cap) {
                  return (
                    <span
                      key={`${d}-${p}`}
                      className="h-8 rounded-md bg-[repeating-linear-gradient(135deg,transparent,transparent_4px,var(--border)_4px,var(--border)_5px)] opacity-60"
                    />
                  );
                }
                const on = open.includes(p);
                return (
                  <button
                    key={`${d}-${p}`}
                    type="button"
                    onClick={() => toggleCell(d, p)}
                    aria-pressed={on}
                    aria-label={`${DAY_NAMES[d]} period ${p}`}
                    className={cn(
                      "h-8 rounded-md border text-[10px] font-mono font-semibold transition-all active:scale-95",
                      on
                        ? "bg-primary border-primary text-primary-foreground shadow-xs hover:bg-primary/90"
                        : "bg-muted/30 border-dashed border-border text-muted-foreground/50 hover:bg-muted hover:text-foreground"
                    )}
                  >
                    {p}
                  </button>
                );
              }, (
                <span className="flex justify-center" aria-hidden>
                  <span className="h-full border-l border-dashed border-amber-400/70" />
                </span>
              ))}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
