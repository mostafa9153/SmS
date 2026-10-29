"use client";

import { Suspense } from "react";
import { Spinner } from "@/components/ui/spinner";

import { PromotionHeader } from "@/components/students/promotion/promotion-header";
import { SuccessBanner } from "@/components/students/promotion/success-banner";
import { FilterBar } from "@/components/students/promotion/filter-bar";
import { SummaryMetrics } from "@/components/students/promotion/summary-metrics";
import { ActionBar } from "@/components/students/promotion/action-bar";
import { RosterTable } from "@/components/students/promotion/roster-table";
import { ExecuteConfirmDialog } from "@/components/students/promotion/execute-confirm-dialog";
import { RollbackDialog } from "@/components/students/promotion/rollback-dialog";
import { usePromotionDesk } from "@/components/students/promotion/use-promotion-desk";

function PromotionPageContent() {
  const desk = usePromotionDesk();

  return (
    <div className="p-3.5 sm:p-6 max-w-7xl mx-auto space-y-4 sm:space-y-5">
      {/* Top Header */}
      <PromotionHeader desk={desk} />

      {/* Success Notification Banner */}
      <SuccessBanner desk={desk} />

      {/* Control Filter Bar */}
      <FilterBar desk={desk} />

      {/* Summary Metrics Bar */}
      <SummaryMetrics desk={desk} />

      {/* Floating / Action Execution Bar */}
      <ActionBar desk={desk} />

      {/* Cohort Roster Table */}
      <RosterTable desk={desk} />

      {/* Confirmation Modal */}
      <ExecuteConfirmDialog desk={desk} />

      {/* Undo / Rollback Modal */}
      <RollbackDialog desk={desk} />
    </div>
  );
}

export default function PromotionPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
          <Spinner className="h-4 w-4 text-primary" />
          <span>Loading Promotion &amp; Lifecycle Desk...</span>
        </div>
      }
    >
      <PromotionPageContent />
    </Suspense>
  );
}
