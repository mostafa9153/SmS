"use client";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, UserCheck, GraduationCap, CheckCheck, Ban, IndianRupee, ClipboardList } from "lucide-react";
import { cn } from "@/lib/utils";
import { showToast } from "@/components/ui/toast-banner";
import { Spinner } from "@/components/ui/spinner";

import type { InvoiceTrackerState } from "./use-invoice-tracker";

export function SettlementTab({ tracker }: { tracker: InvoiceTrackerState }) {
  const { handleSubmitSettlement, isLoadingTeacher, isSubmittingSettlement, loadTeacherInvoices, selectedSettlementTeacher, setSelectedSettlementTeacher, setSettlementDecisions, settlementDecisions, settlementSummaries, settlementSummary, settlementTeachers, teacherInvoices } = tracker;
  return (
    <div className="space-y-4">
      {/* Teacher Selector */}
      <div className="p-4 rounded-2xl border border-border/80 bg-card space-y-3">
        <div className="flex items-center gap-2">
          <GraduationCap className="h-4 w-4 text-amber-600" />
          <h3 className="text-xs font-bold text-foreground">Select Teacher to Settle Blank Slips</h3>
        </div>

        {settlementTeachers.length === 0 ? (
          <EmptyState compact icon={ClipboardList} title="No teacher assignments. Assign printed blank invoices to a teacher first." />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {settlementTeachers.map((teacher) => {
              const summary = settlementSummaries.find((s) => s.teacher === teacher);
              const isSelected = selectedSettlementTeacher === teacher;
              return (
                <button
                  key={teacher}
                  type="button"
                  onClick={() => {
                    setSelectedSettlementTeacher(teacher);
                    loadTeacherInvoices(teacher);
                  }}
                  className={cn(
                    "flex items-center justify-between p-3 rounded-xl border text-left transition-all cursor-pointer",
                    isSelected
                      ? "border-amber-400 bg-amber-500/10 ring-1 ring-amber-400/30"
                      : "border-border/70 hover:bg-muted/50"
                  )}
                >
                  <div>
                    <p className="text-xs font-bold text-foreground">{teacher}</p>
                    {summary && (
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {summary.totalAssigned} assigned •{" "}
                        <span className="text-emerald-600 font-semibold">{summary.totalUsed} used</span> •{" "}
                        <span className="text-rose-600 font-semibold">{summary.totalCancelled} void</span>
                        {summary.totalPending > 0 && (
                          <span className="text-amber-600 font-semibold">
                            {" "}
                            • {summary.totalPending} pending
                          </span>
                        )}
                      </p>
                    )}
                  </div>
                  {summary && summary.totalPending > 0 && (
                    <Badge className="text-[9px] bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-400/30 ml-2">
                      Pending
                    </Badge>
                  )}
                  {summary && summary.totalPending === 0 && summary.totalAssigned > 0 && (
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 ml-2 shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Invoice Settlement Table */}
      {selectedSettlementTeacher && (
        <div className="space-y-3">
          {isLoadingTeacher ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground text-xs gap-2">
              <Spinner className="h-4 w-4 text-primary" />
              <span>Loading invoices for {selectedSettlementTeacher}...</span>
            </div>
          ) : (
            <>
              <div className="rounded-2xl border border-border/80 overflow-hidden bg-card">
                <div className="p-3 bg-muted/40 border-b flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <UserCheck className="h-3.5 w-3.5 text-amber-600" />
                    Invoices for:{" "}
                    <span className="text-amber-700 dark:text-amber-400">
                      {selectedSettlementTeacher}
                    </span>
                    <span className="text-[10px] text-muted-foreground font-normal">
                      ({teacherInvoices.length} slips)
                    </span>
                  </span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={() => {
                        const all = { ...settlementDecisions };
                        teacherInvoices.forEach((inv) => {
                          const current = all[inv.invoice_number];
                          const amt =
                            current?.amount && current.amount > 0
                              ? current.amount
                              : Number(inv.total_amount) > 0
                              ? Number(inv.total_amount)
                              : 600;
                          all[inv.invoice_number] = {
                            status: "active",
                            amount: amt,
                          };
                        });
                        setSettlementDecisions(all);
                        showToast({
                          type: "success",
                          title: "All Marked as Used",
                          description: `All ${teacherInvoices.length} slips marked as Used.`,
                        });
                      }}
                      className="text-[10.5px] px-2.5 py-1 rounded-lg border border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 font-bold text-emerald-700 dark:text-emerald-300 transition-all cursor-pointer flex items-center gap-1 shadow-2xs"
                    >
                      <CheckCheck className="h-3.5 w-3.5" />
                      Select All Used
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const all = { ...settlementDecisions };
                        let count = 0;
                        teacherInvoices.forEach((inv) => {
                          const current = all[inv.invoice_number];
                          if (!current || current.status === "pending") {
                            all[inv.invoice_number] = {
                              status: "cancelled",
                              amount: 0,
                            };
                            count++;
                          }
                        });
                        setSettlementDecisions(all);
                        if (count > 0) {
                          showToast({
                            type: "info",
                            title: "Pending Slips Cancelled",
                            description: `${count} pending slip(s) marked as Cancelled (returned).`,
                          });
                        }
                      }}
                      className="text-[10.5px] px-2.5 py-1 rounded-lg border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 font-semibold text-rose-700 dark:text-rose-400 transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <Ban className="h-3.5 w-3.5" />
                      Cancel All Pending
                    </button>
                  </div>
                </div>

                <div className="divide-y max-h-64 overflow-y-auto">
                  {teacherInvoices.length === 0 ? (
                    <div className="p-4 text-center text-xs text-muted-foreground">
                      No invoices assigned to this teacher.
                    </div>
                  ) : (
                    teacherInvoices.map((inv) => {
                      const dec = settlementDecisions[inv.invoice_number] || {
                        status: "pending",
                        amount: 0,
                      };
                      return (
                        <div
                          key={inv.invoice_number}
                          className={cn(
                            "flex items-center gap-2 p-2.5 text-xs transition-colors",
                            dec.status === "active" && "bg-emerald-500/5",
                            dec.status === "cancelled" && "bg-rose-500/5 opacity-70",
                            dec.status === "pending" && "bg-amber-500/5"
                          )}
                        >
                          <div className="flex-1 min-w-0">
                            <p className="font-mono font-bold text-foreground text-[11px]">
                              {inv.invoice_number}
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              Class {inv.student_class}
                              {inv.section ? ` (${inv.section})` : ""} • {inv.issue_date}
                            </p>
                          </div>

                          <div className="flex items-center gap-1 w-28 shrink-0">
                            <IndianRupee className="h-3 w-3 text-muted-foreground shrink-0" />
                            <Input
                              type="number"
                              min="0"
                              step="1"
                              value={dec.amount}
                              disabled={dec.status !== "active"}
                              onChange={(e) =>
                                setSettlementDecisions((prev) => ({
                                  ...prev,
                                  [inv.invoice_number]: {
                                    ...prev[inv.invoice_number],
                                    amount: parseFloat(e.target.value) || 0,
                                  },
                                }))
                              }
                              className="h-7 text-xs font-mono font-bold text-right w-full"
                            />
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              title="Mark as Used"
                              onClick={() =>
                                setSettlementDecisions((prev) => ({
                                  ...prev,
                                  [inv.invoice_number]: {
                                    status: "active",
                                    amount: dec.amount || 0,
                                  },
                                }))
                              }
                              className={cn(
                                "flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold border transition-all cursor-pointer",
                                dec.status === "active"
                                  ? "bg-emerald-500 text-white border-emerald-500"
                                  : "border-border/70 text-muted-foreground hover:border-emerald-400 hover:text-emerald-600"
                              )}
                            >
                              <CheckCheck className="h-3 w-3" />
                              Used
                            </button>
                            <button
                              type="button"
                              title="Mark as Cancelled (Returned)"
                              onClick={() =>
                                setSettlementDecisions((prev) => ({
                                  ...prev,
                                  [inv.invoice_number]: { status: "cancelled", amount: 0 },
                                }))
                              }
                              className={cn(
                                "flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold border transition-all cursor-pointer",
                                dec.status === "cancelled"
                                  ? "bg-rose-500 text-white border-rose-500"
                                  : "border-border/70 text-muted-foreground hover:border-rose-400 hover:text-rose-600"
                              )}
                            >
                              <Ban className="h-3 w-3" />
                              Cancel
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Summary Tally Card */}
              {teacherInvoices.length > 0 && (
                <div className="p-4 rounded-2xl border border-border/80 bg-muted/30 space-y-3">
                  <p className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <ClipboardList className="h-3.5 w-3.5 text-primary" />
                    Settlement Summary
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="text-center p-2 rounded-xl bg-card border">
                      <p className="text-base font-extrabold text-foreground">{teacherInvoices.length}</p>
                      <p className="text-[10px] text-muted-foreground">Total Assigned</p>
                    </div>
                    <div className="text-center p-2 rounded-xl bg-emerald-500/10 border border-emerald-400/30">
                      <p className="text-base font-extrabold text-emerald-700 dark:text-emerald-400">
                        {settlementSummary.usedCount}
                      </p>
                      <p className="text-[10px] text-emerald-700 dark:text-emerald-400">✅ Used</p>
                    </div>
                    <div className="text-center p-2 rounded-xl bg-rose-500/10 border border-rose-400/30">
                      <p className="text-base font-extrabold text-rose-700 dark:text-rose-400">
                        {settlementSummary.cancelledCount}
                      </p>
                      <p className="text-[10px] text-rose-700 dark:text-rose-400">❌ Cancelled</p>
                    </div>
                    <div className="text-center p-2 rounded-xl bg-primary/10 border border-primary/30">
                      <p className="text-base font-extrabold text-primary font-mono">
                        ₹{settlementSummary.netAmount.toFixed(0)}
                      </p>
                      <p className="text-[10px] text-primary">💰 Net Collection</p>
                    </div>
                  </div>

                  {settlementSummary.pendingCount > 0 && (
                    <p className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold text-center">
                      ⚠️ {settlementSummary.pendingCount} slip(s) still need to be marked Used or Cancelled.
                    </p>
                  )}

                  <Button
                    onClick={handleSubmitSettlement}
                    disabled={isSubmittingSettlement || teacherInvoices.length === 0}
                    className="w-full h-9 text-xs font-bold gap-2 cursor-pointer rounded-xl"
                  >
                    {isSubmittingSettlement ? (
                      <>
                        <Spinner className="h-4 w-4" />
                        <span>Submitting Settlement...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4" />
                        <span>Submit Settlement for {selectedSettlementTeacher}</span>
                      </>
                    )}
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
