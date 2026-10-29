"use client";

import { calculateFeeTotal } from "@/lib/utils/fee-config";
import { InvoicePrintableBatchView } from "@/components/invoice/invoice-printable-view";
import { PrintPreview } from "@/components/print/print-preview";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Printer, Lock, Unlock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { InvoiceQueueState } from "./use-invoice-queue";

export function PrintDialog({ queue }: { queue: InvoiceQueueState }) {
  const { activePrintGroup, activeSingleStudent, clearQueueMutation, currentBatchInvoices, customClass, customFeeItems, formattedEndReceipt, formattedStartReceipt, handleExecutePrint, invoiceSeq, isAmountLocked, isClassLocked, isInvoiceNoLocked, printCopyType, printModalOpen, schoolProfile, setCustomClass, setCustomFeeItems, setInvoiceSeq, setIsAmountLocked, setIsClassLocked, setIsInvoiceNoLocked, setPrintCopyType, setPrintModalOpen } = queue;
  return (
  <Dialog open={printModalOpen} onOpenChange={setPrintModalOpen}>
    <DialogContent className="w-[96vw] max-w-6xl max-h-[94vh] flex flex-col p-4 sm:p-6 bg-card border border-border/80 rounded-3xl shadow-2xl overflow-hidden print:w-auto print:max-w-none print:h-auto print:max-h-none print:p-0 print:border-none print:shadow-none print:bg-white print:overflow-visible">
      <style jsx global>{`
        @media print {
          body > *:not(:has(#bulk-invoice-print-container)) {
            display: none !important;
          }
          [data-slot="dialog-overlay"],
          [data-slot="dialog-close"] {
            display: none !important;
          }
          #bulk-invoice-preview-viewport {
            padding: 0 !important;
            margin: 0 !important;
            background: transparent !important;
            overflow: visible !important;
          }
          #bulk-invoice-print-container {
            transform: none !important;
            margin: 0 !important;
            padding: 0 !important;
          }
        }
      `}</style>

      {/* Modal Header */}
      <DialogHeader className="shrink-0 border-b border-border/70 pb-4 pr-10 sm:pr-12 print:hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/20">
              <Printer className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base sm:text-lg font-black tracking-tight text-foreground flex items-center gap-2 flex-wrap">
                {activeSingleStudent ? (
                  <span>
                    Single Invoice: {activeSingleStudent.name} (Class {activeSingleStudent.presentClass})
                  </span>
                ) : (
                  <span>
                    Batch Invoices: Class {activePrintGroup?.class} – Section {activePrintGroup?.section}
                  </span>
                )}
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                  {currentBatchInvoices.length} {currentBatchInvoices.length === 1 ? "slip" : "slips"}
                </span>
              </DialogTitle>

              {/* Lockable Config Controls */}
              <div className="flex items-center gap-2 mt-2 flex-wrap text-xs">
                {/* Class */}
                <div className="flex items-center gap-1.5 bg-muted/80 px-2.5 py-1 rounded-xl border border-border/70 shadow-2xs">
                  <span className="text-[10.5px] font-bold text-muted-foreground uppercase tracking-wide">
                    Class:
                  </span>
                  {isClassLocked ? (
                    <span className="font-mono font-bold text-foreground">
                      {customClass || activePrintGroup?.class || activeSingleStudent?.presentClass || "VI"}
                    </span>
                  ) : (
                    <select
                      value={customClass}
                      onChange={(e) => setCustomClass(e.target.value)}
                      className="h-6 px-1.5 text-xs font-bold border rounded bg-background text-foreground cursor-pointer"
                    >
                      {["V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"].map((cls) => (
                        <option key={cls} value={cls}>
                          Class {cls}
                        </option>
                      ))}
                    </select>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsClassLocked((prev) => !prev)}
                    className="p-1 rounded text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                    title={isClassLocked ? "Unlock to change Class" : "Lock Class"}
                  >
                    {isClassLocked ? (
                      <Lock className="w-3 h-3 text-slate-400" />
                    ) : (
                      <Unlock className="w-3 h-3 text-amber-500" />
                    )}
                  </button>
                </div>

                {/* Amount */}
                <div className="flex items-center gap-1.5 bg-muted/80 px-2.5 py-1 rounded-xl border border-border/70 shadow-2xs">
                  <span className="text-[10.5px] font-bold text-muted-foreground uppercase tracking-wide">
                    Amount:
                  </span>
                  {isAmountLocked ? (
                    <span className="font-mono font-extrabold text-emerald-700 dark:text-emerald-400">
                      ₹{calculateFeeTotal(customFeeItems)}
                    </span>
                  ) : (
                    <div className="flex items-center gap-1">
                      <span className="text-xs font-bold">₹</span>
                      <input
                        type="number"
                        min={0}
                        value={calculateFeeTotal(customFeeItems)}
                        onChange={(e) => {
                          const newTotal = Math.max(0, parseInt(e.target.value, 10) || 0);
                          const otherSum = customFeeItems
                            .filter((i) => i.id !== "fee-session")
                            .reduce((s, i) => s + (Number(i.amount) || 0), 0);
                          const newSession = Math.max(0, newTotal - otherSum);
                          setCustomFeeItems((prev) =>
                            prev.map((item) =>
                              item.id === "fee-session" ? { ...item, amount: newSession } : item
                            )
                          );
                        }}
                        className="w-16 h-6 px-1.5 text-xs font-mono font-bold border rounded bg-background text-foreground"
                      />
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsAmountLocked((prev) => !prev)}
                    className="p-1 rounded text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                    title={isAmountLocked ? "Unlock to adjust Fee Amount" : "Lock Fee Amount"}
                  >
                    {isAmountLocked ? (
                      <Lock className="w-3 h-3 text-slate-400" />
                    ) : (
                      <Unlock className="w-3 h-3 text-amber-500" />
                    )}
                  </button>
                </div>

                {/* Receipt No */}
                <div className="flex items-center gap-1.5 bg-muted/80 px-2.5 py-1 rounded-xl border border-border/70 shadow-2xs">
                  <span className="text-[10.5px] font-bold text-muted-foreground uppercase tracking-wide">
                    Receipt:
                  </span>
                  {isInvoiceNoLocked ? (
                    <span className="font-mono font-bold text-emerald-700 dark:text-emerald-300">
                      {formattedStartReceipt}{" "}
                      {currentBatchInvoices.length > 1 ? `→ ${formattedEndReceipt}` : ""}
                    </span>
                  ) : (
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-muted-foreground font-semibold">
                        Start #:
                      </span>
                      <input
                        type="number"
                        min={1}
                        value={invoiceSeq}
                        onChange={(e) =>
                          setInvoiceSeq(Math.max(1, parseInt(e.target.value, 10) || 1))
                        }
                        className="w-16 h-6 px-1.5 text-xs font-mono font-bold border rounded bg-background text-foreground"
                      />
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsInvoiceNoLocked((prev) => !prev)}
                    className="p-1 rounded text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                    title={isInvoiceNoLocked ? "Unlock to edit Starting Receipt No" : "Lock Receipt No"}
                  >
                    {isInvoiceNoLocked ? (
                      <Lock className="w-3 h-3 text-slate-400" />
                    ) : (
                      <Unlock className="w-3 h-3 text-amber-500" />
                    )}
                  </button>
                </div>

                {/* Copy Type Selector */}
                <div className="flex items-center gap-1 bg-muted/80 p-0.5 rounded-xl border border-border/70">
                  <button
                    type="button"
                    onClick={() => setPrintCopyType("student")}
                    className={cn(
                      "px-2 py-0.5 rounded-lg text-[10px] font-bold cursor-pointer transition-all",
                      printCopyType === "student"
                        ? "bg-emerald-600 text-white"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    Student (A4 4-Up)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPrintCopyType("both")}
                    className={cn(
                      "px-2 py-0.5 rounded-lg text-[10px] font-bold cursor-pointer transition-all",
                      printCopyType === "both"
                        ? "bg-emerald-600 text-white"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    Both (A5 Dual)
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Zoom & Action Buttons */}
          <div className="flex items-center gap-2.5 flex-wrap">
            {printCopyType === "student" || printCopyType === "school" ? (
              <div className="flex items-center px-2.5 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold font-mono">
                A4 Pages: {Math.ceil(currentBatchInvoices.length / 4)}
              </div>
            ) : (
              <div className="flex items-center px-2.5 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold font-mono">
                A5 Sheets: {currentBatchInvoices.length}
              </div>
            )}

            <Button
              onClick={() => handleExecutePrint(true)}
              disabled={clearQueueMutation.isPending}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-9 px-4 rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5"
            >
              <Printer className="h-4 w-4" />
              <span>Print &amp; Clear Queue</span>
            </Button>
          </div>
        </div>
      </DialogHeader>

      {/* Preview (shared zoom/drag/fit); the hidden copy below is what prints */}
      <div id="bulk-invoice-preview-viewport" className="flex-1 min-h-0 p-1">
        <PrintPreview fill resetKey={`${printCopyType}-${currentBatchInvoices.length}`} className="h-[70vh]">
          <div className="flex justify-center w-full">
            <InvoicePrintableBatchView
              invoices={currentBatchInvoices}
              copyType={printCopyType}
              schoolProfile={schoolProfile}
            />
          </div>
        </PrintPreview>
        <div id="bulk-invoice-print-container" className="hidden print:flex justify-center w-full">
          <InvoicePrintableBatchView
            invoices={currentBatchInvoices}
            copyType={printCopyType}
            schoolProfile={schoolProfile}
          />
        </div>
      </div>
    </DialogContent>
  </Dialog>
  );
}
