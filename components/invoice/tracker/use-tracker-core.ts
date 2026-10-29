"use client";

import { useState, useEffect, useTransition, useCallback } from "react";
import { ApiError, apiFetch } from "@/lib/api/client";
import { DBInvoiceRow, InvoiceStats, TeacherSettlementSummary } from "@/lib/supabase/db-invoices";
import { getLocalCachedInvoices, getLocalStats } from "@/lib/utils/invoice-registry";
import { useSchoolProfile } from "@/lib/hooks/use-school-profile";
import { useAcademicYear } from "@/lib/hooks/use-academic-year";
import { DatePreset } from "@/components/invoice/tracker/helpers";

import type { InvoiceTrackerModalProps } from "./props";

export function useTrackerCore({
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
  const currentSession = useAcademicYear();
  const [pickedSessionFilter, setSessionFilter] = useState<string | null>(null);
  const sessionFilter = pickedSessionFilter ?? currentSession;
  const [typeFilter, setTypeFilter] = useState<"ALL" | "FILLED" | "BLANK">("ALL");
  const [admissionCategoryFilter, setAdmissionCategoryFilter] = useState<
    "ALL" | "NEW_ONLINE" | "NEW_OFFLINE" | "RE_ONLINE" | "RE_OFFLINE"
  >("ALL");
  const [classFilter, setClassFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "CANCELLED">("ALL");
  const [modeFilter, setModeFilter] = useState<string>("ALL");
  const [dateFilterPreset, setDateFilterPreset] = useState<DatePreset>("ALL");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [hasProceeded, setHasProceeded] = useState(Boolean(initialInvoiceNumber));
  const [currentPage, setCurrentPage] = useState(1);
  const [isPrintingLedger, setIsPrintingLedger] = useState(false);

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
      setHasProceeded(true);
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
  }, [
    tableSearch,
    sessionFilter,
    typeFilter,
    admissionCategoryFilter,
    classFilter,
    statusFilter,
    modeFilter,
    dateFilterPreset,
    startDate,
    endDate,
  ]);

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
        const listData = await apiFetch<DBInvoiceRow[]>("/api/invoices?limit=200");
        if (Array.isArray(listData)) {
          list = listData;
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
        const statsData = await apiFetch<{ stats?: InvoiceStats }>("/api/invoices/stats");
        if (statsData.stats && statsData.stats.totalInvoices > 0) {
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
        const taData = await apiFetch<{ teachers?: string[]; summaries?: TeacherSettlementSummary[] }>("/api/invoices/teacher-assignments");
        if (Array.isArray(taData.teachers) && taData.teachers.length > 0) {
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
        const data = await apiFetch<{ valid?: boolean; invoice?: DBInvoiceRow; message?: string }>(
          `/api/invoices/verify?number=${encodeURIComponent(numToSearch)}`
        );

        if (data.valid && data.invoice) {
          setVerificationResult({
            checked: true,
            valid: true,
            invoice: data.invoice,
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
        // The route answers 400 with its own message and 500 with a generic one; anything else means it was unreachable.
        const message =
          err instanceof ApiError
            ? err.status === 400
              ? err.message
              : err.status === 500
                ? "Error verifying invoice"
                : "Invoice number not found in school registry."
            : "Could not connect to database verification server.";
        setVerificationResult({
          checked: true,
          valid: false,
          invoice: null,
          message,
        });
      }
    });
  }


  return {
    activeTab,
    admissionCategoryFilter,
    classFilter,
    computeTeacherSettlements,
    currentPage,
    currentSession,
    dateFilterPreset,
    endDate,
    handlePrintStudentCopy,
    handleVerify,
    hasProceeded,
    initialInvoiceNumber,
    invoicesList,
    isLoadingList,
    isLoadingTeacher,
    isOpen,
    isPending,
    isPrintingLedger,
    isSubmittingSettlement,
    loadRegistryData,
    modeFilter,
    mounted,
    onClose,
    pickedSessionFilter,
    reprintInvoice,
    schoolProfile,
    searchNumber,
    selectedSettlementTeacher,
    sessionFilter,
    setActiveTab,
    setAdmissionCategoryFilter,
    setClassFilter,
    setCurrentPage,
    setDateFilterPreset,
    setEndDate,
    setHasProceeded,
    setInvoicesList,
    setIsLoadingList,
    setIsLoadingTeacher,
    setIsPrintingLedger,
    setIsSubmittingSettlement,
    setModeFilter,
    setMounted,
    setReprintInvoice,
    setSearchNumber,
    setSelectedSettlementTeacher,
    setSessionFilter,
    setSettlementDecisions,
    setSettlementSummaries,
    setSettlementTeachers,
    setStartDate,
    setStats,
    setStatusFilter,
    setTableSearch,
    setTeacherInvoices,
    setTypeFilter,
    setVerificationResult,
    settlementDecisions,
    settlementSummaries,
    settlementTeachers,
    startDate,
    startTransition,
    stats,
    statusFilter,
    tableSearch,
    teacherInvoices,
    typeFilter,
    verificationResult,
  };
}

export type TrackerCoreState = ReturnType<typeof useTrackerCore>;
