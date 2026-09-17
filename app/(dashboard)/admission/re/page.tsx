"use client";

import React, { useState, useMemo, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getStudents, getDistinctClasses, getDistinctSections } from "@/lib/data/students";
import { updateReAdmissionStatus } from "@/lib/data/admission";
import type { Student } from "@/lib/types";
import { CustomSelect } from "@/components/ui/custom-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { showToast } from "@/components/ui/toast-banner";
import {
  RefreshCw,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  ArrowLeft,
  Printer,
  Filter,
  UserCheck,
  UserX,
  RotateCcw,
  Sparkles,
  Phone,
  ArrowUpDown,
  GraduationCap,
  Layers,
  ChevronRight,
  UserPlus,
  Users,
  ShieldCheck,
  Loader2,
} from "lucide-react";
import { cn, sortClasses } from "@/lib/utils";
import {
  getSavedFeeStructure,
  calculateFeeTotal,
  generateInvoiceNumber,
  getFeeCategoryForClass,
  FEE_SECTIONS,
} from "@/lib/utils/fee-config";

// Promotion mapping standard: V -> VI, VI -> VII, etc.
const CLASS_PROMOTION_MAP: Record<string, string> = {
  V: "VI",
  VI: "VII",
  VII: "VIII",
  VIII: "IX",
  IX: "X",
  X: "Sent Up M.P.",
  XI: "XII",
  XII: "Passed Out",
};

const CLASS_NEXT_MAP = CLASS_PROMOTION_MAP;

const VALID_RE_STATUSES = ["all", "pending", "admitted", "not_admitted"] as const;

