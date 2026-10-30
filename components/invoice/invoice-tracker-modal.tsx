"use client";

import { Dialog, DialogContent } from "@/components/ui/dialog";

import { TrackerHeader } from "@/components/invoice/tracker/tracker-header";
import { AnalyticsTab } from "@/components/invoice/tracker/analytics-tab";
import { VerifyTab } from "@/components/invoice/tracker/verify-tab";
import { SettlementTab } from "@/components/invoice/tracker/settlement-tab";
import { TrackerPrintLayer } from "@/components/invoice/tracker/tracker-print-layer";
import { useInvoiceTracker } from "@/components/invoice/tracker/use-invoice-tracker";
import type { InvoiceTrackerModalProps } from "@/components/invoice/tracker/props";

export function InvoiceTrackerModal(props: InvoiceTrackerModalProps) {
  const tracker = useInvoiceTracker(props);
  const { activeTab, isOpen, onClose } = tracker;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      {/* 
        EXPANDED EXTRA LARGE MODAL CONTAINER:
        Spacious modern layout with fixed height ratio for comfortable audit work.
      */}
      <DialogContent className="w-[98vw] max-w-[1400px] h-[92vh] max-h-[920px] min-h-[640px] p-0 flex flex-col gap-0 overflow-hidden rounded-3xl border border-border/80 shadow-2xl bg-background">
        {/* FIXED MODAL HEADER */}
        <TrackerHeader tracker={tracker} />

        {/* SCROLLABLE MODAL BODY - STAYS WITHIN FIXED CONTAINER */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-5">
          {/* ========================================================================= */}
          {/* TAB 1: STANDARD INVOICE DASHBOARD & REGISTRY LEDGER (DEFAULT & FIRST)    */}
          {/* ========================================================================= */}
          {activeTab === "analytics" && (
            <AnalyticsTab tracker={tracker} />
          )}

          {/* ========================================================================= */}
          {/* TAB 2: VERIFY INVOICE                                                     */}
          {/* ========================================================================= */}
          {activeTab === "verify" && (
            <VerifyTab tracker={tracker} />
          )}

          {/* ========================================================================= */}
          {/* TAB 3: TEACHER SETTLEMENT                                                  */}
          {/* ========================================================================= */}
          {activeTab === "settlement" && (
            <SettlementTab tracker={tracker} />
          )}
        </div>

        <TrackerPrintLayer tracker={tracker} />
      </DialogContent>
    </Dialog>
  );
}
