"use client";

import { useState } from "react";
import { ChevronDown, Save } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  MARGIN_PRESETS,
  MARGIN_SIDES,
  pageSizeMm,
  sameMargins,
  type PaperOrientation,
  type PaperSize,
} from "@/lib/print/paper";
import type { PaperSettings } from "@/components/print/use-paper-settings";

const choice = (active: boolean) =>
  cn(
    "p-2 rounded-xl border text-center transition-all cursor-pointer",
    active
      ? "border-primary bg-primary/10 text-primary font-bold"
      : "border-border bg-background text-muted-foreground hover:bg-muted/50",
  );

/**
 * The one "Paper & Margin" card for print pages. `papers` overrides the sizes given to `usePaperSettings`;
 * `orientations` shows the portrait/landscape switch; `lockMargins` hides the margin inputs for
 * layouts with a fixed physical size (ID cards, marksheets).
 */
export function PaperSettingsPanel({
  settings,
  papers,
  orientations = false,
  lockMargins = false,
  defaultOpen = false,
  variant = "card",
  className,
}: {
  settings: PaperSettings;
  papers?: PaperSize[];
  orientations?: boolean;
  lockMargins?: boolean;
  defaultOpen?: boolean;
  /** `card` stands alone; `section` sits in another card under a divider; `bare` adds no wrapper styling. */
  variant?: "card" | "section" | "bare";
  className?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const choices = papers ?? settings.papers;
  const {
    paper,
    setPaper,
    orientation,
    setOrientation,
    margins,
    setMargins,
    setMargin,
    save,
  } = settings;

  const body = (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full flex items-center justify-between py-1 text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
      >
        <span>{lockMargins ? "Paper" : "Paper & Margin"}</span>
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 transition-transform",
            open && "rotate-180",
          )}
        />
      </button>
      {open && (
        <div className="mt-3 space-y-2">
          <div
            className={cn(
              "grid gap-2",
              choices.length > 2 ? "grid-cols-3" : "grid-cols-2",
            )}
          >
            {choices.map((p) => {
              const { pageW, pageH } = pageSizeMm(p, orientation);
              return (
                <button
                  key={p}
                  type="button"
                  aria-pressed={paper === p}
                  onClick={() => setPaper(p)}
                  className={choice(paper === p)}
                >
                  <p className="text-xs">{p}</p>
                  <p className="text-[10px] opacity-75 font-mono">
                    {pageW} × {pageH} mm
                  </p>
                </button>
              );
            })}
          </div>
          {orientations && (
            <div className="grid grid-cols-2 gap-2">
              {(["portrait", "landscape"] as PaperOrientation[]).map((o) => (
                <button
                  key={o}
                  type="button"
                  aria-pressed={orientation === o}
                  onClick={() => setOrientation(o)}
                  className={cn(
                    choice(orientation === o),
                    "text-xs capitalize",
                  )}
                >
                  {o}
                </button>
              ))}
            </div>
          )}
          {!lockMargins && (
            <>
              <p className="px-1 text-[10px] font-semibold text-muted-foreground">
                Margin (mm)
              </p>
              <div className="grid grid-cols-3 gap-1.5">
                {MARGIN_PRESETS.map((p) => {
                  const active = sameMargins(margins, p.margins);
                  return (
                    <button
                      key={p.label}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setMargins({ ...p.margins })}
                      className={cn(choice(active), "p-1.5 text-[11px]")}
                    >
                      {p.label}
                      <span className="block text-[9px] opacity-75 font-mono">
                        {p.margins.top} mm
                      </span>
                    </button>
                  );
                })}
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {MARGIN_SIDES.map((side) => (
                  <label key={side} className="space-y-0.5">
                    <span className="px-1 text-[10px] capitalize text-muted-foreground">
                      {side}
                    </span>
                    <Input
                      type="number"
                      inputMode="decimal"
                      min={0}
                      step={1}
                      value={margins[side]}
                      onChange={(e) => setMargin(side, e.target.value)}
                      className="h-8 text-xs"
                    />
                  </label>
                ))}
              </div>
            </>
          )}
          <button
            type="button"
            onClick={save}
            className="w-full mt-1 h-8 flex items-center justify-center gap-1.5 text-xs font-semibold border rounded-lg hover:bg-accent transition-colors"
          >
            <Save className="h-3.5 w-3.5" />
            Save Settings
          </button>
        </div>
      )}
    </>
  );

  if (variant === "bare") return <div className={className}>{body}</div>;
  if (variant === "section")
    return <div className={cn("border-t pt-2", className)}>{body}</div>;
  return (
    <Card className={cn("rounded-2xl border shadow-2xs", className)}>
      <CardContent className="p-3.5">{body}</CardContent>
    </Card>
  );
}
