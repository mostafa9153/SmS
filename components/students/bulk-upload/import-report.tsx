"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { SearchInput } from "@/components/ui/search-input";
import { cn } from "@/lib/utils";
import type { BulkUploadState, ReportFilter } from "./use-bulk-upload";

type Kind = "created" | "updated" | "skipped" | "errors";

interface ReportItem {
  kind: Kind;
  rowNumber?: number;
  name: string;
  schoolId: string;
  missing: string[];
  changes: Array<{ label: string; from: string; to: string }>;
  note: string;
  warning?: string;
}

const BADGE: Record<Kind, { label: string; className: string }> = {
  created: { label: "Added", className: "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300" },
  updated: { label: "Updated", className: "bg-sky-100 text-sky-800 border-sky-200 dark:bg-sky-500/15 dark:text-sky-300" },
  skipped: { label: "Skipped", className: "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-500/15 dark:text-amber-300" },
  errors: { label: "Failed", className: "bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-500/15 dark:text-rose-300" },
};

const PAGE = 300;

/** Every row of an import in one list: added, updated (what changed), incomplete, skipped, failed. */
export function buildReportItems(details: any): ReportItem[] {
  const d = details || {};
  const items: ReportItem[] = [];
  for (const e of d.errors || []) {
    items.push({ kind: "errors", rowNumber: e.rowNumber, name: e.name || "—", schoolId: e.schoolId || "", missing: [], changes: [], note: e.message || "Import failed" });
  }
  for (const c of d.created || []) {
    items.push({
      kind: "created",
      rowNumber: c.rowNumber,
      name: c.name,
      schoolId: c.schoolId || "",
      missing: c.missing || [],
      changes: [],
      note: c.examName ? `${c.examName} · ${c.marks}` : "",
    });
  }
  for (const u of d.updated || []) {
    items.push({
      kind: "updated",
      rowNumber: u.rowNumber,
      name: u.name,
      schoolId: u.schoolId || "",
      missing: u.missing || [],
      changes: u.changes || [],
      note: u.examName ? `${u.examName} · ${u.marks}` : "",
      warning: u.warning,
    });
  }
  for (const s of d.skipped || []) {
    items.push({ kind: "skipped", rowNumber: s.rowNumber, name: s.name || "—", schoolId: s.schoolId || "", missing: [], changes: [], note: s.reason || "Skipped" });
  }
  return items.sort((a, b) => (a.rowNumber ?? Infinity) - (b.rowNumber ?? Infinity));
}

