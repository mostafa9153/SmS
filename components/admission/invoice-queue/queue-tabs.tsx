"use client";

import { RotateCcw, Layers, UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { InvoiceQueueState } from "./use-invoice-queue";

export function QueueTabs({ queue }: { queue: InvoiceQueueState }) {
  const { newAdmissionCandidates, queueTab, reAdmittedCandidates, setQueueTab, setSelectedClassFilter, totalQueuedCount } = queue;
  return (
  <div className="flex rounded-2xl bg-muted/80 p-1.5 border border-border/80 shadow-xs print:hidden">
    <button
      type="button"
      onClick={() => {
        setQueueTab("new");
        setSelectedClassFilter("ALL");
      }}
      className={cn(
        "flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer",
        queueTab === "new"
          ? "bg-background text-emerald-600 dark:text-emerald-400 shadow-sm border border-emerald-500/20"
          : "text-muted-foreground hover:text-foreground"
      )}
    >
      <UserPlus className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
      <span>New Admission Queue</span>
      <span
        className={cn(
          "px-2 py-0.5 rounded-full text-[10px] font-black",
          queueTab === "new"
            ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
            : "bg-muted text-muted-foreground"
        )}
      >
        {newAdmissionCandidates.length}
      </span>
    </button>

    <button
      type="button"
      onClick={() => {
        setQueueTab("re");
        setSelectedClassFilter("ALL");
      }}
      className={cn(
        "flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer",
        queueTab === "re"
          ? "bg-background text-purple-600 dark:text-purple-400 shadow-sm border border-purple-500/20"
          : "text-muted-foreground hover:text-foreground"
      )}
    >
      <RotateCcw className="w-4 h-4 text-purple-600 dark:text-purple-400" />
      <span>Re-Admission Queue</span>
      <span
        className={cn(
          "px-2 py-0.5 rounded-full text-[10px] font-black",
          queueTab === "re"
            ? "bg-purple-500/15 text-purple-700 dark:text-purple-300"
            : "bg-muted text-muted-foreground"
        )}
      >
        {reAdmittedCandidates.length}
      </span>
    </button>

    <button
      type="button"
      onClick={() => {
        setQueueTab("all");
        setSelectedClassFilter("ALL");
      }}
      className={cn(
        "py-2.5 px-3.5 sm:px-4 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer",
        queueTab === "all"
          ? "bg-background text-foreground shadow-sm border"
          : "text-muted-foreground hover:text-foreground"
      )}
    >
      <Layers className="w-4 h-4" />
      <span className="hidden sm:inline">All</span>
      <span>({totalQueuedCount})</span>
    </button>
  </div>
  );
}
