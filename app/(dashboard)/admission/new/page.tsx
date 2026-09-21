"use client";

import React, { useState, useMemo, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getAdmissionApplications,
  revertAdmissionApplication,
  deleteAdmissionApplication,
} from "@/lib/data/admission";
import type { AdmissionApplication } from "@/lib/types";
import {
  UserPlus,
  FileText,
  Printer,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Link as LinkIcon,
  Eye,
  BarChart3,
  Search,
  Filter,
  Globe,
  UserCheck,
  RefreshCw,
  Phone,
  MapPin,
  FileCheck2,
  QrCode,
  Download,
  Check,
  Copy,
  ExternalLink,
  Loader2,
  AlertTriangle,
  RotateCcw,
  Trash2,
  Edit3,
  History,
  FileSpreadsheet,
  CheckSquare,
  Square,
  Users,
  ShieldCheck,
  Calendar,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CustomSelect } from "@/components/ui/custom-select";
import { showToast } from "@/components/ui/toast-banner";
import * as XLSX from "xlsx";

// Specialized Modals
import { AdmitStudentDialog } from "@/components/admission/admit-student-dialog";
import { AdmissionSuccessDialog } from "@/components/admission/admission-success-dialog";
import { ViewApplicationFormDialog } from "@/components/admission/view-application-form-dialog";
import { EditApplicationDialog } from "@/components/admission/edit-application-dialog";
import { TransferConfirmationDialog } from "@/components/admission/transfer-confirmation-dialog";

const CLASS_TABS = [
  { value: "all", label: "All Classes" },
  { value: "V", label: "Class V" },
  { value: "VI", label: "Class VI" },
  { value: "VII", label: "Class VII" },
  { value: "VIII", label: "Class VIII" },
  { value: "IX", label: "Class IX" },
  { value: "X", label: "Class X" },
  { value: "XI", label: "Class XI" },
  { value: "XII", label: "Class XII" },
];

const SOURCE_OPTIONS = [
  { value: "all", label: "All Sources" },
  { value: "online", label: "Online Portal" },
  { value: "offline", label: "Manual Entry" },
  { value: "ai_scan", label: "AI Scanned" },
];

const SESSION_YEARS = ["2026", "2025", "2024", "2023"];

