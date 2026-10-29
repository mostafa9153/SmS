"use client";

import Link from "next/link";
import { InvoiceTrackerModal } from "@/components/invoice/invoice-tracker-modal";
import { PrintHistoryModal } from "@/components/ui/print-history-modal";
import { Button } from "@/components/ui/button";
import { Printer, RefreshCw, RotateCcw, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page-header";
import { QueueStats } from "@/components/admission/invoice-queue/queue-stats";
import { QueueTabs } from "@/components/admission/invoice-queue/queue-tabs";
import { QueueFilters } from "@/components/admission/invoice-queue/queue-filters";
import { QueueList } from "@/components/admission/invoice-queue/queue-list";
import { PrintDialog } from "@/components/admission/invoice-queue/print-dialog";
import { useInvoiceQueue } from "@/components/admission/invoice-queue/use-invoice-queue";

export default function AdmissionQueuePage() {
  const queue = useInvoiceQueue();
  const { handleUndoBatch, isFetchingApps, isFetchingStudents, isHistoryOpen, isSyncingSeq, isTrackerOpen, refetchAll, setIsHistoryOpen, setIsTrackerOpen } = queue;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <PageHeader
        back="/admission"
        icon={Printer}
        title="Admission Queue"
        badge={<span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Live Active</span>
            </span>}
        actions={<div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={refetchAll}
            disabled={isFetchingStudents || isFetchingApps || isSyncingSeq}
            className="h-9 px-3 rounded-xl text-xs font-semibold cursor-pointer flex items-center gap-1.5"
          >
            <RefreshCw
              className={cn(
                "h-3.5 w-3.5 text-emerald-600",
                (isFetchingStudents || isFetchingApps || isSyncingSeq) && "animate-spin"
              )}
            />
            <span className="hidden sm:inline">Refresh</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsTrackerOpen(true)}
            className="h-9 px-3 rounded-xl text-xs font-semibold cursor-pointer flex items-center gap-1.5 border-teal-300 dark:border-teal-700 bg-teal-500/10 text-teal-700 dark:text-teal-300 hover:bg-teal-500/20"
          >
            <ShieldCheck className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
            <span className="hidden sm:inline">Tracker</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsHistoryOpen(true)}
            className="h-9 px-3 rounded-xl text-xs font-semibold cursor-pointer flex items-center gap-1.5 border-amber-300 dark:border-amber-700 bg-amber-500/10 text-amber-700 dark:text-amber-400 hover:bg-amber-500/20"
          >
            <RotateCcw className="h-3.5 w-3.5 shrink-0" />
            <span className="hidden sm:inline">History</span>
          </Button>

          <Link
            href="/generate/invoice"
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border hover:bg-muted text-xs sm:text-sm font-semibold transition-all"
          >
            <span>Custom Generator</span>
          </Link>
        </div>}
        className="border-b pb-5 print:hidden"
      />


      <QueueStats queue={queue} />

      <QueueTabs queue={queue} />

      <QueueFilters queue={queue} />

      <QueueList queue={queue} />

      <PrintDialog queue={queue} />

      {/* Invoice Registry Tracker Modal */}
      <InvoiceTrackerModal
        isOpen={isTrackerOpen}
        onClose={() => setIsTrackerOpen(false)}
      />

      {/* Print History Modal with Batch Undo */}
      <PrintHistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        docType="invoice"
        title="Admission Invoices Print History"
        onUndoBatch={handleUndoBatch}
      />
    </div>
  );
}