function ReAdmissionDashboardContent() {
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();

  const statusParam = searchParams.get("status") as any;
  const initialStatus = statusParam && VALID_RE_STATUSES.includes(statusParam) ? statusParam : "all";

  // Filters State
  const [selectedClass, setSelectedClass] = useState<string>("all");
  const [selectedSection, setSelectedSection] = useState<string>("");
  const [statusFilter, setStatusFilterState] = useState<"all" | "pending" | "admitted" | "not_admitted">(initialStatus);
  const [searchQuery, setSearchQuery] = useState<string>("");

  const setStatusFilter = (st: "all" | "pending" | "admitted" | "not_admitted") => {
    setStatusFilterState(st);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      if (st === "all") {
        url.searchParams.delete("status");
      } else {
        url.searchParams.set("status", st);
      }
      window.history.replaceState(null, "", url.toString());
    }
  };

  // Confirmation Modal State
  const [activeStudent, setActiveStudent] = useState<Student | null>(null);
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [newClass, setNewClass] = useState<string>("");
  const [newSection, setNewSection] = useState<string>("A");
  const [newRoll, setNewRoll] = useState<string>("1");
  const [feePaid, setFeePaid] = useState<boolean>(true);
  const [feeAmount, setFeeAmount] = useState<string>("600");
  const [receiptNo, setReceiptNo] = useState<string>("");
  const [isFetchingInvoiceNo, setIsFetchingInvoiceNo] = useState<boolean>(false);

  const currentYear = new Date().getFullYear();

  // Fetch Students Roster
  const { data: allStudents = [], isLoading } = useQuery({
    queryKey: ["students"],
    queryFn: () => getStudents("summary"),
    staleTime: 30 * 1000,
  });

  const { data: classes = [] } = useQuery({
    queryKey: ["distinct-classes"],
    queryFn: getDistinctClasses,
    staleTime: Infinity,
  });

  const { data: sections = [] } = useQuery({
    queryKey: ["distinct-sections"],
    queryFn: getDistinctSections,
    staleTime: Infinity,
  });

  // Continuing students eligible for Re-Admission
  const eligibleStudents = useMemo(() => {
    return allStudents.filter((s) => s.currentStatus === "Continuing");
  }, [allStudents]);

  // Funnel Pipeline Counts
  const totalEligible = eligibleStudents.length;

  const admittedStudents = useMemo(() => {
    return eligibleStudents.filter((s) => s.reAdmissionStatus === "admitted");
  }, [eligibleStudents]);

  const notAdmittedStudents = useMemo(() => {
    return eligibleStudents.filter((s) => s.reAdmissionStatus === "not_admitted");
  }, [eligibleStudents]);

  const pendingStudents = useMemo(() => {
    return eligibleStudents.filter(
      (s) => !s.reAdmissionStatus || s.reAdmissionStatus === "pending"
    );
  }, [eligibleStudents]);

  const queuedForInvoice = useMemo(() => {
    return eligibleStudents.filter((s) => s.isInvoiceQueued);
  }, [eligibleStudents]);

  // Filtered list for the desk
  const filteredStudents = useMemo(() => {
    return eligibleStudents.filter((s) => {
      // 1. Class filter
      if (selectedClass !== "all" && s.presentClass !== selectedClass) return false;

      // 2. Section filter
      if (selectedSection && s.presentSection !== selectedSection) return false;

      // 3. Status filter
      if (statusFilter === "admitted" && s.reAdmissionStatus !== "admitted") return false;
      if (statusFilter === "not_admitted" && s.reAdmissionStatus !== "not_admitted") return false;
      if (
        statusFilter === "pending" &&
        (s.reAdmissionStatus === "admitted" || s.reAdmissionStatus === "not_admitted")
      ) {
        return false;
      }

      // 4. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = s.name?.toLowerCase().includes(q);
        const matchesRoll = String(s.presentRoll).includes(q);
        const matchesSchoolId = s.schoolId?.toLowerCase().includes(q);
        const matchesContact = s.studentContact?.includes(q);
        const matchesGuardian = s.fatherName?.toLowerCase().includes(q) || s.guardianName?.toLowerCase().includes(q);

        if (!matchesName && !matchesRoll && !matchesSchoolId && !matchesContact && !matchesGuardian) {
          return false;
        }
      }

      return true;
    });
  }, [eligibleStudents, selectedClass, selectedSection, statusFilter, searchQuery]);

  // Fetch next sequential invoice number from DB
  const fetchNextInvoiceNumber = async () => {
    try {
      setIsFetchingInvoiceNo(true);
      const res = await fetch(`/api/invoices/next-sequence?year=${currentYear}`);
      const data = await res.json();
      if (res.ok && typeof data.nextSequence === "number") {
        return generateInvoiceNumber(data.nextSequence, currentYear);
      }
    } catch (e) {
      console.warn("Could not fetch next sequence:", e);
    } finally {
      setIsFetchingInvoiceNo(false);
    }
    return generateInvoiceNumber(1, currentYear);
  };

  // Dynamic Fee Recalculation on Class Change
  function handleNewClassChange(cls: string) {
    setNewClass(cls);
    const category = getFeeCategoryForClass(cls);
    const feeItems = getSavedFeeStructure(category);
    const invoiceTotal = calculateFeeTotal(feeItems);
    setFeeAmount(String(invoiceTotal > 0 ? invoiceTotal : 600));
  }

  // Open Re-Admission Modal
  async function openConfirmModal(student: Student) {
    setActiveStudent(student);
    const targetClass = CLASS_NEXT_MAP[student.presentClass] || student.presentClass;
    setNewClass(targetClass);
    setNewSection(student.presentSection || "A");
    setNewRoll(String(student.presentRoll || 1));
    setFeePaid(true);

    // Auto-fetch preset amount according to class tier: 5-8, 9-10, 11-12
    const category = getFeeCategoryForClass(targetClass);
    const feeItems = getSavedFeeStructure(category);
    const invoiceTotal = calculateFeeTotal(feeItems);
    setFeeAmount(String(invoiceTotal > 0 ? invoiceTotal : 600));

    setReceiptNo("Syncing...");
    setModalOpen(true);

    // 1. Check if student already has a registered invoice in DB
    try {
      const studentIdToSearch = student.schoolId || student.id;
      const res = await fetch(`/api/invoices?studentId=${encodeURIComponent(studentIdToSearch)}`);
      const data = await res.json();
      if (res.ok && Array.isArray(data?.data) && data.data.length > 0) {
        const existingInv = data.data[0];
        setReceiptNo(existingInv.invoice_number);
        if (existingInv.total_amount) {
          setFeeAmount(String(existingInv.total_amount));
        }
        return;
      }
    } catch (e) {
      console.warn("Could not check existing invoice for student:", e);
    }

    // 2. Fetch fresh sequential invoice number
    const nextInvoiceNo = await fetchNextInvoiceNumber();
    setReceiptNo(nextInvoiceNo);
  }

  // Mutation to confirm Re-Admission
  const mutation = useMutation({
    mutationFn: (payload: {
      action: "admit" | "not_admitted" | "reset";
      studentId: string;
      newClass?: string;
      newSection?: string;
      newRoll?: number;
      feePaid?: boolean;
      feeAmount?: number;
      paymentReceiptNo?: string;
    }) =>
      updateReAdmissionStatus(payload.studentId, {
        action: payload.action,
        newClass: payload.newClass,
        newSection: payload.newSection,
        newRoll: payload.newRoll,
        feePaid: payload.feePaid,
        feeAmount: payload.feeAmount,
        paymentReceiptNo: payload.paymentReceiptNo,
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
      queryClient.invalidateQueries({ queryKey: ["students-all"] });
      queryClient.invalidateQueries({ queryKey: ["invoices-queue"] });
      showToast(data.message || "Updated successfully!", "success");
      setModalOpen(false);
    },
    onError: (err: any) => {
      showToast(err.message || "Failed to update re-admission", "error");
    },
  });

  const handleAdmit = () => {
    if (!activeStudent) return;
    if (!newRoll || isNaN(Number(newRoll))) {
      showToast("Please enter a valid roll number", "error");
      return;
    }

    mutation.mutate({
      action: "admit",
      studentId: activeStudent.id,
      newClass,
      newSection,
      newRoll: parseInt(newRoll, 10) || 1,
      feePaid,
      feeAmount: parseFloat(feeAmount) || 0,
      paymentReceiptNo: receiptNo,
    });
  };

  const handleMarkNotAdmitted = () => {
    if (!activeStudent) return;
    mutation.mutate({
      action: "not_admitted",
      studentId: activeStudent.id,
    });
  };

  const handleReset = () => {
    if (!activeStudent) return;
    mutation.mutate({
      action: "reset",
      studentId: activeStudent.id,
    });
  };

  // Class list with custom order
  const availableClasses = useMemo(() => {
    return sortClasses(classes.length ? classes : ["V", "VI", "VII", "VIII", "IX", "X", "XI"]);
  }, [classes]);

  // Class Promotion Dropdown Options
  const classPromotionOptions = useMemo(() => {
    return [
      { value: "all", label: `All Promotion Classes (${totalEligible})` },
      ...availableClasses.map((cls) => {
        const nextCls = CLASS_NEXT_MAP[cls] || cls;
        const count = eligibleStudents.filter((s) => s.presentClass === cls).length;
        return {
          value: cls,
          label: `Class ${cls} ➔ Class ${nextCls} (${count})`,
        };
      }),
    ];
  }, [availableClasses, eligibleStudents, totalEligible]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-5">
        <div className="flex items-center gap-3">
          <Link
            href="/admission"
            className="p-2.5 rounded-xl border hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            title="Back to Admission Portal"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
              Re-Admission Tracker
            </h1>
          </div>
        </div>

        {/* Action Shortcuts */}
        <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 w-full sm:w-auto">
          <Link
            href="/admission/invoices"
            className="inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs sm:text-sm font-bold shadow-xs transition-all active:scale-95 cursor-pointer"
          >
            <Printer className="h-4 w-4" />
            <span>Class Invoice Queue</span>
            {queuedForInvoice.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-md bg-white/20 text-white text-xs font-mono font-bold">
                {queuedForInvoice.length}
              </span>
            )}
          </Link>
          <Link
            href="/admission/new"
            className="inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl border hover:bg-muted text-foreground text-xs sm:text-sm font-bold transition-all active:scale-95 cursor-pointer"
          >
            <UserPlus className="h-4 w-4 text-emerald-600" />
            <span>New Admission Tracker</span>
          </Link>
        </div>
      </div>

      {/* Funnel Pipeline Overview */}
      <div className="bg-card border rounded-3xl p-5 sm:p-6 shadow-xs relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center justify-between gap-2 mb-6">
          <div className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-orange-600" />
            <h2 className="text-lg font-black tracking-tight text-foreground">
              Re-Admission Funnel
            </h2>
          </div>
          <span className="text-xs font-semibold text-muted-foreground">
            Total Continuing: <strong className="text-foreground">{totalEligible}</strong>
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 relative z-10">
          {/* 1. Eligible for Promotion */}
          <div
            onClick={() => setStatusFilter("all")}
            className={cn(
              "border rounded-2xl p-4 flex flex-col justify-between cursor-pointer transition-all hover:scale-[1.02]",
              statusFilter === "all"
                ? "border-blue-500 bg-blue-500/15 shadow-sm"
                : "border-blue-500/20 bg-blue-500/5 hover:bg-blue-500/10"
            )}
          >
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400 mb-2 flex items-center justify-between">
              <span>1. Promoted &amp; Eligible</span>
              {statusFilter === "all" && <span className="text-[10px] lowercase font-normal">all</span>}
            </span>
            <div className="flex items-end justify-between">
              <span className="text-3xl font-black text-foreground">
                {isLoading ? "..." : totalEligible}
              </span>
              <GraduationCap className="h-5 w-5 text-blue-500/50 mb-1" />
            </div>
          </div>

          {/* 2. Pending Re-Admission */}
          <div
            onClick={() => setStatusFilter(statusFilter === "pending" ? "all" : "pending")}
            className={cn(
              "border rounded-2xl p-4 flex flex-col justify-between cursor-pointer transition-all hover:scale-[1.02]",
              statusFilter === "pending"
                ? "border-amber-500 bg-amber-500/15 shadow-sm"
                : "border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/10"
            )}
          >
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 mb-2 flex items-center justify-between">
              <span>2. Pending Fee / Admission</span>
              {statusFilter === "pending" && <span className="text-[10px] lowercase font-normal">filtered</span>}
            </span>
            <div className="flex items-end justify-between">
              <span className="text-3xl font-black text-foreground text-amber-900 dark:text-amber-100">
                {isLoading ? "..." : pendingStudents.length}
              </span>
              <Clock className="h-5 w-5 text-amber-500/50 mb-1" />
            </div>
          </div>

          {/* 3. Final Re-Admitted */}
          <div
            onClick={() => setStatusFilter(statusFilter === "admitted" ? "all" : "admitted")}
            className={cn(
              "border-2 rounded-2xl p-4 flex flex-col justify-between shadow-sm cursor-pointer transition-all hover:scale-[1.02]",
              statusFilter === "admitted"
                ? "border-emerald-500 bg-emerald-500/20"
                : "border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/15"
            )}
          >
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 mb-2 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5" />
                3. Final Admitted
              </span>
              {statusFilter === "admitted" && <span className="text-[10px] lowercase font-normal">filtered</span>}
            </span>
            <div className="flex items-end justify-between">
              <span className="text-3xl font-black text-foreground text-emerald-900 dark:text-emerald-100">
                {isLoading ? "..." : admittedStudents.length}
              </span>
              <span className="text-[10px] font-bold px-2 py-1 bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 rounded-lg">
                {totalEligible > 0 ? Math.round((admittedStudents.length / totalEligible) * 100) : 0}% Rate
              </span>
            </div>
          </div>

          {/* 4. In Live Invoice Queue */}
          <Link
            href="/admission/invoices"
            className="border border-purple-500/30 bg-purple-500/10 hover:bg-purple-500/15 rounded-2xl p-4 flex flex-col justify-between cursor-pointer transition-all hover:scale-[1.02]"
          >
            <span className="text-[11px] font-bold uppercase tracking-wider text-purple-700 dark:text-purple-400 mb-2 flex items-center justify-between">
              <span>4. Live Invoice Queue</span>
              <span className="text-[10px] bg-purple-500/20 text-purple-800 dark:text-purple-300 px-1.5 py-0.2 rounded-md font-bold">
                Batch Print
              </span>
            </span>
            <div className="flex items-end justify-between">
              <span className="text-3xl font-black text-foreground text-purple-900 dark:text-purple-100">
                {isLoading ? "..." : queuedForInvoice.length}
              </span>
              <Printer className="h-5 w-5 text-purple-500/50 mb-1" />
            </div>
          </Link>
        </div>
      </div>


      {/* ALL CANDIDATES RE-ADMISSION DESK */}
      <div className="bg-card border rounded-3xl p-5 sm:p-6 shadow-xs space-y-5">
        {/* Desk Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4">
          <div>
            <div className="flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-orange-600" />
              <h2 className="text-lg font-black tracking-tight text-foreground">
                Re-Admission Candidates Desk
              </h2>
            </div>
          </div>

          <div className="flex items-center flex-wrap gap-2 text-xs">
            <span className="px-2.5 py-1 rounded-xl bg-muted text-muted-foreground font-semibold border">
              Showing: <strong className="text-foreground">{filteredStudents.length}</strong> of {eligibleStudents.length}
            </span>
            <button
              onClick={() => {
                queryClient.invalidateQueries({ queryKey: ["students"] });
                showToast("Refreshed student roster", "info");
              }}
              className="p-1.5 rounded-xl border hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              title="Refresh Roster"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Filter Toolbar: Status Tabs, Search & Section */}
        <div className="space-y-3">
          {/* Status Segmented Buttons */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
            <button
              type="button"
              onClick={() => setStatusFilter("all")}
              className={cn(
                "px-3.5 py-2 rounded-xl font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5",
                statusFilter === "all"
                  ? "bg-foreground text-background shadow-xs"
                  : "bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground"
              )}
            >
              <span>All Candidates</span>
              <span className="text-[11px] px-1.5 py-0.2 rounded-md font-mono bg-muted">
                {selectedClass === "all" ? totalEligible : eligibleStudents.filter((s) => s.presentClass === selectedClass).length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter("pending")}
              className={cn(
                "px-3.5 py-2 rounded-xl font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5",
                statusFilter === "pending"
                  ? "bg-amber-600 text-white shadow-xs"
                  : "bg-amber-500/10 hover:bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/20"
              )}
            >
              <Clock className="h-3.5 w-3.5" />
              <span>Pending Re-Admission</span>
              <span className="text-[11px] px-1.5 py-0.2 rounded-md font-mono bg-amber-500/20">
                {selectedClass === "all"
                  ? pendingStudents.length
                  : pendingStudents.filter((s) => s.presentClass === selectedClass).length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter("admitted")}
              className={cn(
                "px-3.5 py-2 rounded-xl font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5",
                statusFilter === "admitted"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-500/20"
              )}
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>Admitted &amp; Queued</span>
              <span className="text-[11px] px-1.5 py-0.2 rounded-md font-mono bg-emerald-500/20">
                {selectedClass === "all"
                  ? admittedStudents.length
                  : admittedStudents.filter((s) => s.presentClass === selectedClass).length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter("not_admitted")}
              className={cn(
                "px-3.5 py-2 rounded-xl font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5",
                statusFilter === "not_admitted"
                  ? "bg-rose-600 text-white shadow-xs"
                  : "bg-rose-500/10 hover:bg-rose-500/20 text-rose-800 dark:text-rose-300 border border-rose-500/20"
              )}
            >
              <XCircle className="h-3.5 w-3.5" />
              <span>Not Admitted</span>
              <span className="text-[11px] px-1.5 py-0.2 rounded-md font-mono bg-rose-500/20">
                {selectedClass === "all"
                  ? notAdmittedStudents.length
                  : notAdmittedStudents.filter((s) => s.presentClass === selectedClass).length}
              </span>
            </button>
          </div>

          {/* Search, Class Promotion & Section Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-1">
            {/* Search Input */}
            <div className="sm:col-span-5 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search candidate by name, roll, school ID, or guardian..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9.5 text-xs rounded-xl"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Class Promotion Dropdown */}
            <div className="sm:col-span-4">
              <CustomSelect
                value={selectedClass}
                onChange={setSelectedClass}
                options={classPromotionOptions}
                searchable={true}
                placeholder="Class Promotion..."
                triggerClassName="h-9.5 text-xs font-semibold rounded-xl"
              />
            </div>

            {/* Section Filter */}
            <div className="sm:col-span-3">
              <CustomSelect
                value={selectedSection}
                onChange={setSelectedSection}
                options={[
                  { value: "", label: "All Sections" },
                  ...(sections.length ? sections : ["A", "B", "C", "D"]).map((sec) => ({
                    value: sec,
                    label: `Section ${sec}`,
                  })),
                ]}
                searchable={false}
                placeholder="All Sections"
                triggerClassName="h-9.5 text-xs font-semibold rounded-xl"
              />
            </div>
          </div>
        </div>

        {/* Student Candidates Table */}
        <div className="border rounded-2xl overflow-hidden">
          {isLoading ? (
            <div className="p-12 text-center text-xs text-muted-foreground animate-pulse space-y-2">
              <RefreshCw className="h-6 w-6 animate-spin mx-auto text-muted-foreground/60" />
              <p>Loading candidate roster...</p>
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <Filter className="h-10 w-10 text-muted-foreground/40 mx-auto" />
              <div className="space-y-1">
                <p className="text-sm font-bold text-foreground">No students found</p>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  {searchQuery || selectedClass !== "all" || statusFilter !== "all" || selectedSection
                    ? "No student matches the current filters. Try resetting the filters."
                    : "No continuing students eligible for re-admission found."}
                </p>
              </div>
              {(searchQuery || selectedClass !== "all" || statusFilter !== "all" || selectedSection) && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedClass("all");
                    setSelectedSection("");
                    setStatusFilter("all");
                    setSearchQuery("");
                  }}
                  className="px-3 py-1.5 rounded-xl border text-xs font-bold text-foreground hover:bg-muted transition-colors cursor-pointer"
                >
                  Reset All Filters
                </button>
              )}
            </div>
          ) : (
            <div>
              {/* Mobile Card View (md:hidden) */}
              <div className="md:hidden divide-y divide-border/60">
                {filteredStudents.map((s) => {
                  const targetNextClass = CLASS_NEXT_MAP[s.presentClass] || s.presentClass;
                  const isAdmitted = s.reAdmissionStatus === "admitted";
                  const isNotAdmitted = s.reAdmissionStatus === "not_admitted";

                  return (
                    <div
                      key={s.id}
                      className={cn(
                        "p-4 space-y-2.5 transition-colors",
                        isAdmitted ? "bg-emerald-500/[0.03]" : isNotAdmitted ? "bg-rose-500/[0.03]" : ""
                      )}
                    >
                      {/* Top Bar: Roll & Status */}
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono font-black text-primary text-xs">
                          Roll #{s.presentRoll} • {s.schoolId || "ID Pending"}
                        </span>

                        {isAdmitted ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
                            <CheckCircle2 className="h-3 w-3" />
                            <span>Admitted</span>
                          </span>
                        ) : isNotAdmitted ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/30">
                            <XCircle className="h-3 w-3" />
                            <span>Not Admitted</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30">
                            <Clock className="h-3 w-3" />
                            <span>Pending</span>
                          </span>
                        )}
                      </div>

                      {/* Candidate Name & Info */}
                      <div>
                        <h4 className="font-bold text-sm text-foreground leading-tight">{s.name}</h4>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          Guardian: {s.fatherName || s.guardianName || "N/A"}
                          {s.dob ? ` • DOB: ${s.dob}` : ""}
                        </p>
                      </div>

                      {/* Promotion Transition */}
                      <div className="flex items-center justify-between text-xs pt-1 border-t border-dashed">
                        <span className="text-muted-foreground">
                          Completed: <strong className="text-foreground">Class {s.presentClass} ({s.presentSection || "A"})</strong>
                        </span>
                        <span className="inline-flex items-center gap-1 font-bold text-orange-600 dark:text-orange-400 text-xs">
                          <span>Target: Class {targetNextClass}</span>
                          <ArrowRight className="h-3 w-3" />
                        </span>
                      </div>

                      {/* Contact & Queue Status */}
                      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                        {s.studentContact ? (
                          <a
                            href={`tel:${s.studentContact}`}
                            className="inline-flex items-center gap-1 text-primary font-mono hover:underline"
                          >
                            <Phone className="h-3 w-3" />
                            <span>{s.studentContact}</span>
                          </a>
                        ) : (
                          <span>Phone: N/A</span>
                        )}

                        {s.isInvoiceQueued && (
                          <span className="text-purple-600 font-bold flex items-center gap-1">
                            <Printer className="h-3 w-3" />
                            <span>In Invoice Queue</span>
                          </span>
                        )}
                      </div>

                      {/* Card Action */}
                      <div className="pt-2 flex items-center justify-end gap-2">
                        <Button
                          size="sm"
                          onClick={() => openConfirmModal(s)}
                          className={cn(
                            "h-8 px-3.5 text-xs font-bold rounded-xl shadow-xs cursor-pointer",
                            isAdmitted
                              ? "bg-muted hover:bg-muted/80 text-foreground border"
                              : "bg-emerald-600 hover:bg-emerald-700 text-white"
                          )}
                        >
                          {isAdmitted ? (
                            <span>Edit / Re-confirm</span>
                          ) : (
                            <span className="flex items-center gap-1">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              <span>Take Fee &amp; Admit</span>
                            </span>
                          )}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Desktop Table View (hidden md:block) */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b bg-muted/40 text-muted-foreground font-semibold">
                      <th className="py-3.5 px-4">Roll &amp; ID</th>
                      <th className="py-3.5 px-4">Candidate &amp; Guardian</th>
                      <th className="py-3.5 px-4">Class Progression</th>
                      <th className="py-3.5 px-4">Contact</th>
                      <th className="py-3.5 px-4">Re-Admission Status</th>
                      <th className="py-3.5 px-4">Invoice Queue</th>
                      <th className="py-3.5 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {filteredStudents.map((s) => {
                      const targetNextClass = CLASS_NEXT_MAP[s.presentClass] || s.presentClass;
                      const isAdmitted = s.reAdmissionStatus === "admitted";
                      const isNotAdmitted = s.reAdmissionStatus === "not_admitted";

                      return (
                        <tr
                          key={s.id}
                          className={cn(
                            "hover:bg-muted/30 transition-colors",
                            isAdmitted
                              ? "bg-emerald-500/[0.02]"
                              : isNotAdmitted
                              ? "bg-rose-500/[0.02]"
                              : ""
                          )}
                        >
                          {/* Roll & School ID */}
                          <td className="py-3.5 px-4 font-mono">
                            <span className="font-black text-foreground text-xs block">
                              Roll #{s.presentRoll}
                            </span>
                            <span className="text-[10px] text-muted-foreground block">
                              {s.schoolId || "ID Pending"}
                            </span>
                          </td>

                          {/* Candidate & Guardian */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2.5">
                              <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                                {s.name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p className="font-bold text-foreground text-sm leading-tight">
                                  {s.name}
                                </p>
                                <p className="text-[10px] text-muted-foreground">
                                  Guardian: {s.fatherName || s.guardianName || "N/A"}
                                </p>
                              </div>
                            </div>
                          </td>

                          {/* Class Progression */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-1.5 font-bold">
                              <span className="px-2 py-0.5 rounded-md bg-muted text-foreground border text-xs">
                                Class {s.presentClass} ({s.presentSection || "A"})
                              </span>
                              <ArrowRight className="h-3 w-3 text-muted-foreground" />
                              <span className="px-2 py-0.5 rounded-md bg-orange-500/10 text-orange-700 dark:text-orange-400 border border-orange-500/20 text-xs">
                                Class {targetNextClass}
                              </span>
                            </div>
                          </td>

                          {/* Contact */}
                          <td className="py-3.5 px-4 font-mono">
                            {s.studentContact ? (
                              <a
                                href={`tel:${s.studentContact}`}
                                className="text-primary hover:underline"
                              >
                                {s.studentContact}
                              </a>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>

                          {/* Status */}
                          <td className="py-3.5 px-4">
                            {isAdmitted ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
                                <CheckCircle2 className="h-3 w-3" />
                                <span>Admitted</span>
                              </span>
                            ) : isNotAdmitted ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/30">
                                <XCircle className="h-3 w-3" />
                                <span>Not Admitted</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30">
                                <Clock className="h-3 w-3" />
                                <span>Pending</span>
                              </span>
                            )}
                          </td>

                          {/* Invoice Queue Status */}
                          <td className="py-3.5 px-4">
                            {s.isInvoiceQueued ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-purple-700 dark:text-purple-400">
                                <Printer className="h-3.5 w-3.5" />
                                <span>In Print Queue</span>
                              </span>
                            ) : (
                              <span className="text-muted-foreground text-[11px]">—</span>
                            )}
                          </td>

                          {/* Action */}
                          <td className="py-3.5 px-4 text-right">
                            <Button
                              size="sm"
                              onClick={() => openConfirmModal(s)}
                              className={cn(
                                "h-7.5 px-3 text-xs font-bold rounded-xl shadow-xs cursor-pointer",
                                isAdmitted
                                  ? "bg-muted hover:bg-muted/80 text-foreground border"
                                  : "bg-emerald-600 hover:bg-emerald-700 text-white"
                              )}
                            >
                              {isAdmitted ? (
                                <span>Edit / Re-confirm</span>
                              ) : (
                                <span className="flex items-center gap-1">
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                  <span>Take Fee &amp; Admit</span>
                                </span>
                              )}
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* RE-ADMISSION CONFIRMATION POPUP MODAL */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md bg-card border rounded-3xl p-6 shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-foreground flex items-center gap-2">
              <RefreshCw className="h-5 w-5 text-orange-500" />
              <span>Confirm Re-Admission &amp; Push to Queue</span>
            </DialogTitle>
          </DialogHeader>

          {activeStudent && (
            <div className="space-y-4 pt-2">
              {/* Student Header Card */}
              <div className="p-3 rounded-2xl bg-muted/40 border flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/15 text-primary flex items-center justify-center font-bold text-sm">
                  {activeStudent.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-foreground truncate">
                      {activeStudent.name}
                    </h3>
                    <span className="font-mono text-xs font-bold text-primary">
                      {activeStudent.schoolId || `Roll #${activeStudent.presentRoll}`}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    Guardian: {activeStudent.fatherName || activeStudent.guardianName || "N/A"} • Phone:{" "}
                    {activeStudent.studentContact || "N/A"}
                  </p>
                </div>
              </div>

              {/* Class Transition Details */}
              <div className="grid grid-cols-2 gap-3 p-3.5 rounded-2xl bg-background border">
                {/* Completed / Previous Class */}
                <div className="border-r pr-3 space-y-1">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                    Completed Class
                  </span>
                  <p className="text-sm font-black text-foreground">
                    Class {activeStudent.presentClass}
                  </p>
                  <p className="text-xs text-muted-foreground font-mono">
                    Sec {activeStudent.presentSection || "A"} • Roll #{activeStudent.presentRoll}
                  </p>
                </div>

                {/* New Promoted Class */}
                <div className="space-y-1.5 pl-1">
                  <span className="text-[10px] font-bold text-orange-600 dark:text-orange-400 uppercase tracking-wider">
                    Promoted Class *
                  </span>
                  <CustomSelect
                    value={newClass}
                    onChange={handleNewClassChange}
                    options={[
                      { value: "V", label: "Class V" },
                      { value: "VI", label: "Class VI" },
                      { value: "VII", label: "Class VII" },
                      { value: "VIII", label: "Class VIII" },
                      { value: "IX", label: "Class IX" },
                      { value: "X", label: "Class X" },
                      { value: "Sent Up M.P.", label: "Sent Up M.P." },
                      { value: "XI", label: "Class XI" },
                      { value: "XII", label: "Class XII" },
                      { value: "Passed Out", label: "Passed Out" },
                    ]}
                    searchable={false}
                    placeholder="Class"
                    triggerClassName="h-8.5 text-xs font-bold px-2.5"
                  />
                  <div className="grid grid-cols-2 gap-1.5 pt-1">
                    <div>
                      <label className="text-[9px] text-muted-foreground uppercase font-bold block mb-1">
                        Section
                      </label>
                      <CustomSelect
                        value={newSection}
                        onChange={setNewSection}
                        options={(sections.length ? sections : ["A", "B", "C", "D"]).map((sec) => ({
                          value: sec,
                          label: sec,
                        }))}
                        searchable={false}
                        placeholder="Sec"
                        triggerClassName="h-8 text-xs font-bold px-2.5"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] text-muted-foreground uppercase font-bold block mb-1">
                        Roll
                      </label>
                      <Input
                        type="number"
                        value={newRoll}
                        onChange={(e) => setNewRoll(e.target.value)}
                        className="h-8 text-xs font-bold rounded-lg"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Fee & Invoice Number */}
              <div className="grid grid-cols-2 gap-3 p-3 rounded-2xl bg-muted/30 border">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                      Invoice Amount (₹)
                    </label>
                    <span className="text-[9px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded-md">
                      {newClass ? `${FEE_SECTIONS.find((s) => s.id === getFeeCategoryForClass(newClass))?.shortLabel || "Preset"} Tier` : "From Preset"}
                    </span>
                  </div>
                  <Input
                    type="number"
                    value={feeAmount}
                    onChange={(e) => setFeeAmount(e.target.value)}
                    className="h-8.5 text-xs font-bold rounded-xl bg-background"
                    placeholder="Fee Amount"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                      Invoice Number
                    </label>
                    <button
                      type="button"
                      onClick={async () => {
                        const num = await fetchNextInvoiceNumber();
                        setReceiptNo(num);
                      }}
                      title="Sync next invoice sequence from DB"
                      disabled={isFetchingInvoiceNo}
                      className="text-[9px] font-semibold text-primary hover:underline flex items-center gap-1 cursor-pointer disabled:opacity-50"
                    >
                      <RefreshCw className={cn("h-2.5 w-2.5", isFetchingInvoiceNo && "animate-spin")} />
                      <span>Sync</span>
                    </button>
                  </div>
                  <Input
                    value={receiptNo}
                    onChange={(e) => setReceiptNo(e.target.value)}
                    className="h-8.5 text-xs font-mono font-bold rounded-xl bg-background text-primary"
                    placeholder="e.g. MHS/2026/ADM-0001"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-col gap-2">
                <Button
                  onClick={handleAdmit}
                  disabled={mutation.isPending || isFetchingInvoiceNo}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-10 rounded-xl shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span>
                    {mutation.isPending
                      ? "Enrolling & Queuing..."
                      : "Confirm Re-Admission & Push to Queue"}
                  </span>
                </Button>

                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleMarkNotAdmitted}
                    disabled={mutation.isPending}
                    className="border-rose-500/30 text-rose-600 hover:bg-rose-500/10 font-bold text-xs h-9 rounded-xl cursor-pointer"
                  >
                    <XCircle className="h-3.5 w-3.5 mr-1" />
                    <span>Mark Not Admitted</span>
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    onClick={handleReset}
                    disabled={mutation.isPending}
                    className="text-muted-foreground hover:text-foreground text-xs h-9 rounded-xl cursor-pointer"
                  >
                    <RotateCcw className="h-3.5 w-3.5 mr-1" />
                    <span>Reset to Pending</span>
                  </Button>
                </div>
                <p className="text-[10px] text-center text-muted-foreground">
                  Upon admission, the student is pushed to the Class Invoice Queue for batch printing.
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function ReAdmissionDashboard() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          <span>Loading Re-Admission Desk...</span>
        </div>
      }
    >
      <ReAdmissionDashboardContent />
    </Suspense>
  );
}
