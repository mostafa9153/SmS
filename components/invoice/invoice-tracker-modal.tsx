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
import { CustomSelect } from "@/components/ui/custom-select";
import {
  ShieldCheck,
  Search,
  CheckCircle2,
  XCircle,
  FileText,
  UserCheck,
  Users,
  RefreshCw,
  Calendar,
  CreditCard,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  GraduationCap,
  CheckCheck,
  Ban,
  Loader2,
  IndianRupee,
  ClipboardList,
  Download,
  Copy,
  Receipt,
  Layers,
  SlidersHorizontal,
  TrendingUp,
  LayoutDashboard,
  Filter,
  Printer,
} from "lucide-react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { showToast } from "@/components/ui/toast-banner";
import type { DBInvoiceRow, InvoiceStats, TeacherSettlementSummary } from "@/lib/supabase/db-invoices";
import { getLocalCachedInvoices, getLocalStats } from "@/lib/utils/invoice-registry";
import { useSchoolProfile } from "@/lib/utils/school-profile";
import { InvoicePrintableView } from "@/components/invoice/invoice-printable-view";
import { type InvoiceData, DEFAULT_FEE_ITEMS } from "@/lib/utils/fee-config";

function dbRowToInvoiceData(inv: DBInvoiceRow): InvoiceData {
  return {
    invoiceNumber: inv.invoice_number,
    issueDate: inv.issue_date,
    issueTime: inv.issue_time || "",
    academicSession: inv.academic_session || "2026",
    studentId: inv.student_id || undefined,
    studentName: inv.student_name || "",
    studentClass: inv.student_class,
    section: inv.section || undefined,
    rollNo: inv.roll_no || undefined,
    guardianName: inv.guardian_name || undefined,
    contactNumber: inv.contact_number || undefined,
    penNumber: inv.pen_number || undefined,
    isBlankTemplate: Boolean(inv.is_blank),
    feeItems:
      Array.isArray(inv.fee_items) && inv.fee_items.length > 0
        ? inv.fee_items
        : DEFAULT_FEE_ITEMS,
    paymentMode: (inv.payment_mode as any) || "Cash",
    paymentStatus: (inv.payment_status as any) || "Paid",
    remarks: inv.remarks || undefined,
  };
}

interface InvoiceTrackerModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialInvoiceNumber?: string;
}

const CLASS_LIST = ["ALL", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];
const PAGE_SIZE = 25;

