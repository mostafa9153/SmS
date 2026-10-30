"use client";

import React, { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AllotmentGapRow } from "@/lib/routine/allotment-gaps";

type Tab = "all" | "over" | "missing";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rows: AllotmentGapRow[];
  initialTab?: Tab;
  onEditTeacher: (teacherId: string) => void;
}

export function AllotmentGapsDialog({ open, onOpenChange, rows, initialTab = "all", onEditTeacher }: Props) {
  const [tab, setTab] = useState<Tab>(initialTab);
  React.useEffect(() => {
    if (open) setTab(initialTab);
  }, [open, initialTab]);

  const over = useMemo(() => rows.filter((r) => r.allotted > r.demand), [rows]);
  const missing = useMemo(() => rows.filter((r) => r.allotted < r.demand), [rows]);
  const shown = tab === "over" ? over : tab === "missing" ? missing : [...over, ...missing];

  const tabs: { id: Tab; label: string; count: number }[] = [
    { id: "all", label: "All", count: rows.length },
    { id: "over", label: "Over-allotted", count: over.length },
    { id: "missing", label: "Not assigned", count: missing.length },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col gap-3">
        <DialogHeader>
          <DialogTitle>Allotment Gaps</DialogTitle>
        </DialogHeader>

        <div className="flex gap-1.5">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                "px-2.5 py-1 rounded-md border text-xs font-semibold",
                tab === t.id ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-muted"
              )}
            >
              {t.label} ({t.count})
            </button>
          ))}
        </div>

        <div className="overflow-y-auto -mx-1 px-1 space-y-1.5">
          {shown.length === 0 ? (
            <EmptyState compact icon={CheckCircle2} title="Everything matches" />
          ) : (
            shown.map((r) => {
              const diff = r.allotted - r.demand;
              return (
                <div key={r.id} className="rounded-lg border bg-card px-3 py-2 text-xs space-y-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                      <Badge variant="outline" className="font-mono text-[10px]">
                        {r.className} · {r.section}
                      </Badge>
                      <span className="font-semibold">{r.subject}</span>
                    </div>
                    <Badge
                      variant="outline"
                      className={cn(
                        "font-mono text-[10px] font-bold",
                        diff > 0
                          ? "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-300/40"
                          : "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-300/40"
                      )}
                    >
                      {r.allotted} / {r.demand} p/wk · {diff > 0 ? `+${diff} over` : `${-diff} short`}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {r.teachers.length === 0 && r.unstaffed.length === 0 && (
                      <span className="text-muted-foreground italic">No teacher</span>
                    )}
                    {r.teachers.map((t) => (
                      <button
                        key={`${t.id}:${r.id}`}
                        type="button"
                        onClick={() => onEditTeacher(t.id)}
                        className="rounded-md border bg-muted/40 px-1.5 py-0.5 hover:bg-muted"
                      >
                        {t.name} · {t.periods}p
                      </button>
                    ))}
                    {r.unstaffed.length > 0 && (
                      <span className="text-amber-700 dark:text-amber-300">No teacher: {r.unstaffed.join(", ")}</span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
