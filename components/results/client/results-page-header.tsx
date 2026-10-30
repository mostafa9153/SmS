"use client";

import Link from "next/link";
import { RotateCw, Sliders, Save, FileSpreadsheet, BarChart2, Printer } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Spinner } from "@/components/ui/spinner";
import { PageHeader } from "@/components/ui/page-header";

import type { ResultsClientState } from "./use-results-client";

export function ResultsPageHeader({ rc }: { rc: ResultsClientState }) {
  const { academicYear, activeView, batchSaveMutation, filteredResults, isHs, isLoading, promotionPolicy, rankMutation, setActiveView, setIsPrintModalOpen, updateResultUrl } = rc;
  return (
    <PageHeader
      back
      title="Results & Evaluation"
      badge={<><span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border bg-primary/10 text-primary border-primary/25 font-bold shadow-2xs">
            {isLoading ? (
              <span className="flex items-center gap-1.5 text-xs">
                <Spinner className="h-3 w-3 text-primary" />
                <span>Loading...</span>
              </span>
            ) : (
              <>
                <span className="font-mono font-bold text-xs">{filteredResults.length}</span>
                <span className="text-[11px] font-medium opacity-85">students</span>
              </>
            )}
          </span><span className="inline-flex items-center px-2 py-0.5 rounded-lg border text-xs font-mono font-semibold bg-muted/60 text-muted-foreground">
            {academicYear}
          </span>{isHs && (
            <Badge className="bg-purple-600 text-white text-[10px] font-semibold">
              Higher Secondary
            </Badge>
          )}</>}
      actions={<div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
        {/* View Mode Switcher */}
        <div className="flex items-center p-0.5 bg-muted/80 rounded-xl border border-border/70 shadow-2xs">
          <button
            onClick={() => {
              setActiveView("subject_batch");
              updateResultUrl({ view: "subject_batch" });
            }}
            className={cn(
              "flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer",
              activeView === "subject_batch"
                ? "bg-background text-foreground shadow-2xs font-bold"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <FileSpreadsheet className="h-3.5 w-3.5 text-primary" />
            <span>Subject Batch</span>
          </button>
          <button
            onClick={() => {
              setActiveView("class_summary");
              updateResultUrl({ view: "class_summary" });
            }}
            className={cn(
              "flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer",
              activeView === "class_summary"
                ? "bg-background text-foreground shadow-2xs font-bold"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <BarChart2 className="h-3.5 w-3.5 text-blue-600" />
            <span>Class Summary</span>
          </button>
        </div>

        <Link
          href="/settings/presets?section=marks_scheme"
          className="flex items-center justify-center gap-1.5 min-h-[40px] sm:min-h-[36px] rounded-xl border border-border/80 bg-card px-3 py-1.5 text-xs font-semibold hover:bg-muted transition-all text-muted-foreground hover:text-foreground shadow-2xs"
          title="Configure Pass % and Evaluation Schemes"
        >
          <Sliders className="h-3.5 w-3.5 text-primary" />
          <span>Pass Policy ({promotionPolicy.minPassPercentage}%)</span>
        </Link>

        <button
          onClick={() => rankMutation.mutate()}
          disabled={rankMutation.isPending || isLoading}
          className="flex items-center justify-center gap-1.5 min-h-[40px] sm:min-h-[36px] rounded-xl border border-border/80 bg-card px-3 py-1.5 text-xs font-semibold hover:bg-muted transition-all disabled:opacity-50 shadow-2xs cursor-pointer"
          title="Recalculate dual Section & Class merit ranks"
        >
          <RotateCw className={cn("h-3.5 w-3.5 text-muted-foreground", rankMutation.isPending && "animate-spin")} />
          <span>Re-Rank</span>
        </button>

        {/* Print Register Action Button */}
        <button
          type="button"
          onClick={() => setIsPrintModalOpen(true)}
          disabled={isLoading || filteredResults.length === 0}
          className="flex items-center justify-center gap-1.5 min-h-[40px] sm:min-h-[36px] rounded-xl border border-border/80 bg-card px-3 py-1.5 text-xs font-semibold hover:bg-muted transition-all disabled:opacity-50 shadow-2xs cursor-pointer text-foreground"
          title="Print All Subjects Marks & Evaluation Register"
        >
          <Printer className="h-3.5 w-3.5 text-primary" />
          <span>Print Register</span>
        </button>

        {/* Primary Action Button (Subject Batch Save) */}
        {activeView === "subject_batch" && (
          <button
            type="button"
            onClick={() => batchSaveMutation.mutate()}
            disabled={batchSaveMutation.isPending || isLoading || filteredResults.length === 0}
            className="flex items-center justify-center gap-2 min-h-[40px] sm:min-h-[36px] rounded-xl bg-primary px-4 py-1.5 text-xs font-bold text-primary-foreground hover:bg-primary/90 transition-all shadow-sm active:scale-95 cursor-pointer shrink-0 disabled:opacity-50"
          >
            {batchSaveMutation.isPending ? (
              <Spinner className="h-4 w-4" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            <span>{batchSaveMutation.isPending ? "Saving Marks…" : "Save All Marks"}</span>
          </button>
        )}
      </div>}
    />
  );
}
