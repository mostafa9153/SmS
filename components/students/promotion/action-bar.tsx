"use client";

import { StudentStatus } from "@/lib/types";
import { CustomSelect } from "@/components/ui/custom-select";
import { Sparkles } from "lucide-react";
import { OVERRIDE_STATUS_OPTIONS } from "@/components/students/promotion/constants";
import type { PromotionDeskState } from "./use-promotion-desk";

export function ActionBar({ desk }: { desk: PromotionDeskState }) {
  const { bulkStatus, handleApplyBulkOverride, handleClearSelection, selectedIds, setBulkStatus, setConfirmOpen } = desk;
  return (
    <>
      {selectedIds.size > 0 && (
        <div className="rounded-2xl bg-card border shadow-md p-3 sm:px-4 sm:py-3 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-primary animate-pulse" />
            <p className="text-xs sm:text-sm font-bold">
              {selectedIds.size} student{selectedIds.size > 1 ? "s" : ""} selected
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 bg-muted/60 p-1 rounded-xl border">
              <span className="text-[11px] font-bold text-muted-foreground px-1.5">Set Status:</span>
              <CustomSelect
                value={bulkStatus}
                onChange={(val) => setBulkStatus(val as StudentStatus)}
                className="w-[180px] sm:w-[220px] text-xs h-7"
                options={OVERRIDE_STATUS_OPTIONS}
              />
              <button
                type="button"
                onClick={() => handleApplyBulkOverride(bulkStatus)}
                className="px-2.5 py-1 rounded-lg text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors cursor-pointer"
              >
                Apply
              </button>
            </div>

            <button
              onClick={handleClearSelection}
              className="rounded-xl border px-3 py-1.5 text-xs font-semibold hover:bg-muted transition-colors cursor-pointer"
            >
              Clear Selection
            </button>
            <button
              onClick={() => setConfirmOpen(true)}
              className="rounded-xl bg-primary text-primary-foreground px-4 py-2 text-xs font-bold hover:bg-primary/90 transition-all shadow-xs active:scale-95 cursor-pointer inline-flex items-center gap-1.5"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Execute Promotion ({selectedIds.size})
            </button>
          </div>
        </div>
      )}
    </>
  );
}
