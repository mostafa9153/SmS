"use client";

import { useEffect, useMemo } from "react";
import { type InvoiceData } from "@/lib/utils/fee-config";
import { EMPTY_STUDENTS_ARRAY } from "@/components/invoice/generator/constants";
import type { InvoiceCore } from "./use-invoice-core";

export function useInvoiceBulkData(ctx: InvoiceCore) {
  const { bulkBlankCount, bulkClass, bulkFillMode, bulkPaymentMode, bulkPaymentStatus, bulkReceiptPrefix, bulkRosterSearch, bulkSection, bulkSession, bulkStartingNo, bulkStudents, copyType, currentA4PageIndex, currentPreviewIndex, directStudentData, generatorMode, getLiveFormattedDateTime, invoice, searchResults, selectedStudentIds, setCurrentPreviewIndex, setSelectedStudentIds, studentSearch } = ctx;
  const filteredStudents = useMemo(() => {
    if (directStudentData && !studentSearch) {
      return [directStudentData];
    }
    const raw = searchResults?.data || [];
    if (!studentSearch.trim()) return raw;
    const q = studentSearch.toLowerCase().trim();
    return raw.filter((s) => {
      const matchName = s.name ? s.name.toLowerCase().includes(q) : false;
      const matchSchoolId = s.schoolId ? s.schoolId.toLowerCase().includes(q) : false;
      const matchPen = s.pen ? s.pen.toLowerCase().includes(q) : false;
      const matchRoll = s.presentRoll ? String(s.presentRoll).toLowerCase().includes(q) : false;
      return matchName || matchSchoolId || matchPen || matchRoll;
    });
  }, [directStudentData, searchResults, studentSearch]);

  // Bulk Mode: Filter class roster & sort by Roll No ascending
  const classRoster = useMemo(() => {
    if (!bulkStudents.length) return EMPTY_STUDENTS_ARRAY;
    return [...bulkStudents]
      .sort((a, b) => {
        const rA = parseInt(String(a.presentRoll)) || 9999;
        const rB = parseInt(String(b.presentRoll)) || 9999;
        return rA - rB;
      });
  }, [bulkStudents]);

  // Automatically select all students when class or section changes
  useEffect(() => {
    const nextIds = classRoster.map((s) => s.id);
    setSelectedStudentIds((prev) => {
      if (
        prev.length === nextIds.length &&
        prev.every((id, idx) => id === nextIds[idx])
      ) {
        return prev;
      }
      return nextIds;
    });
    setCurrentPreviewIndex(0);
  }, [classRoster]);

  // Filter roster by local search in bulk mode
  const displayedRoster = useMemo(() => {
    if (!bulkRosterSearch.trim()) return classRoster;
    const q = bulkRosterSearch.toLowerCase().trim();
    return classRoster.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        String(s.presentRoll || "").includes(q) ||
        (s.schoolId && s.schoolId.toLowerCase().includes(q))
    );
  }, [classRoster, bulkRosterSearch]);

  // Bulk Invoices Array (Supports Pre-Filled & Blank Template Mode)
  const bulkInvoices = useMemo<InvoiceData[]>(() => {
    const { dateStr, timeStr } = getLiveFormattedDateTime();

    if (bulkFillMode === "blank") {
      const count = Math.max(1, bulkBlankCount || 1);
      return Array.from({ length: count }).map((_, idx) => {
        const serial = String(bulkStartingNo + idx).padStart(4, "0");
        const invoiceNumber = `${bulkReceiptPrefix}${serial}`;

        return {
          invoiceNumber,
          issueDate: invoice.issueDate || dateStr,
          issueTime: invoice.issueTime || timeStr,
          academicSession: bulkSession,
          studentName: "",
          studentClass: bulkClass,
          section: bulkSection !== "ALL" ? bulkSection : "",
          rollNo: "",
          studentId: "",
          penNumber: "",
          guardianName: "",
          contactNumber: "",
          feeItems: invoice.feeItems,
          paymentMode: bulkPaymentMode,
          paymentStatus: bulkPaymentStatus,
          remarks: "Annual admission fee collected with thanks.",
          isBlankTemplate: true,
          includeDigitalSignature: invoice.includeDigitalSignature ?? true,
        };
      });
    }

    const selected = classRoster.filter((s) => selectedStudentIds.includes(s.id));

    return selected.map((s, idx) => {
      const serial = String(bulkStartingNo + idx).padStart(4, "0");
      const invoiceNumber = `${bulkReceiptPrefix}${serial}`;

      return {
        invoiceNumber,
        issueDate: invoice.issueDate || dateStr,
        issueTime: invoice.issueTime || timeStr,
        academicSession: bulkSession,
        studentName: s.name,
        studentClass: s.presentClass || bulkClass,
        section: s.presentSection || "A",
        rollNo: String(s.presentRoll || idx + 1),
        studentId: s.schoolId || s.id,
        penNumber: s.pen || "",
        guardianName: s.guardianName || s.fatherName || "",
        contactNumber: s.studentContact || s.altMobile || "",
        feeItems: invoice.feeItems,
        paymentMode: bulkPaymentMode,
        paymentStatus: bulkPaymentStatus,
        remarks: "Annual admission fee collected with thanks.",
        includeDigitalSignature: invoice.includeDigitalSignature ?? true,
      };
    });
  }, [
    bulkFillMode,
    bulkBlankCount,
    classRoster,
    selectedStudentIds,
    bulkStartingNo,
    bulkReceiptPrefix,
    invoice.issueDate,
    invoice.issueTime,
    invoice.feeItems,
    invoice.includeDigitalSignature,
    bulkSession,
    bulkClass,
    bulkSection,
    bulkPaymentMode,
    bulkPaymentStatus,
  ]);

  // Active preview invoice for bulk mode (A5 dual preview)
  const activeBulkPreviewInvoice = useMemo(() => {
    if (bulkInvoices.length === 0) return invoice;
    const safeIdx = Math.min(currentPreviewIndex, bulkInvoices.length - 1);
    return bulkInvoices[safeIdx] || invoice;
  }, [bulkInvoices, currentPreviewIndex, invoice]);

  // A4 4-Up Grid calculations for bulk single copy (student or school)
  const isA4FourUp =
    generatorMode === "bulk" &&
    (copyType === "student" || copyType === "school");
  const totalA4Pages = Math.max(1, Math.ceil(bulkInvoices.length / 4));
  const safeA4PageIndex = Math.min(currentA4PageIndex, totalA4Pages - 1);
  const activeA4Chunk = useMemo(() => {
    return bulkInvoices.slice(safeA4PageIndex * 4, safeA4PageIndex * 4 + 4);
  }, [bulkInvoices, safeA4PageIndex]);


  return {
    activeA4Chunk,
    activeBulkPreviewInvoice,
    bulkInvoices,
    classRoster,
    displayedRoster,
    filteredStudents,
    isA4FourUp,
    safeA4PageIndex,
    totalA4Pages,
  };
}

export type InvoiceBulkData = ReturnType<typeof useInvoiceBulkData>;
