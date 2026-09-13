"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getAdmissionApplications, admitNewStudentApplication } from "@/lib/data/admission";
import type { AdmissionApplication } from "@/lib/types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CustomSelect } from "@/components/ui/custom-select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { showToast } from "@/components/ui/toast-banner";
import {
  FileCheck2,
  Search,
  CheckCircle2,
  Clock,
  Printer,
  ArrowLeft,
  UserCheck,
  User,
  ShieldCheck,
  ExternalLink,
  Filter,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getSavedFeeStructure,
  calculateFeeTotal,
  generateInvoiceNumber,
} from "@/lib/utils/fee-config";

export default function ApplicationsDeskPage() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("pending");
  const [classFilter, setClassFilter] = useState("all");

  // Admit Verification Modal State
  const [selectedApp, setSelectedApp] = useState<AdmissionApplication | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [assignedSection, setAssignedSection] = useState("A");
  const [assignedRoll, setAssignedRoll] = useState("1");
  const [feePaid, setFeePaid] = useState(true);
  const [feeAmount, setFeeAmount] = useState("350");
  const [receiptNo, setReceiptNo] = useState("");

  const { data: applications = [], isLoading } = useQuery({
    queryKey: ["admission-applications"],
    queryFn: () => getAdmissionApplications(),
    staleTime: 30 * 1000,
  });

  const filteredApps = useMemo(() => {
    return applications.filter((app) => {
      if (statusFilter !== "all" && app.status !== statusFilter) return false;
      if (classFilter !== "all" && app.targetClass !== classFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = app.studentName.toLowerCase().includes(q);
        const matchAppNo = app.applicationNo.toLowerCase().includes(q);
        const matchContact = app.studentContact?.includes(q);
        if (!matchName && !matchAppNo && !matchContact) return false;
      }
      return true;
    });
  }, [applications, statusFilter, classFilter, searchQuery]);

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

  async function openVerifyModal(app: AdmissionApplication) {
    setSelectedApp(app);
    setAssignedSection(app.targetSection || "A");
    setAssignedRoll(String(app.targetRoll || 1));
    setFeePaid(true);

    // 1. Take amount dynamically from invoice fee structure
    const feeItems = getSavedFeeStructure();
    const invoiceTotal = calculateFeeTotal(feeItems);
    setFeeAmount(String(app.feeAmount || (invoiceTotal > 0 ? invoiceTotal : 600)));

    // 2. Use existing paymentReceiptNo or fetch live next sequence
    if (app.paymentReceiptNo) {
      setReceiptNo(app.paymentReceiptNo);
      setModalOpen(true);
    } else {
      setReceiptNo("Syncing...");
      setModalOpen(true);
      const nextInvoiceNo = await fetchNextInvoiceNumber();
      setReceiptNo(nextInvoiceNo);
    }
  }

  const admitMutation = useMutation({
    mutationFn: (payload: {
      applicationId: string;
      section: string;
      roll: number;
      feePaid: boolean;
      feeAmount: number;
      paymentReceiptNo?: string;
    }) =>
      admitNewStudentApplication(payload.applicationId, {
        section: payload.section,
        roll: payload.roll,
        feePaid: payload.feePaid,
        feeAmount: payload.feeAmount,
        paymentReceiptNo: payload.paymentReceiptNo,
      }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["admission-applications"] });
      queryClient.invalidateQueries({ queryKey: ["students"] });
      showToast("Student successfully admitted to Student Register!", "success");
      setModalOpen(false);
    },
    onError: (err: any) => {
      showToast(err.message || "Failed to confirm admission", "error");
    },
  });

  function handleConfirmAdmit() {
    if (!selectedApp) return;
    admitMutation.mutate({
      applicationId: selectedApp.id,
      section: assignedSection,
      roll: parseInt(assignedRoll) || 1,
      feePaid,
      feeAmount: parseFloat(feeAmount) || 0,
      paymentReceiptNo: receiptNo,
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
              <FileCheck2 className="h-5 w-5 text-blue-600" />
              <span>Applications &amp; Verification Desk</span>
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              Verify receipt copies presented by parents at school, confirm fee payment, and admit students into the register.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/admission/new"
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-primary text-primary-foreground text-xs sm:text-sm font-bold shadow-xs transition-all cursor-pointer"
          >
            <span>+ New Application</span>
          </Link>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-card border rounded-2xl p-4 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="text-[11px] font-bold text-muted-foreground uppercase mb-1 block">
              Search by Application No or Name
            </label>
            <div className="relative">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="ADM-2026-..., Student Name, Mobile..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-xs rounded-xl"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold text-muted-foreground uppercase mb-1 block">
              Admission Status
            </label>
            <CustomSelect
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                { value: "all", label: "All Applications" },
                { value: "pending", label: "⏳ Pending Verification (Unadmitted)" },
                { value: "admitted", label: "✅ Admitted Students" },
              ]}
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-muted-foreground uppercase mb-1 block">
              Target Class
            </label>
            <CustomSelect
              value={classFilter}
              onChange={setClassFilter}
              options={[
                { value: "all", label: "All Classes" },
                { value: "V", label: "Class V (Primary Focus)" },
                { value: "VI", label: "Class VI" },
                { value: "VII", label: "Class VII" },
                { value: "VIII", label: "Class VIII" },
                { value: "IX", label: "Class IX" },
                { value: "XI", label: "Class XI" },
              ]}
            />
          </div>
        </div>
      </div>

      {/* Applications List */}
      <div className="bg-card border rounded-2xl overflow-hidden shadow-xs">
        <div className="px-4 py-3 border-b bg-muted/20 flex items-center justify-between">
          <span className="text-xs font-bold text-foreground">
            Applications ({filteredApps.length})
          </span>
          <span className="text-[11px] text-muted-foreground">
            {statusFilter === "pending"
              ? "Students with receipt copies waiting for fee submission"
              : "All applicant records"}
          </span>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-xs text-muted-foreground animate-pulse">
            Loading applications...
          </div>
        ) : filteredApps.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <Clock className="h-10 w-10 text-muted-foreground/50 mx-auto" />
            <p className="text-sm font-semibold text-foreground">No applications found</p>
            <p className="text-xs text-muted-foreground">
              Submit a new application or adjust search filters.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b bg-muted/40 text-muted-foreground font-semibold">
                  <th className="py-3 px-4">App No</th>
                  <th className="py-3 px-4">Candidate Name</th>
                  <th className="py-3 px-4">Target Class</th>
                  <th className="py-3 px-4">Contact / Address</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredApps.map((app) => {
                  const isAdmitted = app.status === "admitted";

                  return (
                    <tr
                      key={app.id}
                      className={cn(
                        "hover:bg-muted/30 transition-colors",
                        isAdmitted && "bg-emerald-500/5"
                      )}
                    >
                      <td className="py-3 px-4 font-mono font-bold text-primary">
                        {app.applicationNo}
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-bold text-foreground">{app.studentName}</p>
                        <p className="text-[10px] text-muted-foreground">
                          Guardian: {app.guardianName || app.fatherName || "N/A"} • DOB:{" "}
                          {app.dob || "N/A"}
                        </p>
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2.5 py-0.5 rounded-md bg-muted text-foreground font-bold text-xs border">
                          Class {app.targetClass}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-mono text-foreground">{app.studentContact || "N/A"}</p>
                        <p className="text-[10px] text-muted-foreground truncate max-w-xs">
                          {app.village || app.address || "N/A"}
                        </p>
                      </td>
                      <td className="py-3 px-4">
                        {isAdmitted ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
                            <CheckCircle2 className="h-3 w-3" />
                            <span>Admitted (Sec {app.admittedSection} #{app.admittedRoll})</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30">
                            <Clock className="h-3 w-3" />
                            <span>Pending Verification</span>
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/admission/receipt/${app.id}`}
                            className="p-1.5 rounded-lg border hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                            title="Print / View Receipt"
                          >
                            <Printer className="h-3.5 w-3.5" />
                          </Link>

                          {!isAdmitted && (
                            <Button
                              size="sm"
                              onClick={() => openVerifyModal(app)}
                              className="h-7 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-xs cursor-pointer"
                            >
                              Verify &amp; Admit
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Verify & Admit Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md bg-card border rounded-3xl p-6 shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-foreground flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-blue-600" />
              <span>Verify Receipt &amp; Admit Student</span>
            </DialogTitle>
          </DialogHeader>

          {selectedApp && (
            <div className="space-y-4 pt-2">
              <div className="p-3 rounded-2xl bg-muted/40 border">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-primary">
                    {selectedApp.applicationNo}
                  </span>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-background border">
                    Target: Class {selectedApp.targetClass}
                  </span>
                </div>
                <h3 className="text-sm font-bold text-foreground mt-1">
                  {selectedApp.studentName}
                </h3>
                <p className="text-xs text-muted-foreground">
                  Guardian: {selectedApp.guardianName || selectedApp.fatherName || "N/A"} • Phone:{" "}
                  {selectedApp.studentContact || "N/A"}
                </p>
              </div>

              {/* Assign Section & Roll */}
              <div className="grid grid-cols-2 gap-3 p-3.5 rounded-2xl bg-background border">
                <div>
                  <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">
                    Assign Section *
                  </label>
                  <CustomSelect
                    value={assignedSection}
                    onChange={setAssignedSection}
                    options={[
                      { value: "A", label: "Section A" },
                      { value: "B", label: "Section B" },
                      { value: "C", label: "Section C" },
                      { value: "D", label: "Section D" },
                    ]}
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">
                    Assign Roll Number *
                  </label>
                  <Input
                    type="number"
                    value={assignedRoll}
                    onChange={(e) => setAssignedRoll(e.target.value)}
                    className="h-9 text-xs font-bold rounded-xl"
                  />
                </div>
              </div>

              {/* Fee Payment Confirmation */}
              <div className="grid grid-cols-2 gap-3 p-3.5 rounded-2xl bg-muted/30 border">
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

              {/* Action Button */}
              <div className="pt-2">
                <Button
                  onClick={handleConfirmAdmit}
                  disabled={admitMutation.isPending || isFetchingInvoiceNo}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-10 rounded-xl shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span>
                    {admitMutation.isPending
                      ? "Enrolling in Register..."
                      : "Confirm Admission & Push to Register"}
                  </span>
                </Button>
                <p className="text-[10px] text-center text-muted-foreground mt-2">
                  This will generate the official School ID and add the student to the Invoice Print Queue.
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
