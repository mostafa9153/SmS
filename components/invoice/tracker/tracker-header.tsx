"use client";

import { DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, FileText, RefreshCw, GraduationCap, LayoutDashboard, Printer } from "lucide-react";
import { cn } from "@/lib/utils";

import type { InvoiceTrackerState } from "./use-invoice-tracker";

export function TrackerHeader({ tracker }: { tracker: InvoiceTrackerState }) {
  const { activeTab, displayedStats, filteredList, handlePrintLedger, hasProceeded, isLoadingList, loadRegistryData, setActiveTab, settlementSummaries } = tracker;
  return (
    <DialogHeader className="p-4 sm:px-6 sm:py-3.5 border-b border-border/70 shrink-0 bg-muted/20 space-y-3 pr-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center ring-1 ring-primary/20 shrink-0 shadow-2xs">
            <LayoutDashboard className="h-5 w-5" />
          </div>
          <div>
            <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
              <span>Invoice Registry &amp; Statistics</span>
              <Badge variant="outline" className="text-[10px] font-mono border-primary/30 text-primary bg-primary/5">
                Live System
              </Badge>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Comprehensive audit ledger, multi-year historical tracking, real-time fee collection, and verification.
            </DialogDescription>
          </div>
        </div>

        {/* Header Action Buttons: Print Ledger & Refresh Live Data */}
        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
          {activeTab === "analytics" && (
            <Button
              size="sm"
              onClick={handlePrintLedger}
              disabled={!hasProceeded || filteredList.length === 0}
              className="h-8 px-3.5 text-xs font-bold rounded-xl cursor-pointer bg-purple-600 hover:bg-purple-700 text-white shadow-2xs flex items-center gap-1.5"
              title="Print A4 Official Invoice Audit Ledger"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Print Ledger</span>
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={loadRegistryData}
            disabled={isLoadingList}
            className="h-8 text-xs font-semibold gap-1.5 cursor-pointer rounded-xl border-border/80 hover:bg-muted shadow-2xs"
          >
            <RefreshCw className={cn("h-3.5 w-3.5 text-primary", isLoadingList && "animate-spin")} />
            <span>{isLoadingList ? "Syncing..." : "Refresh"}</span>
          </Button>
        </div>
      </div>

      {/* TAB SWITCHER: Registry & Statistics FIRST, then Verify Invoice, then Teacher Settlement */}
      <div className="flex items-center gap-2 overflow-x-auto pb-0.5">
        <div className="flex items-center rounded-xl bg-muted/70 p-1 border border-border/80 text-xs font-bold shrink-0 shadow-2xs">
          {/* TAB 1: REGISTRY & STATISTICS (FIRST) */}
          <button
            type="button"
            onClick={() => setActiveTab("analytics")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer",
              activeTab === "analytics"
                ? "bg-background text-foreground shadow-2xs"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <FileText className="h-3.5 w-3.5 text-primary" />
            <span>Registry &amp; Statistics</span>
            {displayedStats && displayedStats.totalInvoices > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-primary/10 text-primary font-mono font-bold">
                {displayedStats.totalInvoices}
              </span>
            )}
          </button>

          {/* TAB 2: VERIFY INVOICE */}
          <button
            type="button"
            onClick={() => setActiveTab("verify")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer",
              activeTab === "verify"
                ? "bg-background text-foreground shadow-2xs"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <ShieldCheck className="h-3.5 w-3.5 text-teal-600" />
            <span>Verify Invoice</span>
          </button>

          {/* TAB 3: TEACHER SETTLEMENT */}
          <button
            type="button"
            onClick={() => setActiveTab("settlement")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer",
              activeTab === "settlement"
                ? "bg-background text-foreground shadow-2xs"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <GraduationCap className="h-3.5 w-3.5 text-amber-600" />
            <span>Teacher Settlement</span>
            {settlementSummaries.some((s) => s.totalPending > 0) && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-400 font-mono">
                {settlementSummaries.reduce((s, t) => s + t.totalPending, 0)} pending
              </span>
            )}
          </button>
        </div>
      </div>
    </DialogHeader>
  );
}
