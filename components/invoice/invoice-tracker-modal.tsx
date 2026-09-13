"use client";

import React, { useState, useEffect, useMemo, useTransition, useCallback } from "react";
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
import { Label } from "@/components/ui/label";
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
  GraduationCap,
  CheckCheck,
  Ban,
  Loader2,
  IndianRupee,
  ClipboardList,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { showToast } from "@/components/ui/toast-banner";
import type { DBInvoiceRow, InvoiceStats, TeacherSettlementSummary } from "@/lib/supabase/db-invoices";
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
  const [activeTab, setActiveTab] = useState<"verify" | "analytics" | "settlement">("verify");
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

  // Teacher Settlement State
  const [settlementTeachers, setSettlementTeachers] = useState<string[]>([]);
  const [settlementSummaries, setSettlementSummaries] = useState<TeacherSettlementSummary[]>([]);
  const [selectedSettlementTeacher, setSelectedSettlementTeacher] = useState<string>("");
  const [teacherInvoices, setTeacherInvoices] = useState<DBInvoiceRow[]>([]);
  const [isLoadingTeacher, setIsLoadingTeacher] = useState(false);
  const [isSubmittingSettlement, setIsSubmittingSettlement] = useState(false);
  // Per-invoice settlement decision: { invoiceNumber -> { status, amount } }
  const [settlementDecisions, setSettlementDecisions] = useState<
    Record<string, { status: "active" | "cancelled" | "pending"; amount: number }>
  >({});

  // Sync initial query
  useEffect(() => {
    if (initialInvoiceNumber && isOpen) {
      setSearchNumber(initialInvoiceNumber);
      handleVerify(initialInvoiceNumber);
    }
  }, [initialInvoiceNumber, isOpen]);

  // Load stats and invoices list whenever modal opens or tab changes to analytics/settlement
  useEffect(() => {
    if (isOpen) {
      loadRegistryData();
    }
  }, [isOpen, activeTab]); // reload when tab changes too

  // Auto-refresh every 30s while modal is open
  useEffect(() => {
    if (!isOpen) return;
    const interval = setInterval(() => {
      loadRegistryData();
    }, 30000);
    return () => clearInterval(interval);
  }, [isOpen]);

  function computeTeacherSettlements(invoices: DBInvoiceRow[]): {
    teachers: string[];
    summaries: TeacherSettlementSummary[];
  } {
    const map: Record<string, TeacherSettlementSummary> = {};

    invoices.forEach((inv) => {
      // Include blank slips OR any invoice assigned to a teacher
      const teacher = inv.assigned_to?.trim() || (inv.is_blank ? "Unassigned Blank Slips" : null);
      if (!teacher) return;

      if (!map[teacher]) {
        map[teacher] = {
          teacher,
          totalAssigned: 0,
          totalUsed: 0,
          totalCancelled: 0,
          totalPending: 0,
          netAmount: 0,
        };
      }

      const sm = map[teacher];
      sm.totalAssigned++;

      const st = (inv as any).invoice_status || (inv.is_blank ? "blank_assigned" : "active");
      if (st === "active") {
        sm.totalUsed++;
        sm.netAmount += Number(inv.total_amount) || 0;
      } else if (st === "cancelled") {
        sm.totalCancelled++;
      } else {
        sm.totalPending++;
      }
    });

    const teachers = Object.keys(map).sort((a, b) => {
      if (a === "Unassigned Blank Slips") return 1;
      if (b === "Unassigned Blank Slips") return -1;
      return a.localeCompare(b);
    });

    return { teachers, summaries: Object.values(map) };
  }

  async function loadRegistryData() {
    setIsLoadingList(true);
    try {
      // 1. Fetch remote list
      let list: DBInvoiceRow[] = [];
      try {
        const listRes = await fetch("/api/invoices?limit=100");
        const listData = await listRes.json();
        if (listRes.ok && Array.isArray(listData.data)) {
          list = listData.data;
        }
      } catch (err) {
        console.warn("Failed fetching from /api/invoices:", err);
      }

      // If remote list is empty, fallback to local cache or merge
      const localInvoices = getLocalCachedInvoices();
      if (list.length === 0 && localInvoices.length > 0) {
        list = localInvoices;
      } else if (localInvoices.length > 0) {
        const remoteSet = new Set(list.map((inv) => inv.invoice_number.toUpperCase()));
        const extra = localInvoices.filter((inv) => !remoteSet.has(inv.invoice_number.toUpperCase()));
        if (extra.length > 0) {
          list = [...list, ...extra];
        }
      }
      setInvoicesList(list);

      // 2. Fetch or compute stats
      let remoteStats: InvoiceStats | null = null;
      try {
        const statsRes = await fetch("/api/invoices/stats");
        const statsData = await statsRes.json();
        if (statsRes.ok && statsData.stats && statsData.stats.totalInvoices > 0) {
          remoteStats = statsData.stats;
        }
      } catch (err) {
        console.warn("Failed fetching /api/invoices/stats:", err);
      }

      if (remoteStats && remoteStats.totalInvoices >= list.length) {
        setStats(remoteStats);
      } else if (list.length > 0) {
        const totalFilled = list.filter((i) => !i.is_blank).length;
        const totalBlank = list.filter((i) => i.is_blank).length;
        const totalBulk = list.filter((i) => i.generator_mode === "bulk").length;
        const totalSingle = list.filter((i) => i.generator_mode !== "bulk").length;
        const totalCancelled = list.filter((i) => (i as any).invoice_status === "cancelled").length;
        const totalActive = list.filter((i) => (i as any).invoice_status === "active" || (!i.is_blank && !(i as any).invoice_status)).length;
        const totalAmount = list.reduce(
          (sum, i) => ((i as any).invoice_status !== "cancelled" ? sum + (Number(i.total_amount) || 0) : sum),
          0
        );
        setStats({
          totalInvoices: list.length,
          totalFilled,
          totalBlank,
          totalActive,
          totalCancelled,
          totalBulk,
          totalSingle,
          totalAmount,
          byClass: {},
        });
      } else {
        setStats(getLocalStats());
      }

      // 3. Load teacher assignment data (with automatic local fallback)
      let remoteTeachers: string[] = [];
      let remoteSummaries: TeacherSettlementSummary[] = [];

      try {
        const taRes = await fetch("/api/invoices/teacher-assignments");
        const taData = await taRes.json();
        if (taRes.ok && Array.isArray(taData.teachers) && taData.teachers.length > 0) {
          remoteTeachers = taData.teachers;
          remoteSummaries = taData.summaries || [];
        }
      } catch (err) {
        console.warn("Failed fetching teacher assignments from API:", err);
      }

      if (remoteTeachers.length > 0) {
        setSettlementTeachers(remoteTeachers);
        setSettlementSummaries(remoteSummaries);
      } else {
        // Fallback: Compute dynamically from all available invoices (localStorage / state)
        const computed = computeTeacherSettlements(list);
        setSettlementTeachers(computed.teachers);
        setSettlementSummaries(computed.summaries);
      }

      // 4. Auto-sync: push local-only invoices to remote database in background
      if (localInvoices.length > 0 && (!remoteStats || remoteStats.totalInvoices === 0)) {
        fetch("/api/invoices", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ invoices: localInvoices }),
        }).catch(() => {});
      }
    } catch (e) {
      console.warn("Using local cache for invoices registry:", e);
      const local = getLocalCachedInvoices();
      setInvoicesList(local);
      setStats(getLocalStats());
      const computed = computeTeacherSettlements(local);
      setSettlementTeachers(computed.teachers);
      setSettlementSummaries(computed.summaries);
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

  // Load teacher's invoices when selection changes
  const loadTeacherInvoices = useCallback(async (teacher: string) => {
    if (!teacher) { setTeacherInvoices([]); setSettlementDecisions({}); return; }
    setIsLoadingTeacher(true);
    try {
      let invs: DBInvoiceRow[] = [];
      try {
        const res = await fetch(`/api/invoices/teacher-assignments?teacher=${encodeURIComponent(teacher)}`);
        const data = await res.json();
        if (res.ok && Array.isArray(data.data) && data.data.length > 0) {
          invs = data.data;
        }
      } catch (err) {
        console.warn("Error loading teacher invoices from API:", err);
      }

      // Fallback: match from local invoicesList or localStorage
      if (invs.length === 0) {
        const source = invoicesList.length > 0 ? invoicesList : getLocalCachedInvoices();
        if (teacher === "Unassigned Blank Slips") {
          invs = source.filter((i) => i.is_blank && !i.assigned_to);
        } else {
          invs = source.filter(
            (i) => i.assigned_to?.trim().toLowerCase() === teacher.trim().toLowerCase()
          );
        }
      }

      setTeacherInvoices(invs);

      // Pre-populate decisions for invoices
      const decisions: Record<string, { status: "active" | "cancelled" | "pending"; amount: number }> = {};
      invs.forEach((inv) => {
        const st = (inv as any).invoice_status as string;
        decisions[inv.invoice_number] = {
          status: st === "active" ? "active" : st === "cancelled" ? "cancelled" : "pending",
          amount: Number(inv.total_amount) || 0,
        };
      });
      setSettlementDecisions(decisions);
    } catch (err) {
      console.warn("Error loading teacher invoices:", err);
    } finally {
      setIsLoadingTeacher(false);
    }
  }, [invoicesList]);

  // Settlement summary computed from decisions
  const settlementSummary = useMemo(() => {
    const used = Object.values(settlementDecisions).filter((d) => d.status === "active");
    const cancelled = Object.values(settlementDecisions).filter((d) => d.status === "cancelled");
    const pending = Object.values(settlementDecisions).filter((d) => d.status === "pending");
    const netAmount = used.reduce((sum, d) => sum + d.amount, 0);
    return { usedCount: used.length, cancelledCount: cancelled.length, pendingCount: pending.length, netAmount };
  }, [settlementDecisions]);

  async function handleSubmitSettlement() {
    const pending = Object.values(settlementDecisions).some((d) => d.status === "pending");
    if (pending) {
      showToast({ type: "error", title: "Unsettled Invoices", description: "Please mark all invoices as Used or Cancelled before submitting." });
      return;
    }

    const updates = Object.entries(settlementDecisions).map(([invoiceNumber, dec]) => ({
      invoice_number: invoiceNumber,
      status: dec.status as "active" | "cancelled",
      amount: dec.status === "active" ? dec.amount : 0,
    }));

    if (updates.length === 0) {
      showToast({ type: "info", title: "Nothing to settle", description: "No changes to submit." });
      return;
    }

    setIsSubmittingSettlement(true);
    try {
      // 1. Immediately update LocalStorage cache
      const localInvs = getLocalCachedInvoices();
      const updateMap = new Map(updates.map((u) => [u.invoice_number.toUpperCase(), u]));

      const updatedLocal = localInvs.map((inv) => {
        const upd = updateMap.get(inv.invoice_number.toUpperCase());
        if (upd) {
          return {
            ...inv,
            invoice_status: upd.status,
            total_amount: upd.status === "active" ? (upd.amount ?? inv.total_amount) : 0,
            payment_status: upd.status === "cancelled" ? "Cancelled" : "Paid",
            updated_at: new Date().toISOString(),
          };
        }
        return inv;
      });
      localStorage.setItem("sms_cached_invoices_registry_v1", JSON.stringify(updatedLocal));

      // Update in-memory list
      setInvoicesList((prev) =>
        prev.map((inv) => {
          const upd = updateMap.get(inv.invoice_number.toUpperCase());
          if (upd) {
            return {
              ...inv,
              invoice_status: upd.status,
              total_amount: upd.status === "active" ? (upd.amount ?? inv.total_amount) : 0,
              payment_status: upd.status === "cancelled" ? "Cancelled" : "Paid",
              updated_at: new Date().toISOString(),
            };
          }
          return inv;
        })
      );

      // 2. Also send to API in background
      let apiSynced = false;
      try {
        const res = await fetch("/api/invoices/settle", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ updates }),
        });
        const data = await res.json();
        if (res.ok && data.success) {
          apiSynced = true;
        }
      } catch (err) {
        console.warn("Could not sync settlement to backend, saved to local ledger:", err);
      }

      showToast({
        type: "success",
        title: "Settlement Completed!",
        description: apiSynced
          ? `${updates.length} invoices settled and synced to database.`
          : `${updates.length} invoices settled in local registry.`,
      });

      await loadRegistryData();
      await loadTeacherInvoices(selectedSettlementTeacher);
    } catch (err: any) {
      showToast({ type: "error", title: "Settlement Error", description: err?.message || "Failed to submit settlement" });
    } finally {
      setIsSubmittingSettlement(false);
    }
  }
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto p-4 sm:p-6 gap-4">
        <DialogHeader className="border-b pb-4 space-y-3 pr-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center ring-1 ring-teal-500/20 shrink-0">
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
              className="h-8 text-xs font-semibold gap-1.5 cursor-pointer rounded-xl self-start sm:self-auto shrink-0 border-border/80 hover:bg-muted"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", isLoadingList && "animate-spin text-primary")} />
              <span>Refresh</span>
            </Button>
          </div>

          {/* Tab Switcher */}
          <div className="flex items-center gap-2">
            <div className="flex items-center rounded-xl bg-muted/70 p-1 border border-border/80 text-xs font-bold">
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
              <button
                type="button"
                onClick={() => setActiveTab("settlement")}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer",
                  activeTab === "settlement"
                    ? "bg-background text-foreground shadow-2xs"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <GraduationCap className="h-3.5 w-3.5 text-amber-600" />
                <span>Teacher Settlement</span>
                {settlementSummaries.some((s) => s.totalPending > 0) && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-400 font-mono">
                    {settlementSummaries.reduce((s, t) => s + t.totalPending, 0)} pending
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
              <div className="p-3.5 rounded-2xl border border-border/80 bg-muted/20 space-y-1.5 shadow-2xs">
                <span className="text-[11px] text-muted-foreground font-semibold flex items-center justify-between">
                  <span>Total Generated</span>
                  <div className="h-6 w-6 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                    <FileText className="h-3.5 w-3.5" />
                  </div>
                </span>
                <p className="text-2xl font-bold font-mono text-foreground">
                  {stats?.totalInvoices || 0}
                </p>
                <span className="text-[10px] text-muted-foreground block truncate">All time printed receipts</span>
              </div>

              {/* Pre-Filled vs Blank */}
              <div className="p-3.5 rounded-2xl border border-border/80 bg-muted/20 space-y-1.5 shadow-2xs">
                <span className="text-[11px] text-muted-foreground font-semibold flex items-center justify-between">
                  <span>Filled vs Blank</span>
                  <div className="h-6 w-6 rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center">
                    <UserCheck className="h-3.5 w-3.5" />
                  </div>
                </span>
                <div className="flex items-baseline gap-1 text-sm font-bold">
                  <span className="text-teal-700 dark:text-teal-400 font-mono text-base">
                    {stats?.totalFilled || 0}
                  </span>
                  <span className="text-muted-foreground font-normal text-[11px]">filled</span>
                  <span className="text-muted-foreground">&bull;</span>
                  <span className="text-amber-700 dark:text-amber-400 font-mono text-base">
                    {stats?.totalBlank || 0}
                  </span>
                  <span className="text-muted-foreground font-normal text-[11px]">blank</span>
                </div>
                <div className="w-full bg-muted/80 h-1.5 rounded-full overflow-hidden flex">
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
              <div className="p-3.5 rounded-2xl border border-border/80 bg-muted/20 space-y-1.5 shadow-2xs">
                <span className="text-[11px] text-muted-foreground font-semibold flex items-center justify-between">
                  <span>Batch vs Single</span>
                  <div className="h-6 w-6 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                    <Users className="h-3.5 w-3.5" />
                  </div>
                </span>
                <div className="flex items-baseline gap-1 text-sm font-bold">
                  <span className="text-blue-700 dark:text-blue-400 font-mono text-base">
                    {stats?.totalBulk || 0}
                  </span>
                  <span className="text-muted-foreground font-normal text-[11px]">batch</span>
                  <span className="text-muted-foreground">&bull;</span>
                  <span className="text-foreground font-mono text-base">{stats?.totalSingle || 0}</span>
                  <span className="text-muted-foreground font-normal text-[11px]">single</span>
                </div>
                <span className="text-[10px] text-muted-foreground block truncate">Generation mode breakdown</span>
              </div>

              {/* Total Revenue */}
              <div className="p-3.5 rounded-2xl border border-border/80 bg-muted/20 space-y-1.5 shadow-2xs">
                <span className="text-[11px] text-muted-foreground font-semibold flex items-center justify-between">
                  <span>Total Amount</span>
                  <div className="h-6 w-6 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                    <CreditCard className="h-3.5 w-3.5" />
                  </div>
                </span>
                <p className="text-xl font-bold font-mono text-emerald-700 dark:text-emerald-400 truncate">
                  ₹{(stats?.totalAmount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </p>
                <span className="text-[10px] text-muted-foreground block truncate">Cumulative fees recorded</span>
              </div>
            </div>

            {/* Filter Toolbar */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 pt-1">
              <div className="relative sm:col-span-4">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search receipt / student..."
                  value={tableSearch}
                  onChange={(e) => setTableSearch(e.target.value)}
                  className="pl-8 text-xs h-8 rounded-xl"
                />
              </div>

              <div className="sm:col-span-3">
                <CustomSelect
                  value={typeFilter}
                  onChange={(val) => setTypeFilter(val as any)}
                  options={[
                    { label: "All Types", value: "ALL" },
                    { label: "Pre-Filled Only", value: "FILLED" },
                    { label: "Blank Only", value: "BLANK" },
                  ]}
                  searchable={false}
                  triggerClassName="h-8 text-xs rounded-xl"
                />
              </div>

              <div className="sm:col-span-3">
                <CustomSelect
                  value={modeFilter}
                  onChange={(val) => setModeFilter(val as any)}
                  options={[
                    { label: "All Modes", value: "ALL" },
                    { label: "Batch Only", value: "BULK" },
                    { label: "Single Only", value: "SINGLE" },
                  ]}
                  searchable={false}
                  triggerClassName="h-8 text-xs rounded-xl"
                />
              </div>

              <div className="sm:col-span-2">
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
                  triggerClassName="h-8 text-xs rounded-xl"
                />
              </div>
            </div>

            {/* Invoices List Table */}
            <div className="rounded-2xl border border-border/80 overflow-hidden bg-card shadow-2xs">
              <div className="max-h-80 overflow-y-auto divide-y divide-border/60 text-xs">
                {filteredList.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground text-xs space-y-2">
                    <div className="h-10 w-10 rounded-2xl bg-muted/60 flex items-center justify-center mx-auto text-muted-foreground/60 border border-border/60">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground text-xs">No matching invoices found in registry</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {invoicesList.length > 0
                          ? "Try clearing or adjusting the search and filters above."
                          : "Print receipts from the generator to automatically populate this registry."}
                      </p>
                    </div>
                    {tableSearch || typeFilter !== "ALL" || modeFilter !== "ALL" || classFilter !== "ALL" ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setTableSearch("");
                          setTypeFilter("ALL");
                          setModeFilter("ALL");
                          setClassFilter("ALL");
                        }}
                        className="h-7 text-[11px] mt-2 rounded-lg cursor-pointer"
                      >
                        Clear Filters
                      </Button>
                    ) : null}
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

        {/* ========================================================================= */}
        {/* TAB 3: TEACHER SETTLEMENT                                                  */}
        {/* ========================================================================= */}
        {activeTab === "settlement" && (
          <div className="space-y-4 pt-1">
            {/* Teacher Selector */}
            <div className="p-4 rounded-2xl border border-border/80 bg-card space-y-3">
              <div className="flex items-center gap-2">
                <GraduationCap className="h-4 w-4 text-amber-600" />
                <h3 className="text-xs font-bold text-foreground">Select Teacher to Settle</h3>
              </div>

              {settlementTeachers.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground text-xs">
                  <ClipboardList className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  <p className="font-semibold">No teacher assignments found.</p>
                  <p className="text-[10px] mt-1">Print blank invoices and assign them to a teacher first.</p>
                </div>
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
                              <span className="text-rose-600 font-semibold">{summary.totalCancelled} cancelled</span>
                              {summary.totalPending > 0 && (
                                <span className="text-amber-600 font-semibold"> • {summary.totalPending} pending</span>
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
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    <span>Loading invoices for {selectedSettlementTeacher}...</span>
                  </div>
                ) : (
                  <>
                    {/* Per-invoice decisions */}
                    <div className="rounded-2xl border border-border/80 overflow-hidden">
                      <div className="p-3 bg-muted/40 border-b flex flex-wrap items-center justify-between gap-2">
                        <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                          <UserCheck className="h-3.5 w-3.5 text-amber-600" />
                          Invoices for: <span className="text-amber-700 dark:text-amber-400">{selectedSettlementTeacher}</span>
                          <span className="text-[10px] text-muted-foreground font-normal">({teacherInvoices.length} slips)</span>
                        </span>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {/* Select All Used Button */}
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

                          {/* Cancel All Pending Button */}
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

                      <div className="divide-y max-h-72 overflow-y-auto">
                        {teacherInvoices.length === 0 ? (
                          <div className="p-4 text-center text-xs text-muted-foreground">
                            No invoices assigned to this teacher.
                          </div>
                        ) : (
                          teacherInvoices.map((inv) => {
                            const dec = settlementDecisions[inv.invoice_number] || { status: "pending", amount: 0 };
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

                                {/* Amount input (only editable when marked as Used) */}
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

                                {/* Action Buttons */}
                                <div className="flex items-center gap-1 shrink-0">
                                  <button
                                    type="button"
                                    title="Mark as Used"
                                    onClick={() =>
                                      setSettlementDecisions((prev) => ({
                                        ...prev,
                                        [inv.invoice_number]: { status: "active", amount: dec.amount || 0 },
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

                    {/* Running Settlement Summary */}
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
                            <p className="text-base font-extrabold text-emerald-700 dark:text-emerald-400">{settlementSummary.usedCount}</p>
                            <p className="text-[10px] text-emerald-700 dark:text-emerald-400">✅ Used</p>
                          </div>
                          <div className="text-center p-2 rounded-xl bg-rose-500/10 border border-rose-400/30">
                            <p className="text-base font-extrabold text-rose-700 dark:text-rose-400">{settlementSummary.cancelledCount}</p>
                            <p className="text-[10px] text-rose-700 dark:text-rose-400">❌ Cancelled</p>
                          </div>
                          <div className="text-center p-2 rounded-xl bg-primary/10 border border-primary/30">
                            <p className="text-base font-extrabold text-primary font-mono">
                              ₹{settlementSummary.netAmount.toFixed(0)}
                            </p>
                            <p className="text-[10px] text-primary">💰 Net Amount</p>
                          </div>
                        </div>

                        {settlementSummary.pendingCount > 0 && (
                          <p className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold text-center">
                            ⚠️ {settlementSummary.pendingCount} invoice(s) still need to be marked Used or Cancelled.
                          </p>
                        )}

                        <Button
                          onClick={handleSubmitSettlement}
                          disabled={isSubmittingSettlement || teacherInvoices.length === 0}
                          className="w-full h-9 text-xs font-bold gap-2 cursor-pointer"
                        >
                          {isSubmittingSettlement ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
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
        )}
      </DialogContent>
    </Dialog>
  );
}
