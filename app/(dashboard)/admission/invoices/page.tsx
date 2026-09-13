"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getStudents, bulkUpdateStudents } from "@/lib/data/students";
import { getAdmissionApplications } from "@/lib/data/admission";
import type { Student } from "@/lib/types";
import {
  type InvoiceData,
  DEFAULT_FEE_ITEMS,
  getSavedFeeStructure,
  calculateFeeTotal,
  generateInvoiceNumber,
} from "@/lib/utils/fee-config";
import { InvoicePrintableBatchView } from "@/components/invoice/invoice-printable-view";
import { useSchoolProfile } from "@/lib/utils/school-profile";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { showToast } from "@/components/ui/toast-banner";
import {
  Printer,
  ArrowLeft,
  CheckCircle2,
  Users,
  RefreshCw,
  Sparkles,
  FileCheck,
  Eye,
  CheckCheck,
  Clock,
  Filter,
} from "lucide-react";
import { cn, sortClasses } from "@/lib/utils";

interface ClassSectionGroup {
  key: string;
  class: string;
  section: string;
  students: Student[];
  totalCount: number;
}

export default function BulkInvoicesPage() {
  const queryClient = useQueryClient();
  const { profile: schoolProfile } = useSchoolProfile();

  // Print modal state
  const [activePrintGroup, setActivePrintGroup] = useState<ClassSectionGroup | null>(null);
  const [printCopyType, setPrintCopyType] = useState<"both" | "student" | "school">("both");
  const [printModalOpen, setPrintModalOpen] = useState(false);

  // 1. Fetch all students
  const { data: allStudents = [], isLoading: loadingStudents } = useQuery({
    queryKey: ["students"],
    queryFn: () => getStudents("summary"),
    staleTime: 2 * 60 * 1000,
  });

  // 2. Fetch new admitted applications
  const { data: applications = [], isLoading: loadingApps } = useQuery({
    queryKey: ["admission-applications"],
    queryFn: () => getAdmissionApplications({ status: "admitted" }),
    staleTime: 60 * 1000,
  });

  // Filter students who are ready for invoice printing
  // Admitted either via re-admission or new admission or flagged with isInvoiceQueued
  const queuedStudents = useMemo(() => {
    return allStudents.filter((s) => {
      if (s.currentStatus !== "Continuing") return false;
      return (
        s.isInvoiceQueued === true ||
        s.reAdmissionStatus === "admitted"
      );
    });
  }, [allStudents]);

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
    return groups.sort((a, b) => {
      const order = ["V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];
      const idxA = order.indexOf(a.class);
      const idxB = order.indexOf(b.class);
      if (idxA !== idxB) return idxA - idxB;
      return a.section.localeCompare(b.section);
    });
  }, [queuedStudents]);

  // Build InvoiceData objects for printing
  const currentBatchInvoices = useMemo<InvoiceData[]>(() => {
    if (!activePrintGroup) return [];
    const feeItems = getSavedFeeStructure();
    const currentYear = new Date().getFullYear();
    const issueDate = new Date().toISOString().split("T")[0];

    return activePrintGroup.students.map((student, idx) => ({
      invoiceNumber: generateInvoiceNumber(student.presentRoll || idx + 1, currentYear),
      academicSession: `${currentYear}-${currentYear + 1}`,
      issueDate,
      issueTime: "10:00 AM",
      studentId: student.schoolId || `STU-${student.id.slice(0, 6)}`,
      studentName: student.name,
      studentClass: student.presentClass,
      section: student.presentSection || "A",
      rollNo: String(student.presentRoll || idx + 1),
      guardianName: student.fatherName || student.guardianName || "N/A",
      contactNumber: student.studentContact || "",
      penNumber: student.pen || "",
      feeItems,
      paymentMode: "Cash" as const,
      paymentStatus: "Paid" as const,
      remarks: "Admission Fee 2026",
    }));
  }, [activePrintGroup]);

  // Trigger 1-Click Print for a Class & Section
  function handleOneClickPrint(group: ClassSectionGroup) {
    setActivePrintGroup(group);
    setPrintModalOpen(true);
  }

  function executeBrowserPrint() {
    window.print();
  }

  // Mutation to clear invoice queue for a group
  const clearQueueMutation = useMutation({
    mutationFn: async (students: Student[]) => {
      const updates = students.map((s) => ({
        id: s.id,
        changes: { isInvoiceQueued: false, invoice_printed_at: new Date().toISOString() },
      }));
      return bulkUpdateStudents(updates as any);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
      showToast("Invoices marked as printed & archived!", "success");
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
            className="p-2 rounded-xl border hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
              <Printer className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              <span>Bulk Admission Invoices Queue</span>
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              Admitted students organized by Class &amp; Section. 1-Click print all fee slips ready for the upcoming session.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
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
          <p className="text-2xl font-black mt-1 text-purple-600 dark:text-purple-400">{queuedStudents.length}</p>
        </div>
        <div className="bg-card border rounded-2xl p-4 shadow-2xs">
          <span className="text-[11px] font-semibold text-muted-foreground">Class &amp; Section Batches</span>
          <p className="text-2xl font-black mt-1 text-foreground">{groupedByClassSection.length}</p>
        </div>
        <div className="bg-card border rounded-2xl p-4 shadow-2xs">
          <span className="text-[11px] font-semibold text-muted-foreground">Session</span>
          <p className="text-2xl font-black mt-1 text-foreground">2026–2027</p>
        </div>
        <div className="bg-card border rounded-2xl p-4 shadow-2xs">
          <span className="text-[11px] font-semibold text-muted-foreground">Paper Standard</span>
          <p className="text-2xl font-black mt-1 text-emerald-600 dark:text-emerald-400">A4 / A5 Dual</p>
        </div>
      </div>

      {/* Class-wise & Section-wise Queue Cards */}
      <div className="print:hidden">
        {loadingStudents ? (
          <div className="p-12 text-center text-xs text-muted-foreground animate-pulse">
            Loading queued student invoices...
          </div>
        ) : groupedByClassSection.length === 0 ? (
          <div className="bg-card border rounded-3xl p-12 text-center space-y-3">
            <div className="h-14 w-14 rounded-full bg-purple-500/10 text-purple-600 flex items-center justify-center mx-auto">
              <CheckCheck className="h-7 w-7" />
            </div>
            <h3 className="text-base font-bold text-foreground">No Pending Invoices in Queue</h3>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              When students are marked as &quot;Admitted&quot; in Re-admission or New Admission, their names will automatically group here by Class and Section for 1-click batch printing.
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
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {groupedByClassSection.map((group) => (
              <div
                key={group.key}
                className="bg-card border border-border/80 rounded-3xl p-5 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between"
              >
                <div>
                  {/* Card Header with Class & Section Badges */}
                  <div className="flex items-center justify-between border-b pb-3.5 mb-3.5">
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1 rounded-xl bg-purple-500/10 text-purple-700 dark:text-purple-300 font-black text-sm border border-purple-500/20">
                        Class {group.class}
                      </span>
                      <span className="px-2.5 py-1 rounded-xl bg-muted text-foreground font-bold text-xs border">
                        Sec {group.section}
                      </span>
                    </div>
                    <span className="text-xs font-bold text-muted-foreground flex items-center gap-1">
                      <Users className="h-3.5 w-3.5" />
                      <span>{group.totalCount} Students</span>
                    </span>
                  </div>

                  {/* Student Roll & Name List Preview */}
                  <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1 custom-scrollbar">
                    {group.students.map((student) => (
                      <div
                        key={student.id}
                        className="flex items-center justify-between text-xs py-1 px-2 rounded-lg bg-muted/30 hover:bg-muted/60 transition-colors"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-mono font-bold text-[10px] w-6 text-muted-foreground shrink-0">
                            #{student.presentRoll}
                          </span>
                          <span className="font-medium text-foreground truncate">{student.name}</span>
                        </div>
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold shrink-0">
                          Ready
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 1-Click Print Button */}
                <div className="mt-5 pt-4 border-t border-border/60 flex items-center gap-2">
                  <Button
                    onClick={() => handleOneClickPrint(group)}
                    className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs h-10 rounded-xl shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
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
        <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto bg-card border rounded-3xl p-6 shadow-2xl">
          <DialogHeader className="border-b pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <DialogTitle className="text-lg font-black text-foreground flex items-center gap-2">
                  <Printer className="h-5 w-5 text-purple-600" />
                  <span>
                    Batch Invoices: Class {activePrintGroup?.class} – Section {activePrintGroup?.section}
                  </span>
                </DialogTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {currentBatchInvoices.length} invoices generated for 1-click batch printing.
                </p>
              </div>

              {/* Print Format Switcher */}
              <div className="flex items-center gap-2">
                <div className="flex items-center bg-muted p-1 rounded-xl border">
                  <button
                    onClick={() => setPrintCopyType("both")}
                    className={cn(
                      "px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer",
                      printCopyType === "both" ? "bg-background shadow-xs text-foreground" : "text-muted-foreground"
                    )}
                  >
                    Dual (Student+School)
                  </button>
                  <button
                    onClick={() => setPrintCopyType("student")}
                    className={cn(
                      "px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer",
                      printCopyType === "student" ? "bg-background shadow-xs text-foreground" : "text-muted-foreground"
                    )}
                  >
                    4-Up A4 Student
                  </button>
                </div>

                <Button
                  onClick={executeBrowserPrint}
                  className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs h-9 px-4 rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Printer className="h-4 w-4" />
                  <span>Print Now</span>
                </Button>

                {activePrintGroup && (
                  <Button
                    variant="outline"
                    onClick={() => clearQueueMutation.mutate(activePrintGroup.students)}
                    disabled={clearQueueMutation.isPending}
                    className="text-xs font-semibold h-9 rounded-xl border-border"
                  >
                    Mark as Printed
                  </Button>
                )}
              </div>
            </div>
          </DialogHeader>

          {/* Printable Container */}
          <div className="pt-4 overflow-x-auto flex justify-center bg-slate-100 dark:bg-slate-900/50 p-4 rounded-2xl">
            <InvoicePrintableBatchView
              invoices={currentBatchInvoices}
              copyType={printCopyType}
              schoolProfile={schoolProfile}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
