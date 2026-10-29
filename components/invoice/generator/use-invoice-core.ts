"use client";

import { apiFetch } from "@/lib/api/client";
import { useState, useEffect, useMemo, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { getStudents, searchStudents, getStudentById } from "@/lib/data/students";
import { useDebounce } from "@/lib/hooks/use-debounce";
import { useSchoolConfigQuery } from "@/lib/utils/school-config-client";
import { Student } from "@/lib/types";
import { type InvoiceData, type FeeCategory, getSavedFeeStructure, generateInvoiceNumber, getFeeCategoryForClass } from "@/lib/utils/fee-config";
import { showToast } from "@/components/ui/toast-banner";
import { useSchoolProfile } from "@/lib/hooks/use-school-profile";
import { getDynamicClassList, type DynamicClassItem } from "@/lib/ems/ems-config-loader";
import { EMPTY_STUDENTS_ARRAY } from "@/components/invoice/generator/constants";


export function useInvoiceCore() {
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
  const [singleClass, setSingleClass] = useState<string>(classParam?.toUpperCase() || "IX");
  const [singleSection, setSingleSection] = useState<string>(sectionParam?.toUpperCase() || "ALL");
  const [isLoadingFullStudent, setIsLoadingFullStudent] = useState<boolean>(false);
  const [autoDateTime, setAutoDateTime] = useState(true);
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
  const [bulkAssignedTeacher, setBulkAssignedTeacher] = useState<string>("");

  const currentYear = new Date().getFullYear();
  const currentSession = String(currentYear);
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

  // Dynamic Academic Session options: strictly current year & 1 year advance (no extra text)
  const academicSessionOptions = useMemo(() => {
    return [
      { label: String(currentYear), value: String(currentYear) },
      { label: String(currentYear + 1), value: String(currentYear + 1) },
    ];
  }, [currentYear]);

  // Undo / Revert back to previous starting serial directly in database
  async function handleUndoLastPrint() {
    if (prevSeq === null || prevSeq <= 0) return;
    try {
      const data = await apiFetch<{ newSequence?: number }>("/api/invoices/batches", {
        method: "POST",
        json: {
          startSerial: prevSeq,
          endSerial: invoiceSeq - 1,
          year: currentYear,
        },
      });
      if (typeof data.newSequence === "number") {
        setInvoiceSeq(data.newSequence);
        setBulkStartingNo(data.newSequence);
        setInvoice((prev) => ({
          ...prev,
          invoiceNumber: generateInvoiceNumber(data.newSequence, currentYear),
        }));
        setPrevSeq(null);
        try {
          localStorage.setItem(INVOICE_STORAGE_KEY, String(data.newSequence));
          localStorage.removeItem(PREV_INVOICE_STORAGE_KEY);
        } catch {}
        showToast({
          type: "info",
          title: "Serial Reverted (Database Undo)",
          description: `Reverted back to Starting Serial #${String(data.newSequence).padStart(4, "0")}`,
        });
        return;
      }
    } catch (e) {
      console.warn("Database batch undo failed, reverting locally:", e);
    }

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
      studentClass: classParam?.toUpperCase() || "IX",
      section: "A",
      rollNo: "01",
      studentId: `MHS-${currentYear}-0001`,
      penNumber: "",
      guardianName: "Md. Ruhul Amin",
      contactNumber: "9876543210",
      feeItems: getSavedFeeStructure(getFeeCategoryForClass(classParam?.toUpperCase() || "IX")),
      paymentMode: "Cash",
      paymentStatus: "Paid",
      remarks: "Annual admission fee collected with thanks.",
      includeDigitalSignature: true,
    };
  });

  // Sync starting sequence live from database
  const syncSequenceFromDatabase = useCallback(async () => {
    try {
      const data = await apiFetch<{ nextSequence?: number }>(`/api/invoices/next-sequence?year=${currentYear}`);
      if (typeof data.nextSequence === "number" && data.nextSequence >= 1) {
        const seq = data.nextSequence;
        setInvoiceSeq(seq);
        setBulkStartingNo(seq);
        setInvoice((prev) => ({
          ...prev,
          invoiceNumber: generateInvoiceNumber(seq, currentYear),
        }));
        try {
          localStorage.setItem(INVOICE_STORAGE_KEY, String(seq));
        } catch {}
        return seq;
      }
    } catch (e) {
      console.warn("Could not sync next sequence from DB:", e);
    }
    const fallback = getStoredInvoiceSeq();
    setInvoiceSeq(fallback);
    setBulkStartingNo(fallback);
    return fallback;
  }, [currentYear, INVOICE_STORAGE_KEY]);

  useEffect(() => {
    syncSequenceFromDatabase();
    setPrevSeq(getStoredPrevSeq());
  }, [syncSequenceFromDatabase]);

  // Sync invoiceNumber whenever invoiceSeq changes (preserving selected academicSession)
  useEffect(() => {
    setInvoice((prev) => ({
      ...prev,
      invoiceNumber: generateInvoiceNumber(invoiceSeq),
      academicSession: prev.academicSession || currentSession,
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

  const debouncedSearch = useDebounce(studentSearch, 300);

  const { data: searchResults, isLoading: isSearchLoading } = useQuery({
    queryKey: ["students", "search", debouncedSearch, singleClass, singleSection],
    queryFn: () =>
      searchStudents(
        {
          query: debouncedSearch,
          class: singleClass || undefined,
          section: singleSection !== "ALL" ? singleSection : undefined,
        },
        1,
        10,
        "summary"
      ),
    enabled: debouncedSearch.length > 0 && generatorMode === "single" && !!singleClass,
    staleTime: 5 * 60 * 1000,
  });

  const { data: directStudentData, isLoading: isDirectStudentLoading } = useQuery({
    queryKey: ["students", "direct", studentIdParam],
    queryFn: () => getStudentById(studentIdParam!),
    enabled: !!studentIdParam && generatorMode === "single",
    staleTime: 5 * 60 * 1000,
  });

  const { data: rawBulkStudents, isLoading: isBulkLoading } = useQuery({
    queryKey: ["students", "class", bulkClass, bulkSection],
    queryFn: () => getStudents("summary", bulkClass, bulkSection),
    enabled: generatorMode === "bulk" && !!bulkClass,
    staleTime: 5 * 60 * 1000,
  });
  const bulkStudents = rawBulkStudents ?? EMPTY_STUDENTS_ARRAY;

  const isLoadingStudents = isSearchLoading || isDirectStudentLoading || isBulkLoading;

  // Queued admission invoices count fetched directly via lightweight API
  const { data: queuedData } = useQuery({
    queryKey: ["admission", "invoices", "count"],
    queryFn: () => apiFetch<{ count: number }>("/api/admission/invoices/count"),
    staleTime: 5 * 60 * 1000,
  });
  const queuedAdmissionCount = queuedData?.count || 0;

  // Fetch school configuration (including class management) from database
  const { data: schoolConfig } = useSchoolConfigQuery();

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

  const [activeFeeCategory, setActiveFeeCategory] = useState<FeeCategory>(() =>
    getFeeCategoryForClass(classParam?.toUpperCase() || "IX")
  );

  // Available sections for the currently selected singleClass
  const availableSectionsForSingleClass = useMemo(() => {
    if (!singleClass) return ["A", "B", "C", "D"];
    const normClass = singleClass.toUpperCase().trim();
    const matched = dynamicClasses.find(
      (c) => c.code.toUpperCase().trim() === normClass || c.name.toUpperCase().trim() === normClass
    );
    if (matched && Array.isArray(matched.sections) && matched.sections.length > 0) {
      return matched.sections;
    }
    return ["A", "B", "C", "D"];
  }, [dynamicClasses, singleClass]);

  const singleSectionOptions = useMemo(() => {
    return [
      { label: "All Sections", value: "ALL" },
      ...availableSectionsForSingleClass.map((s) => ({
        label: `Section ${s}`,
        value: s,
      })),
    ];
  }, [availableSectionsForSingleClass]);

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

  useEffect(() => {
    if (singleSection !== "ALL" && !availableSectionsForSingleClass.includes(singleSection)) {
      setSingleSection("ALL");
    }
  }, [singleClass, availableSectionsForSingleClass, singleSection]);

  return {
    INVOICE_STORAGE_KEY,
    PREV_INVOICE_STORAGE_KEY,
    academicSessionOptions,
    activeFeeCategory,
    autoDateTime,
    availableSectionsForSelectedClass,
    availableSectionsForSingleClass,
    bulkAssignedTeacher,
    bulkBlankCount,
    bulkClass,
    bulkFillMode,
    bulkPaymentMode,
    bulkPaymentStatus,
    bulkReceiptPrefix,
    bulkRosterSearch,
    bulkSection,
    bulkSession,
    bulkStartingNo,
    bulkStudents,
    classOptions,
    classParam,
    copyType,
    currentA4PageIndex,
    currentPreviewIndex,
    currentSession,
    currentYear,
    debouncedSearch,
    directStudentData,
    dynamicClasses,
    generatorMode,
    getLiveFormattedDateTime,
    getStoredInvoiceSeq,
    getStoredPrevSeq,
    handleUndoLastPrint,
    invoice,
    invoiceSeq,
    isBulkLoading,
    isBulkPrefixLocked,
    isBulkStartingNoLocked,
    isDirectStudentLoading,
    isHistoryOpen,
    isLoadingFullStudent,
    isLoadingStudents,
    isSearchLoading,
    isSingleReceiptLocked,
    isTrackerOpen,
    modeParam,
    prevSeq,
    queuedAdmissionCount,
    queuedData,
    rawBulkStudents,
    router,
    schoolConfig,
    schoolProfile,
    searchParams,
    searchResults,
    sectionOptions,
    sectionParam,
    selectedStudent,
    selectedStudentIds,
    setActiveFeeCategory,
    setAutoDateTime,
    setBulkAssignedTeacher,
    setBulkBlankCount,
    setBulkClass,
    setBulkFillMode,
    setBulkPaymentMode,
    setBulkPaymentStatus,
    setBulkReceiptPrefix,
    setBulkRosterSearch,
    setBulkSection,
    setBulkSession,
    setBulkStartingNo,
    setCopyType,
    setCurrentA4PageIndex,
    setCurrentPreviewIndex,
    setGeneratorMode,
    setInvoice,
    setInvoiceSeq,
    setIsBulkPrefixLocked,
    setIsBulkStartingNoLocked,
    setIsHistoryOpen,
    setIsLoadingFullStudent,
    setIsSingleReceiptLocked,
    setIsTrackerOpen,
    setPrevSeq,
    setSelectedStudent,
    setSelectedStudentIds,
    setSingleClass,
    setSingleSection,
    setStudentSearch,
    singleClass,
    singleSection,
    singleSectionOptions,
    studentIdParam,
    studentSearch,
    syncSequenceFromDatabase,
  };
}

export type InvoiceCore = ReturnType<typeof useInvoiceCore>;
