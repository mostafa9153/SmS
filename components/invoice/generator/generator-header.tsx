"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Printer, RotateCcw, ArrowLeft, Users, Receipt, ShieldCheck } from "lucide-react";

import type { InvoiceGeneratorState } from "./use-invoice-generator";

export function GeneratorHeader({ gen }: { gen: InvoiceGeneratorState }) {
  const { bulkBlankCount, bulkFillMode, bulkInvoices, generatorMode, handlePrint, isA4FourUp, queuedAdmissionCount, router, selectedStudentIds, setIsHistoryOpen, setIsTrackerOpen } = gen;
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4 print:hidden">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.back()}
          title="Go Back"
          className="h-10 w-10 rounded-xl cursor-pointer"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400">
          <Receipt className="h-5 w-5" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              Admission & Fee Invoice
            </h1>
            <Badge
              variant="outline"
              className="text-[10px] bg-teal-500/10 text-teal-700 dark:text-teal-300 font-mono"
            >
              {isA4FourUp ? "A4 4-Up Grid (4 Slips/Page)" : "A5 Dual-Slip"}
            </Badge>
          </div>
        </div>
      </div>

      {/* Print, Track, Queue & Undo Action Header Buttons */}
      <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 w-full sm:w-auto">
        <Link
          href="/admission/invoices"
          className="flex items-center justify-center gap-1.5 text-xs font-semibold h-10 px-3 rounded-xl border border-purple-300 dark:border-purple-700 bg-purple-500/10 text-purple-700 dark:text-purple-300 hover:bg-purple-500/20 transition-colors shadow-2xs"
          title="Go to Bulk Admission Invoices Queue"
        >
          <Users className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400 shrink-0" />
          <span>Admission Queue</span>
          {queuedAdmissionCount > 0 && (
            <span className="h-5 min-w-[20px] px-1.5 flex items-center justify-center rounded-full text-[10px] font-black bg-purple-600 text-white leading-none">
              {queuedAdmissionCount}
            </span>
          )}
        </Link>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsTrackerOpen(true)}
          title="Verify invoice validity and track generated registry"
          className="flex items-center justify-center gap-1.5 text-xs font-semibold h-10 px-3 rounded-xl border-teal-300 dark:border-teal-700 bg-teal-500/10 text-teal-700 dark:text-teal-300 hover:bg-teal-500/20 cursor-pointer shadow-2xs"
        >
          <ShieldCheck className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
          <span>Track &amp; Verify</span>
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsHistoryOpen(true)}
          title="View print history and undo any printed batch"
          className="flex items-center justify-center gap-1.5 text-xs font-semibold h-10 px-3 rounded-xl border-amber-300 dark:border-amber-700 bg-amber-500/10 text-amber-700 dark:text-amber-400 hover:bg-amber-500/20 cursor-pointer shadow-2xs"
        >
          <RotateCcw className="h-3.5 w-3.5 shrink-0" />
          <span>Undo Print</span>
        </Button>

        <Button
          onClick={handlePrint}
          className="col-span-2 sm:col-span-1 flex items-center justify-center gap-2 text-xs font-bold bg-primary text-primary-foreground shadow-xs hover:bg-primary/90 h-10 px-4 rounded-xl cursor-pointer"
        >
          <Printer className="h-4 w-4 shrink-0" />
          <span className="truncate">
            {generatorMode === "bulk"
              ? isA4FourUp
                ? `Print Batch (${bulkInvoices.length} Slips)`
                : bulkFillMode === "blank"
                ? `Print Batch (${bulkBlankCount} Dual Slips)`
                : `Print Batch (${selectedStudentIds.length} Dual Slips)`
              : "Print Invoice (A5)"}
          </span>
        </Button>
      </div>
    </div>
  );
}
