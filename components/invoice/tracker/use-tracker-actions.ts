"use client";

import React, { useCallback } from "react";
import { showToast } from "@/components/ui/toast-banner";
import { todayIST } from "@/lib/utils/date";
import type { TrackerCoreState } from "./use-tracker-core";
import type { TrackerDerivedState } from "./use-tracker-derived";

export function useTrackerActions(ctx: TrackerCoreState & TrackerDerivedState) {
  const { filteredList, handleVerify, setActiveTab, setIsPrintingLedger, setSearchNumber } = ctx;
  // Trigger A4 Full Audit Ledger Print
  const handlePrintLedger = useCallback(() => {
    if (filteredList.length === 0) {
      showToast({ type: "info", title: "No Data", description: "No invoice records match filter to print." });
      return;
    }
    setIsPrintingLedger(true);
    setTimeout(() => {
      window.print();
      setTimeout(() => {
        setIsPrintingLedger(false);
      }, 500);
    }, 120);
  }, [filteredList.length]);

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
    link.setAttribute("download", `school_invoices_registry_${todayIST()}.csv`);
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


  return {
    handleCopyInvoice,
    handleDirectVerify,
    handleExportCSV,
    handlePrintLedger,
  };
}

export type TrackerActionsState = ReturnType<typeof useTrackerActions>;
