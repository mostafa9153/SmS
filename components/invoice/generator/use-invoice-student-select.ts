"use client";

import { apiFetch } from "@/lib/api/client";
import { useEffect } from "react";
import { getStudentById } from "@/lib/data/students";
import { Student } from "@/lib/types";
import { getSavedFeeStructure, getFeeCategoryForClass } from "@/lib/utils/fee-config";
import { showToast } from "@/components/ui/toast-banner";
import type { InvoiceCore } from "./use-invoice-core";

export function useInvoiceStudentSelect(ctx: InvoiceCore) {
  const { bulkClass, directStudentData, invoice, setActiveFeeCategory, setBulkClass, setGeneratorMode, setInvoice, setIsLoadingFullStudent, setSelectedStudent, setSingleClass, setSingleSection } = ctx;
  // Load student by query param if provided
  useEffect(() => {
    if (directStudentData) {
      handleSelectStudent(directStudentData);
    }
  }, [directStudentData]);

  // Handle choosing a student in Single Mode (with full student fetch & existing invoice auto-sync)
  async function handleSelectStudent(studentSummary: Student) {
    setIsLoadingFullStudent(true);
    let fullStudent = studentSummary;
    try {
      const fetched = await getStudentById(studentSummary.id);
      if (fetched) {
        fullStudent = fetched;
      }
    } catch (err) {
      console.warn("Could not fetch full student details, using summary:", err);
    } finally {
      setIsLoadingFullStudent(false);
    }

    setSelectedStudent(fullStudent);
    const category = getFeeCategoryForClass(fullStudent.presentClass);
    setActiveFeeCategory(category);
    const defaultFeeItems = getSavedFeeStructure(category);

    if (fullStudent.presentClass) {
      setSingleClass(fullStudent.presentClass.toUpperCase());
    }
    if (fullStudent.presentSection) {
      setSingleSection(fullStudent.presentSection.toUpperCase());
    }

    // 1. Check if an invoice was already generated/registered for this student in DB
    try {
      const studentIdToSearch = fullStudent.schoolId || fullStudent.id;
      const rows = await apiFetch<Record<string, any>[]>(`/api/invoices?studentId=${encodeURIComponent(studentIdToSearch)}`);
      if (Array.isArray(rows) && rows.length > 0) {
        const existingInv = rows[0];
        setInvoice((prev) => ({
          ...prev,
          invoiceNumber: existingInv.invoice_number,
          academicSession: existingInv.academic_session || prev.academicSession,
          studentId: fullStudent.schoolId || fullStudent.id,
          studentName: fullStudent.name,
          studentClass: fullStudent.presentClass,
          section: fullStudent.presentSection || "A",
          rollNo: String(fullStudent.presentRoll || "01"),
          guardianName: fullStudent.guardianName || fullStudent.fatherName || "",
          contactNumber: fullStudent.studentContact || fullStudent.altMobile || "",
          penNumber: fullStudent.pen || "",
          feeItems: Array.isArray(existingInv.fee_items) && existingInv.fee_items.length > 0
            ? existingInv.fee_items
            : defaultFeeItems,
          paymentMode: existingInv.payment_mode || "Cash",
          paymentStatus: existingInv.payment_status || "Paid",
          remarks: existingInv.remarks || prev.remarks,
        }));
        showToast({
          type: "success",
          title: "Registered Invoice Loaded",
          description: `Loaded ${fullStudent.name} with registered Invoice #${existingInv.invoice_number}`,
        });
        return;
      }
    } catch (e) {
      console.warn("Could not lookup student invoice:", e);
    }

    // 2. Default fresh invoice for student
    setInvoice((prev) => ({
      ...prev,
      studentId: fullStudent.schoolId || fullStudent.id,
      studentName: fullStudent.name,
      studentClass: fullStudent.presentClass,
      section: fullStudent.presentSection || "A",
      rollNo: String(fullStudent.presentRoll || "01"),
      guardianName: fullStudent.guardianName || fullStudent.fatherName || "",
      contactNumber: fullStudent.studentContact || fullStudent.altMobile || "",
      penNumber: fullStudent.pen || "",
      feeItems: defaultFeeItems,
    }));
    showToast({
      type: "success",
      title: "Student Loaded",
      description: `Loaded ${fullStudent.name} (${fullStudent.presentClass}-${fullStudent.presentSection || "A"})`,
    });
  }

  function updateInvoiceClass(newClass: string) {
    const category = getFeeCategoryForClass(newClass);
    setActiveFeeCategory(category);
    setInvoice((prev) => ({
      ...prev,
      studentClass: newClass,
      feeItems: getSavedFeeStructure(category),
    }));
  }

  function handleBulkClassChange(newClass: string) {
    setBulkClass(newClass);
    const category = getFeeCategoryForClass(newClass);
    setActiveFeeCategory(category);
    setInvoice((prev) => ({
      ...prev,
      feeItems: getSavedFeeStructure(category),
    }));
  }

  function handleModeChange(mode: "single" | "bulk") {
    setGeneratorMode(mode);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      if (mode === "single") {
        url.searchParams.delete("mode");
      } else {
        url.searchParams.set("mode", mode);
      }
      window.history.replaceState(null, "", url.toString());
    }
    const targetClass = mode === "bulk" ? bulkClass : invoice.studentClass;
    const category = getFeeCategoryForClass(targetClass);
    setActiveFeeCategory(category);
    setInvoice((prev) => ({
      ...prev,
      feeItems: getSavedFeeStructure(category),
    }));
  }


  return {
    handleBulkClassChange,
    handleModeChange,
    handleSelectStudent,
    updateInvoiceClass,
  };
}

export type InvoiceStudentSelect = ReturnType<typeof useInvoiceStudentSelect>;
