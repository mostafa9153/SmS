"use client";

import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getStudents, getDistinctClasses, getDistinctSections } from "@/lib/data/students";
import { updateReAdmissionStatus } from "@/lib/data/admission";
import type { Student, StudentStatus } from "@/lib/types";
import { CustomSelect } from "@/components/ui/custom-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { showToast } from "@/components/ui/toast-banner";
import {
  RefreshCw,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  Printer,
  Filter,
  ArrowLeft,
  UserCheck,
  UserX,
  User,
  RotateCcw,
} from "lucide-react";
import Link from "next/link";
import { cn, sortClasses } from "@/lib/utils";
import {
  getSavedFeeStructure,
  calculateFeeTotal,
  generateInvoiceNumber,
} from "@/lib/utils/fee-config";

const CLASS_NEXT_MAP: Record<string, string> = {
  V: "VI",
  VI: "VII",
  VII: "VIII",
  VIII: "IX",
  IX: "X",
  X: "Sent Up M.P.",
  XI: "XII",
  XII: "Passed Out",
};

export default function ReAdmissionPage() {
  const queryClient = useQueryClient();
  const [selectedClass, setSelectedClass] = useState<string>("V");
  const [selectedSection, setSelectedSection] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Modal State
  const [activeStudent, setActiveStudent] = useState<Student | null>(null);
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [newClass, setNewClass] = useState<string>("");
  const [newSection, setNewSection] = useState<string>("A");
  const [newRoll, setNewRoll] = useState<string>("1");
  const [feePaid, setFeePaid] = useState<boolean>(true);
  const [feeAmount, setFeeAmount] = useState<string>("250");
  const [receiptNo, setReceiptNo] = useState<string>("");

  const { data: allStudents = [], isLoading } = useQuery({
    queryKey: ["students"],
    queryFn: () => getStudents("summary"),
    staleTime: 2 * 60 * 1000,
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

  // Filter students
  const filteredStudents = useMemo(() => {
    return allStudents.filter((s) => {
      if (s.currentStatus !== "Continuing") return false;
      if (selectedClass && s.presentClass !== selectedClass) return false;
      if (selectedSection && s.presentSection !== selectedSection) return false;

      // Status filter
      if (statusFilter === "admitted" && s.reAdmissionStatus !== "admitted") return false;
      if (statusFilter === "not_admitted" && s.reAdmissionStatus !== "not_admitted") return false;
      if (statusFilter === "pending" && (s.reAdmissionStatus === "admitted" || s.reAdmissionStatus === "not_admitted"))
        return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = s.name.toLowerCase().includes(q);
        const matchesRoll = String(s.presentRoll).includes(q);
        const matchesSchoolId = s.schoolId?.toLowerCase().includes(q);
        if (!matchesName && !matchesRoll && !matchesSchoolId) return false;
      }

      return true;
    });
  }, [allStudents, selectedClass, selectedSection, statusFilter, searchQuery]);

  // Statistics for the selected class
  const classStats = useMemo(() => {
    const classOnly = allStudents.filter(
      (s) => s.currentStatus === "Continuing" && (!selectedClass || s.presentClass === selectedClass)
    );
    const admitted = classOnly.filter((s) => s.reAdmissionStatus === "admitted").length;
    const notAdmitted = classOnly.filter((s) => s.reAdmissionStatus === "not_admitted").length;
    const pending = classOnly.length - admitted - notAdmitted;
    return { total: classOnly.length, admitted, notAdmitted, pending };
  }, [allStudents, selectedClass]);

  const currentYear = new Date().getFullYear();
  const [isFetchingInvoiceNo, setIsFetchingInvoiceNo] = useState(false);

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

  // Open modal
  async function openConfirmModal(student: Student) {
    setActiveStudent(student);
    const defaultNext = CLASS_NEXT_MAP[student.presentClass] || student.presentClass;
    setNewClass(defaultNext);
    setNewSection(student.presentSection || "A");
    setNewRoll(String(student.presentRoll || 1));
    setFeePaid(true);

    // 1. Take amount dynamically from invoice fee structure configuration
    const feeItems = getSavedFeeStructure();
    const invoiceTotal = calculateFeeTotal(feeItems);
    setFeeAmount(String(invoiceTotal > 0 ? invoiceTotal : 600));

    // 2. Fetch the real upcoming invoice number
    setReceiptNo("Syncing...");
    setModalOpen(true);
    const nextInvoiceNo = await fetchNextInvoiceNumber();
    setReceiptNo(nextInvoiceNo);
  }

  // Mutation
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
      showToast(data.message || "Updated successfully!", "success");
      setModalOpen(false);
    },
    onError: (err: any) => {
      showToast(err.message || "Failed to update re-admission", "error");
    },
  });

  function handleAdmit() {
    if (!activeStudent) return;
    mutation.mutate({
      action: "admit",
      studentId: activeStudent.id,
      newClass,
      newSection,
      newRoll: parseInt(newRoll) || 1,
      feePaid,
      feeAmount: parseFloat(feeAmount) || 0,
      paymentReceiptNo: receiptNo,
    });
  }

  function handleMarkNotAdmitted() {
    if (!activeStudent) return;
    mutation.mutate({
      action: "not_admitted",
      studentId: activeStudent.id,
    });
  }

  function handleReset() {
    if (!activeStudent) return;
    mutation.mutate({
      action: "reset",
      studentId: activeStudent.id,
    });
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-5">
        <div className="flex items-center gap-3">
          <Link
            href="/admission"
            className="p-2 rounded-xl border hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
              <RefreshCw className="h-5 w-5 text-orange-500" />
              <span>Re-admission Desk</span>
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              Confirm returning students as they pay fees. Admitted students are automatically queued for 1-click invoice printing.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Link
            href="/admission/invoices"
            className="w-full sm:w-auto justify-center inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-500/20 text-xs sm:text-sm font-bold transition-all"
          >
            <Printer className="h-4 w-4" />
            <span>Class Invoice Queue</span>
          </Link>
        </div>
      </div>

      {/* Class Statistics Chips */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-card border rounded-2xl p-3.5 shadow-2xs">
          <span className="text-[11px] font-semibold text-muted-foreground">Class {selectedClass || "All"} Students</span>
          <p className="text-xl font-bold mt-1 text-foreground">{classStats.total}</p>
        </div>
        <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-3.5 shadow-2xs">
          <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" />
            <span>Admitted</span>
          </span>
          <p className="text-xl font-bold mt-1 text-emerald-600 dark:text-emerald-400">{classStats.admitted}</p>
        </div>
        <div className="bg-rose-500/5 border border-rose-500/20 rounded-2xl p-3.5 shadow-2xs">
          <span className="text-[11px] font-semibold text-rose-700 dark:text-rose-400 flex items-center gap-1">
            <XCircle className="h-3 w-3" />
            <span>Not Admitted</span>
          </span>
          <p className="text-xl font-bold mt-1 text-rose-600 dark:text-rose-400">{classStats.notAdmitted}</p>
        </div>
        <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-3.5 shadow-2xs">
          <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>Pending Re-admission</span>
          </span>
          <p className="text-xl font-bold mt-1 text-amber-600 dark:text-amber-400">{classStats.pending}</p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-card border rounded-2xl p-3.5 sm:p-4 shadow-xs space-y-3">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-3">
          {/* Class Filter */}
          <div>
            <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1 block">
              Current Class
            </label>
            <CustomSelect
              value={selectedClass}
              onChange={setSelectedClass}
              options={sortClasses(classes.length ? classes : ["V", "VI", "VII", "VIII", "IX", "X", "XI"]).map(
                (c) => ({
                  value: c,
                  label: `Class ${c}`,
                })
              )}
              placeholder="Select Class"
            />
          </div>

          {/* Section Filter */}
          <div>
            <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1 block">
              Section
            </label>
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
              placeholder="All Sections"
            />
          </div>

          {/* Status Filter */}
          <div>
            <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1 block">
              Re-admission Status
            </label>
            <CustomSelect
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                { value: "all", label: "All Statuses" },
                { value: "admitted", label: "✅ Admitted Only" },
                { value: "not_admitted", label: "❌ Not Admitted" },
                { value: "pending", label: "⏳ Pending Verification" },
              ]}
            />
          </div>

          {/* Search Query */}
          <div className="col-span-2 md:col-span-1">
            <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1 block">
              Search Student
            </label>
            <div className="relative">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Name, Roll, School ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-xs rounded-xl"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Students List */}
      <div className="bg-card border rounded-2xl overflow-hidden shadow-xs">
        <div className="px-4 py-3 border-b bg-muted/20 flex items-center justify-between">
          <span className="text-xs font-bold text-foreground">
            Students Found ({filteredStudents.length})
          </span>
          <span className="text-[11px] text-muted-foreground">
            Showing promoted candidates ready for confirmation
          </span>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-xs text-muted-foreground animate-pulse">
            Loading student roster...
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <UserX className="h-10 w-10 text-muted-foreground/50 mx-auto" />
            <p className="text-sm font-semibold text-foreground">No students match your filter</p>
            <p className="text-xs text-muted-foreground">
              Try changing class, section or status filter.
            </p>
          </div>
        ) : (
          <div>
            {/* Mobile Card List (Visible on mobile, hidden on md+) */}
            <div className="md:hidden divide-y divide-border/60">
              {filteredStudents.map((s) => {
                const targetNextClass = CLASS_NEXT_MAP[s.presentClass] || s.presentClass;
                const isAdmitted = s.reAdmissionStatus === "admitted";
                const isNotAdmitted = s.reAdmissionStatus === "not_admitted";

                return (
                  <div
                    key={s.id}
                    className={cn(
                      "p-3.5 space-y-2.5 transition-colors",
                      isAdmitted && "bg-emerald-500/[0.03]",
                      isNotAdmitted && "bg-rose-500/[0.03]"
                    )}
                  >
                    {/* Header: Roll & Status */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="px-2 py-0.5 rounded-md bg-muted text-foreground font-mono font-bold text-xs border">
                        Roll #{s.presentRoll}
                      </span>

                      {isAdmitted ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
                          <CheckCircle2 className="h-3 w-3" />
                          <span>Admitted (2026)</span>
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
                    </div>

                    {/* Candidate Info */}
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden border">
                        {s.photoUrl ? (
                          <img
                            src={s.photoUrl}
                            alt={s.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          s.name.charAt(0).toUpperCase()
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm text-foreground leading-tight truncate">
                          {s.name}
                        </p>
                        <p className="text-[11px] text-muted-foreground font-mono mt-0.5 truncate">
                          {s.schoolId || "ID Pending"} • Guardian: {s.fatherName || s.guardianName || "N/A"}
                        </p>
                      </div>
                    </div>

                    {/* Class Progression & Contact */}
                    <div className="flex items-center justify-between gap-2 pt-1 border-t border-dashed border-border/60 text-xs">
                      <div className="flex items-center gap-1.5 font-medium">
                        <span className="text-muted-foreground">Class {s.presentClass} ({s.presentSection || "A"})</span>
                        <ArrowRight className="h-3 w-3 text-muted-foreground" />
                        <span className="font-bold text-primary">Class {targetNextClass}</span>
                      </div>
                      {s.studentContact && (
                        <a
                          href={`tel:${s.studentContact}`}
                          className="text-[11px] font-mono text-primary hover:underline"
                        >
                          📞 {s.studentContact}
                        </a>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="pt-1.5 flex justify-end">
                      <Button
                        size="sm"
                        variant={isAdmitted ? "outline" : "default"}
                        onClick={() => openConfirmModal(s)}
                        className={cn(
                          "h-8 w-full sm:w-auto text-xs font-bold rounded-xl cursor-pointer",
                          isAdmitted
                            ? "border-emerald-500/30 text-emerald-700 hover:bg-emerald-500/10"
                            : "bg-orange-500 hover:bg-orange-600 text-white shadow-xs"
                        )}
                      >
                        {isAdmitted ? "Edit / Re-confirm" : "Take Re-admission"}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop Table (Hidden on mobile, visible md+) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b bg-muted/40 text-muted-foreground font-semibold">
                    <th className="py-3 px-4">Roll</th>
                    <th className="py-3 px-4">Student Name</th>
                    <th className="py-3 px-4">Current Class</th>
                    <th className="py-3 px-4">Next Target</th>
                    <th className="py-3 px-4">Re-admission Status</th>
                    <th className="py-3 px-4 text-right">Action</th>
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
                          isAdmitted && "bg-emerald-500/5",
                          isNotAdmitted && "bg-rose-500/5"
                        )}
                      >
                        <td className="py-3 px-4 font-mono font-bold text-foreground">
                          {s.presentRoll}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="h-7 w-7 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                              {s.photoUrl ? (
                                <img
                                  src={s.photoUrl}
                                  alt={s.name}
                                  className="h-full w-full object-cover rounded-full"
                                />
                              ) : (
                                s.name.charAt(0).toUpperCase()
                              )}
                            </div>
                            <div>
                              <p className="font-bold text-foreground leading-tight">{s.name}</p>
                              <p className="text-[10px] text-muted-foreground font-mono">
                                {s.schoolId || "ID Pending"} • Guardian: {s.fatherName || s.guardianName || "N/A"}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 font-semibold">
                          Class {s.presentClass} ({s.presentSection || "A"})
                        </td>
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center gap-1 font-bold text-primary">
                            <span>Class {targetNextClass}</span>
                            <ArrowRight className="h-3 w-3 text-muted-foreground" />
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {isAdmitted ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
                              <CheckCircle2 className="h-3 w-3" />
                              <span>Admitted (2026)</span>
                            </span>
                          ) : isNotAdmitted ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/30">
                              <XCircle className="h-3 w-3" />
                              <span>Not Admitted</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30">
                              <Clock className="h-3 w-3" />
                              <span>Pending</span>
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <Button
                            size="sm"
                            variant={isAdmitted ? "outline" : "default"}
                            onClick={() => openConfirmModal(s)}
                            className={cn(
                              "h-8 text-xs font-bold rounded-xl cursor-pointer",
                              isAdmitted
                                ? "border-emerald-500/30 text-emerald-700 hover:bg-emerald-500/10"
                                : "bg-orange-500 hover:bg-orange-600 text-white shadow-xs"
                            )}
                          >
                            {isAdmitted ? "Edit / Re-confirm" : "Take Re-admission"}
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

      {/* Confirmation Dialog */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md bg-card border rounded-3xl p-6 shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-foreground flex items-center gap-2">
              <RefreshCw className="h-5 w-5 text-orange-500" />
              <span>Re-admission Confirmation</span>
            </DialogTitle>
          </DialogHeader>

          {activeStudent && (
            <div className="space-y-4 pt-2">
              {/* Student Header */}
              <div className="p-3 rounded-2xl bg-muted/40 border flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-sm">
                  {activeStudent.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">{activeStudent.name}</h3>
                  <p className="text-xs text-muted-foreground">
                    Guardian: {activeStudent.fatherName || activeStudent.guardianName || "N/A"} • Phone:{" "}
                    {activeStudent.studentContact || "N/A"}
                  </p>
                </div>
              </div>

              {/* Compare Prev vs New */}
              <div className="grid grid-cols-2 gap-3 p-3.5 rounded-2xl bg-background border">
                {/* Previous */}
                <div className="border-r pr-3 space-y-1">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                    Completed Class
                  </span>
                  <p className="text-sm font-black text-foreground">Class {activeStudent.presentClass}</p>
                  <p className="text-xs text-muted-foreground">
                    Section: {activeStudent.presentSection || "A"} • Roll: {activeStudent.presentRoll}
                  </p>
                </div>

                {/* New Target */}
                <div className="space-y-1.5 pl-1">
                  <span className="text-[10px] font-bold text-primary uppercase tracking-wider">
                    New Admission Class
                  </span>
                  <CustomSelect
                    value={newClass}
                    onChange={setNewClass}
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
                    placeholder="Select Class"
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

              {/* Fee Receipt Details */}
              <div className="grid grid-cols-2 gap-3 p-3 rounded-2xl bg-muted/30 border">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                      Invoice Amount (₹)
                    </label>
                    <span className="text-[9px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded-md">
                      From Invoice
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

              {/* Status Actions */}
              <div className="pt-2 flex flex-col gap-2">
                <Button
                  onClick={handleAdmit}
                  disabled={mutation.isPending || isFetchingInvoiceNo}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-10 rounded-xl shadow-xs cursor-pointer"
                >
                  <CheckCircle2 className="h-4 w-4 mr-1.5" />
                  <span>Confirm Admitted (Queue Invoice)</span>
                </Button>

                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    onClick={handleMarkNotAdmitted}
                    disabled={mutation.isPending}
                    className="border-rose-500/30 text-rose-600 hover:bg-rose-500/10 font-bold text-xs h-9 rounded-xl cursor-pointer"
                  >
                    <XCircle className="h-3.5 w-3.5 mr-1" />
                    <span>Not Admitted</span>
                  </Button>

                  <Button
                    variant="ghost"
                    onClick={handleReset}
                    disabled={mutation.isPending}
                    className="text-muted-foreground hover:text-foreground text-xs h-9 rounded-xl cursor-pointer"
                  >
                    <RotateCcw className="h-3.5 w-3.5 mr-1" />
                    <span>Reset Pending</span>
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
