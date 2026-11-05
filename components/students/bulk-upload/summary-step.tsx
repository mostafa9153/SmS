"use client";

import { AlertTriangle, ArrowRight, RotateCcw } from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";
import type { BulkUploadState, ReportFilter } from "./use-bulk-upload";
import { CountUp, SuccessHero } from "./success-hero";
import { ImportReport, buildReportItems } from "./import-report";

export function SummaryStep({ bulk }: { bulk: BulkUploadState }) {
  const { importResult, isResultsMode, issueFilter, setFile, setImportResult, setIssueFilter, setParsedData, setRollbackConfirmBatchId, setStep } = bulk;
  const { createdCount, updatedCount, skippedCount, errorCount } = importResult.summary;
  const hasIssues = errorCount > 0;
  const stopped = Boolean(importResult.stopped);
  const incomplete = buildReportItems(importResult.details).filter((i) => i.missing.length > 0).length;

  const card = (filter: ReportFilter) => ({
    onClick: () => setIssueFilter(issueFilter === filter ? "all" : filter),
    active: issueFilter === filter,
  });

  return (
    <div className="rounded-xl border bg-card p-6 space-y-6 shadow-xs animate-scale-in">
      <div className="text-center py-4 space-y-3">
        <SuccessHero celebrate={!hasIssues && !stopped && createdCount + updatedCount > 0} warn={hasIssues || stopped} />
        <h2 className="text-xl font-bold text-foreground animate-rise" style={{ animationDelay: "0.5s" }}>
          {stopped ? "Bulk Import Stopped" : hasIssues ? "Bulk Import Completed with Errors" : "Bulk Import Completed Successfully!"}
        </h2>
        {importResult.batchId && (
          <p className="text-xs text-muted-foreground max-w-md mx-auto animate-rise" style={{ animationDelay: "0.6s" }}>
            Batch ID: <code className="bg-muted px-1.5 py-0.5 rounded font-mono text-[11px]">{importResult.batchId}</code>
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard {...card("created")} label="Records Created" value={<CountUp value={createdCount} delay={700} />} className="animate-rise [animation-delay:650ms] bg-emerald-50/60 border-emerald-200 dark:bg-emerald-500/10 dark:border-emerald-500/30" valueClassName="text-emerald-700 dark:text-emerald-400" />
        <StatCard {...card("updated")} label="Records Updated" value={<CountUp value={updatedCount} delay={780} />} className="animate-rise [animation-delay:730ms] bg-sky-50/60 border-sky-200 dark:bg-sky-500/10 dark:border-sky-500/30" valueClassName="text-sky-700 dark:text-sky-400" />
        <StatCard {...card("skipped")} label="Skipped" value={<CountUp value={skippedCount} delay={860} />} className="animate-rise [animation-delay:810ms] bg-muted/60" valueClassName="text-muted-foreground" />
        <StatCard {...card("errors")} label="Failed / Errors" value={<CountUp value={errorCount} delay={940} />} className="animate-rise [animation-delay:890ms] bg-rose-50/60 border-rose-200 dark:bg-rose-500/10 dark:border-rose-500/30" valueClassName="text-rose-700 dark:text-rose-400" />
      </div>

      {incomplete > 0 && (
        <button
          onClick={() => setIssueFilter("incomplete")}
          className="w-full flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50/70 px-3.5 py-2.5 text-left text-xs font-semibold text-amber-900 hover:bg-amber-100/70 dark:bg-amber-500/10 dark:border-amber-500/30 dark:text-amber-200 transition-colors animate-rise [animation-delay:1000ms]"
        >
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {incomplete.toLocaleString()} students have missing details
          <ArrowRight className="h-3.5 w-3.5 ml-auto" />
        </button>
      )}

      <ImportReport bulk={bulk} />

      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t">
        {importResult.batchId ? (
          <button
            onClick={() => setRollbackConfirmBatchId(importResult.batchId)}
            className="flex items-center gap-1.5 text-xs text-rose-600 hover:text-rose-700 font-medium border border-rose-200 hover:bg-rose-50 px-3.5 py-2 rounded-md transition-colors"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Undo / Delete This Batch
          </button>
        ) : (
          <span />
        )}

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
