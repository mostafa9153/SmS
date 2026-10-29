"use client";

import { generateInvoiceNumber } from "@/lib/utils/fee-config";
import { recordPrintedInvoices } from "@/lib/utils/invoice-registry";
import { showToast } from "@/components/ui/toast-banner";
import { recordPrintBatch } from "@/lib/utils/print-history";
import type { InvoiceCore } from "./use-invoice-core";
import type { InvoiceBulkData } from "./use-invoice-bulk-data";

export function useInvoicePrint(ctx: InvoiceCore & InvoiceBulkData) {
  const { INVOICE_STORAGE_KEY, PREV_INVOICE_STORAGE_KEY, bulkAssignedTeacher, bulkBlankCount, bulkClass, bulkFillMode, bulkInvoices, bulkSection, bulkStartingNo, classRoster, copyType, currentYear, generatorMode, getLiveFormattedDateTime, invoice, invoiceSeq, selectedStudent, selectedStudentIds, setBulkStartingNo, setInvoice, setInvoiceSeq, setPrevSeq, setSelectedStudentIds, syncSequenceFromDatabase } = ctx;
  function handlePrint() {
    const { dateStr, timeStr } = getLiveFormattedDateTime();
    setInvoice((prev) => ({
      ...prev,
      issueDate: dateStr,
      issueTime: timeStr,
    }));

    // Auto-advance receipt sequence and persist to storage (with Undo & History support)
    if (generatorMode === "single") {
      try {
        localStorage.setItem(PREV_INVOICE_STORAGE_KEY, String(invoiceSeq));
      } catch (e) {
        console.error(e);
      }
      setPrevSeq(invoiceSeq);

      const nextSeq = invoiceSeq + 1;
      try {
        localStorage.setItem(INVOICE_STORAGE_KEY, String(nextSeq));
      } catch (e) {
        console.error(e);
      }
      recordPrintBatch(
        {
          docType: "invoice",
          mode: "single",
          startSerial: invoiceSeq,
          endSerial: invoiceSeq,
          formattedStart: invoice.invoiceNumber,
          formattedEnd: invoice.invoiceNumber,
          count: 1,
          classInfo: selectedStudent ? selectedStudent.name : "Single Fee Slip",
        },
        currentYear
      );
    } else {
      const count =
        bulkFillMode === "blank"
          ? Math.max(1, bulkBlankCount || 1)
          : (selectedStudentIds.length || classRoster.length || 1);

      // Validate: blank slips must have a teacher assigned
      if (bulkFillMode === "blank" && !bulkAssignedTeacher.trim()) {
        showToast({
          type: "error",
          title: "Teacher Name Required",
          description: "Please enter the teacher's name before printing blank slips.",
        });
        return;
      }
      try {
        localStorage.setItem(PREV_INVOICE_STORAGE_KEY, String(bulkStartingNo));
      } catch (e) {
        console.error(e);
      }
      setPrevSeq(bulkStartingNo);

      const nextSeq = bulkStartingNo + count;
      try {
        localStorage.setItem(INVOICE_STORAGE_KEY, String(nextSeq));
      } catch (e) {
        console.error(e);
      }
      recordPrintBatch(
        {
          docType: "invoice",
          mode: "bulk",
          fillMode: bulkFillMode,
          startSerial: bulkStartingNo,
          endSerial: bulkStartingNo + count - 1,
          formattedStart: generateInvoiceNumber(bulkStartingNo),
          formattedEnd: generateInvoiceNumber(bulkStartingNo + count - 1),
          count,
          classInfo: bulkFillMode === "blank" ? "Blank Slips Batch" : `Class ${bulkClass} (${bulkSection})`,
        },
        currentYear
      );
    }

    // Auto-record printed invoices to Supabase database & local cache
    if (generatorMode === "single") {
      recordPrintedInvoices([{ ...invoice, issueDate: dateStr, issueTime: timeStr }], "single", copyType)
        .then((res) => {
          if (res.success) {
            showToast({
              type: "success",
              title: "Recorded to Database",
              description: `Receipt #${invoice.invoiceNumber} recorded in official registry.`,
            });
          }
        })
        .catch((e) => console.error(e));
    } else {
      const teacher = bulkFillMode === "blank" ? bulkAssignedTeacher.trim() : null;
      recordPrintedInvoices(bulkInvoices, "bulk", copyType, teacher)
        .then((res) => {
          if (res.success) {
            showToast({
              type: "success",
              title: "Batch Recorded to Database",
              description: `${res.count} invoices recorded in official registry.`,
            });
          }
        })
        .catch((e) => console.error(e));
    }

    const nextSeqTarget = generatorMode === "single" 
      ? invoiceSeq + 1 
      : bulkStartingNo + (bulkFillMode === "blank" ? Math.max(1, bulkBlankCount || 1) : (selectedStudentIds.length || classRoster.length || 1));

    let hasAdvanced = false;
    const advanceToNext = () => {
      if (hasAdvanced) return;
      hasAdvanced = true;
      window.removeEventListener("afterprint", advanceToNext);
      setInvoiceSeq(nextSeqTarget);
      setBulkStartingNo(nextSeqTarget);
      if (generatorMode === "single") {
        setInvoice((prev) => ({
          ...prev,
          invoiceNumber: generateInvoiceNumber(nextSeqTarget),
        }));
      }
      setTimeout(() => {
        syncSequenceFromDatabase();
      }, 1000);
    };

    window.addEventListener("afterprint", advanceToNext, { once: true });

    setTimeout(() => {
      window.print();
      advanceToNext();
    }, 80);
  }

  // Toggle student selection in bulk mode
  function toggleStudentSelection(id: string) {
    setSelectedStudentIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  }

  function handleSelectAll() {
    setSelectedStudentIds(classRoster.map((s) => s.id));
  }

  function handleDeselectAll() {
    setSelectedStudentIds([]);
  }

  return {
    handleDeselectAll,
    handlePrint,
    handleSelectAll,
    toggleStudentSelection,
  };
}

export type InvoicePrint = ReturnType<typeof useInvoicePrint>;
