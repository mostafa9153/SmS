"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getStudents } from "@/lib/data/students";
import type { Student } from "@/lib/types";
import {
  type InvoiceData,
  type FeeItem,
  getSavedFeeStructure,
  calculateFeeTotal,
  generateInvoiceNumber,
  getFeeCategoryForClass,
} from "@/lib/utils/fee-config";
import {
  InvoicePrintableBatchView,
  InvoicePrintableView,
} from "@/components/invoice/invoice-printable-view";
import { InvoiceTrackerModal } from "@/components/invoice/invoice-tracker-modal";
import { PrintHistoryModal } from "@/components/ui/print-history-modal";
import { recordPrintedInvoices } from "@/lib/utils/invoice-registry";
import { recordPrintBatch } from "@/lib/utils/print-history";
import { useSchoolProfile } from "@/lib/utils/school-profile";
import { PinchZoomViewer } from "@/components/ui/pinch-zoom-viewer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { showToast } from "@/components/ui/toast-banner";
import { CustomSelect } from "@/components/ui/custom-select";
import {
  Printer,
  ArrowLeft,
  Users,
  RefreshCw,
  CheckCheck,
  ChevronDown,
  LayoutList,
  LayoutGrid,
  Search,
  CheckCircle2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  ShieldCheck,
  Lock,
  Unlock,
  Clock,
  Layers,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ClassSectionGroup {
  key: string;
  class: string;
  section: string;
  students: Student[];
  totalCount: number;
}

function getStudentQueuedTime(student: Student): { dateStr: string; timeStr: string } {
  const ts =
    student.reAdmittedAt ||
    student.presentClassAdmissionDate ||
    student.admissionDate ||
    student.createdAt ||
    student.updatedAt;

  if (ts) {
    try {
      const d = new Date(ts);
      if (!isNaN(d.getTime())) {
        const dateStr = d.toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        });
        const timeStr = d.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        });
        return { dateStr, timeStr };
      }
    } catch {}
  }

  const now = new Date();
  return {
    dateStr: now.toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" }),
    timeStr: now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true }),
  };
}

