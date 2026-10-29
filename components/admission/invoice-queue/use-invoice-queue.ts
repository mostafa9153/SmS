"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getStudents } from "@/lib/data/students";
import { getAdmissionApplications } from "@/lib/data/admission";
import { type InvoiceData, type FeeItem, getSavedFeeStructure, generateInvoiceNumber, getFeeCategoryForClass } from "@/lib/utils/fee-config";
import { recordPrintedInvoices } from "@/lib/utils/invoice-registry";
import { recordPrintBatch } from "@/lib/utils/print-history";
import { useSchoolProfile } from "@/lib/hooks/use-school-profile";
import { showToast } from "@/components/ui/toast-banner";
import { apiFetch } from "@/lib/api/client";
import { UnifiedQueueCandidate, ClassSectionGroup } from "./types";

export function useInvoiceQueue() {
  const queryClient = useQueryClient();
  const { profile: schoolProfile } = useSchoolProfile();
  const currentYear = new Date().getFullYear();

  // Queue Section Tab State: "new" | "re" | "all"
  const [queueTab, setQueueTab] = useState<"new" | "re" | "all">("new");

  // Print modal state
  const [activePrintGroup, setActivePrintGroup] = useState<ClassSectionGroup | null>(null);
  const [activeSingleStudent, setActiveSingleStudent] = useState<UnifiedQueueCandidate | null>(null);
  const [printCopyType, setPrintCopyType] = useState<"both" | "student" | "school">("student");
  const [printModalOpen, setPrintModalOpen] = useState(false);

  const INVOICE_STORAGE_KEY = `sms_admission_invoice_last_seq_${currentYear}`;
  const PREV_INVOICE_STORAGE_KEY = `sms_admission_invoice_prev_seq_${currentYear}`;

  const [invoiceSeq, setInvoiceSeq] = useState<number>(1);
  const [isSyncingSeq, setIsSyncingSeq] = useState<boolean>(false);
  const [isTrackerOpen, setIsTrackerOpen] = useState<boolean>(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState<boolean>(false);

  // Field Lock Toggles
  const [isClassLocked, setIsClassLocked] = useState<boolean>(true);
  const [isAmountLocked, setIsAmountLocked] = useState<boolean>(true);
  const [isInvoiceNoLocked, setIsInvoiceNoLocked] = useState<boolean>(true);
  const [customClass, setCustomClass] = useState<string>("");
  const [customFeeItems, setCustomFeeItems] = useState<FeeItem[]>(() => getSavedFeeStructure());

  // UI view & filter controls
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>("ALL");
  const [selectedSession, setSelectedSession] = useState<string>(String(currentYear));
  const [expandedGroupKeys, setExpandedGroupKeys] = useState<Set<string>>(new Set());

  const sessionOptions = useMemo(() => {
    return [
      { label: String(currentYear), value: String(currentYear) },
      { label: String(currentYear + 1), value: String(currentYear + 1) },
    ];
  }, [currentYear]);

  // Sync starting sequence live from database
  const syncSequenceFromDatabase = useCallback(async () => {
    setIsSyncingSeq(true);
    try {
      const data = await apiFetch<{ nextSequence?: number }>(`/api/invoices/next-sequence?year=${currentYear}`);
      if (typeof data.nextSequence === "number" && data.nextSequence >= 1) {
        const seq = data.nextSequence;
        setInvoiceSeq(seq);
        try {
          localStorage.setItem(INVOICE_STORAGE_KEY, String(seq));
        } catch {}
        return seq;
      }
    } catch (e) {
      console.warn("Could not sync next sequence from DB:", e);
    } finally {
      setIsSyncingSeq(false);
    }

    try {
      const saved = localStorage.getItem(INVOICE_STORAGE_KEY);
      if (saved) {
        const parsed = parseInt(saved, 10);
        if (!isNaN(parsed) && parsed >= 1) {
          setInvoiceSeq(parsed);
          return parsed;
        }
      }
    } catch {}
    return 1;
  }, [currentYear, INVOICE_STORAGE_KEY]);

  useEffect(() => {
    syncSequenceFromDatabase();
  }, [syncSequenceFromDatabase]);

  // 1. Fetch Re-admission students live
  const {
    data: allStudents = [],
    isLoading: loadingStudents,
    isFetching: isFetchingStudents,
    refetch: refetchStudents,
  } = useQuery({
    queryKey: ["students"],
    queryFn: () => getStudents("summary"),
    staleTime: 5 * 1000,
    refetchInterval: 6000,
    refetchOnWindowFocus: true,
  });

  // 2. Fetch New Admission applications live
  const {
    data: admittedApplications = [],
    isLoading: loadingApplications,
    isFetching: isFetchingApps,
    refetch: refetchApps,
  } = useQuery({
    queryKey: ["admission_applications_admitted"],
    queryFn: () => getAdmissionApplications({ status: "admitted", admissionType: "new" }),
    staleTime: 5 * 1000,
    refetchInterval: 6000,
    refetchOnWindowFocus: true,
  });

  const refetchAll = () => {
    refetchStudents();
    refetchApps();
    syncSequenceFromDatabase();
  };

  // Convert Re-admitted students into Unified Candidates
  const reAdmittedCandidates = useMemo<UnifiedQueueCandidate[]>(() => {
    return allStudents
      .filter((s) => {
        if (s.currentStatus !== "Continuing") return false;
        const queued = Boolean(s.isInvoiceQueued);
        const admittedPending =
          s.reAdmissionStatus === "admitted" && s.isInvoiceQueued !== false && !s.invoicePrintedAt;
        return queued || admittedPending;
      })
      .map((s) => ({
        id: s.id,
        name: s.name,
        schoolId: s.schoolId || `STU-${s.id.slice(0, 6)}`,
        presentClass: s.presentClass || "V",
        presentSection: s.presentSection || "A",
        presentRoll: s.presentRoll || 1,
        guardianName: s.fatherName || s.guardianName,
        studentContact: s.studentContact || s.altMobile,
        pen: s.pen,
        feeAmount: undefined,
        feePaid: true,
        admissionSource: "re_admission",
        admittedAt: s.reAdmittedAt || s.presentClassAdmissionDate || s.admissionDate || s.createdAt,
        rawRecord: s,
      }));
  }, [allStudents]);

  // Convert New Admission applications into Unified Candidates
  const newAdmissionCandidates = useMemo<UnifiedQueueCandidate[]>(() => {
    return admittedApplications.map((app) => ({
      id: app.id,
      name: app.studentName,
      schoolId: app.schoolId || app.applicationNo,
      presentClass: app.admittedClass || app.targetClass || "V",
      presentSection: app.admittedSection || app.targetSection || "A",
      presentRoll: app.admittedRoll || app.targetRoll || 1,
      guardianName: app.guardianName || app.fatherName,
      studentContact: app.studentContact || app.altMobile,
      feeAmount: app.feeAmount || 600,
      feePaid: app.feePaid !== false,
      paymentReceiptNo: app.paymentReceiptNo,
      admissionSource: "new_admission",
      formMethod: app.formMethod || "offline",
      formNo: (app as any).formNo || (app as any).form_no || app.applicationNo,
      applicationNo: app.applicationNo,
      admittedAt: app.admittedAt || app.createdAt,
      rawRecord: app,
    }));
  }, [admittedApplications]);

  // Unified candidates filtered by active Queue Tab
  const tabCandidates = useMemo<UnifiedQueueCandidate[]>(() => {
    if (queueTab === "new") return newAdmissionCandidates;
    if (queueTab === "re") return reAdmittedCandidates;
    return [...newAdmissionCandidates, ...reAdmittedCandidates];
  }, [queueTab, newAdmissionCandidates, reAdmittedCandidates]);

  // Filtered by Search Query
  const searchFilteredCandidates = useMemo(() => {
    if (!searchQuery.trim()) return tabCandidates;
    const q = searchQuery.toLowerCase().trim();
    return tabCandidates.filter((s) => {
      const nameMatch = s.name?.toLowerCase().includes(q);
      const rollMatch = String(s.presentRoll).includes(q);
      const idMatch = s.schoolId?.toLowerCase().includes(q);
      const appMatch = s.applicationNo?.toLowerCase().includes(q);
      const formMatch = s.formNo?.toLowerCase().includes(q);
      const penMatch = s.pen?.toLowerCase().includes(q);
      const classMatch = s.presentClass?.toLowerCase().includes(q);
      return nameMatch || rollMatch || idMatch || appMatch || formMatch || penMatch || classMatch;
    });
  }, [tabCandidates, searchQuery]);

  // Group by Class and Section
  const groupedByClassSection = useMemo(() => {
    const map = new Map<string, { class: string; section: string; students: UnifiedQueueCandidate[] }>();

    searchFilteredCandidates.forEach((student) => {
      const cls = student.presentClass || "Unassigned";
      const sec = student.presentSection || "A";
      const key = `${cls}-${sec}`;

      if (!map.has(key)) {
        map.set(key, { class: cls, section: sec, students: [] });
      }
      map.get(key)!.students.push(student);
    });

    const groups: ClassSectionGroup[] = [];
    map.forEach((val, key) => {
      val.students.sort((a, b) => (a.presentRoll || 0) - (b.presentRoll || 0));
      groups.push({
        key,
        class: val.class,
        section: val.section,
        students: val.students,
        totalCount: val.students.length,
      });
    });

    const order = ["V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];
    return groups.sort((a, b) => {
      const idxA = order.indexOf(a.class);
      const idxB = order.indexOf(b.class);
      if (idxA !== -1 && idxB !== -1 && idxA !== idxB) return idxA - idxB;
      if (idxA !== -1 && idxB === -1) return -1;
      if (idxA === -1 && idxB !== -1) return 1;
      if (a.class !== b.class) return a.class.localeCompare(b.class);
      return a.section.localeCompare(b.section);
    });
  }, [searchFilteredCandidates]);

  // Filter groups by class tab
  const displayedGroups = useMemo(() => {
    if (selectedClassFilter === "ALL") return groupedByClassSection;
    return groupedByClassSection.filter((g) => g.class === selectedClassFilter);
  }, [groupedByClassSection, selectedClassFilter]);

  // All distinct classes in active queue tab
  const availableClassesInQueue = useMemo(() => {
    const set = new Set<string>();
    tabCandidates.forEach((s) => {
      if (s.presentClass) set.add(s.presentClass);
    });
    const order = ["V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];
    return Array.from(set).sort((a, b) => {
      const idxA = order.indexOf(a);
      const idxB = order.indexOf(b);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      return a.localeCompare(b);
    });
  }, [tabCandidates]);

  function toggleGroupExpand(key: string) {
    setExpandedGroupKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  const [existingInvoicesMap, setExistingInvoicesMap] = useState<Map<string, any>>(new Map());

  // Build InvoiceData objects for active batch
  const currentBatchInvoices = useMemo<InvoiceData[]>(() => {
    const targetStudents = activeSingleStudent
      ? [activeSingleStudent]
      : activePrintGroup?.students || [];

    if (targetStudents.length === 0) return [];

    const targetClass = customClass || targetStudents[0]?.presentClass || "V";
    const category = getFeeCategoryForClass(targetClass);
    const defaultFeeItems =
      customFeeItems && customFeeItems.length > 0
        ? customFeeItems
        : getSavedFeeStructure(category);

    const issueDate = new Date().toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
    const issueTime = new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });

    let autoSeqOffset = 0;

    return targetStudents.map((student, idx) => {
      const sId = (student.schoolId || student.id || "").toUpperCase().trim();
      const existing = existingInvoicesMap.get(sId);

      const invoiceNumber =
        student.paymentReceiptNo ||
        existing?.invoice_number ||
        generateInvoiceNumber(invoiceSeq + autoSeqOffset++, currentYear);

      const feeItems =
        Array.isArray(existing?.fee_items) && existing.fee_items.length > 0
          ? existing.fee_items
          : defaultFeeItems;

      const paymentMode = (existing?.payment_mode as any) || "Cash";
      const paymentStatus = (existing?.payment_status as any) || "Paid";
      const remarks =
        existing?.remarks ||
        (student.admissionSource === "new_admission"
          ? `New Admission Fee ${selectedSession}`
          : `Re-admission Fee ${selectedSession}`);

      return {
        invoiceNumber,
        academicSession: existing?.academic_session || selectedSession,
        issueDate: existing?.issue_date
          ? new Date(existing.issue_date).toLocaleDateString("en-GB", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
            })
          : issueDate,
        issueTime: existing?.issue_time || issueTime,
        studentId: student.schoolId || `STU-${student.id.slice(0, 6)}`,
        studentName: student.name,
        studentClass: customClass || student.presentClass,
        section: student.presentSection || "A",
        rollNo: String(student.presentRoll || idx + 1),
        guardianName: student.guardianName || "N/A",
        contactNumber: student.studentContact || "",
        penNumber: student.pen || "",
        feeItems,
        paymentMode,
        paymentStatus,
        remarks,
      };
    });
  }, [
    activePrintGroup,
    activeSingleStudent,
    selectedSession,
    currentYear,
    invoiceSeq,
    customClass,
    customFeeItems,
    existingInvoicesMap,
  ]);

  const formattedStartReceipt = useMemo(() => {
    return generateInvoiceNumber(invoiceSeq, currentYear);
  }, [invoiceSeq, currentYear]);

  const formattedEndReceipt = useMemo(() => {
    const count = currentBatchInvoices.length || 1;
    return generateInvoiceNumber(invoiceSeq + count - 1, currentYear);
  }, [invoiceSeq, currentBatchInvoices.length, currentYear]);

  // Open batch print modal for a class group
  async function handleOneClickPrint(group: ClassSectionGroup) {
    setActiveSingleStudent(null);
    await syncSequenceFromDatabase();
    setActivePrintGroup(group);
    setCustomClass(group.class);
    const category = getFeeCategoryForClass(group.class);
    setCustomFeeItems(getSavedFeeStructure(category));
    setIsClassLocked(true);
    setIsAmountLocked(true);
    setIsInvoiceNoLocked(true);

    try {
      const studentIds = group.students.map((s) => s.schoolId || s.id).filter(Boolean);
      const rows = await apiFetch<any[]>(`/api/invoices?studentIds=${encodeURIComponent(studentIds.join(","))}`);
      const map = new Map<string, any>();
      if (Array.isArray(rows)) {
        rows.forEach((inv: any) => {
          if (inv.student_id) map.set(inv.student_id.toUpperCase().trim(), inv);
        });
      }
      setExistingInvoicesMap(map);
    } catch (e) {
      console.warn("Could not fetch existing invoices:", e);
    }

    setPrintModalOpen(true);
  }

  // Open single student print modal
  async function handleSingleStudentPrint(student: UnifiedQueueCandidate) {
    setActivePrintGroup(null);
    setActiveSingleStudent(student);
    await syncSequenceFromDatabase();
    setCustomClass(student.presentClass);
    const category = getFeeCategoryForClass(student.presentClass);
    setCustomFeeItems(getSavedFeeStructure(category));
    setIsClassLocked(true);
    setIsAmountLocked(true);
    setIsInvoiceNoLocked(true);

    try {
      const sId = student.schoolId || student.id;
      const rows = await apiFetch<any[]>(`/api/invoices?studentId=${encodeURIComponent(sId)}`);
      const map = new Map<string, any>();
      if (Array.isArray(rows) && rows.length > 0) {
        map.set(sId.toUpperCase().trim(), rows[0]);
      }
      setExistingInvoicesMap(map);
    } catch (e) {
      console.warn("Could not fetch existing invoice for student:", e);
    }

    setPrintModalOpen(true);
  }

  // Execute print & save to registry
  async function handleExecutePrint(clearQueue: boolean) {
    if (currentBatchInvoices.length === 0) return;

    const count = currentBatchInvoices.length;
    const startSerial = invoiceSeq;
    const endSerial = invoiceSeq + count - 1;
    const formattedStart = generateInvoiceNumber(startSerial, currentYear);
    const formattedEnd = generateInvoiceNumber(endSerial, currentYear);

    const classLabel = activeSingleStudent
      ? `Single: ${activeSingleStudent.name} (Class ${activeSingleStudent.presentClass})`
      : `Admission Queue: Class ${activePrintGroup?.class} (${activePrintGroup?.section})`;

    recordPrintBatch(
      {
        docType: "invoice",
        mode: activeSingleStudent ? "single" : "bulk",
        fillMode: "fill",
        startSerial,
        endSerial,
        formattedStart,
        formattedEnd,
        count,
        classInfo: classLabel,
      },
      currentYear
    );

    try {
      await recordPrintedInvoices(
        currentBatchInvoices,
        activeSingleStudent ? "single" : "bulk",
        printCopyType
      );
    } catch (err) {
      console.error("Failed to record invoices to DB:", err);
    }

    const nextSeq = invoiceSeq + count;
    try {
      localStorage.setItem(PREV_INVOICE_STORAGE_KEY, String(invoiceSeq));
      localStorage.setItem(INVOICE_STORAGE_KEY, String(nextSeq));
    } catch (e) {
      console.error(e);
    }
    setInvoiceSeq(nextSeq);

    window.print();

    if (clearQueue) {
      const targetList = activeSingleStudent
        ? [activeSingleStudent]
        : activePrintGroup?.students || [];
      clearQueueMutation.mutate(targetList);
    } else {
      showToast(
        `Invoices #${formattedStart} to #${formattedEnd} recorded in official registry.`,
        "success"
      );
      setPrintModalOpen(false);
    }
  }

  const handleUndoBatch = (newNextSerial: number) => {
    setInvoiceSeq(newNextSerial);
    try {
      localStorage.setItem(INVOICE_STORAGE_KEY, String(newNextSerial));
    } catch {}
    showToast(`Invoice sequence reverted to #${String(newNextSerial).padStart(4, "0")}`, "info");
  };

  const clearQueueMutation = useMutation({
    mutationFn: async (candidates: UnifiedQueueCandidate[]) => {
      const studentIds = candidates.filter((c) => c.admissionSource === "re_admission").map((c) => c.id);
      const applicationIds = candidates.filter((c) => c.admissionSource === "new_admission").map((c) => c.id);

      return apiFetch<{ clearedCount?: number }>("/api/admission/invoices/mark-printed", {
        method: "POST",
        json: { studentIds, applicationIds },
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
      queryClient.invalidateQueries({ queryKey: ["admission_applications_admitted"] });
      showToast(
        `${data.clearedCount || "All"} invoices marked as printed. Queue updated.`,
        "success"
      );
      setPrintModalOpen(false);
    },
    onError: (err: any) => {
      showToast(err.message || "Failed to update queue", "error");
    },
  });

  const totalQueuedCount = newAdmissionCandidates.length + reAdmittedCandidates.length;

  return {
    activePrintGroup,
    activeSingleStudent,
    availableClassesInQueue,
    clearQueueMutation,
    currentBatchInvoices,
    customClass,
    customFeeItems,
    displayedGroups,
    expandedGroupKeys,
    formattedEndReceipt,
    formattedStartReceipt,
    groupedByClassSection,
    handleExecutePrint,
    handleOneClickPrint,
    handleSingleStudentPrint,
    handleUndoBatch,
    invoiceSeq,
    isAmountLocked,
    isClassLocked,
    isFetchingApps,
    isFetchingStudents,
    isHistoryOpen,
    isInvoiceNoLocked,
    isSyncingSeq,
    isTrackerOpen,
    loadingApplications,
    loadingStudents,
    newAdmissionCandidates,
    printCopyType,
    printModalOpen,
    queueTab,
    reAdmittedCandidates,
    refetchAll,
    schoolProfile,
    searchQuery,
    selectedClassFilter,
    selectedSession,
    sessionOptions,
    setCustomClass,
    setCustomFeeItems,
    setInvoiceSeq,
    setIsAmountLocked,
    setIsClassLocked,
    setIsHistoryOpen,
    setIsInvoiceNoLocked,
    setIsTrackerOpen,
    setPrintCopyType,
    setPrintModalOpen,
    setQueueTab,
    setSearchQuery,
    setSelectedClassFilter,
    setSelectedSession,
    setViewMode,
    tabCandidates,
    toggleGroupExpand,
    totalQueuedCount,
    viewMode,
  };
}

export type InvoiceQueueState = ReturnType<typeof useInvoiceQueue>;
