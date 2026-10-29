"use client";

import { useMemo } from "react";
import { currentYearIST } from "@/lib/utils/academic-year";
import { sessionYears } from "@/lib/utils/academic-year";
import { getInvoiceCategoryAndMode, isDateInRange } from "@/components/invoice/tracker/helpers";
import { CLASS_LIST, PAGE_SIZE } from "@/components/invoice/tracker/constants";
import type { TrackerCoreState } from "./use-tracker-core";

export function useTrackerDerived(ctx: TrackerCoreState) {
  const { admissionCategoryFilter, classFilter, currentPage, currentSession, dateFilterPreset, endDate, invoicesList, modeFilter, sessionFilter, startDate, stats, statusFilter, tableSearch, typeFilter } = ctx;
  // Options for Academic Session / Year Dropdown
  const sessionOptions = useMemo(() => {
    const set = new Set<string>(sessionYears(currentSession, 3));
    invoicesList.forEach((inv) => {
      if (inv.academic_session?.trim()) {
        set.add(inv.academic_session.trim());
      }
    });
    const sorted = Array.from(set).sort((a, b) => b.localeCompare(a));
    return [
      { label: "All Sessions", value: "ALL" },
      ...sorted.map((s) => ({
        label: s === currentSession ? `${s} (Current)` : `Session ${s}`,
        value: s,
      })),
    ];
  }, [invoicesList, currentSession]);

  // Dynamic stats calculation based on selected Academic Session
  const displayedStats = useMemo(() => {
    const pool =
      sessionFilter === "ALL"
        ? invoicesList
        : invoicesList.filter((inv) => (inv.academic_session || String(currentYearIST())).trim() === sessionFilter);

    if (pool.length === 0 && stats && sessionFilter === "ALL") {
      return stats;
    }

    const totalFilled = pool.filter((i) => !i.is_blank).length;
    const totalBlank = pool.filter((i) => i.is_blank).length;
    const totalBulk = pool.filter((i) => i.generator_mode === "bulk").length;
    const totalSingle = pool.filter((i) => i.generator_mode !== "bulk").length;
    const totalCancelled = pool.filter((i) => (i as any).invoice_status === "cancelled").length;
    const totalActive = pool.filter(
      (i) => (i as any).invoice_status === "active" || (!i.is_blank && !(i as any).invoice_status)
    ).length;
    const totalAmount = pool.reduce(
      (sum, i) => ((i as any).invoice_status !== "cancelled" ? sum + (Number(i.total_amount) || 0) : sum),
      0
    );

    return {
      totalInvoices: pool.length,
      totalFilled,
      totalBlank,
      totalActive,
      totalCancelled,
      totalBulk,
      totalSingle,
      totalAmount,
      byClass: {},
    };
  }, [invoicesList, stats, sessionFilter]);

  // Dynamic class counts for Class Distribution within selected session
  const classCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    const pool =
      sessionFilter === "ALL"
        ? invoicesList
        : invoicesList.filter((inv) => (inv.academic_session || String(currentYearIST())).trim() === sessionFilter);

    pool.forEach((inv) => {
      const cls = (inv.student_class || "").trim().toUpperCase();
      if (cls) {
        counts[cls] = (counts[cls] || 0) + 1;
      }
    });
    return counts;
  }, [invoicesList, sessionFilter]);

  // Options for Class Select Dropdown
  const classSelectOptions = useMemo(() => {
    const poolLength =
      sessionFilter === "ALL"
        ? invoicesList.length
        : invoicesList.filter((inv) => (inv.academic_session || String(currentYearIST())).trim() === sessionFilter).length;

    return [
      { label: `All Classes (${poolLength})`, value: "ALL" },
      ...CLASS_LIST.filter((cls) => cls !== "ALL").map((cls) => {
        const count = classCounts[cls] || 0;
        return { label: `Class ${cls} (${count})`, value: cls };
      }),
    ];
  }, [invoicesList, sessionFilter, classCounts]);

  // Options for Admission Category & Mode Select Dropdown
  const admissionCategoryOptions = useMemo(() => {
    return [
      { label: "All Categories", value: "ALL" },
      { label: "New-Ad. Online", value: "NEW_ONLINE" },
      { label: "New-Ad. Offline", value: "NEW_OFFLINE" },
      { label: "Re-Ad. Online", value: "RE_ONLINE" },
      { label: "Re-Ad. Offline", value: "RE_OFFLINE" },
    ];
  }, []);

  // Options for Date Preset Select Dropdown
  const datePresetOptions = useMemo(() => {
    return [
      { label: "All Dates", value: "ALL" },
      { label: "Today", value: "TODAY" },
      { label: "Yesterday", value: "YESTERDAY" },
      { label: "Last 7 Days", value: "LAST_7_DAYS" },
      { label: "This Month", value: "THIS_MONTH" },
      { label: "Custom Range...", value: "CUSTOM" },
    ];
  }, []);

  // Filtered list for Registry Dashboard
  const filteredList = useMemo(() => {
    return invoicesList.filter((inv) => {
      if (sessionFilter !== "ALL" && (inv.academic_session || String(currentYearIST())).trim() !== sessionFilter) return false;

      if (typeFilter === "FILLED" && inv.is_blank) return false;
      if (typeFilter === "BLANK" && !inv.is_blank) return false;

      if (classFilter !== "ALL" && (inv.student_class || "").trim().toUpperCase() !== classFilter) return false;

      if (admissionCategoryFilter !== "ALL") {
        const cat = getInvoiceCategoryAndMode(inv);
        if (cat.key !== admissionCategoryFilter) return false;
      }

      if (modeFilter !== "ALL" && (inv.payment_mode || "Cash") !== modeFilter) return false;

      const st = (inv as any).invoice_status;
      if (statusFilter === "ACTIVE" && st === "cancelled") return false;
      if (statusFilter === "CANCELLED" && st !== "cancelled") return false;

      if (!isDateInRange(inv, dateFilterPreset, startDate, endDate)) return false;

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
  }, [
    invoicesList,
    sessionFilter,
    typeFilter,
    classFilter,
    admissionCategoryFilter,
    modeFilter,
    statusFilter,
    dateFilterPreset,
    startDate,
    endDate,
    tableSearch,
  ]);

  // Pagination for ledger
  const totalPages = Math.max(1, Math.ceil(filteredList.length / PAGE_SIZE));
  const paginatedList = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredList.slice(start, start + PAGE_SIZE);
  }, [filteredList, currentPage]);


  return {
    admissionCategoryOptions,
    classCounts,
    classSelectOptions,
    datePresetOptions,
    displayedStats,
    filteredList,
    paginatedList,
    sessionOptions,
    totalPages,
  };
}

export type TrackerDerivedState = ReturnType<typeof useTrackerDerived>;
