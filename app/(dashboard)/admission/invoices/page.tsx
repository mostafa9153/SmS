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
} from "@/lib/utils/fee-config";
import { InvoicePrintableBatchView } from "@/components/invoice/invoice-printable-view";
import { InvoiceTrackerModal } from "@/components/invoice/invoice-tracker-modal";
import { PrintHistoryModal } from "@/components/ui/print-history-modal";
import { recordPrintedInvoices } from "@/lib/utils/invoice-registry";
import { recordPrintBatch } from "@/lib/utils/print-history";
import { useSchoolProfile } from "@/lib/utils/school-profile";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  Filter,
  CheckCircle2,
  Sparkles,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  ShieldCheck,
  Lock,
  Unlock,
  Clock,
  Calendar,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ClassSectionGroup {
  key: string;
  class: string;
  section: string;
  students: Student[];
  totalCount: number;
}

/**
 * Format student queued/admission timestamp with date & time
 */
function getStudentQueuedTime(student: Student): { dateStr: string; timeStr: string; rawIso?: string } {
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
        return { dateStr, timeStr, rawIso: ts };
      }
    } catch {}
  }

  const now = new Date();
  return {
    dateStr: now.toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" }),
    timeStr: now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true }),
  };
}

export default function BulkInvoicesPage() {
  const queryClient = useQueryClient();
  const { profile: schoolProfile } = useSchoolProfile();
  const currentYear = new Date().getFullYear();

  // Print modal state - Default to 4-Up Student Copy (4 slips per A4 page)
  const [activePrintGroup, setActivePrintGroup] = useState<ClassSectionGroup | null>(null);
  const [printCopyType, setPrintCopyType] = useState<"both" | "student" | "school">("student");
  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [previewZoom, setPreviewZoom] = useState<number>(0.95);

  // Shared Invoice Sequence Tracking (connected to /generate/invoice backend)
  const INVOICE_STORAGE_KEY = `sms_admission_invoice_last_seq_${currentYear}`;
  const PREV_INVOICE_STORAGE_KEY = `sms_admission_invoice_prev_seq_${currentYear}`;

  const [invoiceSeq, setInvoiceSeq] = useState<number>(1);
  const [isSyncingSeq, setIsSyncingSeq] = useState<boolean>(false);
  const [isTrackerOpen, setIsTrackerOpen] = useState<boolean>(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState<boolean>(false);

  // Field Lock Toggles (Class, Fee Amount, Invoice No - Locked by default, click lock icon to unlock)
  const [isClassLocked, setIsClassLocked] = useState<boolean>(true);
  const [isAmountLocked, setIsAmountLocked] = useState<boolean>(true);
  const [isInvoiceNoLocked, setIsInvoiceNoLocked] = useState<boolean>(true);
  const [customClass, setCustomClass] = useState<string>("");
  const [customFeeItems, setCustomFeeItems] = useState<FeeItem[]>(() => getSavedFeeStructure());

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

  // UI view & filter controls
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>("ALL");
  const [selectedSession, setSelectedSession] = useState<string>(String(currentYear));
  const [expandedGroupKeys, setExpandedGroupKeys] = useState<Set<string>>(new Set());

  // Dynamic Academic Session options (Clean: current year and +1 year advance)
  const sessionOptions = useMemo(() => {
    return [
      { label: String(currentYear), value: String(currentYear) },
      { label: String(currentYear + 1), value: String(currentYear + 1) },
    ];
  }, [currentYear]);

  // 1. Fetch all students live with real-time auto-polling (every 6 seconds)
  const {
    data: allStudents = [],
    isLoading: loadingStudents,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ["students"],
    queryFn: () => getStudents("summary"),
    staleTime: 5 * 1000,
    refetchInterval: 6000, // Live auto-poll every 6 seconds
    refetchOnWindowFocus: true,
  });

  // Filter students who are ready for invoice printing in the active queue
  const queuedStudents = useMemo(() => {
    return allStudents.filter((s) => {
      if (s.currentStatus !== "Continuing") return false;
      const queued = Boolean(s.isInvoiceQueued);
      const admittedPending = s.reAdmissionStatus === "admitted" && s.isInvoiceQueued !== false && !s.invoicePrintedAt;
      const newAdmitQueued = s.admissionYear === currentYear && queued && !s.invoicePrintedAt;
      return queued || admittedPending || newAdmitQueued;
    });
  }, [allStudents, currentYear]);

  // Group by Class and Section
  const groupedByClassSection = useMemo(() => {
    const map = new Map<string, { class: string; section: string; students: Student[] }>();

    queuedStudents.forEach((student) => {
      const cls = student.presentClass || "Unassigned";
      const sec = student.presentSection || "A";
      const key = `${cls}-${sec}`;

      if (!map.has(key)) {
        map.set(key, { class: cls, section: sec, students: [] });
      }
      map.get(key)!.students.push(student);
    });

    // Sort students by roll in each group
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

    // Sort groups by class order
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
  }, [queuedStudents]);

  // Filter groups if a class filter chip is selected
  const displayedGroups = useMemo(() => {
    if (selectedClassFilter === "ALL") return groupedByClassSection;
    return groupedByClassSection.filter((g) => g.class === selectedClassFilter);
  }, [groupedByClassSection, selectedClassFilter]);

  // Extract all distinct classes currently present in queue
  const availableClassesInQueue = useMemo(() => {
    const set = new Set<string>();
    groupedByClassSection.forEach((g) => set.add(g.class));
    return Array.from(set);
  }, [groupedByClassSection]);

  // Toggle group accordion expanded state in list view
  function toggleGroupExpand(key: string) {
    setExpandedGroupKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  // Build InvoiceData objects for printing with sequential receipt numbers & custom overrides
  const currentBatchInvoices = useMemo<InvoiceData[]>(() => {
    if (!activePrintGroup) return [];
    const feeItems = customFeeItems && customFeeItems.length > 0 ? customFeeItems : getSavedFeeStructure();
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

    return activePrintGroup.students.map((student, idx) => ({
      invoiceNumber: generateInvoiceNumber(invoiceSeq + idx, currentYear),
      academicSession: selectedSession,
      issueDate,
      issueTime,
      studentId: student.schoolId || `STU-${student.id.slice(0, 6)}`,
      studentName: student.name,
      studentClass: customClass || student.presentClass,
      section: student.presentSection || "A",
      rollNo: String(student.presentRoll || idx + 1),
      guardianName: student.fatherName || student.guardianName || "N/A",
      contactNumber: student.studentContact || "",
      penNumber: student.pen || "",
      feeItems,
      paymentMode: "Cash" as const,
      paymentStatus: "Paid" as const,
      remarks: `Admission Fee ${selectedSession}`,
    }));
  }, [activePrintGroup, selectedSession, currentYear, invoiceSeq, customClass, customFeeItems]);

  const formattedStartReceipt = useMemo(() => {
    return generateInvoiceNumber(invoiceSeq, currentYear);
  }, [invoiceSeq, currentYear]);

  const formattedEndReceipt = useMemo(() => {
    const count = currentBatchInvoices.length || 1;
    return generateInvoiceNumber(invoiceSeq + count - 1, currentYear);
  }, [invoiceSeq, currentBatchInvoices.length, currentYear]);

  // Trigger 1-Click Print for a Class & Section
  async function handleOneClickPrint(group: ClassSectionGroup) {
    await syncSequenceFromDatabase();
    setActivePrintGroup(group);
    setCustomClass(group.class);
    setCustomFeeItems(getSavedFeeStructure());
    setIsClassLocked(true);
    setIsAmountLocked(true);
    setIsInvoiceNoLocked(true);
    setPrintModalOpen(true);
  }

  // Print & Persist Invoices to Database & Local Cache
  async function handleExecutePrint(clearQueue: boolean) {
    if (!activePrintGroup || currentBatchInvoices.length === 0) return;

    const count = currentBatchInvoices.length;
    const startSerial = invoiceSeq;
    const endSerial = invoiceSeq + count - 1;
    const formattedStart = generateInvoiceNumber(startSerial, currentYear);
    const formattedEnd = generateInvoiceNumber(endSerial, currentYear);

    // 1. Record print batch in print history
    recordPrintBatch(
      {
        docType: "invoice",
        mode: "bulk",
        fillMode: "fill",
        startSerial,
        endSerial,
        formattedStart,
        formattedEnd,
        count,
        classInfo: `Admission Queue: Class ${activePrintGroup.class} (${activePrintGroup.section})`,
      },
      currentYear
    );

    // 2. Persist to official database registry & local cache
    try {
      await recordPrintedInvoices(currentBatchInvoices, "bulk", printCopyType);
    } catch (err) {
      console.error("Failed to record invoices to DB:", err);
    }

    // 3. Increment shared sequence in localStorage and state
    const nextSeq = invoiceSeq + count;
    try {
      localStorage.setItem(PREV_INVOICE_STORAGE_KEY, String(invoiceSeq));
      localStorage.setItem(INVOICE_STORAGE_KEY, String(nextSeq));
    } catch (e) {
      console.error(e);
    }
    setInvoiceSeq(nextSeq);

    // 4. Trigger browser print
    window.print();

    // 5. If clearing queue, run mutation; else show toast
    if (clearQueue) {
      clearQueueMutation.mutate(activePrintGroup.students);
    } else {
      showToast({
        type: "success",
        title: "Invoices Recorded & Printed",
        description: `Invoices #${formattedStart} to #${formattedEnd} recorded in official registry.`,
      });
      setPrintModalOpen(false);
    }
  }

  // Handle undo batch from PrintHistoryModal
  const handleUndoBatch = (newNextSerial: number) => {
    setInvoiceSeq(newNextSerial);
    try {
      localStorage.setItem(INVOICE_STORAGE_KEY, String(newNextSerial));
    } catch {}
    showToast({
      type: "info",
      title: "Serial Reverted",
      description: `Invoice sequence reverted to #${String(newNextSerial).padStart(4, "0")}`,
    });
  };

  // Mutation to clear invoice queue for a group after printing
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
      showToast({
        type: "success",
        title: "Invoices Printed & Queue Cleared",
        description: `${data.clearedCount || "All"} invoices marked as printed. New admissions will accumulate live.`,
      });
      setPrintModalOpen(false);
    },
    onError: (err: any) => {
      showToast({
        type: "error",
        title: "Queue Update Failed",
        description: err.message || "Failed to update queue",
      });
    },
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Header with Live Indicator & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-5 print:hidden">
        <div className="flex items-center gap-3">
          <Link
            href="/admission"
            className="p-2.5 rounded-xl border hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            title="Back to Admission Desk"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
                <Printer className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                <span>Bulk Admission Invoices Queue</span>
              </h1>
              {/* Pulsing Live Indicator */}
              <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>Live Active</span>
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Manual Live Refresh Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              refetch();
              syncSequenceFromDatabase();
            }}
            disabled={isFetching || isSyncingSeq}
            className="h-9 px-3 rounded-xl text-xs font-semibold cursor-pointer flex items-center gap-1.5 border-border/80"
            title="Fetch latest admissions and sequence live"
          >
            <RefreshCw className={cn("h-3.5 w-3.5 text-purple-600", (isFetching || isSyncingSeq) && "animate-spin")} />
            <span className="hidden sm:inline">Refresh Queue</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsTrackerOpen(true)}
            className="h-9 px-3 rounded-xl text-xs font-semibold cursor-pointer flex items-center gap-1.5 border-teal-300 dark:border-teal-700 bg-teal-500/10 text-teal-700 dark:text-teal-300 hover:bg-teal-500/20 shadow-2xs"
            title="Open invoice registry, live statistics, and verification tracker"
          >
            <ShieldCheck className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
            <span className="hidden sm:inline">Registry &amp; Tracker</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsHistoryOpen(true)}
            className="h-9 px-3 rounded-xl text-xs font-semibold cursor-pointer flex items-center gap-1.5 border-amber-300 dark:border-amber-700 bg-amber-500/10 text-amber-700 dark:text-amber-400 hover:bg-amber-500/20 shadow-2xs"
            title="View print history and undo printed batches"
          >
            <RotateCcw className="h-3.5 w-3.5 shrink-0" />
            <span className="hidden sm:inline">Print History</span>
          </Button>

          <Link
            href="/generate/invoice"
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border hover:bg-muted text-xs sm:text-sm font-semibold transition-all"
          >
            <span>Custom Invoice Generator</span>
          </Link>
        </div>
      </div>

      {/* Overview Stat Chips */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 print:hidden">
        <div className="bg-card border rounded-2xl p-4 shadow-2xs">
          <span className="text-[11px] font-semibold text-muted-foreground">Total Invoices Ready</span>
          <p className="text-2xl font-black mt-1 text-purple-600 dark:text-purple-400">
            {queuedStudents.length}
          </p>
        </div>
        <div className="bg-card border rounded-2xl p-4 shadow-2xs">
          <span className="text-[11px] font-semibold text-muted-foreground">Class &amp; Section Batches</span>
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
          <span className="text-[11px] font-semibold text-muted-foreground">Paper Standard</span>
          <p className="text-2xl font-black mt-1 text-emerald-600 dark:text-emerald-400">A4 / A5 Dual</p>
        </div>
      </div>

      {/* Filter Chips & View Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 print:hidden">
        {/* Class Filter Chips */}
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
            const count = groupedByClassSection
              .filter((g) => g.class === cls)
              .reduce((acc, g) => acc + g.totalCount, 0);
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

        {/* View Switcher: List vs Grid */}
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
            title="List view with side print button"
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
            title="Card grid view"
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            <span>Cards</span>
          </button>
        </div>
      </div>

      {/* Class-wise & Section-wise Invoices Content */}
      <div className="print:hidden">
        {loadingStudents ? (
          <div className="p-12 text-center text-xs text-muted-foreground animate-pulse">
            Loading queued student invoices...
          </div>
        ) : displayedGroups.length === 0 ? (
          <div className="bg-card border rounded-3xl p-12 text-center space-y-3">
            <div className="h-14 w-14 rounded-full bg-purple-500/10 text-purple-600 flex items-center justify-center mx-auto">
              <CheckCheck className="h-7 w-7" />
            </div>
            <h3 className="text-base font-bold text-foreground">No Pending Invoices in Queue</h3>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              When students are admitted in Re-admission or New Admission, their names will automatically group here by Class and Section for 1-click batch printing.
            </p>
            <div className="pt-2 flex items-center justify-center gap-3">
              <Link
                href="/admission/re-admission"
                className="px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold transition-all"
              >
                Go to Re-admission Desk
              </Link>
              <Link
                href="/admission/applications"
                className="px-4 py-2 rounded-xl border hover:bg-muted text-xs font-bold transition-all"
              >
                View New Applications
              </Link>
            </div>
          </div>
        ) : viewMode === "list" ? (
          /* ================================================================= */
          /* 1. LIST VIEW: Class - Section (Count) with SIDE Print Button      */
          /* ================================================================= */
          <div className="space-y-3">
            {displayedGroups.map((group) => {
              const isExpanded = expandedGroupKeys.has(group.key);
              const minRoll = group.students[0]?.presentRoll || 1;
              const maxRoll = group.students[group.students.length - 1]?.presentRoll || group.totalCount;

              return (
                <div
                  key={group.key}
                  className="bg-card border border-border/80 rounded-2xl shadow-2xs hover:border-purple-300 dark:hover:border-purple-800 transition-all overflow-hidden"
                >
                  {/* Main Row */}
                  <div className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    {/* Left: Class - Section (Count) Headline */}
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
                          {group.totalCount} admitted {group.totalCount === 1 ? "student" : "students"} queued • Rolls: #{minRoll} to #{maxRoll}
                        </p>
                      </div>
                    </div>

                    {/* Right: Side Actions & Batch Print Button */}
                    <div className="flex items-center gap-2.5 shrink-0 self-end md:self-auto w-full md:w-auto">
                      <button
                        type="button"
                        onClick={() => toggleGroupExpand(group.key)}
                        className="text-xs font-semibold px-3 py-2 rounded-xl border hover:bg-muted text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5 cursor-pointer"
                        title="Toggle student list"
                      >
                        <span>{isExpanded ? "Hide" : `Students (${group.totalCount})`}</span>
                        <ChevronDown
                          className={cn("h-3.5 w-3.5 transition-transform duration-200", isExpanded && "rotate-180")}
                        />
                      </button>

                      <Button
                        onClick={() => handleOneClickPrint(group)}
                        className="flex-1 md:flex-initial bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs sm:text-sm h-10 px-5 rounded-xl shadow-xs cursor-pointer flex items-center justify-center gap-2 transition-all hover:scale-[1.02]"
                      >
                        <Printer className="h-4 w-4" />
                        <span>1-Click Batch Print ({group.totalCount})</span>
                      </Button>
                    </div>
                  </div>

                  {/* Expandable Student Roster in this Batch */}
                  {isExpanded && (
                    <div className="border-t border-border/70 bg-muted/20 p-4 space-y-2">
                      <div className="flex items-center justify-between text-xs font-bold text-muted-foreground pb-1">
                        <span>Students in this Print Batch:</span>
                        <span>{group.totalCount} Students</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                        {group.students.map((student) => {
                          const timeInfo = getStudentQueuedTime(student);
                          return (
                            <div
                              key={student.id}
                              className="flex items-center justify-between p-2.5 rounded-xl bg-background border border-border/80 text-xs gap-2 shadow-2xs hover:border-purple-300 dark:hover:border-purple-800 transition-colors"
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
                                </div>
                              </div>
                              <div className="flex flex-col items-end shrink-0 gap-0.5">
                                <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800 leading-none">
                                  Ready
                                </span>
                                <span className="text-[9.5px] text-slate-500 dark:text-slate-400 font-mono flex items-center gap-1 pt-0.5 whitespace-nowrap" title={`Queued: ${timeInfo.dateStr} ${timeInfo.timeStr}`}>
                                  <Clock className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                                  <span>{timeInfo.dateStr}, {timeInfo.timeStr}</span>
                                </span>
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
          /* ================================================================= */
          /* 2. GRID CARDS VIEW                                                */
          /* ================================================================= */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {displayedGroups.map((group) => (
              <div
                key={group.key}
                className="bg-card border border-border/80 rounded-3xl p-5 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between"
              >
                <div>
                  {/* Card Header with Class - Section (Count) */}
                  <div className="flex items-center justify-between border-b pb-3.5 mb-3.5">
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1 rounded-xl bg-purple-500/10 text-purple-700 dark:text-purple-300 font-black text-sm border border-purple-500/20">
                        Class {group.class} - {group.section}
                      </span>
                    </div>
                    <span className="text-xs font-bold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/40 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Users className="h-3.5 w-3.5" />
                      <span>({group.totalCount})</span>
                    </span>
                  </div>

                  {/* Student Roll & Name List Preview */}
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                    {group.students.map((student) => {
                      const timeInfo = getStudentQueuedTime(student);
                      return (
                        <div
                          key={student.id}
                          className="flex items-center justify-between text-xs py-1.5 px-2.5 rounded-xl bg-muted/40 hover:bg-muted/70 transition-colors gap-2"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="font-mono font-bold text-[10px] w-6 text-muted-foreground shrink-0">
                              #{student.presentRoll}
                            </span>
                            <div className="truncate min-w-0">
                              <span className="font-medium text-foreground truncate block">{student.name}</span>
                              <span className="text-[9.5px] text-muted-foreground font-mono flex items-center gap-1 whitespace-nowrap">
                                <Clock className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                                <span>{timeInfo.dateStr}, {timeInfo.timeStr}</span>
                              </span>
                            </div>
                          </div>
                          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold shrink-0">
                            Ready
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 1-Click Batch Print Button */}
                <div className="mt-5 pt-4 border-t border-border/60">
                  <Button
                    onClick={() => handleOneClickPrint(group)}
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs h-10 rounded-xl shadow-xs cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Printer className="h-4 w-4" />
                    <span>1-Click Batch Print ({group.totalCount})</span>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Batch Print Preview & Execution Modal */}
      <Dialog open={printModalOpen} onOpenChange={setPrintModalOpen}>
        <DialogContent className="w-[96vw] max-w-6xl max-h-[94vh] flex flex-col p-4 sm:p-6 bg-card border border-border/80 rounded-3xl shadow-2xl overflow-hidden print:w-auto print:max-w-none print:h-auto print:max-h-none print:p-0 print:border-none print:shadow-none print:bg-white print:overflow-visible">
          {/* Scoped print styles for batch invoice modal */}
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
                    <span>
                      Batch Invoices: Class {activePrintGroup?.class} – Section {activePrintGroup?.section}
                    </span>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20">
                      {activePrintGroup?.totalCount} {activePrintGroup?.totalCount === 1 ? "slip" : "slips"}
                    </span>
                  </DialogTitle>
                  {/* Lockable Config Controls: Class, Amount & Receipt No */}
                  <div className="flex items-center gap-2 mt-2 flex-wrap text-xs">
                    {/* 1. Class Lock / Unlock */}
                    <div className="flex items-center gap-1.5 bg-muted/80 px-2.5 py-1 rounded-xl border border-border/70 shadow-2xs">
                      <span className="text-[10.5px] font-bold text-muted-foreground uppercase tracking-wide">Class:</span>
                      {isClassLocked ? (
                        <span className="font-mono font-bold text-foreground">
                          {customClass || activePrintGroup?.class || "VI"} - {activePrintGroup?.section || "A"}
                        </span>
                      ) : (
                        <select
                          value={customClass}
                          onChange={(e) => setCustomClass(e.target.value)}
                          className="h-6 px-1.5 text-xs font-bold border rounded bg-background text-foreground cursor-pointer"
                        >
                          {["V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"].map((cls) => (
                            <option key={cls} value={cls}>Class {cls}</option>
                          ))}
                        </select>
                      )}
                      <button
                        type="button"
                        onClick={() => setIsClassLocked((prev) => !prev)}
                        className="p-1 rounded text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                        title={isClassLocked ? "Unlock to change Class" : "Lock Class"}
                      >
                        {isClassLocked ? <Lock className="w-3 h-3 text-slate-400" /> : <Unlock className="w-3 h-3 text-amber-500" />}
                      </button>
                    </div>

                    {/* 2. Amount Lock / Unlock */}
                    <div className="flex items-center gap-1.5 bg-muted/80 px-2.5 py-1 rounded-xl border border-border/70 shadow-2xs">
                      <span className="text-[10.5px] font-bold text-muted-foreground uppercase tracking-wide">Amount:</span>
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
                                prev.map((item) => (item.id === "fee-session" ? { ...item, amount: newSession } : item))
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
                        {isAmountLocked ? <Lock className="w-3 h-3 text-slate-400" /> : <Unlock className="w-3 h-3 text-amber-500" />}
                      </button>
                    </div>

                    {/* 3. Invoice No Lock / Unlock */}
                    <div className="flex items-center gap-1.5 bg-muted/80 px-2.5 py-1 rounded-xl border border-border/70 shadow-2xs">
                      <span className="text-[10.5px] font-bold text-muted-foreground uppercase tracking-wide">Receipt:</span>
                      {isInvoiceNoLocked ? (
                        <span className="font-mono font-bold text-purple-700 dark:text-purple-300">
                          {formattedStartReceipt} {currentBatchInvoices.length > 1 ? `→ ${formattedEndReceipt}` : ""}
                        </span>
                      ) : (
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-muted-foreground font-semibold">Start #:</span>
                          <input
                            type="number"
                            min={1}
                            value={invoiceSeq}
                            onChange={(e) => setInvoiceSeq(Math.max(1, parseInt(e.target.value, 10) || 1))}
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
                        {isInvoiceNoLocked ? <Lock className="w-3 h-3 text-slate-400" /> : <Unlock className="w-3 h-3 text-amber-500" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Controls: Zoom & Actions */}
              <div className="flex items-center gap-2.5 flex-wrap">
                {/* A4 Sheet Page Counter */}
                <div className="flex items-center px-2.5 py-1 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-700 dark:text-purple-300 text-[11px] font-bold font-mono">
                  A4 Pages: {Math.ceil(currentBatchInvoices.length / 4)} ({currentBatchInvoices.length} slips total)
                </div>

                {/* Zoom Controller */}
                <div className="hidden sm:flex items-center bg-muted/80 p-1 rounded-xl border border-border/60 gap-1">
                  <button
                    type="button"
                    onClick={() => setPreviewZoom((z) => Math.max(0.6, Number((z - 0.1).toFixed(2))))}
                    className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-background/80 transition-colors cursor-pointer"
                    title="Zoom Out"
                  >
                    <ZoomOut className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-[10px] font-mono font-bold px-1 text-muted-foreground min-w-[36px] text-center">
                    {Math.round(previewZoom * 100)}%
                  </span>
                  <button
                    type="button"
                    onClick={() => setPreviewZoom((z) => Math.min(1.4, Number((z + 0.1).toFixed(2))))}
                    className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-background/80 transition-colors cursor-pointer"
                    title="Zoom In"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewZoom(0.95)}
                    className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-background/80 transition-colors cursor-pointer ml-0.5"
                    title="Reset Zoom"
                  >
                    <RotateCcw className="w-3 h-3" />
                  </button>
                </div>

                {/* Primary Print Button */}
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

          {/* Printable Scrollable Canvas */}
          <div
            id="bulk-invoice-preview-viewport"
            className="flex-1 overflow-auto bg-slate-100/90 dark:bg-slate-900/70 rounded-2xl p-4 sm:p-6 flex flex-col items-center custom-scrollbar print:p-0 print:m-0 print:bg-transparent print:overflow-visible"
          >
            <div
              id="bulk-invoice-print-container"
              style={{
                transform: `scale(${previewZoom})`,
                transformOrigin: "top center",
              }}
              className="transition-transform duration-150 ease-out print:transform-none print:m-0 print:p-0 flex justify-center w-full"
            >
              <InvoicePrintableBatchView
                invoices={currentBatchInvoices}
                copyType={printCopyType}
                schoolProfile={schoolProfile}
              />
            </div>
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