export function InvoiceTrackerModal({
  isOpen,
  onClose,
  initialInvoiceNumber = "",
}: InvoiceTrackerModalProps) {
  // Active Tab: Default is "analytics" (Registry & Statistics Dashboard)
  const [activeTab, setActiveTab] = useState<"analytics" | "verify" | "settlement">(
    initialInvoiceNumber ? "verify" : "analytics"
  );
  const [searchNumber, setSearchNumber] = useState(initialInvoiceNumber);
  const [isPending, startTransition] = useTransition();

  // School Profile & 1-Click Student Copy Reprint state
  const { profile: schoolProfile } = useSchoolProfile();
  const [reprintInvoice, setReprintInvoice] = useState<DBInvoiceRow | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handlePrintStudentCopy = useCallback((inv: DBInvoiceRow) => {
    setReprintInvoice(inv);
    setTimeout(() => {
      window.print();
    }, 100);
  }, []);

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

  // Filters for Registry Dashboard
  const [tableSearch, setTableSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"ALL" | "FILLED" | "BLANK">("ALL");
  const [modeFilter, setModeFilter] = useState<"ALL" | "BULK" | "SINGLE">("ALL");
  const [classFilter, setClassFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "CANCELLED">("ALL");
  const [currentPage, setCurrentPage] = useState(1);

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
      setActiveTab("verify");
    }
  }, [initialInvoiceNumber, isOpen]);

  // Load stats and invoices list whenever modal opens or tab changes
  useEffect(() => {
    if (isOpen) {
      loadRegistryData();
    }
  }, [isOpen, activeTab]);

  // Auto-refresh every 30s while modal is open
  useEffect(() => {
    if (!isOpen) return;
    const interval = setInterval(() => {
      loadRegistryData();
    }, 30000);
    return () => clearInterval(interval);
  }, [isOpen]);

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [tableSearch, typeFilter, modeFilter, classFilter, statusFilter]);

  function computeTeacherSettlements(invoices: DBInvoiceRow[]): {
    teachers: string[];
    summaries: TeacherSettlementSummary[];
  } {
    const map: Record<string, TeacherSettlementSummary> = {};

    invoices.forEach((inv) => {
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
        const listRes = await fetch("/api/invoices?limit=200");
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
        const totalActive = list.filter(
          (i) => (i as any).invoice_status === "active" || (!i.is_blank && !(i as any).invoice_status)
        ).length;
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

      // 3. Load teacher assignment data
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
        const computed = computeTeacherSettlements(list);
        setSettlementTeachers(computed.teachers);
        setSettlementSummaries(computed.summaries);
      }
    } finally {
      setIsLoadingList(false);
    }
  }

  // Handle Verify Lookup
  function handleVerify(targetNum?: string) {
    const numToSearch = (targetNum || searchNumber).trim().toUpperCase();
    if (!numToSearch) return;

    startTransition(async () => {
      // 1. Try local cache first for instant response
      const localInvoices = getLocalCachedInvoices();
      const localMatch =
        invoicesList.find((i) => i.invoice_number.toUpperCase() === numToSearch) ||
        localInvoices.find((i) => i.invoice_number.toUpperCase() === numToSearch);

      if (localMatch) {
        setVerificationResult({
          checked: true,
          valid: true,
          invoice: localMatch,
        });
        return;
      }

      // 2. Fetch from backend API
      try {
        const res = await fetch(`/api/invoices/verify?number=${encodeURIComponent(numToSearch)}`);
        const data = await res.json();

        if (res.ok && data.valid && data.data) {
          setVerificationResult({
            checked: true,
            valid: true,
            invoice: data.data,
          });
        } else {
          setVerificationResult({
            checked: true,
            valid: false,
            invoice: null,
            message: data.message || "Invoice number not found in school registry.",
          });
        }
      } catch (err) {
        setVerificationResult({
          checked: true,
          valid: false,
          invoice: null,
          message: "Could not connect to database verification server.",
        });
      }
    });
  }

  // Dynamic class counts for Class Distribution chips
  const classCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    invoicesList.forEach((inv) => {
      const cls = (inv.student_class || "").trim().toUpperCase();
      if (cls) {
        counts[cls] = (counts[cls] || 0) + 1;
      }
    });
    return counts;
  }, [invoicesList]);

  // Filtered list for Registry Dashboard
  const filteredList = useMemo(() => {
    return invoicesList.filter((inv) => {
      if (typeFilter === "FILLED" && inv.is_blank) return false;
      if (typeFilter === "BLANK" && !inv.is_blank) return false;

      if (modeFilter === "BULK" && inv.generator_mode !== "bulk") return false;
      if (modeFilter === "SINGLE" && inv.generator_mode === "bulk") return false;

      if (classFilter !== "ALL" && inv.student_class !== classFilter) return false;

      const st = (inv as any).invoice_status;
      if (statusFilter === "ACTIVE" && st === "cancelled") return false;
      if (statusFilter === "CANCELLED" && st !== "cancelled") return false;

      if (tableSearch.trim()) {
        const q = tableSearch.toLowerCase().trim();
        const matchNum = inv.invoice_number.toLowerCase().includes(q);
        const matchName = (inv.student_name || "").toLowerCase().includes(q);
        const matchId = (inv.student_id || "").toLowerCase().includes(q);
        const matchGuardian = (inv.guardian_name || "").toLowerCase().includes(q);
        const matchTeacher = (inv.assigned_to || "").toLowerCase().includes(q);
        const matchRoll = (inv.roll_no || "").toLowerCase().includes(q);
        if (!matchNum && !matchName && !matchId && !matchGuardian && !matchTeacher && !matchRoll) {
          return false;
        }
      }

      return true;
    });
  }, [invoicesList, typeFilter, modeFilter, classFilter, statusFilter, tableSearch]);

  // Pagination for ledger
  const totalPages = Math.max(1, Math.ceil(filteredList.length / PAGE_SIZE));
  const paginatedList = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredList.slice(start, start + PAGE_SIZE);
  }, [filteredList, currentPage]);

  // Copy invoice number helper
  const handleCopyInvoice = useCallback((num: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(num);
      showToast({
        type: "success",
        title: "Copied",
        description: `Invoice ${num} copied to clipboard.`,
      });
    }
  }, []);

  // Quick verify from dashboard table
  const handleDirectVerify = useCallback((num: string) => {
    setActiveTab("verify");
    setSearchNumber(num);
    handleVerify(num);
  }, []);

  // Export filtered invoices to CSV
  function handleExportCSV() {
    if (filteredList.length === 0) {
      showToast({ type: "info", title: "No Data", description: "No invoices to export." });
      return;
    }

    const headers = [
      "Invoice Number",
      "Session",
      "Class",
      "Section",
      "Roll No",
      "Student Name",
      "Student ID",
      "PEN Number",
      "Guardian Name",
      "Contact",
      "Total Amount (INR)",
      "Payment Mode",
      "Status",
      "Slip Type",
      "Mode",
      "Assigned To",
      "Issue Date",
      "Issue Time",
    ];

    const rows = filteredList.map((inv) => [
      `"${inv.invoice_number}"`,
      `"${inv.academic_session || ""}"`,
      `"${inv.student_class || ""}"`,
      `"${inv.section || ""}"`,
      `"${inv.roll_no || ""}"`,
      `"${(inv.student_name || "").replace(/"/g, '""')}"`,
      `"${inv.student_id || ""}"`,
      `"${inv.pen_number || ""}"`,
      `"${(inv.guardian_name || "").replace(/"/g, '""')}"`,
      `"${inv.contact_number || ""}"`,
      Number(inv.total_amount) || 0,
      `"${inv.payment_mode || "Cash"}"`,
      `"${(inv as any).invoice_status || "active"}"`,
      inv.is_blank ? "Blank Slip" : "Pre-Filled",
      inv.generator_mode === "bulk" ? "Batch" : "Single",
      `"${(inv.assigned_to || "").replace(/"/g, '""')}"`,
      `"${inv.issue_date || ""}"`,
      `"${inv.issue_time || ""}"`,
    ]);

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `school_invoices_registry_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showToast({
      type: "success",
      title: "Export Completed",
      description: `Exported ${filteredList.length} invoice records to CSV.`,
    });
  }

  // Load teacher's invoices when selection changes
  const loadTeacherInvoices = useCallback(
    async (teacher: string) => {
      if (!teacher) {
        setTeacherInvoices([]);
        setSettlementDecisions({});
        return;
      }
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

        if (invs.length === 0) {
          const source = invoicesList.length > 0 ? invoicesList : getLocalCachedInvoices();
          if (teacher === "Unassigned Blank Slips") {
            invs = source.filter((i) => i.is_blank && !i.assigned_to);
          } else {
            invs = source.filter((i) => i.assigned_to?.trim().toLowerCase() === teacher.trim().toLowerCase());
          }
        }

        setTeacherInvoices(invs);

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
    },
    [invoicesList]
  );

  const settlementSummary = useMemo(() => {
    const used = Object.values(settlementDecisions).filter((d) => d.status === "active");
    const cancelled = Object.values(settlementDecisions).filter((d) => d.status === "cancelled");
    const pending = Object.values(settlementDecisions).filter((d) => d.status === "pending");
    const netAmount = used.reduce((sum, d) => sum + d.amount, 0);
    return {
      usedCount: used.length,
      cancelledCount: cancelled.length,
      pendingCount: pending.length,
      netAmount,
    };
  }, [settlementDecisions]);

  async function handleSubmitSettlement() {
    const pending = Object.values(settlementDecisions).some((d) => d.status === "pending");
    if (pending) {
      showToast({
        type: "error",
        title: "Unsettled Invoices",
        description: "Please mark all invoices as Used or Cancelled before submitting.",
      });
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
      showToast({
        type: "error",
        title: "Settlement Error",
        description: err?.message || "Failed to submit settlement",
      });
    } finally {
      setIsSubmittingSettlement(false);
    }
  }

  // Filter count active check
  const isFiltered =
    Boolean(tableSearch.trim()) ||
    typeFilter !== "ALL" ||
    modeFilter !== "ALL" ||
    classFilter !== "ALL" ||
    statusFilter !== "ALL";

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      {/* 
        FIXED PARTICULAR SIZE CONTAINER:
        Modal retains the exact same dimensions regardless of tab or search state.
        Never grows or shrinks abruptly.
      */}
      <DialogContent className="w-[96vw] max-w-5xl h-[88vh] max-h-[820px] min-h-[580px] p-0 flex flex-col gap-0 overflow-hidden rounded-3xl border border-border/80 shadow-2xl bg-background">
        {/* FIXED MODAL HEADER */}
        <DialogHeader className="p-4 sm:px-6 sm:py-4 border-b border-border/70 shrink-0 bg-muted/20 space-y-3 pr-12">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center ring-1 ring-primary/20 shrink-0 shadow-2xs">
                <LayoutDashboard className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
                  <span>Invoice Registry &amp; Statistics</span>
                  <Badge variant="outline" className="text-[10px] font-mono border-primary/30 text-primary bg-primary/5">
                    Live System
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Comprehensive audit ledger, real-time fee collection, blank slip tracking, and verification.
                </DialogDescription>
              </div>
            </div>

            {/* Refresh Live Data */}
            <Button
              variant="outline"
              size="sm"
              onClick={loadRegistryData}
              disabled={isLoadingList}
              className="h-8 text-xs font-semibold gap-1.5 cursor-pointer rounded-xl self-start sm:self-auto shrink-0 border-border/80 hover:bg-muted shadow-2xs"
            >
              <RefreshCw className={cn("h-3.5 w-3.5 text-primary", isLoadingList && "animate-spin")} />
              <span>{isLoadingList ? "Syncing..." : "Refresh"}</span>
            </Button>
          </div>

          {/* TAB SWITCHER: Registry & Statistics FIRST, then Verify Invoice, then Teacher Settlement */}
          <div className="flex items-center gap-2 overflow-x-auto pb-0.5">
            <div className="flex items-center rounded-xl bg-muted/70 p-1 border border-border/80 text-xs font-bold shrink-0 shadow-2xs">
              {/* TAB 1: REGISTRY & STATISTICS (FIRST) */}
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
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-primary/10 text-primary font-mono font-bold">
                    {stats.totalInvoices}
                  </span>
                )}
              </button>

              {/* TAB 2: VERIFY INVOICE */}
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

              {/* TAB 3: TEACHER SETTLEMENT */}
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

        {/* SCROLLABLE MODAL BODY - STAYS WITHIN FIXED CONTAINER */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-5">
          {/* ========================================================================= */}
          {/* TAB 1: STANDARD INVOICE DASHBOARD & REGISTRY LEDGER (DEFAULT & FIRST)    */}
          {/* ========================================================================= */}
          {activeTab === "analytics" && (
            <div className="space-y-4">
              {/* TOP EXECUTIVE KPI METRICS */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {/* 1. Total Generated Receipts */}
                <div className="p-3.5 rounded-2xl border border-border/80 bg-card space-y-1.5 shadow-2xs relative overflow-hidden">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-muted-foreground">Total Invoices</span>
                    <div className="h-7 w-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                      <Receipt className="h-4 w-4" />
                    </div>
                  </div>
                  <p className="text-2xl font-bold font-mono text-foreground">
                    {stats?.totalInvoices || 0}
                  </p>
                  <div className="flex items-center gap-1.5 text-[10.5px] text-muted-foreground font-medium">
                    <span className="text-emerald-600 font-semibold">{stats?.totalActive || 0} active</span>
                    <span>&bull;</span>
                    <span className="text-rose-600 font-semibold">{stats?.totalCancelled || 0} void</span>
                  </div>
                </div>

                {/* 2. Total Revenue Collection */}
                <div className="p-3.5 rounded-2xl border border-border/80 bg-card space-y-1.5 shadow-2xs relative overflow-hidden">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-muted-foreground">Total Fee Collection</span>
                    <div className="h-7 w-7 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                      <IndianRupee className="h-4 w-4" />
                    </div>
                  </div>
                  <p className="text-xl sm:text-2xl font-bold font-mono text-emerald-700 dark:text-emerald-400 truncate">
                    ₹{(stats?.totalAmount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </p>
                  <div className="text-[10px] text-muted-foreground truncate">
                    {stats && stats.totalInvoices > 0 ? (
                      <span>
                        Avg: ₹{Math.round((stats.totalAmount || 0) / (stats.totalActive || 1))} / invoice
                      </span>
                    ) : (
                      "All recorded receipts"
                    )}
                  </div>
                </div>

                {/* 3. Filled vs Blank Slips Inventory */}
                <div className="p-3.5 rounded-2xl border border-border/80 bg-card space-y-1.5 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-muted-foreground">Filled vs Blank</span>
                    <div className="h-7 w-7 rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center">
                      <UserCheck className="h-4 w-4" />
                    </div>
                  </div>
                  <div className="flex items-baseline gap-1.5 text-sm font-bold">
                    <span className="text-teal-700 dark:text-teal-400 font-mono text-lg">
                      {stats?.totalFilled || 0}
                    </span>
                    <span className="text-muted-foreground text-[11px] font-normal">roster</span>
                    <span className="text-muted-foreground">&bull;</span>
                    <span className="text-amber-700 dark:text-amber-400 font-mono text-lg">
                      {stats?.totalBlank || 0}
                    </span>
                    <span className="text-muted-foreground text-[11px] font-normal">blank</span>
                  </div>
                  {/* Progress Ratio Bar */}
                  <div className="w-full bg-muted/80 h-1.5 rounded-full overflow-hidden flex">
                    <div
                      style={{
                        width: `${
                          stats && stats.totalInvoices > 0 ? (stats.totalFilled / stats.totalInvoices) * 100 : 50
                        }%`,
                      }}
                      className="bg-teal-500 h-full transition-all"
                      title="Pre-Filled Invoices"
                    />
                    <div
                      style={{
                        width: `${
                          stats && stats.totalInvoices > 0 ? (stats.totalBlank / stats.totalInvoices) * 100 : 50
                        }%`,
                      }}
                      className="bg-amber-500 h-full transition-all"
                      title="Blank Slips"
                    />
                  </div>
                </div>

                {/* 4. Generation Mode (Batch vs Single) */}
                <div className="p-3.5 rounded-2xl border border-border/80 bg-card space-y-1.5 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-muted-foreground">Mode Breakdown</span>
                    <div className="h-7 w-7 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                      <Layers className="h-4 w-4" />
                    </div>
                  </div>
                  <div className="flex items-baseline gap-1.5 text-sm font-bold">
                    <span className="text-blue-700 dark:text-blue-400 font-mono text-lg">
                      {stats?.totalBulk || 0}
                    </span>
                    <span className="text-muted-foreground text-[11px] font-normal">batch</span>
                    <span className="text-muted-foreground">&bull;</span>
                    <span className="text-foreground font-mono text-lg">{stats?.totalSingle || 0}</span>
                    <span className="text-muted-foreground text-[11px] font-normal">single</span>
                  </div>
                  <div className="text-[10px] text-muted-foreground truncate">
                    {stats && stats.totalInvoices > 0
                      ? `${Math.round(((stats.totalBulk || 0) / stats.totalInvoices) * 100)}% printed in batch`
                      : "Batch generator mode"}
                  </div>
                </div>
              </div>

              {/* CLASS DISTRIBUTION QUICK SELECTOR PILLS */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-muted-foreground flex items-center gap-1.5">
                    <SlidersHorizontal className="h-3 w-3" />
                    Filter by Class Distribution:
                  </span>
                  {classFilter !== "ALL" && (
                    <button
                      type="button"
                      onClick={() => setClassFilter("ALL")}
                      className="text-[10.5px] text-primary hover:underline font-semibold cursor-pointer"
                    >
                      Reset Class
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                  {CLASS_LIST.map((cls) => {
                    const count = cls === "ALL" ? invoicesList.length : classCounts[cls] || 0;
                    const isSelected = classFilter === cls;
                    return (
                      <button
                        key={cls}
                        type="button"
                        onClick={() => setClassFilter(cls)}
                        className={cn(
                          "px-2.5 py-1 rounded-xl font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1.5 border text-xs",
                          isSelected
                            ? "bg-primary text-primary-foreground border-primary shadow-xs"
                            : "bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground border-border/80"
                        )}
                      >
                        <span>{cls === "ALL" ? "All Classes" : `Class ${cls}`}</span>
                        <span
                          className={cn(
                            "text-[10px] px-1.5 py-0.2 rounded-full font-mono",
                            isSelected ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted/80 text-foreground"
                          )}
                        >
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* TOOLBAR: SEARCH & ADVANCED FILTERS & EXPORT */}
              <div className="p-3 rounded-2xl border border-border/80 bg-muted/20 space-y-2.5">
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                  {/* Search input */}
                  <div className="relative sm:col-span-4">
                    <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      placeholder="Search receipt, student, roll, ID..."
                      value={tableSearch}
                      onChange={(e) => setTableSearch(e.target.value)}
                      className="pl-8 text-xs h-8 rounded-xl bg-background"
                    />
                  </div>

                  {/* Type Filter */}
                  <div className="sm:col-span-3">
                    <CustomSelect
                      value={typeFilter}
                      onChange={(val) => setTypeFilter(val as any)}
                      options={[
                        { label: "All Types", value: "ALL" },
                        { label: "Pre-Filled Roster", value: "FILLED" },
                        { label: "Blank Slips", value: "BLANK" },
                      ]}
                      searchable={false}
                      triggerClassName="h-8 text-xs rounded-xl bg-background"
                    />
                  </div>

                  {/* Mode Filter */}
                  <div className="sm:col-span-2">
                    <CustomSelect
                      value={modeFilter}
                      onChange={(val) => setModeFilter(val as any)}
                      options={[
                        { label: "All Modes", value: "ALL" },
                        { label: "Batch Mode", value: "BULK" },
                        { label: "Single Mode", value: "SINGLE" },
                      ]}
                      searchable={false}
                      triggerClassName="h-8 text-xs rounded-xl bg-background"
                    />
                  </div>

                  {/* Status Filter */}
                  <div className="sm:col-span-3 flex items-center gap-1.5">
                    <CustomSelect
                      value={statusFilter}
                      onChange={(val) => setStatusFilter(val as any)}
                      options={[
                        { label: "All Status", value: "ALL" },
                        { label: "Active Only", value: "ACTIVE" },
                        { label: "Cancelled Only", value: "CANCELLED" },
                      ]}
                      searchable={false}
                      triggerClassName="h-8 text-xs rounded-xl bg-background flex-1"
                    />

                    {/* Export CSV Button */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleExportCSV}
                      disabled={filteredList.length === 0}
                      className="h-8 px-2.5 text-xs font-semibold rounded-xl shrink-0 cursor-pointer border-border/80 hover:bg-background"
                      title="Export filtered records to CSV"
                    >
                      <Download className="h-3.5 w-3.5 mr-1" />
                      <span className="hidden sm:inline">CSV</span>
                    </Button>
                  </div>
                </div>

                {/* Filter Summary & Quick Reset */}
                {isFiltered && (
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-border/60">
                    <span>
                      Filtered: <strong className="text-foreground">{filteredList.length}</strong> of{" "}
                      {invoicesList.length} invoices
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setTableSearch("");
                        setTypeFilter("ALL");
                        setModeFilter("ALL");
                        setClassFilter("ALL");
                        setStatusFilter("ALL");
                      }}
                      className="text-primary hover:underline font-semibold cursor-pointer"
                    >
                      Clear All Filters
                    </button>
                  </div>
                )}
              </div>

              {/* STANDARD INVOICES REGISTRY TABLE */}
              <div className="rounded-2xl border border-border/80 overflow-hidden bg-card shadow-2xs">
                {/* Table Header Row (Desktop) */}
                <div className="hidden sm:grid sm:grid-cols-12 gap-2 px-3 py-2 bg-muted/50 border-b text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                  <div className="col-span-3">Invoice # / Type</div>
                  <div className="col-span-4">Student &amp; Guardian Info</div>
                  <div className="col-span-2">Class &amp; Roll</div>
                  <div className="col-span-2 text-right">Fee Amount</div>
                  <div className="col-span-1 text-center">Action</div>
                </div>

                {/* Table Content List */}
                <div className="divide-y divide-border/60 max-h-[380px] overflow-y-auto text-xs">
                  {filteredList.length === 0 ? (
                    <div className="p-10 text-center text-muted-foreground space-y-2">
                      <div className="h-12 w-12 rounded-2xl bg-muted/60 flex items-center justify-center mx-auto text-muted-foreground/60 border border-border/60">
                        <FileText className="h-6 w-6" />
                      </div>
                      <div>
                        <p className="font-semibold text-foreground text-sm">No matching invoices found in registry</p>
                        <p className="text-xs text-muted-foreground mt-0.5 max-w-sm mx-auto">
                          {invoicesList.length > 0
                            ? "Try adjusting your search keywords or clearing active filters."
                            : "Generated and printed invoices will automatically populate this central audit ledger."}
                        </p>
                      </div>
                      {isFiltered && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setTableSearch("");
                            setTypeFilter("ALL");
                            setModeFilter("ALL");
                            setClassFilter("ALL");
                            setStatusFilter("ALL");
                          }}
                          className="h-8 text-xs mt-2 rounded-xl cursor-pointer"
                        >
                          Clear All Filters
                        </Button>
                      )}
                    </div>
                  ) : (
                    paginatedList.map((inv) => {
                      const isCancelled = (inv as any).invoice_status === "cancelled";
                      return (
                        <div
                          key={inv.id || inv.invoice_number}
                          className={cn(
                            "p-3 sm:px-3 sm:py-2.5 sm:grid sm:grid-cols-12 gap-2 items-center hover:bg-muted/40 transition-colors",
                            isCancelled && "opacity-60 bg-rose-500/5"
                          )}
                        >
                          {/* Col 1: Invoice # & Type */}
                          <div className="col-span-3 space-y-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-mono font-bold text-foreground text-xs select-all">
                                {inv.invoice_number}
                              </span>
                              <button
                                type="button"
                                title="Copy invoice number"
                                onClick={(e) => handleCopyInvoice(inv.invoice_number, e)}
                                className="text-muted-foreground hover:text-foreground cursor-pointer p-0.5 rounded hover:bg-muted"
                              >
                                <Copy className="h-3 w-3" />
                              </button>
                            </div>
                            <div className="flex items-center gap-1 flex-wrap">
                              <Badge
                                variant="outline"
                                className={cn(
                                  "text-[9px] px-1.5 py-0 rounded-md font-semibold",
                                  inv.is_blank
                                    ? "border-amber-400 text-amber-700 bg-amber-50 dark:bg-amber-950/20"
                                    : "border-teal-400 text-teal-700 bg-teal-50 dark:bg-teal-950/20"
                                )}
                              >
                                {inv.is_blank ? "Blank Slip" : "Pre-Filled"}
                              </Badge>
                              <span className="text-[9.5px] text-muted-foreground font-mono">
                                {inv.generator_mode === "bulk" ? "Batch" : "Single"}
                              </span>
                              {isCancelled && (
                                <Badge className="text-[9px] px-1 py-0 bg-rose-500/10 text-rose-600 border border-rose-400/30">
                                  Cancelled
                                </Badge>
                              )}
                            </div>
                          </div>

                          {/* Col 2: Student & Guardian Info */}
                          <div className="col-span-4 min-w-0">
                            <p className="font-semibold text-foreground truncate">
                              {inv.student_name || (
                                <span className="text-muted-foreground italic font-normal">
                                  [Blank Student Write-in]
                                </span>
                              )}
                            </p>
                            <div className="text-[10.5px] text-muted-foreground flex items-center gap-1 truncate">
                              {inv.guardian_name ? (
                                <span>G: {inv.guardian_name}</span>
                              ) : inv.assigned_to ? (
                                <span className="text-amber-600 dark:text-amber-400">
                                  Teacher: {inv.assigned_to}
                                </span>
                              ) : null}
                              {inv.student_id && (
                                <span className="font-mono">({inv.student_id})</span>
                              )}
                            </div>
                          </div>

                          {/* Col 3: Class & Roll & Issue Date */}
                          <div className="col-span-2">
                            <p className="font-mono font-bold text-foreground">
                              Class {inv.student_class}
                              {inv.section ? `-${inv.section}` : ""}
                              {inv.roll_no ? ` • Roll: ${inv.roll_no}` : ""}
                            </p>
                            <p className="text-[10px] text-muted-foreground font-mono">
                              {inv.issue_date} {inv.issue_time || ""}
                            </p>
                          </div>

                          {/* Col 4: Amount */}
                          <div className="col-span-2 text-left sm:text-right mt-1 sm:mt-0">
                            <span className="font-mono font-bold text-sm text-foreground">
                              ₹{Number(inv.total_amount).toFixed(2)}
                            </span>
                            <span className="block text-[10px] text-muted-foreground">
                              {inv.payment_mode || "Cash"}
                            </span>
                          </div>

                          {/* Col 5: Actions */}
                          <div className="col-span-1 flex items-center justify-end sm:justify-center gap-1 mt-2 sm:mt-0">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDirectVerify(inv.invoice_number)}
                              className="h-7 text-[11px] px-2 font-semibold text-primary hover:text-primary hover:bg-primary/10 rounded-lg cursor-pointer"
                              title="Verify full particulars and fee heads"
                            >
                              <span>Verify</span>
                              <ChevronRight className="h-3 w-3 ml-0.5" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handlePrintStudentCopy(inv);
                              }}
                              className="h-7 w-7 p-0 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer shrink-0 border-border/70"
                              title="1-Click Reprint Student Copy"
                            >
                              <Printer className="h-3.5 w-3.5 text-emerald-600" />
                            </Button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* PAGINATION FOOTER */}
                {filteredList.length > 0 && (
                  <div className="p-2.5 px-4 bg-muted/30 border-t flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      Showing {(currentPage - 1) * PAGE_SIZE + 1}–
                      {Math.min(currentPage * PAGE_SIZE, filteredList.length)} of {filteredList.length} records
                    </span>
                    <div className="flex items-center gap-1.5">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={currentPage <= 1}
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        className="h-7 w-7 p-0 rounded-lg cursor-pointer"
                      >
                        <ChevronLeft className="h-3.5 w-3.5" />
                      </Button>
                      <span className="text-[11px] font-mono font-bold px-2">
                        {currentPage} / {totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={currentPage >= totalPages}
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        className="h-7 w-7 p-0 rounded-lg cursor-pointer"
                      >
                        <ChevronRight className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 2: VERIFY INVOICE                                                     */}
          {/* ========================================================================= */}
          {activeTab === "verify" && (
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
          )}

          {/* ========================================================================= */}
          {/* TAB 3: TEACHER SETTLEMENT                                                  */}
          {/* ========================================================================= */}
          {activeTab === "settlement" && (
            <div className="space-y-4">
              {/* Teacher Selector */}
              <div className="p-4 rounded-2xl border border-border/80 bg-card space-y-3">
                <div className="flex items-center gap-2">
                  <GraduationCap className="h-4 w-4 text-amber-600" />
                  <h3 className="text-xs font-bold text-foreground">Select Teacher to Settle Blank Slips</h3>
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
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
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
        </div>

        {/* Scoped print CSS for 1-Click Student Copy Reprint */}
        <style jsx global>{`
          @media print {
            body:has(#single-invoice-reprint-portal) > *:not(#single-invoice-reprint-portal) {
              display: none !important;
            }
            body:has(#single-invoice-reprint-portal) {
              background: #ffffff !important;
              color: #000000 !important;
              margin: 0 !important;
              padding: 0 !important;
              width: 100% !important;
              overflow: visible !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            #single-invoice-reprint-portal {
              display: flex !important;
              align-items: center !important;
              justify-content: center !important;
              width: 100vw !important;
              min-height: 100vh !important;
              margin: 0 auto !important;
              padding: 0 !important;
              background: #ffffff !important;
              overflow: visible !important;
            }
            @page {
              size: 210mm 148mm;
              margin: 0;
            }
          }
        `}</style>

        {/* Portal Target in body: Renders only when active for zero DOM clutter */}
        {mounted && (reprintInvoice || verificationResult.invoice) &&
          createPortal(
            <div id="single-invoice-reprint-portal" className="hidden print:flex items-center justify-center">
              <InvoicePrintableView
                data={dbRowToInvoiceData(reprintInvoice || verificationResult.invoice!)}
                copyType="student"
                schoolProfile={schoolProfile}
              />
            </div>,
            document.body
          )}
      </DialogContent>
    </Dialog>
  );
}