export function ImportReport({ bulk }: { bulk: BulkUploadState }) {
  const { exportImportReportExcel, importResult, issueFilter, setIssueFilter } = bulk;
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState(PAGE);
  const all = useMemo(() => buildReportItems(importResult?.details), [importResult]);

  const counts: Record<ReportFilter, number> = {
    all: all.length,
    created: all.filter((i) => i.kind === "created").length,
    updated: all.filter((i) => i.kind === "updated").length,
    incomplete: all.filter((i) => i.missing.length > 0).length,
    skipped: all.filter((i) => i.kind === "skipped").length,
    errors: all.filter((i) => i.kind === "errors").length,
  };
  const tabs: Array<[ReportFilter, string]> = [
    ["all", "All"],
    ["created", "Added"],
    ["updated", "Updated"],
    ["incomplete", "Incomplete"],
    ["skipped", "Skipped"],
    ["errors", "Failed"],
  ];

  const q = query.trim().toLowerCase();
  const shown = all.filter(
    (i) =>
      (issueFilter === "all" || (issueFilter === "incomplete" ? i.missing.length > 0 : i.kind === issueFilter)) &&
      (!q || i.name.toLowerCase().includes(q) || i.schoolId.toLowerCase().includes(q) || String(i.rowNumber ?? "") === q)
  );

  if (all.length === 0) return null;

  return (
    <div className="rounded-xl border bg-muted/20 p-3 sm:p-4 space-y-3">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
        <div className="flex flex-wrap gap-1 rounded-lg border bg-background p-0.5 text-xs w-fit">
          {tabs
            .filter(([key]) => key === "all" || counts[key] > 0)
            .map(([key, label]) => (
              <button
                key={key}
                onClick={() => {
                  setIssueFilter(key);
                  setLimit(PAGE);
                }}
                className={cn(
                  "px-2.5 py-1 rounded-md font-medium transition-all",
                  issueFilter === key ? "bg-primary text-primary-foreground font-bold shadow-2xs" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {label} ({counts[key].toLocaleString()})
              </button>
            ))}
        </div>
        <div className="flex items-center gap-2">
          <SearchInput value={query} onChange={setQuery} placeholder="Name, School ID or row" size="sm" className="w-full lg:w-56" />
          <button
            onClick={exportImportReportExcel}
            className="flex shrink-0 items-center gap-1.5 rounded-lg border bg-background px-3 py-1.5 text-xs font-semibold hover:bg-muted transition-colors shadow-2xs active:scale-95"
          >
            <Download className="h-3.5 w-3.5 text-muted-foreground" />
            Report (.xlsx)
          </button>
        </div>
      </div>

      <div className="rounded-lg border bg-card overflow-hidden max-h-[420px] overflow-y-auto overflow-x-auto">
        <table className="w-full min-w-[640px] text-xs">
          <thead className="bg-muted/60 border-b sticky top-0 z-10">
            <tr>
              <th className="px-3 py-2 text-left font-semibold text-muted-foreground w-14">Row</th>
              <th className="px-3 py-2 text-left font-semibold text-muted-foreground w-20">Status</th>
              <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Student</th>
              <th className="px-3 py-2 text-left font-semibold text-muted-foreground">School ID</th>
              <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {shown.slice(0, limit).map((item, idx) => (
              <tr key={`${item.kind}-${item.rowNumber ?? "x"}-${idx}`} className="hover:bg-muted/20 align-top">
                <td className="px-3 py-2 font-mono text-muted-foreground">{item.rowNumber ?? "—"}</td>
                <td className="px-3 py-2">
                  <Badge className={cn("text-[10px] px-1.5 py-0", BADGE[item.kind].className)}>{BADGE[item.kind].label}</Badge>
                </td>
                <td className="px-3 py-2 font-semibold text-foreground">{item.name}</td>
                <td className="px-3 py-2 font-mono text-muted-foreground">{item.schoolId || "—"}</td>
                <td className="px-3 py-2 space-y-1">
                  {item.warning && (
                    <p className="flex items-start gap-1 text-amber-700 dark:text-amber-400 font-medium">
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-px" />
                      {item.warning}
                    </p>
                  )}
                  {item.changes.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {item.changes.map((c) => (
                        <span key={c.label} title={`${c.from || "(blank)"} → ${c.to}`} className="rounded bg-sky-50 dark:bg-sky-500/10 px-1.5 py-0.5 text-[10.5px] text-sky-900 dark:text-sky-200">
                          <span className="font-semibold">{c.label}:</span> {c.from ? <span className="line-through opacity-60">{c.from}</span> : null}
                          {c.from ? " → " : ""}
                          {c.to}
                        </span>
                      ))}
                    </div>
                  )}
                  {item.missing.length > 0 && <p className="text-amber-700 dark:text-amber-400">Missing: {item.missing.join(", ")}</p>}
                  {item.note && <p className="text-muted-foreground">{item.note}</p>}
                  {item.kind === "created" && !item.missing.length && !item.note && <p className="text-emerald-700 dark:text-emerald-400">Complete</p>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {shown.length === 0 && <p className="p-6 text-center text-xs text-muted-foreground">No rows</p>}
        {shown.length > limit && (
          <button onClick={() => setLimit((l) => l + PAGE * 3)} className="w-full border-t py-2 text-xs font-semibold text-primary hover:bg-muted/40">
            Show more ({(shown.length - limit).toLocaleString()})
          </button>
        )}
      </div>
    </div>
  );
}