function NewAdmissionDashboardContent() {
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();

  const currentYear = new Date().getFullYear();

  // Top Tabs: "pending" | "admitted" | "history"
  const tabParam = searchParams.get("tab") as any;
  const initialMainTab = tabParam === "admitted" || tabParam === "history" ? tabParam : "pending";
  const [activeMainTab, setActiveMainTabState] = useState<"pending" | "admitted" | "history">(initialMainTab);

  const setActiveMainTab = (tab: "pending" | "admitted" | "history") => {
    setActiveMainTabState(tab);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      if (tab === "pending") {
        url.searchParams.delete("tab");
      } else {
        url.searchParams.set("tab", tab);
      }
      window.history.replaceState(null, "", url.toString());
    }
  };

  // Filter States
  const [classFilter, setClassFilter] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [transferFilter, setTransferFilter] = useState<"all" | "pending" | "transferred">("pending");
  const [historyYear, setHistoryYear] = useState<string>(String(currentYear));

  // Multi-selection for bulk transfer
  const [selectedAppIds, setSelectedAppIds] = useState<string[]>([]);

  // Dialog States
  const [admitModalApp, setAdmitModalApp] = useState<AdmissionApplication | null>(null);
  const [admitModalOpen, setAdmitModalOpen] = useState(false);

  const [editModalApp, setEditModalApp] = useState<AdmissionApplication | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);

  const [viewFormApp, setViewFormApp] = useState<AdmissionApplication | null>(null);
  const [viewFormOpen, setViewFormOpen] = useState(false);

  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [transferTargetApps, setTransferTargetApps] = useState<AdmissionApplication[]>([]);
  const [transferMode, setTransferMode] = useState<"selected" | "class" | "single">("selected");

  const [successDialogData, setSuccessDialogData] = useState<{
    open: boolean;
    studentName: string;
    className: string;
    section: string;
    roll: number;
    receiptNo: string;
    feeAmount: number;
    stream?: string;
    guardianName?: string;
    contactNumber?: string;
  }>({
    open: false,
    studentName: "",
    className: "V",
    section: "A",
    roll: 1,
    receiptNo: "",
    feeAmount: 0,
  });

  // Dynamic Online Application URL & QR Code
  const [onlineUrl, setOnlineUrl] = useState<string>("");
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>("");
  const [copied, setCopied] = useState<boolean>(false);

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const fullUrl = `${window.location.origin}/admission/new/apply`;
      setOnlineUrl(fullUrl);

      import("qrcode").then((QRCodeModule) => {
        const QRCode = QRCodeModule.default || QRCodeModule;
        QRCode.toDataURL(fullUrl, {
          width: 450,
          margin: 2,
          color: { dark: "#0f172a", light: "#ffffff" },
        })
          .then((url) => setQrCodeDataUrl(url))
          .catch((err) => console.error("QR Code Error:", err));
      });
    }
  }, []);

  const handleCopyLink = () => {
    const urlToCopy = onlineUrl || (typeof window !== "undefined" ? `${window.location.origin}/admission/new/apply` : "");
    if (!urlToCopy) return;
    navigator.clipboard.writeText(urlToCopy);
    setCopied(true);
    showToast("Application link copied to clipboard!", "success");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadQr = () => {
    if (!qrCodeDataUrl) {
      showToast("QR code is not ready yet. Please wait.", "error");
      return;
    }
    const link = document.createElement("a");
    link.href = qrCodeDataUrl;
    link.download = `online-admission-qr-${currentYear}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("QR code downloaded successfully!", "success");
  };

  // Queries
  const activeAcademicYear = activeMainTab === "history" ? historyYear : String(currentYear);

  const { data: allApplications = [], isLoading, refetch } = useQuery({
    queryKey: ["admission-applications", activeAcademicYear],
    queryFn: () => getAdmissionApplications({ academicYear: activeAcademicYear }),
    staleTime: 15 * 1000,
  });

  // Filter for new admission records only
  const newApps = useMemo(() => {
    return allApplications.filter((a) => a.admissionType === "new");
  }, [allApplications]);

  // Tab 1: Pending Applicants (status === "pending")
  const pendingApplicants = useMemo(() => {
    return newApps.filter((a) => {
      if (a.status !== "pending") return false;
      if (classFilter !== "all" && a.targetClass !== classFilter) return false;
      if (sourceFilter !== "all" && a.formMethod !== sourceFilter) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = a.studentName?.toLowerCase().includes(q);
        const matchAppNo = a.applicationNo?.toLowerCase().includes(q);
        const matchContact = a.studentContact?.toLowerCase().includes(q) || a.altMobile?.toLowerCase().includes(q);
        const matchGuardian = a.guardianName?.toLowerCase().includes(q) || a.fatherName?.toLowerCase().includes(q);
        if (!matchName && !matchAppNo && !matchContact && !matchGuardian) return false;
      }
      return true;
    });
  }, [newApps, classFilter, sourceFilter, searchQuery]);

  // Tab 2: Admitted Students (status === "admitted")
  const admittedStudents = useMemo(() => {
    return newApps.filter((a) => {
      if (a.status !== "admitted") return false;
      if (classFilter !== "all" && (a.admittedClass || a.targetClass) !== classFilter) return false;

      if (transferFilter === "pending" && a.isTransferredToActive) return false;
      if (transferFilter === "transferred" && !a.isTransferredToActive) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = a.studentName?.toLowerCase().includes(q);
        const matchAppNo = a.applicationNo?.toLowerCase().includes(q);
        const matchReceipt = a.paymentReceiptNo?.toLowerCase().includes(q);
        const matchContact = a.studentContact?.toLowerCase().includes(q);
        const matchGuardian = a.guardianName?.toLowerCase().includes(q) || a.fatherName?.toLowerCase().includes(q);
        if (!matchName && !matchAppNo && !matchReceipt && !matchContact && !matchGuardian) return false;
      }
      return true;
    });
  }, [newApps, classFilter, transferFilter, searchQuery]);

  // Tab 3: History Records
  const historyApplications = useMemo(() => {
    return newApps.filter((a) => {
      if (classFilter !== "all" && (a.admittedClass || a.targetClass) !== classFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = a.studentName?.toLowerCase().includes(q);
        const matchAppNo = a.applicationNo?.toLowerCase().includes(q);
        const matchReceipt = a.paymentReceiptNo?.toLowerCase().includes(q);
        if (!matchName && !matchAppNo && !matchReceipt) return false;
      }
      return true;
    });
  }, [newApps, classFilter, searchQuery]);

  // Summary Counters
  const totalPendingCount = useMemo(() => newApps.filter((a) => a.status === "pending").length, [newApps]);
  const totalAdmittedCount = useMemo(() => newApps.filter((a) => a.status === "admitted").length, [newApps]);
  const pendingTransferCount = useMemo(
    () => newApps.filter((a) => a.status === "admitted" && !a.isTransferredToActive).length,
    [newApps]
  );
  const transferredActiveCount = useMemo(
    () => newApps.filter((a) => a.status === "admitted" && a.isTransferredToActive).length,
    [newApps]
  );
  const totalFeesCollected = useMemo(() => {
    return newApps
      .filter((a) => a.status === "admitted" && a.feePaid)
      .reduce((sum, a) => sum + (Number(a.feeAmount) || 0), 0);
  }, [newApps]);

  // Revert Admission Mutation
  const revertMutation = useMutation({
    mutationFn: (applicationId: string) => revertAdmissionApplication(applicationId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["admission-applications"] });
      showToast(data.message || "Admission reverted back to pending.", "success");
    },
    onError: (err: any) => {
      showToast(err.message || "Failed to revert admission", "error");
    },
  });

  // Delete Application Mutation
  const deleteMutation = useMutation({
    mutationFn: (applicationId: string) => deleteAdmissionApplication(applicationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admission-applications"] });
      showToast("Application deleted.", "success");
    },
    onError: (err: any) => {
      showToast(err.message || "Failed to delete application", "error");
    },
  });

  // Checkbox selection toggle
  const toggleSelectAll = () => {
    const untransferredInView = admittedStudents.filter((a) => !a.isTransferredToActive);
    if (selectedAppIds.length === untransferredInView.length && untransferredInView.length > 0) {
      setSelectedAppIds([]);
    } else {
      setSelectedAppIds(untransferredInView.map((a) => a.id));
    }
  };

  const toggleSelectApp = (id: string) => {
    setSelectedAppIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Open Transfer Dialog for Selected
  const openTransferForSelected = () => {
    const selected = admittedStudents.filter((a) => selectedAppIds.includes(a.id) && !a.isTransferredToActive);
    if (selected.length === 0) {
      showToast("Please select at least one untransferred student.", "info");
      return;
    }
    setTransferTargetApps(selected);
    setTransferMode("selected");
    setTransferModalOpen(true);
  };

  // Open Transfer Dialog for Entire Class
  const openTransferForClass = () => {
    const classUntransferred = admittedStudents.filter(
      (a) =>
        !a.isTransferredToActive &&
        (classFilter === "all" ? true : (a.admittedClass || a.targetClass) === classFilter)
    );
    if (classUntransferred.length === 0) {
      showToast(`No untransferred students found for Class ${classFilter}.`, "info");
      return;
    }
    setTransferTargetApps(classUntransferred);
    setTransferMode("class");
    setTransferModalOpen(true);
  };

  // Open Transfer Dialog for Single Student
  const openTransferForSingle = (app: AdmissionApplication) => {
    setTransferTargetApps([app]);
    setTransferMode("single");
    setTransferModalOpen(true);
  };

  // Excel Export for Admission History
  const handleExportHistoryExcel = () => {
    if (historyApplications.length === 0) {
      showToast("No admission records to export.", "info");
      return;
    }

    const rows = historyApplications.map((app, index) => ({
      "Sl No": index + 1,
      "Application No": app.applicationNo,
      "Student Name": app.studentName,
      "Admitted Class": app.admittedClass || app.targetClass,
      "Section": app.admittedSection || app.targetSection || "",
      "Roll No": app.admittedRoll || app.targetRoll || "",
      "Stream": app.stream || "",
      "Status": app.status,
      "Transferred to Active": app.isTransferredToActive ? "Yes" : "No",
      "School ID": app.schoolId || "",
      "Guardian Name": app.guardianName || app.fatherName || "",
      "Contact Number": app.studentContact || app.altMobile || "",
      "Aadhaar Number": app.aadhaar || "",
      "Date of Birth": app.dob || "",
      "Gender": app.gender,
      "Category": app.socialCategory || "",
      "Religion": app.religion || "",
      "Village": app.village || app.address || "",
      "PIN Code": app.pincode || "",
      "Fee Amount": app.feeAmount || 0,
      "Fee Paid": app.feePaid ? "Paid" : "Due",
      "Receipt No": app.paymentReceiptNo || "",
      "Admission Date": app.admissionDate || (app.admittedAt ? app.admittedAt.split("T")[0] : ""),
      "Created At": app.createdAt,
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, `Admissions ${historyYear}`);
    XLSX.writeFile(workbook, `admission_records_session_${historyYear}.xlsx`);
    showToast(`Exported ${rows.length} admission records to Excel!`, "success");
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1700px] mx-auto space-y-6">
      {/* Top Header & Fast Navigation */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4 print:hidden">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
              <UserPlus className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              <span>New Admission Lifecycle &amp; Staging</span>
            </h1>
            <span className="bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20 text-xs font-black px-2.5 py-0.5 rounded-full">
              Session {currentYear}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Staged admission management &bull; Photo capture &bull; Auto-sequential roll &bull; Active directory transfer.
          </p>
        </div>

        {/* Action Buttons: 2-Column Mobile Grid, Flex Row on Desktop */}
        <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 w-full sm:w-auto">
          <Link
            href="/admission/new/apply"
            target="_blank"
            className="inline-flex items-center justify-center gap-1.5 min-h-[44px] px-3.5 py-2.5 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-sm transition-all active:scale-95 cursor-pointer text-center col-span-2 sm:col-span-1"
          >
            <Globe className="h-4 w-4" />
            <span className="truncate">Online Application Form</span>
            <ExternalLink className="h-3 w-3 opacity-75" />
          </Link>

          <Link
            href="/admission/new/offline"
            className="inline-flex items-center justify-center gap-1.5 min-h-[44px] px-3.5 py-2.5 rounded-2xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-500/20 text-xs font-bold transition-all active:scale-95 cursor-pointer text-center"
          >
            <Printer className="h-4 w-4" />
            <span className="truncate">Offline Center</span>
          </Link>

          <Link
            href="/admission/invoices"
            className="inline-flex items-center justify-center gap-1.5 min-h-[44px] px-3.5 py-2.5 rounded-2xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-700 dark:text-blue-300 border border-blue-500/20 text-xs font-bold transition-all active:scale-95 cursor-pointer text-center"
          >
            <FileText className="h-4 w-4" />
            <span className="truncate">Invoices Desk</span>
          </Link>
        </div>
      </div>

      {/* Online Application Link & QR Banner */}
      <div className="bg-gradient-to-r from-purple-900/10 via-background to-blue-900/10 border border-purple-500/20 rounded-3xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-md">
            <Globe className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-xs font-black text-foreground">
              Public Online Student Admission Portal URL
            </h3>
            <p className="text-[11px] text-muted-foreground font-mono truncate max-w-sm sm:max-w-md">
              {onlineUrl || "Loading portal URL..."}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 w-full sm:w-auto shrink-0">
          <Button
            size="sm"
            variant="outline"
            onClick={handleCopyLink}
            className="min-h-[40px] rounded-xl text-xs font-bold gap-1.5 cursor-pointer active:scale-95"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
            <span>{copied ? "Copied" : "Copy Link"}</span>
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={handleDownloadQr}
            className="min-h-[40px] rounded-xl text-xs font-bold gap-1.5 cursor-pointer active:scale-95"
          >
            <QrCode className="h-3.5 w-3.5" />
            <span>QR Poster</span>
          </Button>
        </div>
      </div>

      {/* 3 Core Workflow Tabs: Native Segmented Control */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 p-1.5 rounded-2xl bg-muted/70 border border-border/80 shadow-2xs">
        <button
          type="button"
          onClick={() => setActiveMainTab("pending")}
          className={cn(
            "flex items-center justify-center gap-2 min-h-[44px] px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold transition-all cursor-pointer active:scale-95",
            activeMainTab === "pending"
              ? "bg-background text-foreground shadow-xs border border-border/60"
              : "text-muted-foreground hover:text-foreground hover:bg-background/50"
          )}
        >
          <Clock className="h-4 w-4 text-amber-500 shrink-0" />
          <span className="truncate">Pending Applicants</span>
          <span
            className={cn(
              "text-[10px] font-black px-2 py-0.5 rounded-full shrink-0",
              activeMainTab === "pending"
                ? "bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/20"
                : "bg-muted text-muted-foreground"
            )}
          >
            {totalPendingCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveMainTab("admitted")}
          className={cn(
            "flex items-center justify-center gap-2 min-h-[44px] px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold transition-all cursor-pointer active:scale-95",
            activeMainTab === "admitted"
              ? "bg-background text-foreground shadow-xs border border-border/60"
              : "text-muted-foreground hover:text-foreground hover:bg-background/50"
          )}
        >
          <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
          <span className="truncate">Admitted ({currentYear})</span>
          <span
            className={cn(
              "text-[10px] font-black px-2 py-0.5 rounded-full shrink-0",
              activeMainTab === "admitted"
                ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20"
                : "bg-muted text-muted-foreground"
            )}
          >
            {totalAdmittedCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveMainTab("history")}
          className={cn(
            "flex items-center justify-center gap-2 min-h-[44px] px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold transition-all cursor-pointer active:scale-95",
            activeMainTab === "history"
              ? "bg-background text-foreground shadow-xs border border-border/60"
              : "text-muted-foreground hover:text-foreground hover:bg-background/50"
          )}
        >
          <History className="h-4 w-4 text-purple-500 shrink-0" />
          <span className="truncate">Admission History</span>
        </button>
      </div>

      {/* Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-card border rounded-2xl p-3.5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-muted-foreground uppercase">Pending Verification</span>
            <div className="text-xl font-black text-amber-600 mt-0.5">{totalPendingCount}</div>
          </div>
          <Clock className="h-6 w-6 text-amber-500/50" />
        </div>

        <div className="bg-card border rounded-2xl p-3.5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-muted-foreground uppercase">Pending Transfer</span>
            <div className="text-xl font-black text-purple-600 dark:text-purple-400 mt-0.5">
              {pendingTransferCount}
            </div>
          </div>
          <UserCheck className="h-6 w-6 text-purple-500/50" />
        </div>

        <div className="bg-card border rounded-2xl p-3.5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-muted-foreground uppercase">In Active Directory</span>
            <div className="text-xl font-black text-emerald-600 mt-0.5">{transferredActiveCount}</div>
          </div>
          <ShieldCheck className="h-6 w-6 text-emerald-500/50" />
        </div>

        <div className="bg-card border rounded-2xl p-3.5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-muted-foreground uppercase">Total Fees Collected</span>
            <div className="text-xl font-black text-foreground mt-0.5">
              ₹{totalFeesCollected.toLocaleString("en-IN")}
            </div>
          </div>
          <BarChart3 className="h-6 w-6 text-blue-500/50" />
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-card border rounded-3xl p-4 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by Name, App No, Mobile..."
            className="pl-9 h-9 rounded-xl text-xs"
          />
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2 flex-wrap w-full md:w-auto justify-end">
          {/* Class Filter */}
          <div className="w-36">
            <CustomSelect
              value={classFilter}
              onChange={setClassFilter}
              options={CLASS_TABS}
            />
          </div>

          {activeMainTab === "pending" && (
            <div className="w-36">
              <CustomSelect
                value={sourceFilter}
                onChange={setSourceFilter}
                options={SOURCE_OPTIONS}
              />
            </div>
          )}

          {activeMainTab === "admitted" && (
            <div className="flex items-center bg-muted p-1 rounded-xl border">
              <button
                type="button"
                onClick={() => setTransferFilter("pending")}
                className={cn(
                  "px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer",
                  transferFilter === "pending"
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Pending Transfer ({pendingTransferCount})
              </button>
              <button
                type="button"
                onClick={() => setTransferFilter("transferred")}
                className={cn(
                  "px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer",
                  transferFilter === "transferred"
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Transferred ({transferredActiveCount})
              </button>
              <button
                type="button"
                onClick={() => setTransferFilter("all")}
                className={cn(
                  "px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer",
                  transferFilter === "all"
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                All ({totalAdmittedCount})
              </button>
            </div>
          )}

          {activeMainTab === "history" && (
            <div className="flex items-center gap-2">
              <div className="w-32">
                <CustomSelect
                  value={historyYear}
                  onChange={setHistoryYear}
                  options={SESSION_YEARS.map((y) => ({ value: y, label: `Session ${y}` }))}
                />
              </div>

              <Button
                size="sm"
                onClick={handleExportHistoryExcel}
                className="h-9 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-1.5 shadow-sm cursor-pointer"
              >
                <FileSpreadsheet className="h-4 w-4" />
                <span>Export Excel</span>
              </Button>
            </div>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="h-9 rounded-xl text-xs gap-1 cursor-pointer"
            title="Refresh list"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", isLoading && "animate-spin")} />
          </Button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: PENDING APPLICANTS                                                 */}
      {/* ========================================================================= */}
      {activeMainTab === "pending" && (
        <div className="space-y-4">
          <div className="bg-card border rounded-3xl overflow-hidden shadow-xs">
            <div className="p-4 border-b bg-muted/20 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-purple-600" />
                <span className="text-xs font-black uppercase tracking-wide text-foreground">
                  Pending Verification &amp; Admission Queue ({pendingApplicants.length})
                </span>
              </div>
            </div>

            {isLoading ? (
              <div className="p-12 text-center text-xs text-muted-foreground flex flex-col items-center justify-center gap-2">
                <Loader2 className="h-6 w-6 animate-spin text-purple-600" />
                <span>Loading pending applications...</span>
              </div>
            ) : pendingApplicants.length === 0 ? (
              <div className="p-12 text-center space-y-2">
                <CheckCircle2 className="h-10 w-10 text-muted-foreground/40 mx-auto" />
                <h3 className="text-sm font-bold text-foreground">No Pending Applicants</h3>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  All applicants have been verified and admitted or there are no new submissions.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-muted/50 text-muted-foreground font-bold border-b text-[11px] uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Applicant</th>
                      <th className="py-3 px-3">Target Class</th>
                      <th className="py-3 px-3">Guardian &amp; Contact</th>
                      <th className="py-3 px-3">Method / Source</th>
                      <th className="py-3 px-3">Applied On</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {pendingApplicants.map((app) => (
                      <tr key={app.id} className="hover:bg-muted/30 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-700 dark:text-purple-300 font-bold flex items-center justify-center shrink-0 border border-purple-500/20 overflow-hidden">
                              {app.photoUrl ? (
                                /* eslint-disable-next-line @next/next/no-img-element */
                                <img src={app.photoUrl} alt="" className="w-full h-full object-cover" />
                              ) : (
                                app.studentName?.charAt(0)?.toUpperCase() || "A"
                              )}
                            </div>
                            <div>
                              <div className="font-bold text-foreground uppercase">{app.studentName}</div>
                              <div className="text-[10px] font-mono text-muted-foreground">
                                {app.applicationNo}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-3">
                          <span className="bg-purple-500/10 text-purple-700 dark:text-purple-300 font-black px-2 py-0.5 rounded-lg border border-purple-500/20">
                            Class {app.targetClass}
                            {app.stream ? ` (${app.stream})` : ""}
                          </span>
                        </td>

                        <td className="py-3 px-3">
                          <div className="font-medium text-foreground">
                            {app.guardianName || app.fatherName || "N/A"}
                          </div>
                          <div className="text-[10px] text-muted-foreground font-mono">
                            {app.studentContact || app.altMobile || "No contact"}
                          </div>
                        </td>

                        <td className="py-3 px-3">
                          <span
                            className={cn(
                              "text-[10px] font-bold px-2 py-0.5 rounded-md uppercase",
                              app.formMethod === "online"
                                ? "bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20"
                                : app.formMethod === "ai_scan"
                                ? "bg-pink-500/10 text-pink-700 dark:text-pink-300 border border-pink-500/20"
                                : "bg-muted text-muted-foreground border"
                            )}
                          >
                            {app.formMethod === "ai_scan" ? "AI Scan" : app.formMethod}
                          </span>
                        </td>

                        <td className="py-3 px-3 text-muted-foreground text-[11px]">
                          {new Date(app.createdAt).toLocaleDateString()}
                        </td>

                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* View Filled Form */}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setViewFormApp(app);
                                setViewFormOpen(true);
                              }}
                              className="h-7 px-2 text-[11px] rounded-lg cursor-pointer"
                              title="View official filled application form (2 pages)"
                            >
                              <Eye className="h-3 w-3 mr-1 text-purple-600" />
                              <span>View Form</span>
                            </Button>

                            {/* Edit */}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setEditModalApp(app);
                                setEditModalOpen(true);
                              }}
                              className="h-7 w-7 p-0 rounded-lg cursor-pointer"
                              title="Edit applicant information"
                            >
                              <Edit3 className="h-3 w-3 text-muted-foreground" />
                            </Button>

                            {/* Verify & Admit Button */}
                            <Button
                              size="sm"
                              onClick={() => {
                                setAdmitModalApp(app);
                                setAdmitModalOpen(true);
                              }}
                              className="h-7 px-2.5 text-[11px] font-bold rounded-lg bg-purple-600 hover:bg-purple-700 text-white shadow-xs gap-1 cursor-pointer"
                            >
                              <UserCheck className="h-3.5 w-3.5" />
                              <span>Verify &amp; Admit</span>
                            </Button>

                            {/* Delete */}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                if (confirm(`Delete application for ${app.studentName}?`)) {
                                  deleteMutation.mutate(app.id);
                                }
                              }}
                              className="h-7 w-7 p-0 rounded-lg text-muted-foreground hover:text-destructive cursor-pointer"
                              title="Delete application"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: ADMITTED STUDENTS (STAGING & DIRECTORY TRANSFER)                   */}
      {/* ========================================================================= */}
      {activeMainTab === "admitted" && (
        <div className="space-y-4">
          {/* Bulk Action Strip */}
          <div className="bg-purple-500/10 border border-purple-500/20 rounded-2xl p-3 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-purple-700 dark:text-purple-300" />
              <span className="text-xs font-black text-purple-900 dark:text-purple-100">
                Staging Roster Actions &bull; {selectedAppIds.length} Selected
              </span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <Button
                size="sm"
                variant="outline"
                onClick={openTransferForClass}
                className="h-8 rounded-xl text-xs font-bold border-purple-300 dark:border-purple-700 text-purple-700 dark:text-purple-300 cursor-pointer"
              >
                <UserCheck className="h-3.5 w-3.5 mr-1" />
                <span>Transfer Class {classFilter === "all" ? "All" : classFilter} to Active</span>
              </Button>

              <Button
                size="sm"
                onClick={openTransferForSelected}
                disabled={selectedAppIds.length === 0}
                className="h-8 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm cursor-pointer"
              >
                <ShieldCheck className="h-3.5 w-3.5 mr-1" />
                <span>Transfer Selected ({selectedAppIds.length}) to Active</span>
              </Button>
            </div>
          </div>

          <div className="bg-card border rounded-3xl overflow-hidden shadow-xs">
            <div className="p-4 border-b bg-muted/20 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span className="text-xs font-black uppercase tracking-wide text-foreground">
                  Admitted Student Roster (Staging) &bull; {admittedStudents.length} Records
                </span>
              </div>
            </div>

            {isLoading ? (
              <div className="p-12 text-center text-xs text-muted-foreground flex flex-col items-center justify-center gap-2">
                <Loader2 className="h-6 w-6 animate-spin text-purple-600" />
                <span>Loading admitted students...</span>
              </div>
            ) : admittedStudents.length === 0 ? (
              <div className="p-12 text-center space-y-2">
                <Clock className="h-10 w-10 text-muted-foreground/40 mx-auto" />
                <h3 className="text-sm font-bold text-foreground">No Admitted Students Found</h3>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  Admit applicants from the Pending Applicants tab to see them here in the staging queue.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-muted/50 text-muted-foreground font-bold border-b text-[11px] uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-3 text-center w-10">
                        <button
                          type="button"
                          onClick={toggleSelectAll}
                          className="cursor-pointer text-muted-foreground hover:text-foreground"
                          title="Select / Deselect all untransferred"
                        >
                          <CheckSquare className="h-4 w-4" />
                        </button>
                      </th>
                      <th className="py-3 px-3">Student</th>
                      <th className="py-3 px-3">Class &amp; Roll</th>
                      <th className="py-3 px-3">Fee &amp; Receipt</th>
                      <th className="py-3 px-3">Directory Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {admittedStudents.map((app) => {
                      const isSelected = selectedAppIds.includes(app.id);
                      return (
                        <tr
                          key={app.id}
                          className={cn(
                            "hover:bg-muted/30 transition-colors",
                            isSelected && "bg-purple-500/5"
                          )}
                        >
                          {/* Checkbox */}
                          <td className="py-3 px-3 text-center">
                            {!app.isTransferredToActive ? (
                              <button
                                type="button"
                                onClick={() => toggleSelectApp(app.id)}
                                className="cursor-pointer text-muted-foreground hover:text-purple-600"
                              >
                                {isSelected ? (
                                  <CheckSquare className="h-4 w-4 text-purple-600" />
                                ) : (
                                  <Square className="h-4 w-4" />
                                )}
                              </button>
                            ) : (
                              <Check className="h-4 w-4 text-emerald-600 mx-auto" />
                            )}
                          </td>

                          {/* Student Details */}
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-700 dark:text-purple-300 font-bold flex items-center justify-center shrink-0 border border-purple-500/20 overflow-hidden">
                                {app.photoUrl ? (
                                  /* eslint-disable-next-line @next/next/no-img-element */
                                  <img src={app.photoUrl} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  app.studentName?.charAt(0)?.toUpperCase() || "A"
                                )}
                              </div>
                              <div>
                                <div className="font-bold text-foreground uppercase">{app.studentName}</div>
                                <div className="text-[10px] text-muted-foreground font-mono">
                                  {app.schoolId || app.applicationNo}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Class, Sec, Roll */}
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-black text-purple-700 dark:text-purple-300 bg-purple-500/10 px-2 py-0.5 rounded-md border border-purple-500/20">
                                Class {app.admittedClass || app.targetClass} - {app.admittedSection || app.targetSection || "A"}
                              </span>
                              <span className="font-mono font-bold text-foreground bg-muted px-1.5 py-0.5 rounded-md border">
                                Roll #{app.admittedRoll || app.targetRoll || 1}
                              </span>
                            </div>
                            {app.stream && (
                              <div className="text-[10px] text-muted-foreground mt-0.5">
                                Stream: <strong className="text-foreground">{app.stream}</strong>
                              </div>
                            )}
                          </td>

                          {/* Fee & Receipt */}
                          <td className="py-3 px-3">
                            <div className="font-bold text-emerald-600 dark:text-emerald-400">
                              ₹{(app.feeAmount || 0).toLocaleString("en-IN")} ({app.paymentMode || "Cash"})
                            </div>
                            <div className="text-[10px] font-mono text-muted-foreground">
                              {app.paymentReceiptNo || "No Receipt"}
                            </div>
                          </td>

                          {/* Directory Transfer Status */}
                          <td className="py-3 px-3">
                            {app.isTransferredToActive ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                                <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                                <span>In Active Directory</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-purple-700 dark:text-purple-300 bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded-full">
                                <Clock className="h-3 w-3 text-purple-600" />
                                <span>Staging Queue</span>
                              </span>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Transfer Single Student */}
                              {!app.isTransferredToActive && (
                                <Button
                                  size="sm"
                                  onClick={() => openTransferForSingle(app)}
                                  className="h-7 px-2 text-[11px] font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs cursor-pointer"
                                  title="Transfer single student to Active Students directory"
                                >
                                  <UserCheck className="h-3 w-3 mr-1" />
                                  <span>Transfer</span>
                                </Button>
                              )}

                              {/* View Form */}
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setViewFormApp(app);
                                  setViewFormOpen(true);
                                }}
                                className="h-7 w-7 p-0 rounded-lg cursor-pointer"
                                title="View 2-page filled official form"
                              >
                                <Eye className="h-3 w-3 text-purple-600" />
                              </Button>

                              {/* Print Receipt */}
                              {app.paymentReceiptNo && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setSuccessDialogData({
                                      open: true,
                                      studentName: app.studentName,
                                      className: app.admittedClass || app.targetClass,
                                      section: app.admittedSection || app.targetSection || "A",
                                      roll: Number(app.admittedRoll || app.targetRoll || 1),
                                      receiptNo: app.paymentReceiptNo || "",
                                      feeAmount: Number(app.feeAmount || 0),
                                      stream: app.stream,
                                      guardianName: app.guardianName || app.fatherName,
                                      contactNumber: app.studentContact || app.altMobile,
                                    });
                                  }}
                                  className="h-7 w-7 p-0 rounded-lg cursor-pointer"
                                  title="Print fee receipt / invoice"
                                >
                                  <Printer className="h-3 w-3 text-blue-600" />
                                </Button>
                              )}

                              {/* Edit Details */}
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setEditModalApp(app);
                                  setEditModalOpen(true);
                                }}
                                className="h-7 w-7 p-0 rounded-lg cursor-pointer"
                                title="Edit student details"
                              >
                                <Edit3 className="h-3 w-3 text-muted-foreground" />
                              </Button>

                              {/* Revert Admission */}
                              {!app.isTransferredToActive && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    if (
                                      confirm(
                                        `Revert admission for ${app.studentName}? This will reset the student to Pending and cancel the generated invoice.`
                                      )
                                    ) {
                                      revertMutation.mutate(app.id);
                                    }
                                  }}
                                  className="h-7 w-7 p-0 rounded-lg text-muted-foreground hover:text-amber-600 cursor-pointer"
                                  title="Revert admission back to Pending (voids invoice)"
                                >
                                  <RotateCcw className="h-3 w-3" />
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
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: PERMANENT YEAR-WISE ADMISSION HISTORY                              */}
      {/* ========================================================================= */}
      {activeMainTab === "history" && (
        <div className="space-y-4">
          <div className="bg-card border rounded-3xl overflow-hidden shadow-xs">
            <div className="p-4 border-b bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <History className="h-4 w-4 text-purple-600" />
                <span className="text-xs font-black uppercase tracking-wide text-foreground">
                  Permanent Admission Archive (Session {historyYear}) &bull; {historyApplications.length} Total Records
                </span>
              </div>

              <Button
                size="sm"
                onClick={handleExportHistoryExcel}
                className="h-8 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-1.5 shadow-xs cursor-pointer"
              >
                <FileSpreadsheet className="h-3.5 w-3.5" />
                <span>Export Session {historyYear} Excel</span>
              </Button>
            </div>

            {isLoading ? (
              <div className="p-12 text-center text-xs text-muted-foreground flex flex-col items-center justify-center gap-2">
                <Loader2 className="h-6 w-6 animate-spin text-purple-600" />
                <span>Loading historical admission records...</span>
              </div>
            ) : historyApplications.length === 0 ? (
              <div className="p-12 text-center space-y-2">
                <History className="h-10 w-10 text-muted-foreground/40 mx-auto" />
                <h3 className="text-sm font-bold text-foreground">No Historical Records for Session {historyYear}</h3>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  Select a different academic year or import records to view history.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-muted/50 text-muted-foreground font-bold border-b text-[11px] uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Student</th>
                      <th className="py-3 px-3">Class &amp; Roll</th>
                      <th className="py-3 px-3">Guardian &amp; Contact</th>
                      <th className="py-3 px-3">Fee &amp; Receipt</th>
                      <th className="py-3 px-3">Lifecycle Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {historyApplications.map((app) => (
                      <tr key={app.id} className="hover:bg-muted/30 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-bold text-foreground uppercase">{app.studentName}</div>
                          <div className="text-[10px] font-mono text-muted-foreground">
                            {app.schoolId || app.applicationNo}
                          </div>
                        </td>

                        <td className="py-3 px-3">
                          <span className="font-bold text-foreground">
                            Class {app.admittedClass || app.targetClass} - {app.admittedSection || app.targetSection || "A"}
                          </span>
                          <div className="text-[10px] text-muted-foreground">
                            Roll #{app.admittedRoll || app.targetRoll || 1} {app.stream ? `(${app.stream})` : ""}
                          </div>
                        </td>

                        <td className="py-3 px-3">
                          <div>{app.guardianName || app.fatherName || "N/A"}</div>
                          <div className="text-[10px] text-muted-foreground font-mono">
                            {app.studentContact || app.altMobile || ""}
                          </div>
                        </td>

                        <td className="py-3 px-3">
                          <div className="font-semibold text-foreground">
                            ₹{(app.feeAmount || 0).toLocaleString("en-IN")}
                          </div>
                          <div className="text-[10px] font-mono text-muted-foreground">
                            {app.paymentReceiptNo || "N/A"}
                          </div>
                        </td>

                        <td className="py-3 px-3">
                          <span
                            className={cn(
                              "text-[10px] font-bold px-2 py-0.5 rounded-full uppercase",
                              app.status === "admitted"
                                ? app.isTransferredToActive
                                  ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20"
                                  : "bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20"
                                : "bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20"
                            )}
                          >
                            {app.status === "admitted"
                              ? app.isTransferredToActive
                                ? "Active Student"
                                : "Staging (Admitted)"
                              : app.status}
                          </span>
                        </td>

                        <td className="py-3 px-4 text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setViewFormApp(app);
                              setViewFormOpen(true);
                            }}
                            className="h-7 px-2 text-[11px] rounded-lg cursor-pointer"
                            title="View official filled application form"
                          >
                            <Eye className="h-3 w-3 mr-1 text-purple-600" />
                            <span>View Form</span>
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL DIALOGS                                                             */}
      {/* ========================================================================= */}

      {/* 1. Admit Student Dialog */}
      <AdmitStudentDialog
        open={admitModalOpen}
        onOpenChange={setAdmitModalOpen}
        application={admitModalApp}
        onAdmitSuccess={(res) => {
          queryClient.invalidateQueries({ queryKey: ["admission-applications"] });
          setSuccessDialogData({
            open: true,
            ...res,
          });
        }}
      />

      {/* 2. Admission Success Dialog */}
      <AdmissionSuccessDialog
        open={successDialogData.open}
        onOpenChange={(open) => setSuccessDialogData((prev) => ({ ...prev, open }))}
        studentName={successDialogData.studentName}
        className={successDialogData.className}
        section={successDialogData.section}
        roll={successDialogData.roll}
        receiptNo={successDialogData.receiptNo}
        feeAmount={successDialogData.feeAmount}
        stream={successDialogData.stream}
        guardianName={successDialogData.guardianName}
        contactNumber={successDialogData.contactNumber}
      />

      {/* 3. View Official Filled Application Form (2 Pages) */}
      <ViewApplicationFormDialog
        open={viewFormOpen}
        onOpenChange={setViewFormOpen}
        application={viewFormApp}
      />

      {/* 4. Edit Application Dialog */}
      <EditApplicationDialog
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        application={editModalApp}
        onSaved={() => {
          queryClient.invalidateQueries({ queryKey: ["admission-applications"] });
        }}
      />

      {/* 5. Transfer to Active Directory Confirmation Dialog */}
      <TransferConfirmationDialog
        open={transferModalOpen}
        onOpenChange={setTransferModalOpen}
        applications={transferTargetApps}
        transferMode={transferMode}
        selectedClass={classFilter}
        onTransferSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["admission-applications"] });
          queryClient.invalidateQueries({ queryKey: ["students"] });
          setSelectedAppIds([]);
        }}
      />
    </div>
  );
}

export default function NewAdmissionDashboardPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-muted-foreground">Loading New Admission Dashboard...</div>}>
      <NewAdmissionDashboardContent />
    </Suspense>
  );
}
