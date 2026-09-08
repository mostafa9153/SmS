"use client";

import React, { useState, useEffect, useMemo, useTransition } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { CustomSelect } from "@/components/ui/custom-select";
import {
  ShieldCheck,
  Search,
  CheckCircle2,
  XCircle,
  FileText,
  UserCheck,
  Users,
  User,
  RefreshCw,
  Calendar,
  CreditCard,
  Building2,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { DBInvoiceRow, InvoiceStats } from "@/lib/supabase/db-invoices";
import { getLocalCachedInvoices, getLocalStats } from "@/lib/utils/invoice-registry";

interface InvoiceTrackerModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialInvoiceNumber?: string;
}

export function InvoiceTrackerModal({
  isOpen,
  onClose,
  initialInvoiceNumber = "",
}: InvoiceTrackerModalProps) {
  const [activeTab, setActiveTab] = useState<"verify" | "analytics">("verify");
  const [searchNumber, setSearchNumber] = useState(initialInvoiceNumber);
  const [isPending, startTransition] = useTransition();

  // Verification State
  const [verificationResult, setVerificationResult] = useState<{
    checked: boolean;
    valid: boolean;
    invoice: DBInvoiceRow | null;
    message?: string;
  }>({ checked: false, valid: false, invoice: null });

  // Stats & Invoices Registry State
  const [stats, setStats] = useState<InvoiceStats | null>(null);
  const [invoicesList, setInvoicesList] = useState<DBInvoiceRow[]>([]);
  const [isLoadingList, setIsLoadingList] = useState(false);

  // Filters for Registry Tab
  const [tableSearch, setTableSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"ALL" | "FILLED" | "BLANK">("ALL");
  const [modeFilter, setModeFilter] = useState<"ALL" | "BULK" | "SINGLE">("ALL");
  const [classFilter, setClassFilter] = useState<string>("ALL");

  // Sync initial query
  useEffect(() => {
    if (initialInvoiceNumber && isOpen) {
      setSearchNumber(initialInvoiceNumber);
      handleVerify(initialInvoiceNumber);
    }
  }, [initialInvoiceNumber, isOpen]);

  // Load stats and invoices list whenever modal opens or tab changes
  useEffect(() => {
    if (isOpen) {
      loadRegistryData();
    }
  }, [isOpen]);

  async function loadRegistryData() {
    setIsLoadingList(true);
    try {
      // 1. Load Stats
      const statsRes = await fetch("/api/invoices/stats");
      const statsData = await statsRes.json();
      if (statsRes.ok && statsData.stats && statsData.stats.totalInvoices > 0) {
        setStats(statsData.stats);
      } else {
        // Fallback to local cache if table pending or empty
        setStats(getLocalStats());
      }

      // 2. Load Invoices List
      const listRes = await fetch("/api/invoices?limit=100");
      const listData = await listRes.json();
      if (listRes.ok && Array.isArray(listData.data) && listData.data.length > 0) {
        setInvoicesList(listData.data);
      } else {
        // Fallback to local cache
        setInvoicesList(getLocalCachedInvoices());
      }
    } catch (e) {
      console.warn("Using local cache for invoices registry:", e);
      setStats(getLocalStats());
      setInvoicesList(getLocalCachedInvoices());
    } finally {
      setIsLoadingList(false);
    }
  }

  // Handle Verify Execution
  function handleVerify(numToVerify?: string) {
    const term = (numToVerify !== undefined ? numToVerify : searchNumber).trim();
    if (!term) return;

    startTransition(async () => {
      try {
        const res = await fetch(`/api/invoices/verify?number=${encodeURIComponent(term)}`);
        const data = await res.json();

        if (res.ok && data.valid && data.invoice) {
          setVerificationResult({
            checked: true,
            valid: true,
            invoice: data.invoice,
            message: data.message,
          });
          return;
        }

        // Check local cache fallback
        const localInvoices = getLocalCachedInvoices();
        const cleanTerm = term.toLowerCase().replace(/[^a-z0-9]/g, "");
        const matched = localInvoices.find(
          (inv) =>
            inv.invoice_number.toLowerCase().replace(/[^a-z0-9]/g, "") === cleanTerm ||
            inv.invoice_number.toLowerCase().includes(term.toLowerCase())
        );

        if (matched) {
          setVerificationResult({
            checked: true,
            valid: true,
            invoice: matched,
            message: "Verified from local school ledger",
          });
        } else {
          setVerificationResult({
            checked: true,
            valid: false,
            invoice: null,
            message: `Invoice '${term}' was not found in the database.`,
          });
        }
      } catch (err) {
        // Fallback search in local cache
        const localInvoices = getLocalCachedInvoices();
        const matched = localInvoices.find(
          (inv) => inv.invoice_number.toLowerCase() === term.toLowerCase()
        );

        if (matched) {
          setVerificationResult({
            checked: true,
            valid: true,
            invoice: matched,
            message: "Verified from local ledger",
          });
        } else {
          setVerificationResult({
            checked: true,
            valid: false,
            invoice: null,
            message: "Verification lookup failed or invoice not found.",
          });
        }
      }
    });
  }

  // Filtered list in Registry Tab
  const filteredList = useMemo(() => {
    return invoicesList.filter((inv) => {
      if (typeFilter === "FILLED" && inv.is_blank) return false;
      if (typeFilter === "BLANK" && !inv.is_blank) return false;

      if (modeFilter === "BULK" && inv.generator_mode !== "bulk") return false;
      if (modeFilter === "SINGLE" && inv.generator_mode !== "single") return false;

      if (classFilter !== "ALL" && inv.student_class !== classFilter) return false;

      if (tableSearch.trim()) {
        const q = tableSearch.toLowerCase().trim();
        const matchNum = inv.invoice_number.toLowerCase().includes(q);
        const matchName = (inv.student_name || "").toLowerCase().includes(q);
        const matchId = (inv.student_id || "").toLowerCase().includes(q);
        const matchGuardian = (inv.guardian_name || "").toLowerCase().includes(q);
        if (!matchNum && !matchName && !matchId && !matchGuardian) return false;
      }

      return true;
    });
  }, [invoicesList, typeFilter, modeFilter, classFilter, tableSearch]);
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto p-4 sm:p-6 gap-4">
        <DialogHeader className="border-b pb-3.5 space-y-1">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-foreground">
                  Invoice Verification &amp; Registry Tracker
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Verify authentic receipt numbers, track blank vs. filled batches, and review database records.
                </DialogDescription>
              </div>
            </div>

            {/* Refresh Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={loadRegistryData}
              disabled={isLoadingList}
              className="h-8 text-xs font-semibold gap-1.5 cursor-pointer"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", isLoadingList && "animate-spin text-primary")} />
              <span>Refresh</span>
            </Button>
          </div>

          {/* Tab Switcher */}
          <div className="flex items-center gap-2 pt-2">
            <div className="flex items-center rounded-xl bg-muted/60 p-1 border border-border/80 text-xs font-bold">
              <button
                type="button"
                onClick={() => setActiveTab("verify")}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer",
                  activeTab === "verify"
                    ? "bg-background text-foreground shadow-2xs"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <ShieldCheck className="h-3.5 w-3.5 text-teal-600" />
                <span>Verify Invoice</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("analytics")}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer",
                  activeTab === "analytics"
                    ? "bg-background text-foreground shadow-2xs"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <FileText className="h-3.5 w-3.5 text-primary" />
                <span>Registry &amp; Statistics</span>
                {stats && stats.totalInvoices > 0 && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-primary/10 text-primary font-mono">
                    {stats.totalInvoices}
                  </span>
                )}
              </button>
            </div>
          </div>
        </DialogHeader>

        {/* ========================================================================= */}
        {/* TAB 1: VERIFY INVOICE                                                     */}
        {/* ========================================================================= */}
        {activeTab === "verify" && (
          <div className="space-y-4 pt-1">
            {/* Search Input Box */}
            <div className="flex flex-col sm:flex-row items-center gap-2">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Enter invoice number (e.g. MHS/2026/ADM-0001)..."
                  value={searchNumber}
                  onChange={(e) => setSearchNumber(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleVerify()}
                  className="pl-9 h-9.5 text-xs font-mono font-bold"
                />
              </div>
              <Button
                onClick={() => handleVerify()}
                disabled={isPending || !searchNumber.trim()}
                className="w-full sm:w-auto h-9.5 px-4 text-xs font-bold gap-2 cursor-pointer"
              >
                <ShieldCheck className="h-4 w-4" />
                <span>{isPending ? "Checking..." : "Verify Now"}</span>
              </Button>
            </div>

            {/* Quick Suggestions from recent invoices */}
            {invoicesList.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap text-xs text-muted-foreground">
                <span className="text-[11px] font-semibold">Recent Receipts:</span>
                {invoicesList.slice(0, 4).map((item) => (
                  <button
                    key={item.id}
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
            {verificationResult.checked && (
              <div className="animate-in fade-in-0 duration-200">
                {verificationResult.valid && verificationResult.invoice ? (
                  <div className="p-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 space-y-3.5">
                    {/* Status Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-emerald-500/20 pb-3">
                      <div className="flex items-center gap-2.5">
                        <div className="h-9 w-9 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                          <CheckCircle2 className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-emerald-800 dark:text-emerald-300">
                              Valid Official School Invoice
                            </span>
                            <Badge className="bg-emerald-600 text-white text-[10px] font-mono">
                              Verified
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground font-mono">
                            {verificationResult.invoice.invoice_number}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
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
                              <FileText className="h-3 w-3" /> Blank Slip (Manual Fill)
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
                      </div>
                    </div>

                    {/* Metadata Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-background/60 p-3 rounded-xl border border-border/70">
                      <div>
                        <span className="text-[10.5px] text-muted-foreground block">Student Name</span>
                        <span className="font-bold text-foreground">
                          {verificationResult.invoice.student_name || (
                            <span className="text-muted-foreground italic font-normal">
                              [Blank Write-in Line]
                            </span>
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
                        <span className="text-[10.5px] text-muted-foreground block">Total Paid Amount</span>
                        <span className="text-sm font-extrabold text-emerald-700 dark:text-emerald-400 font-mono">
                          ₹{Number(verificationResult.invoice.total_amount).toFixed(2)}
                        </span>
                      </div>
                    </div>

                    {/* Fee Breakdown Particulars Table */}
                    {Array.isArray(verificationResult.invoice.fee_items) &&
                      verificationResult.invoice.fee_items.length > 0 && (
                        <div className="space-y-1 pt-1">
                          <p className="text-[11px] font-bold text-muted-foreground">
                            Fee Heads Breakdown ({verificationResult.invoice.fee_items.length} heads)
                          </p>
                          <div className="rounded-xl border border-border/80 divide-y bg-background text-xs max-h-36 overflow-y-auto">
                            {verificationResult.invoice.fee_items.map((item, idx) => (
                              <div key={item.id || idx} className="py-1 px-2.5 flex items-center justify-between">
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
                  <div className="p-4 rounded-2xl border border-rose-500/30 bg-rose-500/5 text-center space-y-2">
                    <XCircle className="h-8 w-8 text-rose-500 mx-auto" />
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
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: REGISTRY & STATISTICS TRACKER                                      */}
        {/* ========================================================================= */}
        {activeTab === "analytics" && (
          <div className="space-y-4 pt-1">
            {/* KPI Metric Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {/* Total Invoices */}
              <div className="p-3 rounded-xl border border-border/80 bg-card space-y-1">
                <span className="text-[11px] text-muted-foreground font-semibold flex items-center justify-between">
                  <span>Total Generated</span>
                  <FileText className="h-3.5 w-3.5 text-primary" />
                </span>
                <p className="text-xl font-bold font-mono text-foreground">
                  {stats?.totalInvoices || 0}
                </p>
                <span className="text-[10px] text-muted-foreground">All time printed receipts</span>
              </div>

              {/* Pre-Filled vs Blank */}
              <div className="p-3 rounded-xl border border-border/80 bg-card space-y-1">
                <span className="text-[11px] text-muted-foreground font-semibold flex items-center justify-between">
                  <span>Filled vs Blank</span>
                  <UserCheck className="h-3.5 w-3.5 text-teal-600" />
                </span>
                <div className="flex items-baseline gap-1 text-sm font-bold">
                  <span className="text-teal-700 dark:text-teal-400 font-mono">
                    {stats?.totalFilled || 0}
                  </span>
                  <span className="text-muted-foreground font-normal text-xs">filled</span>
                  <span className="text-muted-foreground">•</span>
                  <span className="text-amber-700 dark:text-amber-400 font-mono">
                    {stats?.totalBlank || 0}
                  </span>
                  <span className="text-muted-foreground font-normal text-xs">blank</span>
                </div>
                <div className="w-full bg-muted h-1.5 rounded-full overflow-hidden flex">
                  <div
                    style={{
                      width: `${
                        stats && stats.totalInvoices > 0
                          ? (stats.totalFilled / stats.totalInvoices) * 100
                          : 50
                      }%`,
                    }}
                    className="bg-teal-500 h-full"
                  />
                  <div
                    style={{
                      width: `${
                        stats && stats.totalInvoices > 0
                          ? (stats.totalBlank / stats.totalInvoices) * 100
                          : 50
                      }%`,
                    }}
                    className="bg-amber-500 h-full"
                  />
                </div>
              </div>

              {/* Bulk Batch vs Single */}
              <div className="p-3 rounded-xl border border-border/80 bg-card space-y-1">
                <span className="text-[11px] text-muted-foreground font-semibold flex items-center justify-between">
                  <span>Batch vs Single</span>
                  <Users className="h-3.5 w-3.5 text-blue-600" />
                </span>
                <div className="flex items-baseline gap-1 text-sm font-bold">
                  <span className="text-blue-700 dark:text-blue-400 font-mono">
                    {stats?.totalBulk || 0}
                  </span>
                  <span className="text-muted-foreground font-normal text-xs">batch</span>
                  <span className="text-muted-foreground">•</span>
                  <span className="text-foreground font-mono">{stats?.totalSingle || 0}</span>
                  <span className="text-muted-foreground font-normal text-xs">single</span>
                </div>
                <span className="text-[10px] text-muted-foreground">Generation mode breakdown</span>
              </div>

              {/* Total Revenue */}
              <div className="p-3 rounded-xl border border-border/80 bg-card space-y-1">
                <span className="text-[11px] text-muted-foreground font-semibold flex items-center justify-between">
                  <span>Total Amount</span>
                  <CreditCard className="h-3.5 w-3.5 text-emerald-600" />
                </span>
                <p className="text-xl font-bold font-mono text-emerald-700 dark:text-emerald-400">
                  ₹{(stats?.totalAmount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </p>
                <span className="text-[10px] text-muted-foreground">Cumulative fees recorded</span>
              </div>
            </div>

            {/* Filter Toolbar */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 pt-1">
              <div className="relative sm:col-span-1">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search receipt / student..."
                  value={tableSearch}
                  onChange={(e) => setTableSearch(e.target.value)}
                  className="pl-8 text-xs h-8"
                />
              </div>

              <CustomSelect
                value={typeFilter}
                onChange={(val) => setTypeFilter(val as any)}
                options={[
                  { label: "All Types (Filled & Blank)", value: "ALL" },
                  { label: "Pre-Filled Roster Only", value: "FILLED" },
                  { label: "Blank Templates Only", value: "BLANK" },
                ]}
                searchable={false}
                triggerClassName="h-8 text-xs"
              />

              <CustomSelect
                value={modeFilter}
                onChange={(val) => setModeFilter(val as any)}
                options={[
                  { label: "All Modes (Batch & Single)", value: "ALL" },
                  { label: "Batch (Bulk) Generated", value: "BULK" },
                  { label: "Single Student Receipts", value: "SINGLE" },
                ]}
                searchable={false}
                triggerClassName="h-8 text-xs"
              />

              <CustomSelect
                value={classFilter}
                onChange={(val) => setClassFilter(val)}
                options={[
                  { label: "All Classes", value: "ALL" },
                  { label: "Class V", value: "V" },
                  { label: "Class VI", value: "VI" },
                  { label: "Class VII", value: "VII" },
                  { label: "Class VIII", value: "VIII" },
                  { label: "Class IX", value: "IX" },
                  { label: "Class X", value: "X" },
                  { label: "Class XI", value: "XI" },
                  { label: "Class XII", value: "XII" },
                ]}
                searchable={false}
                triggerClassName="h-8 text-xs"
              />
            </div>

            {/* Invoices List Table */}
            <div className="rounded-xl border border-border/80 overflow-hidden bg-card">
              <div className="max-h-72 overflow-y-auto divide-y text-xs">
                {filteredList.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground text-xs space-y-1">
                    <FileText className="h-6 w-6 mx-auto opacity-40" />
                    <p className="font-semibold">No matching invoices found in database records.</p>
                    <p className="text-[11px]">Print receipts to automatically populate this registry.</p>
                  </div>
                ) : (
                  filteredList.map((inv) => (
                    <div
                      key={inv.id}
                      className="p-2.5 flex items-center justify-between gap-2 hover:bg-muted/40 transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="h-7 w-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-mono font-bold text-[10px]">
                          {inv.student_class}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-foreground">
                              {inv.invoice_number}
                            </span>
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-[9px] px-1 py-0",
                                inv.is_blank
                                  ? "border-amber-400 text-amber-700 bg-amber-50 dark:bg-amber-950/20"
                                  : "border-teal-400 text-teal-700 bg-teal-50 dark:bg-teal-950/20"
                              )}
                            >
                              {inv.is_blank ? "Blank" : "Filled"}
                            </Badge>
                            <span className="text-[10px] text-muted-foreground font-mono">
                              {inv.generator_mode === "bulk" ? "Batch" : "Single"}
                            </span>
                          </div>
                          <p className="text-[10.5px] text-muted-foreground">
                            {inv.student_name ? (
                              <span className="font-semibold text-foreground">
                                {inv.student_name}{" "}
                                {inv.roll_no ? `(Roll: ${inv.roll_no})` : ""} •{" "}
                              </span>
                            ) : (
                              <span className="italic">Manual Blank Slip • </span>
                            )}
                            Class {inv.student_class}
                            {inv.section ? ` (${inv.section})` : ""} • {inv.issue_date}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5 shrink-0">
                        <span className="font-mono font-bold text-xs text-foreground">
                          ₹{Number(inv.total_amount).toFixed(2)}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setActiveTab("verify");
                            setSearchNumber(inv.invoice_number);
                            handleVerify(inv.invoice_number);
                          }}
                          className="h-7 text-[11px] px-2 font-semibold text-primary hover:text-primary hover:bg-primary/10 cursor-pointer"
                        >
                          <span>Verify</span>
                          <ChevronRight className="h-3 w-3 ml-0.5" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
