"use client";

import React, { useState, useEffect, useMemo, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { getStudents } from "@/lib/data/students";
import type { Student } from "@/lib/types";
import {
  type FeeItem,
  type InvoiceData,
  DEFAULT_FEE_ITEMS,
  getSavedFeeStructure,
  saveFeeStructure,
  calculateFeeTotal,
  generateInvoiceNumber,
} from "@/lib/utils/fee-config";
import {
  InvoicePrintableView,
  InvoicePrintableBatchView,
  InvoicePrintableA4Sheet,
} from "@/components/invoice/invoice-printable-view";
import { InvoiceTrackerModal } from "@/components/invoice/invoice-tracker-modal";
import { recordPrintedInvoices } from "@/lib/utils/invoice-registry";
import { CustomSelect } from "@/components/ui/custom-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { showToast } from "@/components/ui/toast-banner";
import {
  Printer,
  Plus,
  Trash2,
  RotateCcw,
  Save,
  Search,
  FileText,
  ArrowLeft,
  User,
  Users,
  Sliders,
  Eye,
  CheckSquare,
  Square,
  ChevronLeft,
  ChevronRight,
  Receipt,
  ZoomIn,
  ZoomOut,
  Lock,
  Unlock,
  Undo2,
  UserCheck,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSchoolProfile } from "@/lib/utils/school-profile";
import { getDynamicClassList, type DynamicClassItem } from "@/lib/ems/ems-config-loader";
import { PrintHistoryModal } from "@/components/ui/print-history-modal";
import { recordPrintBatch } from "@/lib/utils/print-history";

const STANDARD_CLASSES = ["V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];
const STANDARD_SECTIONS = ["ALL", "A", "B", "C", "D"];

function InvoiceGeneratorContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const studentIdParam = searchParams.get("studentId");
  const modeParam = searchParams.get("mode");
  const classParam = searchParams.get("class");
  const sectionParam = searchParams.get("section");
  const { profile: schoolProfile } = useSchoolProfile();

  // Mode: "single" vs "bulk"
  const [generatorMode, setGeneratorMode] = useState<"single" | "bulk">(
    modeParam === "bulk" ? "bulk" : "single"
  );

  const [copyType, setCopyType] = useState<"both" | "student" | "school">("both");
  const [studentSearch, setStudentSearch] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [autoDateTime, setAutoDateTime] = useState(true);
  const [previewScale, setPreviewScale] = useState<number>(0.75);
  const [isTrackerOpen, setIsTrackerOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  // Bulk mode states
  const [bulkClass, setBulkClass] = useState<string>(classParam?.toUpperCase() || "IX");
  const [bulkSection, setBulkSection] = useState<string>(sectionParam?.toUpperCase() || "ALL");
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [bulkRosterSearch, setBulkRosterSearch] = useState("");
  const [currentPreviewIndex, setCurrentPreviewIndex] = useState(0);
  const [currentA4PageIndex, setCurrentA4PageIndex] = useState(0);
  const [bulkFillMode, setBulkFillMode] = useState<"fill" | "blank">("fill");
  const [bulkBlankCount, setBulkBlankCount] = useState<number>(10);

  const currentYear = new Date().getFullYear();
  const currentSession = `${currentYear} – ${currentYear + 1}`;
  const INVOICE_STORAGE_KEY = `sms_admission_invoice_last_seq_${currentYear}`;
  const PREV_INVOICE_STORAGE_KEY = `sms_admission_invoice_prev_seq_${currentYear}`;

  function getStoredInvoiceSeq(): number {
    if (typeof window === "undefined") return 1;
    try {
      const saved = localStorage.getItem(INVOICE_STORAGE_KEY);
      if (saved) {
        const parsed = parseInt(saved, 10);
        if (!isNaN(parsed) && parsed > 0) return parsed;
      }
    } catch (e) {
      console.error(e);
    }
    return 1;
  }

  function getStoredPrevSeq(): number | null {
    if (typeof window === "undefined") return null;
    try {
      const saved = localStorage.getItem(PREV_INVOICE_STORAGE_KEY);
      if (saved) {
        const parsed = parseInt(saved, 10);
        if (!isNaN(parsed) && parsed >= 1) return parsed;
      }
    } catch (e) {
      console.error(e);
    }
    return null;
  }

  const [invoiceSeq, setInvoiceSeq] = useState<number>(1);
  const [prevSeq, setPrevSeq] = useState<number | null>(null);

  // Field Lock Toggles (Locked by default, click lock icon to unlock)
  const [isBulkPrefixLocked, setIsBulkPrefixLocked] = useState(true);
  const [isBulkStartingNoLocked, setIsBulkStartingNoLocked] = useState(true);
  const [isSingleReceiptLocked, setIsSingleReceiptLocked] = useState(true);

  useEffect(() => {
    const seq = getStoredInvoiceSeq();
    setInvoiceSeq(seq);
    setBulkStartingNo(seq);
    setPrevSeq(getStoredPrevSeq());
  }, []);

  // Undo / Revert back to previous starting serial
  function handleUndoLastPrint() {
    if (prevSeq === null || prevSeq <= 0) return;
    const reverted = prevSeq;
    try {
      localStorage.setItem(INVOICE_STORAGE_KEY, String(reverted));
      localStorage.removeItem(PREV_INVOICE_STORAGE_KEY);
    } catch (e) {
      console.error(e);
    }
    setInvoiceSeq(reverted);
    setBulkStartingNo(reverted);
    setInvoice((prev) => ({
      ...prev,
      invoiceNumber: generateInvoiceNumber(reverted),
    }));
    setPrevSeq(null);
    showToast({
      type: "info",
      title: "Serial Reverted (Undo)",
      description: `Reverted back to Starting Serial #${String(reverted).padStart(4, "0")}`,
    });
  }

  const [bulkReceiptPrefix, setBulkReceiptPrefix] = useState(`MHS/${currentYear}/ADM-`);
  const [bulkStartingNo, setBulkStartingNo] = useState(1);
  const [bulkSession, setBulkSession] = useState(currentSession);
  const [bulkPaymentMode, setBulkPaymentMode] = useState<
    "Cash" | "Online / UPI" | "Bank Transfer" | "Cheque"
  >("Cash");
  const [bulkPaymentStatus, setBulkPaymentStatus] = useState<
    "Paid" | "Partial" | "Due"
  >("Paid");

  // Helper for live formatted Indian Date & Time
  function getLiveFormattedDateTime() {
    const today = new Date();
    const dateStr = today.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }); // "02/09/2026"
    const timeStr = today.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }); // "06:45 PM"
    return { dateStr, timeStr };
  }

  // Invoice State (Single Mode)
  const [invoice, setInvoice] = useState<InvoiceData>(() => {
    const today = new Date();
    const dateStr = today.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
    const timeStr = today.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true });

    return {
      invoiceNumber: generateInvoiceNumber(1),
      issueDate: dateStr,
      issueTime: timeStr,
      academicSession: currentSession,
      studentName: "Synthia Sanam",
      studentClass: "IX",
      section: "A",
      rollNo: "01",
      studentId: `MHS-${currentYear}-0001`,
      penNumber: "",
      guardianName: "Md. Ruhul Amin",
      contactNumber: "9876543210",
      feeItems: getSavedFeeStructure(),
      paymentMode: "Cash",
      paymentStatus: "Paid",
      remarks: "Annual admission fee collected with thanks.",
    };
  });

  // Sync locked fields: invoiceNumber & session whenever invoiceSeq changes
  useEffect(() => {
    setInvoice((prev) => ({
      ...prev,
      invoiceNumber: generateInvoiceNumber(invoiceSeq),
      academicSession: currentSession,
    }));
  }, [invoiceSeq, currentSession]);

  // Auto-sync current date and time continuously when enabled
  useEffect(() => {
    if (!autoDateTime) return;
    const syncCurrent = () => {
      const { dateStr, timeStr } = getLiveFormattedDateTime();
      setInvoice((prev) => ({
        ...prev,
        issueDate: dateStr,
        issueTime: timeStr,
      }));
    };
    syncCurrent();
    const timer = setInterval(syncCurrent, 30000);
    return () => clearInterval(timer);
  }, [autoDateTime]);

  // Fetch all students
  const { data: students = [], isLoading: isLoadingStudents } = useQuery({
    queryKey: ["all-students-for-invoice"],
    queryFn: getStudents,
  });

  // Fetch school configuration (including class management) from database
  const { data: schoolConfig } = useQuery({
    queryKey: ["school-config-invoice"],
    queryFn: async () => {
      const res = await fetch("/api/school-config", { cache: "no-store" });
      if (!res.ok) return null;
      const json = await res.json();
      return json?.data || null;
    },
  });

  // Dynamic Class Management List from DB / Settings
  const dynamicClasses = useMemo<DynamicClassItem[]>(() => {
    if (
      schoolConfig?.class_management &&
      Array.isArray(schoolConfig.class_management) &&
      schoolConfig.class_management.length > 0
    ) {
      return schoolConfig.class_management.map((c: any) => ({
        name: c.name || `Class ${c.code}`,
        code: String(c.code || c.name).trim().toUpperCase(),
        sections: Array.isArray(c.sections) && c.sections.length > 0 ? c.sections : ["A", "B"],
        stream: c.stream,
      }));
    }
    return getDynamicClassList();
  }, [schoolConfig]);

  // Options for Class selector
  const classOptions = useMemo(() => {
    return dynamicClasses.map((c) => ({
      label: c.name.startsWith("Class") ? c.name : `Class ${c.code}`,
      value: c.code,
    }));
  }, [dynamicClasses]);

  // Available sections for the currently selected bulkClass
  const availableSectionsForSelectedClass = useMemo(() => {
    if (!bulkClass) return ["A", "B", "C", "D"];
    const normClass = bulkClass.toUpperCase().trim();
    const matched = dynamicClasses.find(
      (c) => c.code.toUpperCase().trim() === normClass || c.name.toUpperCase().trim() === normClass
    );
    if (matched && Array.isArray(matched.sections) && matched.sections.length > 0) {
      return matched.sections;
    }
    return ["A", "B", "C", "D"];
  }, [dynamicClasses, bulkClass]);

  // Options for Section selector
  const sectionOptions = useMemo(() => {
    return [
      { label: "All Sections", value: "ALL" },
      ...availableSectionsForSelectedClass.map((s) => ({
        label: `Section ${s}`,
        value: s,
      })),
    ];
  }, [availableSectionsForSelectedClass]);

  // Reset selected section if it is no longer valid for the newly selected class
  useEffect(() => {
    if (bulkSection !== "ALL" && !availableSectionsForSelectedClass.includes(bulkSection)) {
      setBulkSection("ALL");
    }
  }, [bulkClass, availableSectionsForSelectedClass, bulkSection]);

  // Load student by query param if provided
  useEffect(() => {
    if (studentIdParam && students.length > 0) {
      const match = students.find((s) => s.id === studentIdParam);
      if (match) {
        handleSelectStudent(match);
      }
    }
  }, [studentIdParam, students]);

  // Handle choosing a student in Single Mode
  function handleSelectStudent(student: Student) {
    setSelectedStudent(student);
    setInvoice((prev) => ({
      ...prev,
      studentId: student.schoolId || student.id,
      studentName: student.name,
      studentClass: student.presentClass,
      section: student.presentSection || "A",
      rollNo: String(student.presentRoll || "01"),
      guardianName: student.guardianName || student.fatherName || "",
      contactNumber: student.studentContact || student.altMobile || "",
      penNumber: student.pen || "",
    }));
    showToast({
      type: "success",
      title: "Student Loaded",
      description: `Loaded ${student.name} (${student.presentClass}-${student.presentSection || "A"})`,
    });
  }

  // Filter students based on search (Single Mode)
  const filteredStudents = useMemo(() => {
    if (!studentSearch.trim()) return [];
    const q = studentSearch.toLowerCase().trim();
    return students
      .filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          (s.schoolId && s.schoolId.toLowerCase().includes(q)) ||
          (s.pen && s.pen.toLowerCase().includes(q)) ||
          (s.presentClass && s.presentClass.toLowerCase().includes(q))
      )
      .slice(0, 6);
  }, [studentSearch, students]);

  // Bulk Mode: Filter class roster & sort by Roll No ascending
  const classRoster = useMemo(() => {
    const normClass = bulkClass.toUpperCase().trim();
    const normSec = bulkSection.toUpperCase().trim();

    return students
      .filter((s) => {
        const cMatch = String(s.presentClass || "").toUpperCase().trim() === normClass;
        if (!cMatch) return false;
        if (normSec !== "ALL") {
          return String(s.presentSection || "A").toUpperCase().trim() === normSec;
        }
        return true;
      })
      .sort((a, b) => {
        const rollA = parseInt(String(a.presentRoll || "9999"), 10) || 9999;
        const rollB = parseInt(String(b.presentRoll || "9999"), 10) || 9999;
        return rollA - rollB;
      });
  }, [students, bulkClass, bulkSection]);

  // Automatically select all students when class or section changes
  useEffect(() => {
    if (classRoster.length > 0) {
      setSelectedStudentIds(classRoster.map((s) => s.id));
      setCurrentPreviewIndex(0);
    } else {
      setSelectedStudentIds([]);
      setCurrentPreviewIndex(0);
    }
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

  // Fee Item Management (CRUD)
  function handleFeeNameChange(idx: number, newName: string) {
    setInvoice((prev) => {
      const nextItems = [...prev.feeItems];
      nextItems[idx] = { ...nextItems[idx], name: newName };
      return { ...prev, feeItems: nextItems };
    });
  }

  function handleFeeAmountChange(idx: number, newAmount: number) {
    setInvoice((prev) => {
      const nextItems = [...prev.feeItems];
      nextItems[idx] = { ...nextItems[idx], amount: isNaN(newAmount) ? 0 : newAmount };
      return { ...prev, feeItems: nextItems };
    });
  }

  function handleAddFeeItem() {
    const newItem: FeeItem = {
      id: `fee-${Date.now()}`,
      name: "New Fee Head",
      amount: 50,
    };
    setInvoice((prev) => ({
      ...prev,
      feeItems: [...prev.feeItems, newItem],
    }));
  }

  function handleRemoveFeeItem(idx: number) {
    setInvoice((prev) => {
      const nextItems = prev.feeItems.filter((_, i) => i !== idx);
      return { ...prev, feeItems: nextItems };
    });
  }

  function handleSaveAsDefaultFeeStructure() {
    saveFeeStructure(invoice.feeItems);
    showToast({
      type: "success",
      title: "Saved as Default",
      description: "Current fee breakdown saved as the school's global default.",
    });
  }

  function handleResetDefaultFees() {
    saveFeeStructure(DEFAULT_FEE_ITEMS);
    setInvoice((prev) => ({
      ...prev,
      feeItems: DEFAULT_FEE_ITEMS,
    }));
    showToast({
      type: "info",
      title: "Defaults Restored",
      description: "Fee structure reset to official school standards (8 heads, ₹600 total).",
    });
  }

  const grandTotal = calculateFeeTotal(invoice.feeItems);

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
      recordPrintedInvoices(bulkInvoices, "bulk", copyType)
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

  return (
    <div className="p-3.5 sm:p-6 max-w-[1600px] mx-auto space-y-6 print:p-0 print:m-0 print:max-w-none print:space-y-0">
      {/* Top Action Header (Hidden in Print) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4 print:hidden">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
            title="Go Back"
            className="h-10 w-10 rounded-xl cursor-pointer"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400">
            <Receipt className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-foreground">
                Admission & Fee Invoice
              </h1>
              <Badge
                variant="outline"
                className="text-[10px] bg-teal-500/10 text-teal-700 dark:text-teal-300 font-mono"
              >
                {isA4FourUp ? "A4 4-Up Grid (4 Slips/Page)" : "A5 Dual-Slip"}
              </Badge>
            </div>
          </div>
        </div>

        {/* Print, Track & Undo Action Header Buttons */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsTrackerOpen(true)}
            title="Verify invoice validity and track generated registry"
            className="gap-1.5 text-xs font-semibold h-9.5 px-3 rounded-xl border-teal-300 dark:border-teal-700 bg-teal-500/10 text-teal-700 dark:text-teal-300 hover:bg-teal-500/20 cursor-pointer shadow-2xs"
          >
            <ShieldCheck className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />
            <span>Track &amp; Verify</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsHistoryOpen(true)}
            title="View print history and undo any printed batch"
            className="gap-1.5 text-xs font-semibold h-9.5 px-3 rounded-xl border-amber-300 dark:border-amber-700 bg-amber-500/10 text-amber-700 dark:text-amber-400 hover:bg-amber-500/20 cursor-pointer shadow-2xs"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Undo Last Print</span>
          </Button>

          <Button
            onClick={handlePrint}
            className="gap-2 text-xs font-bold bg-primary text-primary-foreground shadow-xs hover:bg-primary/90 h-9.5 px-4 rounded-xl cursor-pointer"
          >
            <Printer className="h-4 w-4" />
            <span>
              {generatorMode === "bulk"
                ? isA4FourUp
                  ? `Print Batch (${bulkInvoices.length} ${copyType === "school" ? "School" : "Student"} Slips • ${totalA4Pages} A4 ${totalA4Pages > 1 ? "Pages" : "Page"})`
                  : bulkFillMode === "blank"
                  ? `Print Batch (${bulkBlankCount} Dual Slips on A5)`
                  : `Print Batch (${selectedStudentIds.length} Dual Slips on A5)`
                : "Print Invoice (A5 Landscape)"}
            </span>
          </Button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SINGLE MODE CONTENT                                                       */}
      {/* ========================================================================= */}
      {generatorMode === "single" && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start print:block print:w-full print:m-0 print:p-0">
          {/* LEFT COLUMN: Controls & Fee Editor (Hidden in Print) */}
          <div className="xl:col-span-5 space-y-4 print:hidden">
            {/* Mode Switcher Segmented Control */}
            <div className="flex items-center w-full rounded-2xl border border-border/80 bg-muted/40 p-1.5 text-xs font-semibold shadow-xs">
              <button
                type="button"
                onClick={() => setGeneratorMode("single")}
                className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl transition-all cursor-pointer font-bold bg-background text-foreground shadow-xs"
              >
                <User className="h-4 w-4 text-teal-600" />
                <span>Single Student</span>
              </button>
              <button
                type="button"
                onClick={() => setGeneratorMode("bulk")}
                className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl transition-all cursor-pointer font-bold text-muted-foreground hover:text-foreground"
              >
                <Users className="h-4 w-4 text-primary" />
                <span>Class Batch (Bulk)</span>
                {classRoster.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-primary/10 text-primary font-bold">
                    {selectedStudentIds.length}
                  </span>
                )}
              </button>
            </div>

            {/* Card 1: Student Selection */}
            <Card className="border border-border/80 shadow-xs rounded-2xl overflow-hidden">
              <CardHeader className="p-4 border-b bg-muted/20">
                <CardTitle className="text-xs font-bold flex items-center gap-2 text-foreground">
                  <User className="h-3.5 w-3.5 text-primary" />
                  <span>Student Information</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                {/* Search Existing Student */}
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Search student by name, ID, roll..."
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                    className="pl-8 text-xs h-8"
                  />
                  {filteredStudents.length > 0 && (
                    <div className="absolute z-20 top-9 left-0 right-0 bg-popover border rounded-lg shadow-lg divide-y text-xs overflow-hidden">
                      {filteredStudents.map((s) => (
                        <div
                          key={s.id}
                          onClick={() => {
                            handleSelectStudent(s);
                            setStudentSearch("");
                          }}
                          className="p-2 hover:bg-muted/60 cursor-pointer flex items-center justify-between"
                        >
                          <div>
                            <p className="font-bold text-foreground">{s.name}</p>
                            <p className="text-[10px] text-muted-foreground">
                              Class {s.presentClass} ({s.presentSection || "A"}) • Roll:{" "}
                              {s.presentRoll || "01"}
                            </p>
                          </div>
                          <Badge variant="outline" className="text-[10px] font-mono">
                            {s.schoolId || "ID"}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Student Fields */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="col-span-2 space-y-1">
                    <Label className="text-[11px] font-semibold text-muted-foreground">
                      Student Full Name
                    </Label>
                    <Input
                      value={invoice.studentName}
                      onChange={(e) => setInvoice({ ...invoice, studentName: e.target.value })}
                      className="text-xs font-bold h-8"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold text-muted-foreground">
                      Student ID / PEN
                    </Label>
                    <Input
                      value={invoice.studentId || invoice.penNumber || ""}
                      onChange={(e) => setInvoice({ ...invoice, studentId: e.target.value })}
                      className="text-xs font-mono h-8"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold text-muted-foreground">Class</Label>
                    <Input
                      value={invoice.studentClass}
                      onChange={(e) => setInvoice({ ...invoice, studentClass: e.target.value })}
                      className="text-xs font-bold h-8"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold text-muted-foreground">Section</Label>
                    <Input
                      value={invoice.section || ""}
                      onChange={(e) => setInvoice({ ...invoice, section: e.target.value })}
                      className="text-xs font-bold h-8"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold text-muted-foreground">Roll Number</Label>
                    <Input
                      value={invoice.rollNo || ""}
                      onChange={(e) => setInvoice({ ...invoice, rollNo: e.target.value })}
                      className="text-xs font-mono font-bold h-8"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold text-muted-foreground">Guardian Name</Label>
                    <Input
                      value={invoice.guardianName || ""}
                      onChange={(e) => setInvoice({ ...invoice, guardianName: e.target.value })}
                      className="text-xs h-8"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold text-muted-foreground">Contact No</Label>
                    <Input
                      value={invoice.contactNumber || ""}
                      onChange={(e) => setInvoice({ ...invoice, contactNumber: e.target.value })}
                      className="text-xs font-mono h-8"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Card 2: Invoice Metadata & Payment */}
            <Card className="border border-border/80 shadow-xs rounded-2xl overflow-hidden">
              <CardHeader className="p-4 border-b bg-muted/20 flex flex-row items-center justify-between">
                <CardTitle className="text-xs font-bold flex items-center gap-2 text-foreground">
                  <Sliders className="h-3.5 w-3.5 text-primary" />
                  <span>Invoice Metadata & Payment</span>
                </CardTitle>
                <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800 shadow-2xs">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Auto-Locked & Live</span>
                </div>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                <div className="grid grid-cols-2 gap-2.5">
                  {/* Receipt No - Locked by default with toggleable unlock */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <Label className="text-[11px] font-semibold text-muted-foreground">Receipt No</Label>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setIsHistoryOpen(true)}
                          className="text-[9.5px] font-semibold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-0.5 cursor-pointer"
                          title="View print batch history & undo"
                        >
                          <RotateCcw className="h-2.5 w-2.5" /> History &amp; Undo
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsSingleReceiptLocked(!isSingleReceiptLocked)}
                          className="text-[9.5px] font-semibold text-muted-foreground hover:text-foreground flex items-center gap-0.5 cursor-pointer"
                          title={isSingleReceiptLocked ? "Click to unlock and edit" : "Click to lock"}
                        >
                          {isSingleReceiptLocked ? (
                            <>
                              <Lock className="h-2.5 w-2.5" /> Locked
                            </>
                          ) : (
                            <>
                              <Unlock className="h-2.5 w-2.5 text-amber-600 dark:text-amber-400" /> Unlocked
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                    <div className="relative flex items-center">
                      <Input
                        value={invoice.invoiceNumber}
                        disabled={isSingleReceiptLocked}
                        readOnly={isSingleReceiptLocked}
                        onChange={(e) => setInvoice({ ...invoice, invoiceNumber: e.target.value })}
                        className={cn(
                          "text-xs font-mono font-bold h-8 pr-8",
                          isSingleReceiptLocked
                            ? "bg-muted/60 text-foreground cursor-not-allowed select-none border-dashed"
                            : "bg-background focus:ring-1 focus:ring-primary"
                        )}
                      />
                      <button
                        type="button"
                        onClick={() => setIsSingleReceiptLocked(!isSingleReceiptLocked)}
                        title={isSingleReceiptLocked ? "Click to unlock" : "Click to lock"}
                        className="absolute right-2.5 h-4 w-4 flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer"
                      >
                        {isSingleReceiptLocked ? (
                          <Lock className="h-3.5 w-3.5 text-muted-foreground/70" />
                        ) : (
                          <Unlock className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Academic Session - Locked & Auto-Updated */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <Label className="text-[11px] font-semibold text-muted-foreground">Academic Session</Label>
                      <span className="text-[9.5px] text-muted-foreground font-semibold flex items-center gap-0.5">
                        <Lock className="h-2.5 w-2.5" /> Auto
                      </span>
                    </div>
                    <div className="relative flex items-center">
                      <Input
                        value={invoice.academicSession}
                        disabled
                        readOnly
                        className="text-xs font-semibold h-8 bg-muted/60 text-foreground cursor-not-allowed select-none pr-8 border-dashed"
                      />
                      <Lock className="absolute right-2.5 h-3.5 w-3.5 text-muted-foreground/60 pointer-events-none" />
                    </div>
                  </div>

                  {/* Date - Locked & Auto Live */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <Label className="text-[11px] font-semibold text-muted-foreground">Date</Label>
                      <span className="text-[9.5px] text-emerald-600 font-bold flex items-center gap-0.5">
                        Auto Live
                      </span>
                    </div>
                    <div className="relative flex items-center">
                      <Input
                        value={invoice.issueDate}
                        disabled
                        readOnly
                        className="text-xs font-mono font-bold h-8 bg-muted/60 text-foreground cursor-not-allowed select-none pr-8 border-dashed"
                      />
                      <Lock className="absolute right-2.5 h-3.5 w-3.5 text-muted-foreground/60 pointer-events-none" />
                    </div>
                  </div>

                  {/* Time - Locked & Auto Live */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <Label className="text-[11px] font-semibold text-muted-foreground">Time</Label>
                      <span className="text-[9.5px] text-emerald-600 font-bold flex items-center gap-0.5">
                        Auto Live
                      </span>
                    </div>
                    <div className="relative flex items-center">
                      <Input
                        value={invoice.issueTime}
                        disabled
                        readOnly
                        className="text-xs font-mono font-bold h-8 bg-muted/60 text-foreground cursor-not-allowed select-none pr-8 border-dashed"
                      />
                      <Lock className="absolute right-2.5 h-3.5 w-3.5 text-muted-foreground/60 pointer-events-none" />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold text-muted-foreground">
                      Payment Mode
                    </Label>
                    <CustomSelect
                      value={invoice.paymentMode}
                      onChange={(val) =>
                        setInvoice({
                          ...invoice,
                          paymentMode: val as "Cash" | "Online / UPI" | "Bank Transfer" | "Cheque",
                        })
                      }
                      options={[
                        { label: "Cash", value: "Cash" },
                        { label: "Online / UPI", value: "Online / UPI" },
                        { label: "Bank Transfer", value: "Bank Transfer" },
                        { label: "Cheque", value: "Cheque" },
                      ]}
                      searchable={false}
                      triggerClassName="h-8 text-xs font-medium"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold text-muted-foreground">Status</Label>
                    <CustomSelect
                      value={invoice.paymentStatus}
                      onChange={(val) =>
                        setInvoice({
                          ...invoice,
                          paymentStatus: val as "Paid" | "Partial" | "Due",
                        })
                      }
                      options={[
                        { label: "PAID", value: "Paid" },
                        { label: "DUE", value: "Due" },
                        { label: "PARTIAL", value: "Partial" },
                      ]}
                      searchable={false}
                      triggerClassName="h-8 text-xs font-bold text-emerald-600"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Card 3: Fee Particulars Editor */}
            <Card className="border border-border/80 shadow-xs rounded-2xl overflow-hidden">
              <CardHeader className="p-4 border-b bg-muted/20 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-xs font-bold text-foreground">
                    Fee Particulars (Customizable)
                  </CardTitle>
                  <p className="text-[11px] text-muted-foreground">
                    Admin can add, edit name/amount, or delete any fee head.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAddFeeItem}
                  className="h-7 text-xs font-semibold gap-1"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add Item</span>
                </Button>
              </CardHeader>

              <CardContent className="p-3 space-y-2">
                <div className="divide-y max-h-72 overflow-y-auto pr-1">
                  {invoice.feeItems.map((item, idx) => (
                    <div key={item.id || idx} className="py-1.5 flex items-center gap-2">
                      <span className="text-[10px] font-mono text-muted-foreground w-4 text-center">
                        {idx + 1}
                      </span>
                      <Input
                        value={item.name}
                        onChange={(e) => handleFeeNameChange(idx, e.target.value)}
                        placeholder="Fee Head Description"
                        className="text-xs h-7 flex-1 font-medium"
                      />
                      <div className="flex items-center gap-1 w-24">
                        <span className="text-xs text-muted-foreground font-semibold">₹</span>
                        <Input
                          type="number"
                          min="0"
                          step="1"
                          value={item.amount}
                          onChange={(e) => handleFeeAmountChange(idx, parseFloat(e.target.value))}
                          className="text-xs font-mono font-bold h-7 text-right"
                        />
                      </div>
                      <button
                        onClick={() => handleRemoveFeeItem(idx)}
                        title="Remove"
                        className="p-1 text-muted-foreground hover:text-rose-600 rounded transition-colors cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Total Summary */}
                <div className="pt-2 border-t flex items-center justify-between text-xs font-bold">
                  <span className="text-muted-foreground uppercase">Grand Total:</span>
                  <span className="text-sm font-mono text-primary font-extrabold">
                    ₹{grandTotal.toFixed(2)}
                  </span>
                </div>

                {/* Save / Reset Actions */}
                <div className="pt-2 border-t flex items-center justify-between gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleResetDefaultFees}
                    className="h-7 text-[11px] font-semibold gap-1 text-muted-foreground"
                  >
                    <RotateCcw className="h-3 w-3" />
                    <span>Restore Standard</span>
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleSaveAsDefaultFeeStructure}
                    className="h-7 text-[11px] font-semibold gap-1 shadow-2xs"
                  >
                    <Save className="h-3 w-3" />
                    <span>Save as School Default</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* RIGHT COLUMN: Live Single Invoice Preview */}
          <div className="xl:col-span-7 space-y-3 print:w-full print:m-0 print:p-0">
            {/* Preview Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-card border border-border/80 rounded-2xl shadow-xs print:hidden">
              {/* Copy Type Selector */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 mr-1">
                  <Eye className="h-3.5 w-3.5 text-primary" />
                  <span>Preview</span>
                </span>
                <div className="flex items-center rounded-xl border bg-muted/50 p-1 text-xs font-semibold shadow-2xs">
                  <button
                    type="button"
                    onClick={() => setCopyType("both")}
                    className={cn(
                      "px-2.5 py-1 rounded-lg transition-all cursor-pointer font-bold",
                      copyType === "both"
                        ? "bg-background text-foreground shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    Dual (Both)
                  </button>
                  <button
                    type="button"
                    onClick={() => setCopyType("student")}
                    className={cn(
                      "px-2.5 py-1 rounded-lg transition-all cursor-pointer",
                      copyType === "student"
                        ? "bg-background text-foreground shadow-xs font-bold"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    Student
                  </button>
                  <button
                    type="button"
                    onClick={() => setCopyType("school")}
                    className={cn(
                      "px-2.5 py-1 rounded-lg transition-all cursor-pointer",
                      copyType === "school"
                        ? "bg-background text-foreground shadow-xs font-bold"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    School
                  </button>
                </div>
              </div>

              {/* Zoom Controls */}
              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setPreviewScale((prev) => Math.max(0.4, Number((prev - 0.05).toFixed(2))))}
                  className="h-8 w-8 rounded-lg cursor-pointer"
                  title="Zoom Out"
                >
                  <ZoomOut className="h-3.5 w-3.5" />
                </Button>
                <span className="text-xs font-mono font-bold w-12 text-center">
                  {Math.round(previewScale * 100)}%
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setPreviewScale((prev) => Math.min(1.2, Number((prev + 0.05).toFixed(2))))}
                  className="h-8 w-8 rounded-lg cursor-pointer"
                  title="Zoom In"
                >
                  <ZoomIn className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPreviewScale(0.75)}
                  className="h-8 text-xs font-semibold rounded-lg px-2 cursor-pointer"
                >
                  Fit
                </Button>
              </div>
            </div>

            {/* Printable Canvas Viewport with ZERO horizontal scrollbar */}
            <div className="relative overflow-hidden bg-muted/40 p-4 sm:p-6 rounded-2xl border border-border/80 flex justify-center custom-scrollbar print:p-0 print:border-none print:bg-transparent print:w-full print:block min-h-[460px]">
              <div
                style={{
                  width: `${210 * previewScale}mm`,
                  height: `${146 * previewScale}mm`,
                  overflow: "visible",
                }}
                className="shrink-0 transition-all duration-150"
              >
                <div
                  id="printable-invoice-canvas"
                  style={{
                    transform: `scale(${previewScale})`,
                    transformOrigin: "top left",
                    width: "210mm",
                    height: "146mm",
                  }}
                  className="transition-transform duration-150 origin-top-left"
                >
                  <InvoicePrintableView data={invoice} copyType={copyType} schoolProfile={schoolProfile} />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* CLASS BATCH (BULK) MODE CONTENT                                           */}
      {/* ========================================================================= */}
      {generatorMode === "bulk" && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          {/* LEFT COLUMN: Class Filter, Student Roster Selection & Fee Editor */}
          <div className="xl:col-span-5 space-y-4 print:hidden">
            {/* Mode Switcher Segmented Control */}
            <div className="flex items-center w-full rounded-2xl border border-border/80 bg-muted/40 p-1.5 text-xs font-semibold shadow-xs">
              <button
                type="button"
                onClick={() => setGeneratorMode("single")}
                className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl transition-all cursor-pointer font-bold text-muted-foreground hover:text-foreground"
              >
                <User className="h-4 w-4 text-teal-600" />
                <span>Single Student</span>
              </button>
              <button
                type="button"
                onClick={() => setGeneratorMode("bulk")}
                className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl transition-all cursor-pointer font-bold bg-background text-foreground shadow-xs"
              >
                <Users className="h-4 w-4 text-primary" />
                <span>Class Batch (Bulk)</span>
                {classRoster.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-primary/10 text-primary font-bold">
                    {selectedStudentIds.length}
                  </span>
                )}
              </button>
            </div>

            {/* Card 1: Class & Section Selector with Roster Checklist */}
            <Card className="border border-border/80 shadow-xs rounded-2xl overflow-hidden">
              <CardHeader className="p-4 border-b bg-muted/20">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xs font-bold flex items-center gap-2 text-foreground">
                    <Users className="h-3.5 w-3.5 text-primary" />
                    <span>Class Roster Selection</span>
                  </CardTitle>
                  <Badge variant="secondary" className="text-[10px] font-mono">
                    {bulkFillMode === "blank"
                      ? `${bulkBlankCount} Blank Slips`
                      : `${selectedStudentIds.length} / ${classRoster.length} Selected`}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-4 space-y-3.5">
                {/* Class & Section Selectors */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold text-muted-foreground">Select Class</Label>
                    <CustomSelect
                      value={bulkClass}
                      onChange={(val) => setBulkClass(val)}
                      options={classOptions}
                      searchable={false}
                      triggerClassName="h-8 text-xs font-bold"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold text-muted-foreground">
                      Select Section
                    </Label>
                    <CustomSelect
                      value={bulkSection}
                      onChange={(val) => setBulkSection(val)}
                      options={sectionOptions}
                      searchable={false}
                      triggerClassName="h-8 text-xs font-bold"
                    />
                  </div>
                </div>

                {bulkFillMode === "blank" ? (
                  <div className="p-4 rounded-xl border border-dashed border-teal-500/30 bg-teal-500/5 text-center space-y-2">
                    <FileText className="h-7 w-7 mx-auto text-teal-600 dark:text-teal-400 opacity-80" />
                    <div className="space-y-0.5">
                      <p className="text-xs font-bold text-foreground">
                        Blank Slips Mode Active
                      </p>
                      <p className="text-[11px] text-muted-foreground max-w-xs mx-auto">
                        Generating {bulkBlankCount} blank printable slips for Class {bulkClass}{" "}
                        {bulkSection !== "ALL" ? `(${bulkSection})` : ""}. Student name, ID, roll, and guardian lines are empty for manual entry.
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setBulkFillMode("fill")}
                      className="h-7 text-[11px] font-semibold gap-1.5 cursor-pointer mt-1"
                    >
                      <UserCheck className="h-3 w-3 text-teal-600" />
                      <span>Switch to Pre-Filled Roster</span>
                    </Button>
                  </div>
                ) : (
                  <>
                    {/* Search in class roster + Select/Deselect All buttons */}
                    <div className="flex items-center justify-between gap-2 pt-1">
                      <div className="relative flex-1">
                        <Search className="absolute left-2.5 top-2.5 h-3 w-3 text-muted-foreground" />
                        <Input
                          placeholder="Search within class..."
                          value={bulkRosterSearch}
                          onChange={(e) => setBulkRosterSearch(e.target.value)}
                          className="pl-7 text-xs h-7"
                        />
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={handleSelectAll}
                          className="text-[11px] px-2 py-1 rounded border hover:bg-muted font-semibold text-primary transition-colors cursor-pointer"
                        >
                          All
                        </button>
                        <button
                          type="button"
                          onClick={handleDeselectAll}
                          className="text-[11px] px-2 py-1 rounded border hover:bg-muted font-semibold text-muted-foreground transition-colors cursor-pointer"
                        >
                          Clear
                        </button>
                      </div>
                    </div>

                    {/* Student Checklist Table */}
                    <div className="border rounded-xl divide-y max-h-60 overflow-y-auto bg-card text-xs">
                      {displayedRoster.length === 0 ? (
                        <div className="p-4 text-center text-muted-foreground text-xs">
                          No students found in Class {bulkClass}{" "}
                          {bulkSection !== "ALL" ? `Sec ${bulkSection}` : ""}.
                        </div>
                      ) : (
                        displayedRoster.map((s) => {
                          const isChecked = selectedStudentIds.includes(s.id);
                          return (
                            <div
                              key={s.id}
                              onClick={() => toggleStudentSelection(s.id)}
                              className={`p-2 flex items-center justify-between gap-2 hover:bg-muted/50 cursor-pointer transition-colors ${
                                isChecked ? "bg-primary/5" : ""
                              }`}
                            >
                              <div className="flex items-center gap-2.5">
                                {isChecked ? (
                                  <CheckSquare className="h-4 w-4 text-primary shrink-0" />
                                ) : (
                                  <Square className="h-4 w-4 text-muted-foreground shrink-0" />
                                )}
                                <div>
                                  <p className="font-semibold text-foreground text-xs leading-tight">
                                    {s.name}
                                  </p>
                                  <p className="text-[10px] text-muted-foreground">
                                    Roll: <span className="font-bold text-foreground">{s.presentRoll || "—"}</span> • Sec:{" "}
                                    {s.presentSection || "A"} • {s.schoolId || s.id}
                                  </p>
                                </div>
                              </div>
                              {isChecked && (
                                <Badge variant="outline" className="text-[9px] bg-primary/10 text-primary border-primary/30">
                                  Included
                                </Badge>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Card 2: Batch Invoice Numbering & Payment Settings */}
            <Card className="border border-border/80 shadow-xs rounded-2xl overflow-hidden">
              <CardHeader className="p-4 border-b bg-muted/20">
                <CardTitle className="text-xs font-bold flex items-center gap-2 text-foreground">
                  <Receipt className="h-3.5 w-3.5 text-primary" />
                  <span>Batch Invoice Configuration</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3.5">
                {/* Invoice Data Fill Mode (Pre-Filled vs Blank) */}
                <div className="space-y-1.5 pb-2.5 border-b border-border/70">
                  <div className="flex items-center justify-between">
                    <Label className="text-[11px] font-semibold text-muted-foreground">
                      Invoice Data Fill Mode
                    </Label>
                    <span className="text-[9.5px] font-semibold text-teal-600 dark:text-teal-400">
                      {bulkFillMode === "fill" ? "Class Roster (Full Data)" : "Blank Slips (Manual Entry)"}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 bg-muted/40 p-1 rounded-xl border border-border/70">
                    <button
                      type="button"
                      onClick={() => setBulkFillMode("fill")}
                      className={cn(
                        "flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                        bulkFillMode === "fill"
                          ? "bg-background text-foreground shadow-2xs border border-border/80"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <UserCheck className="h-3.5 w-3.5 text-teal-600" />
                      <span>Pre-Filled</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setBulkFillMode("blank")}
                      className={cn(
                        "flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                        bulkFillMode === "blank"
                          ? "bg-background text-foreground shadow-2xs border border-border/80"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <FileText className="h-3.5 w-3.5 text-primary" />
                      <span>Blank Template</span>
                    </button>
                  </div>

                  {bulkFillMode === "blank" && (
                    <div className="mt-2 flex items-center justify-between gap-2 p-2 rounded-xl bg-teal-500/10 border border-teal-500/20">
                      <div>
                        <p className="text-xs font-bold text-teal-800 dark:text-teal-300">
                          Number of Blank Slips
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          Name, Guardian, ID &amp; Roll will be blank lines
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Input
                          type="number"
                          min="1"
                          max="500"
                          value={bulkBlankCount}
                          onChange={(e) =>
                            setBulkBlankCount(Math.max(1, parseInt(e.target.value, 10) || 1))
                          }
                          className="w-18 h-7 text-xs font-mono font-bold text-center bg-background"
                        />
                        <span className="text-[11px] font-semibold text-muted-foreground">slips</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  {/* Receipt Prefix */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <Label className="text-[11px] font-semibold text-muted-foreground">
                        Receipt Prefix
                      </Label>
                      <button
                        type="button"
                        onClick={() => setIsBulkPrefixLocked(!isBulkPrefixLocked)}
                        className="text-[9.5px] font-semibold text-muted-foreground hover:text-foreground flex items-center gap-0.5 cursor-pointer"
                        title={isBulkPrefixLocked ? "Click to unlock and edit" : "Click to lock"}
                      >
                        {isBulkPrefixLocked ? (
                          <>
                            <Lock className="h-2.5 w-2.5" /> Locked
                          </>
                        ) : (
                          <>
                            <Unlock className="h-2.5 w-2.5 text-amber-600 dark:text-amber-400" /> Unlocked
                          </>
                        )}
                      </button>
                    </div>
                    <div className="relative flex items-center">
                      <Input
                        value={bulkReceiptPrefix}
                        disabled={isBulkPrefixLocked}
                        readOnly={isBulkPrefixLocked}
                        onChange={(e) => setBulkReceiptPrefix(e.target.value)}
                        className={cn(
                          "text-xs font-mono font-bold h-8 pr-8",
                          isBulkPrefixLocked
                            ? "bg-muted/60 text-foreground cursor-not-allowed select-none border-dashed"
                            : "bg-background focus:ring-1 focus:ring-primary"
                        )}
                      />
                      <button
                        type="button"
                        onClick={() => setIsBulkPrefixLocked(!isBulkPrefixLocked)}
                        title={isBulkPrefixLocked ? "Click to unlock" : "Click to lock"}
                        className="absolute right-2.5 h-4 w-4 flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer"
                      >
                        {isBulkPrefixLocked ? (
                          <Lock className="h-3.5 w-3.5 text-muted-foreground/70" />
                        ) : (
                          <Unlock className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Starting Serial No */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <Label className="text-[11px] font-semibold text-muted-foreground">
                        Starting Serial No
                      </Label>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setIsHistoryOpen(true)}
                          className="text-[9.5px] font-semibold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-0.5 cursor-pointer"
                          title="View print batch history & undo"
                        >
                          <RotateCcw className="h-2.5 w-2.5" /> History &amp; Undo
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsBulkStartingNoLocked(!isBulkStartingNoLocked)}
                          className="text-[9.5px] font-semibold text-muted-foreground hover:text-foreground flex items-center gap-0.5 cursor-pointer"
                          title={isBulkStartingNoLocked ? "Click to unlock and edit" : "Click to lock"}
                        >
                          {isBulkStartingNoLocked ? (
                            <>
                              <Lock className="h-2.5 w-2.5" /> Locked
                            </>
                          ) : (
                            <>
                              <Unlock className="h-2.5 w-2.5 text-amber-600 dark:text-amber-400" /> Unlocked
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                    <div className="relative flex items-center">
                      <Input
                        type="number"
                        min="1"
                        value={bulkStartingNo}
                        disabled={isBulkStartingNoLocked}
                        readOnly={isBulkStartingNoLocked}
                        onChange={(e) => setBulkStartingNo(parseInt(e.target.value, 10) || 1)}
                        className={cn(
                          "text-xs font-mono font-bold h-8 pr-8",
                          isBulkStartingNoLocked
                            ? "bg-muted/60 text-foreground cursor-not-allowed select-none border-dashed"
                            : "bg-background focus:ring-1 focus:ring-primary"
                        )}
                      />
                      <button
                        type="button"
                        onClick={() => setIsBulkStartingNoLocked(!isBulkStartingNoLocked)}
                        title={isBulkStartingNoLocked ? "Click to unlock" : "Click to lock"}
                        className="absolute right-2.5 h-4 w-4 flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer"
                      >
                        {isBulkStartingNoLocked ? (
                          <Lock className="h-3.5 w-3.5 text-muted-foreground/70" />
                        ) : (
                          <Unlock className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <Label className="text-[11px] font-semibold text-muted-foreground">
                        Academic Session
                      </Label>
                      <span className="text-[9px] font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-1 py-0.2 rounded">
                        Auto
                      </span>
                    </div>
                    <div className="relative flex items-center">
                      <Input
                        value={bulkSession}
                        disabled
                        readOnly
                        className="text-xs font-semibold h-8 bg-muted/60 text-foreground cursor-not-allowed select-none pr-8 border-dashed"
                      />
                      <Lock className="absolute right-2.5 h-3.5 w-3.5 text-muted-foreground/60 pointer-events-none" />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold text-muted-foreground">
                      Payment Mode
                    </Label>
                    <CustomSelect
                      value={bulkPaymentMode}
                      onChange={(val) =>
                        setBulkPaymentMode(
                          val as "Cash" | "Online / UPI" | "Bank Transfer" | "Cheque"
                        )
                      }
                      options={[
                        { label: "Cash", value: "Cash" },
                        { label: "Online / UPI", value: "Online / UPI" },
                        { label: "Bank Transfer", value: "Bank Transfer" },
                        { label: "Cheque", value: "Cheque" },
                      ]}
                      searchable={false}
                      triggerClassName="h-8 text-xs font-medium"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Card 3: Batch Fee Particulars (Applies to all) */}
            <Card className="border border-border/80 shadow-xs rounded-2xl overflow-hidden">
              <CardHeader className="p-4 border-b bg-muted/20 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-xs font-bold text-foreground">
                    Shared Fee Structure for Class {bulkClass}
                  </CardTitle>
                  <p className="text-[11px] text-muted-foreground">
                    Applied equally to all{" "}
                    {bulkFillMode === "blank"
                      ? `${bulkBlankCount} blank`
                      : `${selectedStudentIds.length}`}{" "}
                    generated student slips.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAddFeeItem}
                  className="h-7 text-xs font-semibold gap-1"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add Head</span>
                </Button>
              </CardHeader>

              <CardContent className="p-3 space-y-2">
                <div className="divide-y max-h-56 overflow-y-auto pr-1">
                  {invoice.feeItems.map((item, idx) => (
                    <div key={item.id || idx} className="py-1.5 flex items-center gap-2">
                      <span className="text-[10px] font-mono text-muted-foreground w-4 text-center">
                        {idx + 1}
                      </span>
                      <Input
                        value={item.name}
                        onChange={(e) => handleFeeNameChange(idx, e.target.value)}
                        placeholder="Fee Head Description"
                        className="text-xs h-7 flex-1 font-medium"
                      />
                      <div className="flex items-center gap-1 w-24">
                        <span className="text-xs text-muted-foreground font-semibold">₹</span>
                        <Input
                          type="number"
                          min="0"
                          step="1"
                          value={item.amount}
                          onChange={(e) => handleFeeAmountChange(idx, parseFloat(e.target.value))}
                          className="text-xs font-mono font-bold h-7 text-right"
                        />
                      </div>
                      <button
                        onClick={() => handleRemoveFeeItem(idx)}
                        title="Remove"
                        className="p-1 text-muted-foreground hover:text-rose-600 rounded transition-colors cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="pt-2 border-t flex items-center justify-between text-xs font-bold">
                  <span className="text-muted-foreground uppercase">Per Student Total:</span>
                  <span className="text-sm font-mono text-primary font-extrabold">
                    ₹{grandTotal.toFixed(2)}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* RIGHT COLUMN: Batch Preview Slider & Screen Output */}
          <div className="xl:col-span-7 space-y-3">
            {/* Preview Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-card border border-border/80 rounded-2xl shadow-xs print:hidden">
              {/* Copy Type Selector */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 mr-1">
                  <Eye className="h-3.5 w-3.5 text-primary" />
                  <span>Preview</span>
                </span>
                <div className="flex items-center rounded-xl border bg-muted/50 p-1 text-xs font-semibold shadow-2xs">
                  <button
                    type="button"
                    onClick={() => setCopyType("both")}
                    className={cn(
                      "px-2.5 py-1 rounded-lg transition-all cursor-pointer font-bold",
                      copyType === "both"
                        ? "bg-background text-foreground shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    Dual (Both)
                  </button>
                  <button
                    type="button"
                    onClick={() => setCopyType("student")}
                    className={cn(
                      "px-2.5 py-1 rounded-lg transition-all cursor-pointer",
                      copyType === "student"
                        ? "bg-background text-foreground shadow-xs font-bold"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    Student
                  </button>
                  <button
                    type="button"
                    onClick={() => setCopyType("school")}
                    className={cn(
                      "px-2.5 py-1 rounded-lg transition-all cursor-pointer",
                      copyType === "school"
                        ? "bg-background text-foreground shadow-xs font-bold"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    School
                  </button>
                </div>
              </div>

              {/* Inspector Prev/Next Navigator in Bulk Mode */}
              {bulkInvoices.length > 0 && (
                isA4FourUp ? (
                  <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-xl">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setCurrentA4PageIndex((prev) => Math.max(0, prev - 1))}
                      disabled={safeA4PageIndex === 0}
                      className="h-7 w-7 rounded-lg cursor-pointer"
                      title="Previous A4 Page"
                    >
                      <ChevronLeft className="h-3.5 w-3.5" />
                    </Button>
                    <span className="text-xs font-bold px-2 font-mono">
                      A4 Page {safeA4PageIndex + 1} / {totalA4Pages}:{" "}
                      <span className="text-primary font-sans font-semibold">
                        Slips {safeA4PageIndex * 4 + 1}–{Math.min(bulkInvoices.length, safeA4PageIndex * 4 + 4)} of {bulkInvoices.length}
                      </span>
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        setCurrentA4PageIndex((prev) =>
                          Math.min(totalA4Pages - 1, prev + 1)
                        )
                      }
                      disabled={safeA4PageIndex >= totalA4Pages - 1}
                      className="h-7 w-7 rounded-lg cursor-pointer"
                      title="Next A4 Page"
                    >
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-xl">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setCurrentPreviewIndex((prev) => Math.max(0, prev - 1))}
                      disabled={currentPreviewIndex === 0}
                      className="h-7 w-7 rounded-lg cursor-pointer"
                      title="Previous Student"
                    >
                      <ChevronLeft className="h-3.5 w-3.5" />
                    </Button>
                    <span className="text-xs font-bold px-2 font-mono">
                      {currentPreviewIndex + 1} / {bulkInvoices.length}:{" "}
                      <span className="text-primary font-sans">
                        {activeBulkPreviewInvoice.studentName ||
                          `Blank Slip #${activeBulkPreviewInvoice.invoiceNumber}`}
                      </span>
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        setCurrentPreviewIndex((prev) =>
                          Math.min(bulkInvoices.length - 1, prev + 1)
                        )
                      }
                      disabled={currentPreviewIndex >= bulkInvoices.length - 1}
                      className="h-7 w-7 rounded-lg cursor-pointer"
                      title="Next Student"
                    >
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )
              )}

              {/* Zoom Controls */}
              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setPreviewScale((prev) => Math.max(0.3, Number((prev - 0.05).toFixed(2))))}
                  className="h-8 w-8 rounded-lg cursor-pointer"
                  title="Zoom Out"
                >
                  <ZoomOut className="h-3.5 w-3.5" />
                </Button>
                <span className="text-xs font-mono font-bold w-12 text-center">
                  {Math.round(previewScale * 100)}%
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setPreviewScale((prev) => Math.min(1.2, Number((prev + 0.05).toFixed(2))))}
                  className="h-8 w-8 rounded-lg cursor-pointer"
                  title="Zoom In"
                >
                  <ZoomIn className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPreviewScale(isA4FourUp ? 0.52 : 0.75)}
                  className="h-8 text-xs font-semibold rounded-lg px-2 cursor-pointer"
                >
                  Fit
                </Button>
              </div>
            </div>

            {/* Scaled Preview Viewport (Zero horizontal scrollbar) */}
            <div className="relative overflow-hidden bg-muted/40 p-4 sm:p-6 rounded-2xl border border-border/80 flex justify-center custom-scrollbar print:hidden min-h-[460px]">
              {bulkInvoices.length > 0 ? (
                <div
                  style={{
                    width: `${210 * previewScale}mm`,
                    height: `${(isA4FourUp ? 295 : 146) * previewScale}mm`,
                    overflow: "visible",
                  }}
                  className="shrink-0 transition-all duration-150"
                >
                  <div
                    id="printable-invoice-canvas"
                    style={{
                      transform: `scale(${previewScale})`,
                      transformOrigin: "top left",
                      width: "210mm",
                      height: isA4FourUp ? "295mm" : "146mm",
                    }}
                    className="transition-transform duration-150 origin-top-left"
                  >
                    {isA4FourUp ? (
                      <div
                        id="pure-a4-invoice-sheet"
                        className="relative bg-white text-slate-900 border border-slate-400 font-sans box-border select-none mx-auto overflow-hidden w-[210mm] h-[295mm] min-w-[210mm] max-w-[210mm] min-h-[295mm] max-h-[295mm] p-[3mm] shadow-md flex items-center justify-center"
                      >
                        <InvoicePrintableA4Sheet
                          invoices={activeA4Chunk}
                          copyLabel={copyType === "school" ? "SCHOOL COPY" : "STUDENT COPY"}
                          schoolProfile={schoolProfile}
                        />
                      </div>
                    ) : (
                      <InvoicePrintableView
                        data={activeBulkPreviewInvoice}
                        copyType={copyType}
                        schoolProfile={schoolProfile}
                      />
                    )}
                  </div>
                </div>
              ) : (
                <div className="py-24 text-center text-muted-foreground text-xs flex flex-col items-center justify-center gap-2">
                  <Users className="h-8 w-8 text-muted-foreground/40" />
                  <p className="font-medium">Please select at least 1 student from the left roster to preview invoice.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* BATCH PRINT CANVAS (PRINT ONLY)                                           */}
      {/* Renders all selected students' invoices with page breaks                 */}
      {/* ========================================================================= */}
      {generatorMode === "bulk" && bulkInvoices.length > 0 && (
        <div id="printable-bulk-canvas" className="hidden print:block w-full">
          <InvoicePrintableBatchView
            invoices={bulkInvoices}
            copyType={copyType}
            schoolProfile={schoolProfile}
          />
        </div>
      )}

      {/* Global CSS for Print Optimization */}
      <style jsx global>{`
        @media print {
          /* Hide non-printable UI elements */
          header,
          aside,
          nav,
          .print\\:hidden,
          button {
            display: none !important;
          }

          @page {
            size: ${isA4FourUp ? "210mm 297mm" : "210mm 148mm"};
            margin: 0;
          }

          html,
          body {
            background: white !important;
            color: black !important;
            padding: 0 !important;
            margin: 0 !important;
            width: 210mm !important;
            height: auto !important;
            max-width: 210mm !important;
            max-height: none !important;
            overflow: visible !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          /* Single mode canvas layout */
          #printable-invoice-canvas {
            transform: none !important;
            background: transparent !important;
            padding: 0 !important;
            margin: 0 auto !important;
            border: none !important;
            box-shadow: none !important;
            width: 210mm !important;
            max-width: 210mm !important;
            height: ${isA4FourUp ? "295mm" : "146mm"} !important;
            max-height: ${isA4FourUp ? "295mm" : "146mm"} !important;
            box-sizing: border-box !important;
            overflow: hidden !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
          }

          #pure-a5-invoice-sheet {
            width: 210mm !important;
            height: 146mm !important;
            min-width: 210mm !important;
            max-width: 210mm !important;
            min-height: 146mm !important;
            max-height: 146mm !important;
            margin: 0 auto !important;
            padding: 1.5mm !important;
            box-sizing: border-box !important;
            border: 1px solid #475569 !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            page-break-after: avoid !important;
            break-after: avoid !important;
          }

          #pure-a4-invoice-sheet {
            width: 210mm !important;
            height: 295mm !important;
            min-width: 210mm !important;
            max-width: 210mm !important;
            min-height: 295mm !important;
            max-height: 295mm !important;
            margin: 0 auto !important;
            padding: 3mm !important;
            box-sizing: border-box !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }

          /* Bulk batch print canvas */
          #printable-bulk-canvas {
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            display: block !important;
          }

          /* Bulk batch print page break styles */
          .print\\:break-after-page {
            break-after: page !important;
            page-break-after: always !important;
          }
        }
      `}</style>

      {/* Invoice Verification & Registry Tracker Modal */}
      <InvoiceTrackerModal
        isOpen={isTrackerOpen}
        onClose={() => setIsTrackerOpen(false)}
      />

      {/* Print Batch History & Selective Undo Modal */}
      <PrintHistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        docType="invoice"
        onUndoBatch={(newStart) => {
          setInvoiceSeq(newStart);
          setBulkStartingNo(newStart);
        }}
      />
    </div>
  );
}

export default function AdmissionInvoicePage() {
  return (
    <Suspense fallback={<div className="p-6 text-xs text-muted-foreground">Loading Invoice Generator...</div>}>
      <InvoiceGeneratorContent />
    </Suspense>
  );
}
