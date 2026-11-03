"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, RefreshCw, Square, UserPlus, UserCheck, SkipForward, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { StatCard } from "@/components/ui/stat-card";
import { cn } from "@/lib/utils";
import type { BulkUploadState, DryRunRow } from "./use-bulk-upload";
import type { ImportProgress } from "./use-chunked-import";

const MATCHED_BY: Record<string, string> = {
  pen: "PEN",
  studentUniqueCode: "Banglar Shiksha ID",
  schoolId: "School ID",
  aadhaar: "Aadhaar",
};

function Tile({ icon, label, value, tone, loading }: { icon: typeof UserPlus; label: string; value: number; tone: string; loading?: boolean }) {
  return (
    <StatCard
      icon={icon}
      label={label}
      value={loading ? <Spinner className="h-4 w-4" /> : value.toLocaleString()}
      className={tone}
      iconClassName="opacity-80"
      valueClassName="tabular-nums"
    />
  );
}

/** What the import will do, from the server's dry run: shown before anything is written. */
export function ImportOutcome({ bulk }: { bulk: BulkUploadState }) {
  const { createNew, dryRun, importPlan, retryDryRun, updateMode } = bulk;
  const loading = dryRun.status === "loading";
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <Tile
          icon={UserPlus}
          label={createNew ? "New students" : "New (adding off)"}
          value={importPlan.newCount}
          loading={loading}
          tone="bg-emerald-50/70 border-emerald-200 text-emerald-800 dark:bg-emerald-500/10 dark:border-emerald-500/30 dark:text-emerald-300"
        />
        <Tile
          icon={UserCheck}
          label={updateMode === "skip" ? "Existing: left as is" : updateMode === "fill_blanks" ? "Existing: fill blanks" : "Existing: fill & correct"}
          value={importPlan.updateCount}
          loading={loading}
          tone="bg-sky-50/70 border-sky-200 text-sky-800 dark:bg-sky-500/10 dark:border-sky-500/30 dark:text-sky-300"
        />
        <Tile
          icon={AlertTriangle}
          label="Name differs"
          value={importPlan.nameMismatch}
          loading={loading}
          tone="bg-amber-50/70 border-amber-200 text-amber-800 dark:bg-amber-500/10 dark:border-amber-500/30 dark:text-amber-300"
        />
        <Tile
          icon={SkipForward}
          label="Will be skipped"
          value={importPlan.preSkipped.length}
          loading={loading}
          tone="bg-muted/60 text-muted-foreground"
        />
      </div>
      {dryRun.status === "error" && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:bg-amber-500/10 dark:border-amber-500/30 dark:text-amber-200">
          <span>{dryRun.error}</span>
          <button onClick={retryDryRun} className="flex items-center gap-1 font-semibold hover:underline">
            <RefreshCw className="h-3.5 w-3.5" /> Retry
          </button>
        </div>
      )}
    </div>
  );
}

/** Action badge for one preview row. */
export function RowAction({ d, hasErrors, createNew, skipExisting, loading }: { d?: DryRunRow; hasErrors: boolean; createNew: boolean; skipExisting: boolean; loading: boolean }) {
  if (hasErrors) return <Badge variant="destructive" className="text-[10px]">Skip</Badge>;
  if (loading) return <Spinner className="h-3.5 w-3.5 text-muted-foreground" />;
  if (!d) return <span className="text-[10px] text-muted-foreground">—</span>;
  if (d.status === "ambiguous" || d.status === "duplicate" || (d.status === "update" && skipExisting)) {
    return (
      <Badge title={d.reason} className="bg-muted text-muted-foreground border-border text-[10px]">
        Skip
      </Badge>
    );
  }
  if (d.status === "new") {
    return createNew ? (
      <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 text-[10px]">New</Badge>
    ) : (
      <Badge className="bg-muted text-muted-foreground border-border text-[10px]">Skip</Badge>
    );
  }
  return (
    <Badge
      title={`Matched by ${MATCHED_BY[d.matchedBy || ""] || d.matchedBy}: ${d.studentName}`}
      className="bg-sky-100 text-sky-800 border-sky-200 dark:bg-sky-500/15 dark:text-sky-300 text-[10px]"
    >
      Update
    </Badge>
  );
}

/** Who a row updates, with a warning when the sheet's name differs. */
export function MatchedStudent({ d }: { d?: DryRunRow }) {
  if (!d || d.status !== "update") return <span className="text-muted-foreground">{d?.status === "new" ? "—" : d?.reason || "—"}</span>;
  return (
    <span className={cn("inline-flex items-center gap-1", d.nameMismatch && "text-amber-700 dark:text-amber-400 font-semibold")}>
      {d.nameMismatch && <AlertTriangle className="h-3.5 w-3.5 shrink-0" />}
      {d.studentName}
      <span className="text-muted-foreground font-normal">· {MATCHED_BY[d.matchedBy || ""]}</span>
    </span>
  );
}

function formatEta(ms: number): string {
  const s = Math.max(1, Math.round(ms / 1000));
  return s < 60 ? `~${s}s left` : `~${Math.ceil(s / 60)} min left`;
}

/** Live progress of a chunked import: real counts, percentage and time left. */
export function ImportProgressPanel({ progress, onStop }: { progress: ImportProgress; onStop: () => void }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);

  const pct = progress.total ? Math.round((progress.done / progress.total) * 100) : 0;
  const elapsed = now - progress.startedAt;
  const eta = progress.done > 0 && progress.done < progress.total ? formatEta((elapsed / progress.done) * (progress.total - progress.done)) : "";
  const chips = [
    { label: "Added", value: progress.created, icon: UserPlus, tone: "text-emerald-700 dark:text-emerald-400" },
    { label: "Updated", value: progress.updated, icon: UserCheck, tone: "text-sky-700 dark:text-sky-400" },
    { label: "Skipped", value: progress.skipped, icon: SkipForward, tone: "text-muted-foreground" },
    { label: "Failed", value: progress.failed, icon: XCircle, tone: "text-rose-700 dark:text-rose-400" },
  ];

  return (
    <div className="rounded-xl border bg-muted/20 p-5 sm:p-6 space-y-5 animate-fade-in" aria-live="polite">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-4xl font-bold tabular-nums text-foreground leading-none">{pct}%</p>
          <p className="text-xs text-muted-foreground mt-2 tabular-nums">
            {progress.done.toLocaleString()} / {progress.total.toLocaleString()} rows {eta && <>· {eta}</>}
          </p>
        </div>
        <button
          onClick={onStop}
          disabled={progress.stopping}
          className="flex items-center gap-1.5 rounded-md border bg-background px-3 py-1.5 text-xs font-semibold hover:bg-muted disabled:opacity-50"
        >
          {progress.stopping ? <Spinner className="h-3.5 w-3.5" /> : <Square className="h-3.5 w-3.5" />}
          {progress.stopping ? "Stopping…" : "Stop"}
        </button>
      </div>

      <div className="relative h-3 rounded-full bg-muted overflow-hidden" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-primary/70 to-primary transition-[width] duration-700 ease-out"
          style={{ width: `${Math.max(pct, 2)}%` }}
        />
        <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-transparent via-white/25 to-transparent" />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {chips.map(({ label, value, icon: Icon, tone }) => (
          <div key={label} className="rounded-lg border bg-card px-3 py-2 flex items-center gap-2">
            <Icon className={cn("h-4 w-4", tone)} />
            <span className={cn("text-base font-bold tabular-nums", tone)}>{value.toLocaleString()}</span>
            <span className="text-[11px] text-muted-foreground font-medium">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