export default function AdmissionQueuePage() {
  const queryClient = useQueryClient();
  const { profile: schoolProfile } = useSchoolProfile();
  const currentYear = new Date().getFullYear();

  // Print modal state
  const [activePrintGroup, setActivePrintGroup] = useState<ClassSectionGroup | null>(null);
  const [activeSingleStudent, setActiveSingleStudent] = useState<Student | null>(null);
  const [printCopyType, setPrintCopyType] = useState<"both" | "student" | "school">("student");
  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [previewZoom, setPreviewZoom] = useState<number>(0.95);

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
      const res = await fetch(`/api/invoices/next-sequence?year=${currentYear}`);
      const data = await res.json();
      if (res.ok && typeof data.nextSequence === "number" && data.nextSequence >= 1) {
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

  // Fetch students live
  const {
    data: allStudents = [],
    isLoading: loadingStudents,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ["students"],
    queryFn: () => getStudents("summary"),
    staleTime: 5 * 1000,
    refetchInterval: 6000,
    refetchOnWindowFocus: true,
  });

  // Filter students who are ready in the active admission invoice queue
  const queuedStudents = useMemo(() => {
    return allStudents.filter((s) => {
      if (s.currentStatus !== "Continuing") return false;
      const queued = Boolean(s.isInvoiceQueued);
      const admittedPending =
        s.reAdmissionStatus === "admitted" && s.isInvoiceQueued !== false && !s.invoicePrintedAt;
      const newAdmitQueued = s.admissionYear === currentYear && queued && !s.invoicePrintedAt;
      return queued || admittedPending || newAdmitQueued;
    });
  }, [allStudents, currentYear]);

  // Filtered by Search Query
  const searchFilteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return queuedStudents;
    const q = searchQuery.toLowerCase().trim();
    return queuedStudents.filter((s) => {
      const nameMatch = s.name?.toLowerCase().includes(q);
      const rollMatch = String(s.presentRoll).includes(q);
      const idMatch = s.schoolId?.toLowerCase().includes(q);
      const penMatch = s.pen?.toLowerCase().includes(q);
      const classMatch = s.presentClass?.toLowerCase().includes(q);
      return nameMatch || rollMatch || idMatch || penMatch || classMatch;
    });
  }, [queuedStudents, searchQuery]);

  // Group by Class and Section
  const groupedByClassSection = useMemo(() => {
    const map = new Map<string, { class: string; section: string; students: Student[] }>();

    searchFilteredStudents.forEach((student) => {
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
  }, [searchFilteredStudents]);

  // Filter groups by class tab
  const displayedGroups = useMemo(() => {
    if (selectedClassFilter === "ALL") return groupedByClassSection;
    return groupedByClassSection.filter((g) => g.class === selectedClassFilter);
  }, [groupedByClassSection, selectedClassFilter]);

  // All distinct classes in queue
  const availableClassesInQueue = useMemo(() => {
    const set = new Set<string>();
    queuedStudents.forEach((s) => {
      if (s.presentClass) set.add(s.presentClass);
    });
    const order = ["V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];
    return Array.from(set).sort((a, b) => {
      const idxA = order.indexOf(a);
      const idxB = order.indexOf(b);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      return a.localeCompare(b);
    });
  }, [queuedStudents]);

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
        existing?.invoice_number ||
        generateInvoiceNumber(invoiceSeq + autoSeqOffset++, currentYear);
      const feeItems =
        Array.isArray(existing?.fee_items) && existing.fee_items.length > 0
          ? existing.fee_items
          : defaultFeeItems;
      const paymentMode = (existing?.payment_mode as any) || "Cash";
      const paymentStatus = (existing?.payment_status as any) || "Paid";
      const remarks = existing?.remarks || `Admission Fee ${selectedSession}`;

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
        guardianName: student.fatherName || student.guardianName || "N/A",
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
      const res = await fetch(
        `/api/invoices?studentIds=${encodeURIComponent(studentIds.join(","))}`
      );
      const data = await res.json();
      const map = new Map<string, any>();
      if (res.ok && Array.isArray(data?.data)) {
        data.data.forEach((inv: any) => {
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
  async function handleSingleStudentPrint(student: Student) {
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
      const res = await fetch(`/api/invoices?studentId=${encodeURIComponent(sId)}`);
      const data = await res.json();
      const map = new Map<string, any>();
      if (res.ok && Array.isArray(data?.data) && data.data.length > 0) {
        map.set(sId.toUpperCase().trim(), data.data[0]);
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
    mutationFn: async (students: Student[]) => {
      const studentIds = students.map((s) => s.id);
      const res = await fetch("/api/admission/invoices/mark-printed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentIds }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to update queue");
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
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

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-5 print:hidden">
        <div className="flex items-center gap-3">
          <Link
            href="/admission"
            className="p-2.5 rounded-xl border hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            title="Back to Admission Desk"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
              <Printer className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              <span>Admission Queue</span>
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Live Active</span>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              refetch();
              syncSequenceFromDatabase();
            }}
            disabled={isFetching || isSyncingSeq}
            className="h-9 px-3 rounded-xl text-xs font-semibold cursor-pointer flex items-center gap-1.5"
          >
            <RefreshCw
              className={cn(
                "h-3.5 w-3.5 text-purple-600",
                (isFetching || isSyncingSeq) && "animate-spin"
              )}
            />
            <span className="hidden sm:inline">Refresh</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsTrackerOpen(true)}
            className="h-9 px-3 rounded-xl text-xs font-semibold cursor-pointer flex items-center gap-1.5 border-teal-300 dark:border-teal-700 bg-teal-500/10 text-teal-700 dark:text-teal-300 hover:bg-teal-500/20"
          >
            <ShieldCheck className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
            <span className="hidden sm:inline">Tracker</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsHistoryOpen(true)}
            className="h-9 px-3 rounded-xl text-xs font-semibold cursor-pointer flex items-center gap-1.5 border-amber-300 dark:border-amber-700 bg-amber-500/10 text-amber-700 dark:text-amber-400 hover:bg-amber-500/20"
          >
            <RotateCcw className="h-3.5 w-3.5 shrink-0" />
            <span className="hidden sm:inline">History</span>
          </Button>

          <Link
            href="/generate/invoice"
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border hover:bg-muted text-xs sm:text-sm font-semibold transition-all"
          >
            <span>Custom Generator</span>
          </Link>
        </div>
      </div>

      {/* Overview Stat Chips */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 print:hidden">
        <div className="bg-card border rounded-2xl p-4 shadow-2xs">
          <span className="text-[11px] font-semibold text-muted-foreground">Queued Invoices</span>
          <p className="text-2xl font-black mt-1 text-purple-600 dark:text-purple-400">
            {queuedStudents.length}
          </p>
        </div>
        <div className="bg-card border rounded-2xl p-4 shadow-2xs">
          <span className="text-[11px] font-semibold text-muted-foreground">Class Batches</span>
          <p className="text-2xl font-black mt-1 text-foreground">{groupedByClassSection.length}</p>
        </div>
        <div className="bg-card border rounded-2xl p-4 shadow-2xs flex flex-col justify-between">
          <span className="text-[11px] font-semibold text-muted-foreground">Academic Session</span>
          <div className="w-28 mt-1">
            <CustomSelect
              value={selectedSession}
              onChange={(val) => setSelectedSession(String(val))}
              options={sessionOptions}
              searchable={false}
              triggerClassName="h-7 text-xs font-black bg-background border-border/70"
            />
          </div>
        </div>
        <div className="bg-card border rounded-2xl p-4 shadow-2xs">
          <span className="text-[11px] font-semibold text-muted-foreground">Print Engine</span>
          <p className="text-2xl font-black mt-1 text-emerald-600 dark:text-emerald-400">
            A4 4-Up / A5 Dual
          </p>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="space-y-3 print:hidden">
        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search candidate by name, roll, student ID, or PEN..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-10 text-xs rounded-xl"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
            >
              Clear
            </button>
          )}
        </div>

        {/* Class Filter Chips & View Mode Switcher */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 custom-scrollbar">
            <button
              type="button"
              onClick={() => setSelectedClassFilter("ALL")}
              className={cn(
                "px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap",
                selectedClassFilter === "ALL"
                  ? "bg-purple-600 text-white shadow-2xs"
                  : "bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80"
              )}
            >
              All Classes ({queuedStudents.length})
            </button>
            {availableClassesInQueue.map((cls) => {
              const count = queuedStudents.filter((s) => s.presentClass === cls).length;
              return (
                <button
                  key={cls}
                  type="button"
                  onClick={() => setSelectedClassFilter(cls)}
                  className={cn(
                    "px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap",
                    selectedClassFilter === cls
                      ? "bg-purple-600 text-white shadow-2xs"
                      : "bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80"
                  )}
                >
                  Class {cls} ({count})
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-1 bg-muted p-1 rounded-xl border border-border/80 self-end sm:self-auto shrink-0">
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={cn(
                "px-2.5 py-1 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer",
                viewMode === "list"
                  ? "bg-background text-foreground shadow-2xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <LayoutList className="h-3.5 w-3.5" />
              <span>List</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className={cn(
                "px-2.5 py-1 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer",
                viewMode === "grid"
                  ? "bg-background text-foreground shadow-2xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              <span>Cards</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Queue Content */}
      <div className="print:hidden">
        {loadingStudents ? (
          <div className="p-12 text-center text-xs text-muted-foreground animate-pulse">
            Loading admission queue...
          </div>
        ) : displayedGroups.length === 0 ? (
          <div className="bg-card border rounded-3xl p-12 text-center space-y-3">
            <div className="h-14 w-14 rounded-full bg-purple-500/10 text-purple-600 flex items-center justify-center mx-auto">
              <CheckCheck className="h-7 w-7" />
            </div>
            <h3 className="text-base font-bold text-foreground">No Pending Invoices</h3>
            <div className="pt-2 flex items-center justify-center gap-3">
              <Link
                href="/admission/re"
                className="px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold transition-all"
              >
                Re-admission Desk
              </Link>
              <Link
                href="/admission/new"
                className="px-4 py-2 rounded-xl border hover:bg-muted text-xs font-bold transition-all"
              >
                New Admission
              </Link>
            </div>
          </div>
        ) : viewMode === "list" ? (
          /* LIST VIEW */
          <div className="space-y-3">
            {displayedGroups.map((group) => {
              const isExpanded = expandedGroupKeys.has(group.key);
              const minRoll = group.students[0]?.presentRoll || 1;
              const maxRoll =
                group.students[group.students.length - 1]?.presentRoll || group.totalCount;

              return (
                <div
                  key={group.key}
                  className="bg-card border border-border/80 rounded-2xl shadow-2xs hover:border-purple-300 dark:hover:border-purple-800 transition-all overflow-hidden"
                >
                  <div className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="px-3.5 py-2 rounded-xl bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20 font-black text-sm sm:text-base shrink-0">
                        {group.class} - {group.section}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-base sm:text-lg font-black text-foreground">
                            Class {group.class} - {group.section}{" "}
                            <span className="text-purple-600 dark:text-purple-400">
                              ({group.totalCount})
                            </span>
                          </h3>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                            Ready
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">
                          Rolls: #{minRoll} to #{maxRoll}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0 self-end md:self-auto w-full md:w-auto">
                      <button
                        type="button"
                        onClick={() => toggleGroupExpand(group.key)}
                        className="text-xs font-semibold px-3 py-2 rounded-xl border hover:bg-muted text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        <span>{isExpanded ? "Hide" : `Students (${group.totalCount})`}</span>
                        <ChevronDown
                          className={cn(
                            "h-3.5 w-3.5 transition-transform duration-200",
                            isExpanded && "rotate-180"
                          )}
                        />
                      </button>

                      <Button
                        onClick={() => handleOneClickPrint(group)}
                        className="flex-1 md:flex-initial bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs sm:text-sm h-10 px-5 rounded-xl shadow-xs cursor-pointer flex items-center justify-center gap-2 transition-all hover:scale-[1.02]"
                      >
                        <Printer className="h-4 w-4" />
                        <span>Batch Print ({group.totalCount})</span>
                      </Button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="border-t border-border/70 bg-muted/20 p-4 space-y-2">
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                        {group.students.map((student) => {
                          const timeInfo = getStudentQueuedTime(student);
                          return (
                            <div
                              key={student.id}
                              className="flex items-center justify-between p-3 rounded-xl bg-background border border-border/80 text-xs gap-2 shadow-2xs hover:border-purple-300 dark:hover:border-purple-800 transition-colors"
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <span className="font-mono font-bold text-[11px] w-6 text-muted-foreground shrink-0">
                                  #{student.presentRoll}
                                </span>
                                <div className="truncate min-w-0">
                                  <p className="font-bold text-foreground truncate">{student.name}</p>
                                  <p className="text-[10px] text-muted-foreground font-mono truncate">
                                    {student.schoolId || student.id.slice(0, 8)}
                                  </p>
                                  <span className="text-[9.5px] text-muted-foreground font-mono flex items-center gap-1 pt-0.5">
                                    <Clock className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                                    <span>{timeInfo.dateStr}, {timeInfo.timeStr}</span>
                                  </span>
                                </div>
                              </div>
                              <div className="flex flex-col items-end shrink-0 gap-1.5">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleSingleStudentPrint(student)}
                                  className="h-7 px-2.5 text-[11px] font-bold rounded-lg gap-1 cursor-pointer hover:bg-purple-50 text-purple-700 border-purple-200"
                                >
                                  <Printer className="w-3 h-3" />
                                  <span>Print</span>
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          /* GRID VIEW */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {displayedGroups.map((group) => (
              <div
                key={group.key}
                className="bg-card border border-border/80 rounded-3xl p-5 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between border-b pb-3.5 mb-3.5">
                    <span className="px-3 py-1 rounded-xl bg-purple-500/10 text-purple-700 dark:text-purple-300 font-black text-sm border border-purple-500/20">
                      Class {group.class} - {group.section}
                    </span>
                    <span className="text-xs font-bold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/40 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Users className="h-3.5 w-3.5" />
                      <span>({group.totalCount})</span>
                    </span>
                  </div>

                  <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1 custom-scrollbar">
                    {group.students.map((student) => {
                      const timeInfo = getStudentQueuedTime(student);
                      return (
                        <div
                          key={student.id}
                          className="flex items-center justify-between text-xs py-2 px-2.5 rounded-xl bg-muted/40 hover:bg-muted/70 transition-colors gap-2"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="font-mono font-bold text-[10px] w-6 text-muted-foreground shrink-0">
                              #{student.presentRoll}
                            </span>
                            <div className="truncate min-w-0">
                              <span className="font-medium text-foreground truncate block">
                                {student.name}
                              </span>
                              <span className="text-[9.5px] text-muted-foreground font-mono flex items-center gap-1">
                                <Clock className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                                <span>{timeInfo.dateStr}, {timeInfo.timeStr}</span>
                              </span>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSingleStudentPrint(student)}
                            className="h-6 px-2 text-[10px] font-bold rounded cursor-pointer hover:bg-purple-100 text-purple-700"
                          >
                            <Printer className="w-3 h-3 mr-0.5" /> Print
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="mt-5 pt-4 border-t border-border/60">
                  <Button
                    onClick={() => handleOneClickPrint(group)}
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs h-10 rounded-xl shadow-xs cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Printer className="h-4 w-4" />
                    <span>Batch Print ({group.totalCount})</span>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Batch / Single Print Preview & Execution Modal */}
      <Dialog open={printModalOpen} onOpenChange={setPrintModalOpen}>
        <DialogContent className="w-[96vw] max-w-6xl max-h-[94vh] flex flex-col p-4 sm:p-6 bg-card border border-border/80 rounded-3xl shadow-2xl overflow-hidden print:w-auto print:max-w-none print:h-auto print:max-h-none print:p-0 print:border-none print:shadow-none print:bg-white print:overflow-visible">
          <style jsx global>{`
            @media print {
              body > *:not(:has(#bulk-invoice-print-container)) {
                display: none !important;
              }
              [data-slot="dialog-overlay"],
              [data-slot="dialog-close"] {
                display: none !important;
              }
              #bulk-invoice-preview-viewport {
                padding: 0 !important;
                margin: 0 !important;
                background: transparent !important;
                overflow: visible !important;
              }
              #bulk-invoice-print-container {
                transform: none !important;
                margin: 0 !important;
                padding: 0 !important;
              }
            }
          `}</style>

          {/* Modal Header */}
          <DialogHeader className="shrink-0 border-b border-border/70 pb-4 pr-10 sm:pr-12 print:hidden">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 border border-purple-500/20">
                  <Printer className="h-5 w-5" />
                </div>
                <div>
                  <DialogTitle className="text-base sm:text-lg font-black tracking-tight text-foreground flex items-center gap-2 flex-wrap">
                    {activeSingleStudent ? (
                      <span>
                        Single Invoice: {activeSingleStudent.name} (Class {activeSingleStudent.presentClass})
                      </span>
                    ) : (
                      <span>
                        Batch Invoices: Class {activePrintGroup?.class} – Section {activePrintGroup?.section}
                      </span>
                    )}
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20">
                      {currentBatchInvoices.length} {currentBatchInvoices.length === 1 ? "slip" : "slips"}
                    </span>
                  </DialogTitle>

                  {/* Lockable Config Controls */}
                  <div className="flex items-center gap-2 mt-2 flex-wrap text-xs">
                    {/* Class */}
                    <div className="flex items-center gap-1.5 bg-muted/80 px-2.5 py-1 rounded-xl border border-border/70 shadow-2xs">
                      <span className="text-[10.5px] font-bold text-muted-foreground uppercase tracking-wide">
                        Class:
                      </span>
                      {isClassLocked ? (
                        <span className="font-mono font-bold text-foreground">
                          {customClass || activePrintGroup?.class || activeSingleStudent?.presentClass || "VI"}
                        </span>
                      ) : (
                        <select
                          value={customClass}
                          onChange={(e) => setCustomClass(e.target.value)}
                          className="h-6 px-1.5 text-xs font-bold border rounded bg-background text-foreground cursor-pointer"
                        >
                          {["V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"].map((cls) => (
                            <option key={cls} value={cls}>
                              Class {cls}
                            </option>
                          ))}
                        </select>
                      )}
                      <button
                        type="button"
                        onClick={() => setIsClassLocked((prev) => !prev)}
                        className="p-1 rounded text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                        title={isClassLocked ? "Unlock to change Class" : "Lock Class"}
                      >
                        {isClassLocked ? (
                          <Lock className="w-3 h-3 text-slate-400" />
                        ) : (
                          <Unlock className="w-3 h-3 text-amber-500" />
                        )}
                      </button>
                    </div>

                    {/* Amount */}
                    <div className="flex items-center gap-1.5 bg-muted/80 px-2.5 py-1 rounded-xl border border-border/70 shadow-2xs">
                      <span className="text-[10.5px] font-bold text-muted-foreground uppercase tracking-wide">
                        Amount:
                      </span>
                      {isAmountLocked ? (
                        <span className="font-mono font-extrabold text-emerald-700 dark:text-emerald-400">
                          ₹{calculateFeeTotal(customFeeItems)}
                        </span>
                      ) : (
                        <div className="flex items-center gap-1">
                          <span className="text-xs font-bold">₹</span>
                          <input
                            type="number"
                            min={0}
                            value={calculateFeeTotal(customFeeItems)}
                            onChange={(e) => {
                              const newTotal = Math.max(0, parseInt(e.target.value, 10) || 0);
                              const otherSum = customFeeItems
                                .filter((i) => i.id !== "fee-session")
                                .reduce((s, i) => s + (Number(i.amount) || 0), 0);
                              const newSession = Math.max(0, newTotal - otherSum);
                              setCustomFeeItems((prev) =>
                                prev.map((item) =>
                                  item.id === "fee-session" ? { ...item, amount: newSession } : item
                                )
                              );
                            }}
                            className="w-16 h-6 px-1.5 text-xs font-mono font-bold border rounded bg-background text-foreground"
                          />
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => setIsAmountLocked((prev) => !prev)}
                        className="p-1 rounded text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                        title={isAmountLocked ? "Unlock to adjust Fee Amount" : "Lock Fee Amount"}
                      >
                        {isAmountLocked ? (
                          <Lock className="w-3 h-3 text-slate-400" />
                        ) : (
                          <Unlock className="w-3 h-3 text-amber-500" />
                        )}
                      </button>
                    </div>

                    {/* Receipt No */}
                    <div className="flex items-center gap-1.5 bg-muted/80 px-2.5 py-1 rounded-xl border border-border/70 shadow-2xs">
                      <span className="text-[10.5px] font-bold text-muted-foreground uppercase tracking-wide">
                        Receipt:
                      </span>
                      {isInvoiceNoLocked ? (
                        <span className="font-mono font-bold text-purple-700 dark:text-purple-300">
                          {formattedStartReceipt}{" "}
                          {currentBatchInvoices.length > 1 ? `→ ${formattedEndReceipt}` : ""}
                        </span>
                      ) : (
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-muted-foreground font-semibold">
                            Start #:
                          </span>
                          <input
                            type="number"
                            min={1}
                            value={invoiceSeq}
                            onChange={(e) =>
                              setInvoiceSeq(Math.max(1, parseInt(e.target.value, 10) || 1))
                            }
                            className="w-16 h-6 px-1.5 text-xs font-mono font-bold border rounded bg-background text-foreground"
                          />
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => setIsInvoiceNoLocked((prev) => !prev)}
                        className="p-1 rounded text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                        title={isInvoiceNoLocked ? "Unlock to edit Starting Receipt No" : "Lock Receipt No"}
                      >
                        {isInvoiceNoLocked ? (
                          <Lock className="w-3 h-3 text-slate-400" />
                        ) : (
                          <Unlock className="w-3 h-3 text-amber-500" />
                        )}
                      </button>
                    </div>

                    {/* Copy Type Selector */}
                    <div className="flex items-center gap-1 bg-muted/80 p-0.5 rounded-xl border border-border/70">
                      <button
                        type="button"
                        onClick={() => setPrintCopyType("student")}
                        className={cn(
                          "px-2 py-0.5 rounded-lg text-[10px] font-bold cursor-pointer transition-all",
                          printCopyType === "student"
                            ? "bg-purple-600 text-white"
                            : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        Student (A4 4-Up)
                      </button>
                      <button
                        type="button"
                        onClick={() => setPrintCopyType("both")}
                        className={cn(
                          "px-2 py-0.5 rounded-lg text-[10px] font-bold cursor-pointer transition-all",
                          printCopyType === "both"
                            ? "bg-purple-600 text-white"
                            : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        Both (A5 Dual)
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Zoom & Action Buttons */}
              <div className="flex items-center gap-2.5 flex-wrap">
                {printCopyType === "student" || printCopyType === "school" ? (
                  <div className="flex items-center px-2.5 py-1 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-700 dark:text-purple-300 text-[11px] font-bold font-mono">
                    A4 Pages: {Math.ceil(currentBatchInvoices.length / 4)}
                  </div>
                ) : (
                  <div className="flex items-center px-2.5 py-1 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-700 dark:text-purple-300 text-[11px] font-bold font-mono">
                    A5 Sheets: {currentBatchInvoices.length}
                  </div>
                )}

                <Button
                  onClick={() => handleExecutePrint(true)}
                  disabled={clearQueueMutation.isPending}
                  className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs h-9 px-4 rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Printer className="h-4 w-4" />
                  <span>Print &amp; Clear Queue</span>
                </Button>
              </div>
            </div>
          </DialogHeader>

          {/* Printable Scrollable Canvas with Pinch-to-Zoom */}
          <div
            id="bulk-invoice-preview-viewport"
            className="flex-1 overflow-y-auto max-h-[75vh] custom-scrollbar p-1"
          >
            <PinchZoomViewer
              initialScale={0.75}
              minScale={0.4}
              maxScale={2.0}
              scale={previewZoom}
              onScaleChange={setPreviewZoom}
              showControls={false}
              canvasClassName="min-h-[460px] bg-slate-100/90 dark:bg-slate-900/70"
            >
              <div id="bulk-invoice-print-container" className="flex justify-center w-full">
                <InvoicePrintableBatchView
                  invoices={currentBatchInvoices}
                  copyType={printCopyType}
                  schoolProfile={schoolProfile}
                />
              </div>
            </PinchZoomViewer>
          </div>
        </DialogContent>
      </Dialog>

      {/* Invoice Registry Tracker Modal */}
      <InvoiceTrackerModal
        isOpen={isTrackerOpen}
        onClose={() => setIsTrackerOpen(false)}
      />

      {/* Print History Modal with Batch Undo */}
      <PrintHistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        docType="invoice"
        title="Admission Invoices Print History"
        onUndoBatch={handleUndoBatch}
      />
    </div>
  );
}
