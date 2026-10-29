"use client";

import { LayoutList, LayoutGrid } from "lucide-react";
import { cn } from "@/lib/utils";
import { SearchInput } from "@/components/ui/search-input";
import type { InvoiceQueueState } from "./use-invoice-queue";

export function QueueFilters({ queue }: { queue: InvoiceQueueState }) {
  const { availableClassesInQueue, queueTab, searchQuery, selectedClassFilter, setSearchQuery, setSelectedClassFilter, setViewMode, tabCandidates, viewMode } = queue;
  return (
  <div className="space-y-3 print:hidden">
    {/* Search Input */}
    <SearchInput value={searchQuery} onChange={setSearchQuery} placeholder="Search candidate by name, roll, student ID, form no, or PEN..." size="sm" />

    {/* Class Filter Chips & View Mode Switcher */}
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 custom-scrollbar">
        <button
          type="button"
          onClick={() => setSelectedClassFilter("ALL")}
          className={cn(
            "px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap",
            selectedClassFilter === "ALL"
              ? queueTab === "new"
                ? "bg-emerald-600 text-white shadow-2xs"
                : "bg-purple-600 text-white shadow-2xs"
              : "bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80"
          )}
        >
          All Classes ({tabCandidates.length})
        </button>
        {availableClassesInQueue.map((cls) => {
          const count = tabCandidates.filter((s) => s.presentClass === cls).length;
          return (
            <button
              key={cls}
              type="button"
              onClick={() => setSelectedClassFilter(cls)}
              className={cn(
                "px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap",
                selectedClassFilter === cls
                  ? queueTab === "new"
                    ? "bg-emerald-600 text-white shadow-2xs"
                    : "bg-purple-600 text-white shadow-2xs"
                  : "bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80"
              )}
            >
              Class {cls} ({count})
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-1 bg-muted p-1 rounded-xl border border-border/80 self-end sm:self-auto shrink-0">
        <button
          type="button"
          onClick={() => setViewMode("list")}
          className={cn(
            "px-2.5 py-1 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer",
            viewMode === "list"
              ? "bg-background text-foreground shadow-2xs"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <LayoutList className="h-3.5 w-3.5" />
          <span>List</span>
        </button>
        <button
          type="button"
          onClick={() => setViewMode("grid")}
          className={cn(
            "px-2.5 py-1 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer",
            viewMode === "grid"
              ? "bg-background text-foreground shadow-2xs"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <LayoutGrid className="h-3.5 w-3.5" />
          <span>Cards</span>
        </button>
      </div>
    </div>
  </div>
  );
}
