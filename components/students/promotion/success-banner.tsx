"use client";

import { CheckCircle2 } from "lucide-react";

import type { PromotionDeskState } from "./use-promotion-desk";

export function SuccessBanner({ desk }: { desk: PromotionDeskState }) {
  const { executionResult, setExecutionResult } = desk;
  return (
    <>
      {executionResult && (
        <div className="rounded-2xl border border-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 p-4 space-y-3 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-semibold text-sm">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
              Promotion Batch Executed Successfully ({executionResult.total} Students Processed)
            </div>
            <button
              onClick={() => setExecutionResult(null)}
              className="text-xs font-semibold text-emerald-800 dark:text-emerald-300 hover:underline cursor-pointer"
            >
              Dismiss ✕
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-center text-xs">
            <div className="bg-white/80 dark:bg-black/20 rounded-xl p-2 border border-emerald-200">
              <p className="text-[10px] text-muted-foreground">Promoted</p>
              <p className="text-base font-bold text-emerald-700">{executionResult.promotedCount}</p>
            </div>
            <div className="bg-white/80 dark:bg-black/20 rounded-xl p-2 border border-rose-200">
              <p className="text-[10px] text-muted-foreground">Detained</p>
              <p className="text-base font-bold text-rose-700">{executionResult.detainedCount}</p>
            </div>
            <div className="bg-white/80 dark:bg-black/20 rounded-xl p-2 border border-amber-200">
              <p className="text-[10px] text-muted-foreground">Supplementary</p>
              <p className="text-base font-bold text-amber-700">{executionResult.supplementaryCount || 0}</p>
            </div>
            <div className="bg-white/80 dark:bg-black/20 rounded-xl p-2 border border-blue-200">
              <p className="text-[10px] text-muted-foreground">Sent Up M.P.</p>
              <p className="text-base font-bold text-blue-700">{executionResult.sentUpCount || 0}</p>
            </div>
            <div className="bg-white/80 dark:bg-black/20 rounded-xl p-2 border border-purple-200">
              <p className="text-[10px] text-muted-foreground">Passed Out</p>
              <p className="text-base font-bold text-purple-700">{executionResult.passedOutCount || 0}</p>
            </div>
            <div className="bg-white/80 dark:bg-black/20 rounded-xl p-2 border border-indigo-200">
              <p className="text-[10px] text-muted-foreground">Overridden</p>
              <p className="text-base font-bold text-indigo-700">{executionResult.overriddenCount || 0}</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
