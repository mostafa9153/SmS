"use client";

import { AlertTriangle, RefreshCw, Undo2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Activity } from "@/lib/library/use-desk";

const KIND_LABEL: Record<Activity["kind"], string> = {
  issue: "Issue",
  return: "Return",
  renew: "Renew",
  found: "Found",
  damaged: "Damaged",
  restore: "Shelf",
  scan: "Scan",
};

const time = (ms: number) => new Date(ms).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });

export function ActivityList({
  activity,
  onUndo,
  onRenewInstead,
  onDamaged,
  onDismiss,
}: {
  activity: Activity[];
  onUndo: (a: Activity) => void;
  onRenewInstead: (a: Activity) => void;
  onDamaged: (a: Activity) => void;
  onDismiss: (id: string) => void;
}) {
  // Failed rows stay on top until handled (W6).
  const rows = [...activity.filter((a) => a.status === "failed"), ...activity.filter((a) => a.status === "ok")];
  if (!rows.length) return <p className="py-8 text-center text-sm text-muted-foreground">Nothing yet today</p>;

  return (
    <ul className="space-y-1.5">
      {rows.map((a) => (
        <li
          key={a.id}
          className={cn(
            "space-y-1 rounded-lg border border-l-4 px-3 py-2 text-sm",
            a.status === "failed" ? "border-l-rose-500 bg-rose-500/10" : "border-l-emerald-500",
            a.undone && "opacity-50",
          )}
        >
          <div className="flex items-start gap-2">
            {a.status === "failed" && <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />}
            <div className="min-w-0 flex-1">
              <p className={cn("break-words font-medium", a.undone && "line-through")}>
                <span className="mr-1.5 text-xs font-semibold uppercase text-muted-foreground">{KIND_LABEL[a.kind]}</span>
                {a.label}
                {a.by && <span className="ml-1.5 text-xs font-normal text-muted-foreground">· {a.by}</span>}
              </p>
              {a.error && <p className="text-xs text-rose-600">{a.error}</p>}
            </div>
            <span className="shrink-0 text-xs text-muted-foreground">{time(a.at)}</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {a.status === "failed" && a.retry && (
              <Button size="sm" variant="outline" onClick={a.retry}>
                <RefreshCw /> Retry
              </Button>
            )}
            {a.status === "failed" && (
              <Button size="sm" variant="ghost" onClick={() => onDismiss(a.id)}>
                <X /> Dismiss
              </Button>
            )}
            {a.status === "ok" && !a.undone && a.loanId && a.kind === "return" && (
              <>
                <Button size="sm" variant="outline" onClick={() => onRenewInstead(a)} title="Alt+R">
                  Renew instead
                </Button>
                <Button size="sm" variant="outline" onClick={() => onDamaged(a)}>
                  Damaged
                </Button>
              </>
            )}
            {a.status === "ok" && !a.undone && a.undoId && (
              <Button size="sm" variant="ghost" onClick={() => onUndo(a)}>
                <Undo2 /> Undo
              </Button>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
