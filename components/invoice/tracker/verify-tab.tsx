"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, Search, CheckCircle2, XCircle, FileText, UserCheck, Printer } from "lucide-react";
import { cn } from "@/lib/utils";

import type { InvoiceTrackerState } from "./use-invoice-tracker";

export function VerifyTab({ tracker }: { tracker: InvoiceTrackerState }) {
  const { handlePrintStudentCopy, handleVerify, invoicesList, isPending, searchNumber, setSearchNumber, verificationResult } = tracker;
  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-2">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Enter invoice number (e.g. MHS/2026/ADM-0001)..."
            value={searchNumber}
            onChange={(e) => setSearchNumber(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleVerify()}
            className="pl-9 h-10 text-xs font-mono font-bold"
          />
        </div>
        <Button
          onClick={() => handleVerify()}
          disabled={isPending || !searchNumber.trim()}
          className="w-full sm:w-auto h-10 px-5 text-xs font-bold gap-2 cursor-pointer rounded-xl"
        >
          <ShieldCheck className="h-4 w-4" />
          <span>{isPending ? "Checking..." : "Verify Now"}</span>
        </Button>
      </div>

      {/* Quick Suggestions from recent invoices */}
      {invoicesList.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap text-xs text-muted-foreground">
          <span className="text-[11px] font-semibold">Quick Check:</span>
          {invoicesList.slice(0, 5).map((item) => (
            <button
              key={item.id || item.invoice_number}
              type="button"
              onClick={() => {
                setSearchNumber(item.invoice_number);
                handleVerify(item.invoice_number);
              }}
              className="font-mono text-[10.5px] px-2 py-0.5 rounded-md border border-border/80 bg-muted/40 hover:bg-muted font-bold text-primary transition-colors cursor-pointer"
            >
              {item.invoice_number}
            </button>
          ))}
        </div>
      )}

      {/* Verification Result Card */}
      {verificationResult.checked ? (
        <div className="animate-in fade-in-0 duration-200">
          {verificationResult.valid && verificationResult.invoice ? (
            <div className="p-4 sm:p-5 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 space-y-4">
              {/* Status Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-emerald-500/20 pb-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-emerald-800 dark:text-emerald-300">
                        Valid Official School Invoice
                      </span>
                      <Badge className="bg-emerald-600 text-white text-[10px] font-mono">
                        Verified Authentic
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground font-mono">
                      {verificationResult.invoice.invoice_number}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap">
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-[10px] font-semibold",
                      verificationResult.invoice.is_blank
                        ? "border-amber-400 text-amber-700 bg-amber-50 dark:bg-amber-950/30"
                        : "border-teal-400 text-teal-700 bg-teal-50 dark:bg-teal-950/30"
                    )}
                  >
                    {verificationResult.invoice.is_blank ? (
                      <span className="flex items-center gap-1">
                        <FileText className="h-3 w-3" /> Blank Slip (Manual)
                      </span>
                    ) : (
                      <span className="flex items-center gap-1">
                        <UserCheck className="h-3 w-3" /> Pre-Filled Roster
                      </span>
                    )}
                  </Badge>
                  <Badge variant="secondary" className="text-[10px] font-mono">
                    {verificationResult.invoice.generator_mode === "bulk" ? "Batch Mode" : "Single Mode"}
                  </Badge>

                  {/* 1-Click Print Student Copy Button */}
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => handlePrintStudentCopy(verificationResult.invoice!)}
                    className="h-7.5 px-3 rounded-xl text-xs font-bold gap-1.5 cursor-pointer bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs ml-1"
                    title="1-Click Reprint authentic official student copy"
                  >
                    <Printer className="h-3.5 w-3.5" />
                    <span>Print Student Copy</span>
                  </Button>
                </div>
              </div>

              {/* Metadata Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-background/80 p-3.5 rounded-xl border border-border/70">
                <div>
                  <span className="text-[10.5px] text-muted-foreground block">Student Name</span>
                  <span className="font-bold text-foreground">
                    {verificationResult.invoice.student_name || (
                      <span className="text-muted-foreground italic font-normal">[Blank Write-in]</span>
                    )}
                  </span>
                </div>

                <div>
                  <span className="text-[10.5px] text-muted-foreground block">Class &amp; Section</span>
                  <span className="font-bold text-foreground font-mono">
                    Class {verificationResult.invoice.student_class}
                    {verificationResult.invoice.section ? ` (${verificationResult.invoice.section})` : ""}
                  </span>
                </div>

                <div>
                  <span className="text-[10.5px] text-muted-foreground block">Roll No</span>
                  <span className="font-bold text-foreground font-mono">
                    {verificationResult.invoice.roll_no || (
                      <span className="text-muted-foreground italic font-normal">[Blank]</span>
                    )}
                  </span>
                </div>

                <div>
                  <span className="text-[10.5px] text-muted-foreground block">Student ID / PEN</span>
                  <span className="font-bold text-foreground font-mono">
                    {verificationResult.invoice.student_id ||
                      verificationResult.invoice.pen_number || (
                        <span className="text-muted-foreground italic font-normal">[Blank]</span>
                      )}
                  </span>
                </div>

                <div>
                  <span className="text-[10.5px] text-muted-foreground block">Guardian Name</span>
                  <span className="font-bold text-foreground">
                    {verificationResult.invoice.guardian_name || (
                      <span className="text-muted-foreground italic font-normal">[Blank]</span>
                    )}
                  </span>
                </div>

                <div>
                  <span className="text-[10.5px] text-muted-foreground block">Issue Date &amp; Time</span>
                  <span className="font-semibold text-foreground font-mono">
                    {verificationResult.invoice.issue_date}{" "}
                    {verificationResult.invoice.issue_time || ""}
                  </span>
                </div>

                <div>
                  <span className="text-[10.5px] text-muted-foreground block">Payment Mode</span>
                  <span className="font-bold text-foreground">
                    {verificationResult.invoice.payment_mode} ({verificationResult.invoice.payment_status})
                  </span>
                </div>

                <div>
                  <span className="text-[10.5px] text-muted-foreground block">Total Amount</span>
                  <span className="text-sm font-extrabold text-emerald-700 dark:text-emerald-400 font-mono">
                    ₹{Number(verificationResult.invoice.total_amount).toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Fee Breakdown Particulars Table */}
              {Array.isArray(verificationResult.invoice.fee_items) &&
                verificationResult.invoice.fee_items.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <p className="text-[11px] font-bold text-muted-foreground">
                      Fee Particulars Breakdown ({verificationResult.invoice.fee_items.length} Heads)
                    </p>
                    <div className="rounded-xl border border-border/80 divide-y bg-background text-xs max-h-48 overflow-y-auto">
                      {verificationResult.invoice.fee_items.map((item, idx) => (
                        <div key={item.id || idx} className="py-1.5 px-3 flex items-center justify-between">
                          <span className="font-medium text-foreground">
                            {idx + 1}. {item.name}
                          </span>
                          <span className="font-mono font-bold text-foreground">
                            ₹{Number(item.amount).toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
            </div>
          ) : (
            <div className="p-6 rounded-2xl border border-rose-500/30 bg-rose-500/5 text-center space-y-2">
              <XCircle className="h-9 w-9 text-rose-500 mx-auto" />
              <div className="space-y-0.5">
                <p className="text-sm font-bold text-rose-700 dark:text-rose-400">
                  Invoice Not Found / Invalid Receipt Number
                </p>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  {verificationResult.message ||
                    `The invoice number '${searchNumber}' does not exist in the school's records.`}
                </p>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Empty state guide inside fixed container */
        <div className="p-8 rounded-2xl border border-dashed border-border/80 bg-muted/10 text-center space-y-3">
          <div className="h-10 w-10 rounded-2xl bg-teal-500/10 text-teal-600 mx-auto flex items-center justify-center">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div className="space-y-1 max-w-md mx-auto">
            <h4 className="text-xs font-bold text-foreground">Verify Any Printed Receipt Instantly</h4>
            <p className="text-[11px] text-muted-foreground">
              Type or paste any student invoice number above to inspect fee particulars, student roster
              matching, and cashier assignment status.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
