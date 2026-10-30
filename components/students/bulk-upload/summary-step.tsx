"use client";

import { CheckCircle2, AlertCircle, ArrowRight, RotateCcw, Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/ui/stat-card";
import { cn } from "@/lib/utils";
import type { BulkUploadState } from "./use-bulk-upload";

export function SummaryStep({ bulk }: { bulk: BulkUploadState }) {
  const { exportSkippedAndErrorsExcel, importResult, isResultsMode, issueFilter, setFile, setImportResult, setIssueFilter, setParsedData, setRollbackConfirmBatchId, setStep } = bulk;
  return (
    <div className="rounded-xl border bg-card p-6 space-y-6 shadow-xs">
      <div className="text-center py-4 space-y-2">
        <div className="rounded-full bg-emerald-100 p-3 w-14 h-14 mx-auto flex items-center justify-center text-emerald-600">
          <CheckCircle2 className="h-8 w-8" />
        </div>
        <h2 className="text-xl font-bold text-foreground">Bulk Import Completed Successfully!</h2>
        <p className="text-xs text-muted-foreground max-w-md mx-auto">
          Batch ID: <code className="bg-muted px-1.5 py-0.5 rounded font-mono text-[11px]">{importResult.batchId}</code>
        </p>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Records Created" value={importResult.summary.createdCount} className="bg-emerald-50/60 border-emerald-200 dark:bg-emerald-500/10 dark:border-emerald-500/30" valueClassName="text-emerald-700 dark:text-emerald-400" />
        <StatCard label="Records Updated" value={importResult.summary.updatedCount} className="bg-sky-50/60 border-sky-200 dark:bg-sky-500/10 dark:border-sky-500/30" valueClassName="text-sky-700 dark:text-sky-400" />
        <StatCard label="Skipped" value={importResult.summary.skippedCount} className="bg-muted/60" valueClassName="text-muted-foreground" />
        <StatCard label="Failed / Errors" value={importResult.summary.errorCount} className="bg-rose-50/60 border-rose-200 dark:bg-rose-500/10 dark:border-rose-500/30" valueClassName="text-rose-700 dark:text-rose-400" />
      </div>

      {/* Detailed Skipped / Failed Table if any */}
      {((importResult.details?.skipped?.length || 0) > 0 || (importResult.details?.errors?.length || 0) > 0) && (
        <div className="rounded-xl border bg-muted/20 p-4 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              <h3 className="text-sm font-bold text-foreground">
                Skipped & Unprocessed Rows ({(importResult.details?.skipped?.length || 0) + (importResult.details?.errors?.length || 0)})
              </h3>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex rounded-lg border overflow-hidden p-0.5 bg-background text-xs">
                <button
                  onClick={() => setIssueFilter("all")}
                  className={cn(
                    "px-2.5 py-1 rounded-md font-medium transition-all",
                    issueFilter === "all" ? "bg-primary text-primary-foreground font-bold shadow-2xs" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  All ({(importResult.details?.skipped?.length || 0) + (importResult.details?.errors?.length || 0)})
                </button>
                {(importResult.details?.skipped?.length || 0) > 0 && (
                  <button
                    onClick={() => setIssueFilter("skipped")}
                    className={cn(
                      "px-2.5 py-1 rounded-md font-medium transition-all",
                      issueFilter === "skipped" ? "bg-primary text-primary-foreground font-bold shadow-2xs" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    Skipped ({importResult.details?.skipped?.length || 0})
                  </button>
                )}
                {(importResult.details?.errors?.length || 0) > 0 && (
                  <button
                    onClick={() => setIssueFilter("errors")}
                    className={cn(
                      "px-2.5 py-1 rounded-md font-medium transition-all",
                      issueFilter === "errors" ? "bg-primary text-primary-foreground font-bold shadow-2xs" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    Errors ({importResult.details?.errors?.length || 0})
                  </button>
                )}
              </div>

              <button
                onClick={exportSkippedAndErrorsExcel}
                className="flex items-center gap-1.5 rounded-lg border bg-background px-3 py-1.5 text-xs font-semibold hover:bg-muted transition-colors shadow-2xs active:scale-95"
              >
                <Download className="h-3.5 w-3.5 text-muted-foreground" />
                Download Issues (.xlsx)
              </button>
            </div>
          </div>

          <div className="rounded-lg border bg-card overflow-hidden max-h-[280px] overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="bg-muted/60 border-b sticky top-0">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold text-muted-foreground w-16">Row</th>
                  <th className="px-3 py-2 text-left font-semibold text-muted-foreground w-24">Type</th>
                  <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Student Name</th>
                  <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Identifier</th>
                  <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Reason / Issue Detail</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {(() => {
                  const skipped = (importResult.details?.skipped || []).map((s: any) => ({
                    type: "skipped" as const,
                    rowNumber: s.rowNumber || "—",
                    name: s.name || "Unnamed",
                    schoolId: s.schoolId || "—",
                    message: s.reason || "Duplicate / No changes detected",
                  }));
                  const errors = (importResult.details?.errors || []).map((e: any) => ({
                    type: "error" as const,
                    rowNumber: e.rowNumber || "—",
                    name: e.name || "—",
                    schoolId: e.schoolId || "—",
                    message: e.message || "Import failed",
                  }));
                  const items = issueFilter === "all" ? [...errors, ...skipped] : issueFilter === "skipped" ? skipped : errors;

                  return items.map((item: any, idx: number) => (
                    <tr key={idx} className="hover:bg-muted/20">
                      <td className="px-3 py-2 font-mono text-muted-foreground">{item.rowNumber}</td>
                      <td className="px-3 py-2">
                        {item.type === "error" ? (
                          <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                            Failed
                          </Badge>
                        ) : (
                          <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400 border-amber-200 text-[10px] px-1.5 py-0">
                            Skipped
                          </Badge>
                        )}
                      </td>
                      <td className="px-3 py-2 font-semibold text-foreground">{item.name}</td>
                      <td className="px-3 py-2 font-mono text-muted-foreground">{item.schoolId}</td>
                      <td className="px-3 py-2 text-muted-foreground">{item.message}</td>
                    </tr>
                  ));
                })()}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t">
        <button
          onClick={() => setRollbackConfirmBatchId(importResult.batchId)}
          className="flex items-center gap-1.5 text-xs text-rose-600 hover:text-rose-700 font-medium border border-rose-200 hover:bg-rose-50 px-3.5 py-2 rounded-md transition-colors"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Undo / Delete This Batch
        </button>

        <div className="flex gap-2 w-full sm:w-auto">
          <button
            onClick={() => {
              setStep(1);
              setFile(null);
              setParsedData(null);
              setImportResult(null);
            }}
            className="flex-1 sm:flex-none rounded-md border px-4 py-2 text-xs font-medium hover:bg-muted"
          >
            Upload Another File
          </button>
          <a
            href={isResultsMode ? "/results" : "/students"}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 rounded-md bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
          >
            {isResultsMode ? "View Marks & Results" : "View Students Directory"}{" "}
            <ArrowRight className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>
    </div>
  );
}
