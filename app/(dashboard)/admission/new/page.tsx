"use client";

import React, { useState, useMemo, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getAdmissionApplications, admitNewStudentApplication } from "@/lib/data/admission";
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CustomSelect } from "@/components/ui/custom-select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { showToast } from "@/components/ui/toast-banner";
import {
  getSavedFeeStructure,
  calculateFeeTotal,
  generateInvoiceNumber,
  getFeeCategoryForClass,
  FEE_SECTIONS,
} from "@/lib/utils/fee-config";

const VALID_NEW_SOURCES = ["all", "offline", "online", "blank"] as const;

function NewAdmissionDashboardContent() {
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();

  const sourceParam = searchParams.get("source") as any;
  const initialSource = sourceParam && VALID_NEW_SOURCES.includes(sourceParam) ? sourceParam : "all";

  // Filters state
  const [sourceFilter, setSourceFilterState] = useState<"all" | "offline" | "online" | "blank">(initialSource);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [classFilter, setClassFilter] = useState<string>("V");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const setSourceFilter = (src: "all" | "offline" | "online" | "blank") => {
    setSourceFilterState(src);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      if (src === "all") {
        url.searchParams.delete("source");
      } else {
        url.searchParams.set("source", src);
      }
      window.history.replaceState(null, "", url.toString());
    }
  };

  // Admit Verification Modal State
  const [selectedApp, setSelectedApp] = useState<AdmissionApplication | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [assignedSection, setAssignedSection] = useState("A");
  const [assignedRoll, setAssignedRoll] = useState("1");
  const [feePaid, setFeePaid] = useState(true);
  const [feeAmount, setFeeAmount] = useState("350");
  const [receiptNo, setReceiptNo] = useState("");
  const [isFetchingInvoiceNo, setIsFetchingInvoiceNo] = useState(false);

  // Dynamic Online Application URL & QR Code
  const [onlineUrl, setOnlineUrl] = useState<string>("");
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>("");
  const [copied, setCopied] = useState<boolean>(false);
  const [isGeneratingQr, setIsGeneratingQr] = useState<boolean>(true);

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const fullUrl = `${window.location.origin}/admission/new/apply`;
      setOnlineUrl(fullUrl);
      
      // Dynamically import QRCode
      import("qrcode").then((QRCodeModule) => {
        const QRCode = QRCodeModule.default || QRCodeModule;
        QRCode.toDataURL(fullUrl, {
          width: 450,
          margin: 2,
          color: {
            dark: "#0f172a",
            light: "#ffffff",
          },
        })
          .then((url) => {
            setQrCodeDataUrl(url);
            setIsGeneratingQr(false);
          })
          .catch((err) => {
            console.error("Failed to generate QR code:", err);
            setIsGeneratingQr(false);
          });
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
    link.download = `online-admission-qr-${new Date().getFullYear()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("QR code downloaded successfully!", "success");
  };

  const currentYear = new Date().getFullYear();

  const { data: applications = [], isLoading } = useQuery({
    queryKey: ["admission-applications", classFilter],
    queryFn: () => getAdmissionApplications({ targetClass: classFilter === "all" ? undefined : classFilter }),
    staleTime: 30 * 1000,
  });

  // Filter only new admissions
  const newApps = useMemo(() => {
    return applications.filter((a) => a.admissionType === "new");
  }, [applications]);

  // Pipeline Metrics
  // Forms Issued: Blank printed forms (offline form with empty or whitespace studentName)
  const formsIssued = useMemo(() => {
    return newApps.filter(
      (a) => a.formMethod === "offline" && (!a.studentName || a.studentName.trim() === "")
    );
  }, [newApps]);

  // Forms Received & Entered: Offline or AI scan forms with a student name
  const formsEntered = useMemo(() => {
    return newApps.filter(
      (a) =>
        (a.formMethod === "offline" || a.formMethod === "ai_scan") &&
        Boolean(a.studentName && a.studentName.trim() !== "")
    );
  }, [newApps]);

  // Online Forms Filled
  const onlineForms = useMemo(() => {
    return newApps.filter((a) => a.formMethod === "online");
  }, [newApps]);

  // Admitted from new
  const admittedForms = useMemo(() => {
    return newApps.filter((a) => a.status === "admitted");
  }, [newApps]);

  const offlineAdmitted = useMemo(() => {
    return admittedForms.filter(
      (a) => a.formMethod === "offline" || a.formMethod === "ai_scan"
    ).length;
  }, [admittedForms]);

  const onlineAdmitted = useMemo(() => {
    return admittedForms.filter((a) => a.formMethod === "online").length;
  }, [admittedForms]);

  // Filtered Applications for the table
  const filteredApps = useMemo(() => {
    return newApps.filter((app) => {
      const isBlank =
        app.formMethod === "offline" && (!app.studentName || app.studentName.trim() === "");

      // 1. Source Filter
      if (sourceFilter === "offline") {
        // All offline filled (manual + AI scan)
        if (app.formMethod === "online" || isBlank) return false;
      } else if (sourceFilter === "online") {
        if (app.formMethod !== "online") return false;
      } else if (sourceFilter === "blank") {
        if (!isBlank) return false;
      }

      // 2. Status Filter
      if (statusFilter !== "all" && app.status !== statusFilter) {
        return false;
      }

      // 3. Class Filter
      if (classFilter !== "all" && app.targetClass !== classFilter) {
        return false;
      }

      // 4. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = app.studentName?.toLowerCase().includes(q);
        const matchAppNo = app.applicationNo?.toLowerCase().includes(q);
        const matchContact = app.studentContact?.toLowerCase().includes(q);
        const matchGuardian = app.guardianName?.toLowerCase().includes(q) || app.fatherName?.toLowerCase().includes(q);
        const matchReceipt = app.paymentReceiptNo?.toLowerCase().includes(q);

        if (!matchName && !matchAppNo && !matchContact && !matchGuardian && !matchReceipt) {
          return false;
        }
      }

      return true;
    });
  }, [newApps, sourceFilter, statusFilter, classFilter, searchQuery]);

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

    // 1. Take amount dynamically from class preset tier (5-8, 9-10, 11-12)
    const category = getFeeCategoryForClass(app.targetClass);
    const feeItems = getSavedFeeStructure(category);
    const invoiceTotal = calculateFeeTotal(feeItems);
    setFeeAmount(String(app.feeAmount || (invoiceTotal > 0 ? invoiceTotal : 600)));

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
    }) => admitNewStudentApplication(payload.applicationId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admission-applications"] });
      queryClient.invalidateQueries({ queryKey: ["students"] });
      showToast("Student successfully admitted and enrolled!", "success");
      setModalOpen(false);
      setSelectedApp(null);
    },
    onError: (err: any) => {
      showToast(err.message || "Failed to confirm admission", "error");
    },
  });

  const handleConfirmAdmit = () => {
    if (!selectedApp) return;
    if (!assignedRoll || isNaN(Number(assignedRoll))) {
      showToast("Please enter a valid roll number", "error");
      return;
    }

    admitMutation.mutate({
      applicationId: selectedApp.id,
      section: assignedSection,
      roll: parseInt(assignedRoll, 10),
      feePaid,
      feeAmount: parseFloat(feeAmount) || 0,
      paymentReceiptNo: receiptNo || undefined,
    });
  };

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
              New Admission Tracker
            </h1>
          </div>
        </div>

        {/* Action Shortcuts */}
        <div className="flex items-center gap-2">
          <Link
            href="/admission/re"
            className="inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs sm:text-sm font-bold shadow-xs transition-all active:scale-95 cursor-pointer"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Re-Admission Tracker</span>
          </Link>
        </div>
      </div>

      {/* Funnel Pipeline Overview */}
      <div className="bg-card border rounded-3xl p-5 sm:p-6 shadow-xs relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex items-center justify-between gap-2 mb-6">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-emerald-600" />
            <h2 className="text-lg font-black tracking-tight text-foreground">Admission Funnel</h2>
          </div>
          <span className="text-xs font-semibold text-muted-foreground">
            Total Pipeline: <span className="font-bold text-foreground">{newApps.length}</span>
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 relative z-10">
          {/* Step 1: Forms Issued */}
          <div
            onClick={() => setSourceFilter(sourceFilter === "blank" ? "all" : "blank")}
            className={cn(
              "border rounded-2xl p-4 flex flex-col justify-between cursor-pointer transition-all hover:scale-[1.02]",
              sourceFilter === "blank"
                ? "border-purple-500 bg-purple-500/15 shadow-sm"
                : "border-purple-500/20 bg-purple-500/5 hover:bg-purple-500/10"
            )}
          >
            <span className="text-[11px] font-bold uppercase tracking-wider text-purple-700 dark:text-purple-400 mb-2 flex items-center justify-between">
              <span>1. Blank Forms Issued</span>
              {sourceFilter === "blank" && <span className="text-[10px] lowercase font-normal">filtered</span>}
            </span>
            <div className="flex items-end justify-between">
              <span className="text-3xl font-black text-foreground">
                {isLoading ? "..." : formsIssued.length}
              </span>
              <Printer className="h-5 w-5 text-purple-500/50 mb-1" />
            </div>
          </div>

          {/* Step 2A: Offline Forms Received */}
          <div
            onClick={() => setSourceFilter(sourceFilter === "offline" ? "all" : "offline")}
            className={cn(
              "border rounded-2xl p-4 flex flex-col justify-between cursor-pointer transition-all hover:scale-[1.02]",
              sourceFilter === "offline"
                ? "border-orange-500 bg-orange-500/15 shadow-sm"
                : "border-orange-500/20 bg-orange-500/5 hover:bg-orange-500/10"
            )}
          >
            <span className="text-[11px] font-bold uppercase tracking-wider text-orange-700 dark:text-orange-400 mb-2 flex items-center justify-between">
              <span>2A. Offline Received & Entered</span>
              {sourceFilter === "offline" && <span className="text-[10px] lowercase font-normal">filtered</span>}
            </span>
            <div className="flex items-end justify-between">
              <span className="text-3xl font-black text-foreground">
                {isLoading ? "..." : formsEntered.length}
              </span>
              <FileText className="h-5 w-5 text-orange-500/50 mb-1" />
            </div>
          </div>

          {/* Step 2B: Online Forms Filled */}
          <div
            onClick={() => setSourceFilter(sourceFilter === "online" ? "all" : "online")}
            className={cn(
              "border rounded-2xl p-4 flex flex-col justify-between cursor-pointer transition-all hover:scale-[1.02]",
              sourceFilter === "online"
                ? "border-blue-500 bg-blue-500/15 shadow-sm"
                : "border-blue-500/20 bg-blue-500/5 hover:bg-blue-500/10"
            )}
          >
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400 mb-2 flex items-center justify-between">
              <span>2B. Online Applications</span>
              {sourceFilter === "online" && <span className="text-[10px] lowercase font-normal">filtered</span>}
            </span>
            <div className="flex items-end justify-between">
              <span className="text-3xl font-black text-foreground">
                {isLoading ? "..." : onlineForms.length}
              </span>
              <Clock className="h-5 w-5 text-blue-500/50 mb-1" />
            </div>
          </div>

          {/* Step 3: Admitted */}
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
            <div className="flex items-end justify-between mb-2">
              <span className="text-3xl font-black text-foreground text-emerald-900 dark:text-emerald-100 leading-none">
                {isLoading ? "..." : admittedForms.length}
              </span>
              <span className="text-[10px] font-bold px-2 py-1 bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 rounded-lg leading-none">
                Total
              </span>
            </div>
            <div className="flex items-center gap-2 mt-auto pt-2 border-t border-emerald-500/20">
              <div className="flex-1 text-[10px] font-bold text-emerald-800 dark:text-emerald-300 flex items-center justify-between">
                <span>Offline:</span>
                <span>{isLoading ? "-" : offlineAdmitted}</span>
              </div>
              <div className="w-px h-3 bg-emerald-500/30"></div>
              <div className="flex-1 text-[10px] font-bold text-emerald-800 dark:text-emerald-300 flex items-center justify-between">
                <span>Online:</span>
                <span>{isLoading ? "-" : onlineAdmitted}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Action Areas (Offline vs Online) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Offline Process Panel */}
        <div className="rounded-3xl border-2 border-purple-500/20 bg-gradient-to-br from-purple-500/[0.03] via-card to-card p-5 sm:p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 border-b border-purple-500/15 pb-4 mb-4">
              <div className="h-10 w-10 rounded-2xl bg-purple-500/15 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold shrink-0">
                <Printer className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-black tracking-tight text-foreground">
                  Offline Process
                </h2>
              </div>
            </div>

            <div className="space-y-3 flex-1">
              <Link
                href="/admission/new/offline"
                className="group flex items-center justify-between p-4 rounded-2xl border bg-card/50 hover:bg-card hover:border-purple-500/50 transition-all cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                    <Printer className="h-4 w-4" />
                  </div>
                  <span className="text-sm font-bold text-foreground group-hover:text-purple-600 transition-colors">
                    Print Blank Forms
                  </span>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-purple-600 group-hover:translate-x-1 transition-all" />
              </Link>

              <Link
                href="/admission/new/ai-scan"
                className="group flex items-center justify-between p-4 rounded-2xl border bg-card/50 hover:bg-card hover:border-purple-500/50 transition-all cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                    <Sparkles className="h-4 w-4 text-purple-500" />
                  </div>
                  <span className="text-sm font-bold text-foreground group-hover:text-purple-600 transition-colors">
                    AI Scan &amp; Data Entry
                  </span>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-purple-600 group-hover:translate-x-1 transition-all" />
              </Link>

              <Link
                href="/admission/applications"
                className="group flex items-center justify-between p-4 rounded-2xl border bg-card/50 hover:bg-card hover:border-purple-500/50 transition-all cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="h-4 w-4 text-purple-500" />
                  </div>
                  <span className="text-sm font-bold text-foreground group-hover:text-purple-600 transition-colors">
                    Verify Desk
                  </span>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-purple-600 group-hover:translate-x-1 transition-all" />
              </Link>
            </div>
          </div>
        </div>

        {/* Online Process Panel */}
        <div className="rounded-3xl border-2 border-blue-500/20 bg-gradient-to-br from-blue-500/[0.03] via-card to-card p-5 sm:p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-blue-500/15 pb-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold shrink-0">
                  <LinkIcon className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-black tracking-tight text-foreground">
                      Online Process
                    </h2>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                      Live Portal
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-3.5">
              {/* Shareable Link Box */}
              <div className="p-3.5 sm:p-4 rounded-2xl border bg-card/60 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Globe className="h-3.5 w-3.5 text-blue-500" />
                    Shareable Form Link
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex-1 min-w-0 px-3 py-2 bg-muted/60 dark:bg-muted/40 rounded-xl border text-[11px] font-mono text-foreground select-all overflow-hidden">
                    <span className="truncate block">
                      {onlineUrl || "https://school.edu/admission/new/apply"}
                    </span>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant={copied ? "default" : "outline"}
                    onClick={handleCopyLink}
                    className={cn(
                      "shrink-0 h-9 font-semibold text-xs transition-all cursor-pointer",
                      copied
                        ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                        : "border-blue-500/30 text-blue-600 dark:text-blue-400 hover:bg-blue-500/10"
                    )}
                  >
                    {copied ? (
                      <>
                        <Check className="h-3.5 w-3.5 mr-1" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5 mr-1" />
                        Copy Link
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* QR Code Card */}
              <div className="p-3.5 sm:p-4 rounded-2xl border bg-card/60 flex flex-col sm:flex-row items-center gap-4">
                <div className="relative p-2 bg-white rounded-2xl border shadow-xs shrink-0 flex items-center justify-center">
                  {qrCodeDataUrl ? (
                    <img
                      src={qrCodeDataUrl}
                      alt="Online Admission Form QR Code"
                      className="h-24 w-24 object-contain rounded-lg"
                    />
                  ) : (
                    <div className="h-24 w-24 flex items-center justify-center text-muted-foreground">
                      <QrCode className="h-10 w-10 animate-pulse text-muted-foreground/40" />
                    </div>
                  )}
                </div>

                <div className="flex-1 text-center sm:text-left space-y-2.5 w-full">
                  <div>
                    <div className="flex items-center justify-center sm:justify-start gap-2">
                      <h4 className="text-xs font-bold text-foreground">Instant Scan QR Code</h4>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold border border-emerald-500/20">
                        Print Ready
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 justify-center sm:justify-start">
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleDownloadQr}
                      className="h-8 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-xs cursor-pointer gap-1.5"
                    >
                      <Download className="h-3.5 w-3.5" />
                      1-Click Download QR
                    </Button>
                    <Link
                      href="/admission/new/apply"
                      target="_blank"
                      className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border text-xs font-semibold text-foreground hover:bg-accent transition-colors cursor-pointer"
                    >
                      <Eye className="h-3.5 w-3.5 text-blue-500" />
                      Preview Form
                      <ExternalLink className="h-3 w-3 text-muted-foreground" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ALL APPLICATIONS & TRACKING SECTION */}
      <div className="bg-card border rounded-3xl p-5 sm:p-6 shadow-xs space-y-5">
        {/* Section Title & Metrics Badges */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4">
          <div>
            <div className="flex items-center gap-2">
              <FileCheck2 className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-black tracking-tight text-foreground">
                Admission Applications &amp; Tracking Desk
              </h2>
            </div>
          </div>

          <div className="flex items-center flex-wrap gap-2 text-xs">
            <span className="px-2.5 py-1 rounded-xl bg-muted text-muted-foreground font-semibold border">
              Showing: <strong className="text-foreground">{filteredApps.length}</strong> of {newApps.length}
            </span>
            <button
              onClick={() => {
                queryClient.invalidateQueries({ queryKey: ["admission-applications"] });
                showToast("Refreshed admission records", "info");
              }}
              className="p-1.5 rounded-xl border hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              title="Refresh List"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="space-y-3">
          {/* Source Filter Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
            <button
              type="button"
              onClick={() => setSourceFilter("all")}
              className={cn(
                "px-3.5 py-2 rounded-xl font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5",
                sourceFilter === "all"
                  ? "bg-foreground text-background shadow-xs"
                  : "bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground border border-transparent"
              )}
            >
              <span>All Applications</span>
              <span className={cn(
                "text-[11px] px-1.5 py-0.2 rounded-md font-mono",
                sourceFilter === "all" ? "bg-background/20 text-background" : "bg-muted text-foreground"
              )}>
                {newApps.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setSourceFilter("offline")}
              className={cn(
                "px-3.5 py-2 rounded-xl font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5",
                sourceFilter === "offline"
                  ? "bg-orange-600 text-white shadow-xs"
                  : "bg-orange-500/10 hover:bg-orange-500/20 text-orange-700 dark:text-orange-400 border border-orange-500/20"
              )}
            >
              <FileText className="h-3.5 w-3.5" />
              <span>Offline Admissions</span>
              <span className={cn(
                "text-[11px] px-1.5 py-0.2 rounded-md font-mono",
                sourceFilter === "offline" ? "bg-white/20 text-white" : "bg-orange-500/20 text-orange-800 dark:text-orange-300"
              )}>
                {formsEntered.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setSourceFilter("online")}
              className={cn(
                "px-3.5 py-2 rounded-xl font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5",
                sourceFilter === "online"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "bg-blue-500/10 hover:bg-blue-500/20 text-blue-700 dark:text-blue-400 border border-blue-500/20"
              )}
            >
              <Globe className="h-3.5 w-3.5" />
              <span>Online Applications</span>
              <span className={cn(
                "text-[11px] px-1.5 py-0.2 rounded-md font-mono",
                sourceFilter === "online" ? "bg-white/20 text-white" : "bg-blue-500/20 text-blue-800 dark:text-blue-300"
              )}>
                {onlineForms.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setSourceFilter("blank")}
              className={cn(
                "px-3.5 py-2 rounded-xl font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5",
                sourceFilter === "blank"
                  ? "bg-purple-600 text-white shadow-xs"
                  : "bg-purple-500/10 hover:bg-purple-500/20 text-purple-700 dark:text-purple-400 border border-purple-500/20"
              )}
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Blank Issued</span>
              <span className={cn(
                "text-[11px] px-1.5 py-0.2 rounded-md font-mono",
                sourceFilter === "blank" ? "bg-white/20 text-white" : "bg-purple-500/20 text-purple-800 dark:text-purple-300"
              )}>
                {formsIssued.length}
              </span>
            </button>
          </div>

          {/* Search, Status & Class Filter Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-3 pt-2">
            {/* Search Input */}
            <div className="sm:col-span-2 md:col-span-6 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by candidate name, app no, contact, or guardian..."
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

            {/* Status Filter */}
            <div className="sm:col-span-1 md:col-span-3">
              <CustomSelect
                value={statusFilter}
                onChange={setStatusFilter}
                options={[
                  { value: "all", label: "All Statuses" },
                  { value: "pending", label: "⏳ Pending Verification" },
                  { value: "admitted", label: "✅ Admitted (Enrolled)" },
                ]}
                searchable={false}
                placeholder="Status"
                triggerClassName="h-9.5 text-xs font-semibold rounded-xl"
              />
            </div>

            {/* Target Class Filter */}
            <div className="sm:col-span-1 md:col-span-3">
              <CustomSelect
                value={classFilter}
                onChange={setClassFilter}
                options={[
                  { value: "all", label: "All Classes" },
                  { value: "V", label: "Class V" },
                  { value: "VI", label: "Class VI" },
                  { value: "VII", label: "Class VII" },
                  { value: "VIII", label: "Class VIII" },
                  { value: "IX", label: "Class IX" },
                  { value: "X", label: "Class X" },
                  { value: "XI", label: "Class XI" },
                  { value: "XII", label: "Class XII" },
                ]}
                searchable={false}
                placeholder="Class"
                triggerClassName="h-9.5 text-xs font-semibold rounded-xl"
              />
            </div>
          </div>
        </div>

        {/* Records Display */}
        <div className="border rounded-2xl overflow-hidden">
          {isLoading ? (
            <div className="p-12 text-center text-xs text-muted-foreground animate-pulse space-y-2">
              <RefreshCw className="h-6 w-6 animate-spin mx-auto text-muted-foreground/60" />
              <p>Loading admission records...</p>
            </div>
          ) : filteredApps.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <Filter className="h-10 w-10 text-muted-foreground/40 mx-auto" />
              <div className="space-y-1">
                <p className="text-sm font-bold text-foreground">No applications found</p>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  {searchQuery || sourceFilter !== "all" || statusFilter !== "all" || classFilter !== "all"
                    ? "No records matched your current filters. Try resetting the filters or searching with a different term."
                    : "No new admission applications have been received yet."}
                </p>
              </div>
              {(searchQuery || sourceFilter !== "all" || statusFilter !== "all" || classFilter !== "all") && (
                <button
                  type="button"
                  onClick={() => {
                    setSourceFilter("all");
                    setStatusFilter("all");
                    setClassFilter("all");
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
                {filteredApps.map((app) => {
                  const isAdmitted = app.status === "admitted";
                  const isBlank =
                    app.formMethod === "offline" && (!app.studentName || app.studentName.trim() === "");

                  return (
                    <div
                      key={app.id}
                      className={cn(
                        "p-4 space-y-2.5 transition-colors",
                        isAdmitted ? "bg-emerald-500/[0.03]" : isBlank ? "bg-purple-500/[0.02]" : ""
                      )}
                    >
                      {/* Top Bar: App No & Method Badge */}
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono font-black text-primary text-xs">
                          {app.applicationNo}
                        </span>

                        <div className="flex items-center gap-1.5">
                          {/* Method Badge */}
                          {app.formMethod === "online" ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20">
                              <Globe className="h-2.5 w-2.5" />
                              <span>Online</span>
                            </span>
                          ) : app.formMethod === "ai_scan" ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-500/10 text-purple-700 dark:text-purple-400 border border-purple-500/20">
                              <Sparkles className="h-2.5 w-2.5" />
                              <span>AI Scan</span>
                            </span>
                          ) : isBlank ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-500/10 text-purple-700 dark:text-purple-400 border border-purple-500/20 border-dashed">
                              <Printer className="h-2.5 w-2.5" />
                              <span>Blank Issued</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-orange-500/10 text-orange-700 dark:text-orange-400 border border-orange-500/20">
                              <FileText className="h-2.5 w-2.5" />
                              <span>Offline</span>
                            </span>
                          )}

                          {/* Status Badge */}
                          {isAdmitted ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
                              <CheckCircle2 className="h-3 w-3" />
                              <span>Admitted</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30">
                              <Clock className="h-3 w-3" />
                              <span>Pending</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Student Info */}
                      <div>
                        {isBlank ? (
                          <p className="font-semibold text-xs italic text-muted-foreground">
                            — Blank Printed Form (Awaiting Physical Submission) —
                          </p>
                        ) : (
                          <>
                            <h4 className="font-bold text-sm text-foreground leading-tight">
                              {app.studentName}
                            </h4>
                            <p className="text-[11px] text-muted-foreground mt-0.5">
                              Guardian: {app.guardianName || app.fatherName || "N/A"}
                              {app.dob ? ` • DOB: ${app.dob}` : ""}
                            </p>
                          </>
                        )}
                      </div>

                      {/* Class & Admitted Info */}
                      <div className="flex items-center justify-between text-xs pt-1 border-t border-dashed">
                        <span className="text-muted-foreground">
                          Target: <strong className="text-foreground">Class {app.targetClass}</strong>
                        </span>
                        {isAdmitted && (
                          <span className="font-bold text-emerald-700 dark:text-emerald-400 text-[11px]">
                            Sec {app.admittedSection || "A"} • Roll #{app.admittedRoll || 1}
                          </span>
                        )}
                      </div>

                      {/* Contact & Location */}
                      {(app.studentContact || app.village || app.address) && (
                        <div className="text-[11px] text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1">
                          {app.studentContact && (
                            <a
                              href={`tel:${app.studentContact}`}
                              className="inline-flex items-center gap-1 text-primary font-mono hover:underline"
                            >
                              <Phone className="h-3 w-3" />
                              <span>{app.studentContact}</span>
                            </a>
                          )}
                          {(app.village || app.address) && (
                            <span className="inline-flex items-center gap-1 truncate max-w-[200px]">
                              <MapPin className="h-3 w-3 shrink-0" />
                              <span>{app.village || app.address}</span>
                            </span>
                          )}
                        </div>
                      )}

                      {/* Card Actions */}
                      <div className="pt-2 flex items-center justify-end gap-2">
                        {isBlank ? (
                          <Link
                            href="/admission/new/ai-scan"
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-purple-500/30 bg-purple-500/10 hover:bg-purple-500/20 text-purple-700 dark:text-purple-300 text-xs font-bold transition-colors"
                          >
                            <Sparkles className="h-3.5 w-3.5" />
                            <span>Digitize Form</span>
                          </Link>
                        ) : (
                          <>
                            <Link
                              href={`/admission/receipt/${app.id}`}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border hover:bg-muted text-muted-foreground hover:text-foreground text-xs font-semibold transition-colors"
                            >
                              <Printer className="h-3.5 w-3.5" />
                              <span>Receipt</span>
                            </Link>

                            {!isAdmitted && (
                              <Button
                                size="sm"
                                onClick={() => openVerifyModal(app)}
                                className="h-8 px-3 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-xs cursor-pointer"
                              >
                                Verify & Admit
                              </Button>
                            )}
                          </>
                        )}
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
                      <th className="py-3.5 px-4">Form / App No</th>
                      <th className="py-3.5 px-4">Source / Method</th>
                      <th className="py-3.5 px-4">Candidate & Guardian</th>
                      <th className="py-3.5 px-4">Target Class</th>
                      <th className="py-3.5 px-4">Contact / Location</th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {filteredApps.map((app) => {
                      const isAdmitted = app.status === "admitted";
                      const isBlank =
                        app.formMethod === "offline" && (!app.studentName || app.studentName.trim() === "");

                      return (
                        <tr
                          key={app.id}
                          className={cn(
                            "hover:bg-muted/30 transition-colors",
                            isAdmitted
                              ? "bg-emerald-500/[0.02]"
                              : isBlank
                              ? "bg-purple-500/[0.01]"
                              : ""
                          )}
                        >
                          {/* App No */}
                          <td className="py-3 px-4 font-mono font-black text-primary text-xs">
                            {app.applicationNo}
                          </td>

                          {/* Method */}
                          <td className="py-3 px-4">
                            {app.formMethod === "online" ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20">
                                <Globe className="h-3 w-3" />
                                <span>Online Form</span>
                              </span>
                            ) : app.formMethod === "ai_scan" ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/10 text-purple-700 dark:text-purple-400 border border-purple-500/20">
                                <Sparkles className="h-3 w-3" />
                                <span>AI Scanned</span>
                              </span>
                            ) : isBlank ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/10 text-purple-700 dark:text-purple-400 border border-purple-500/20 border-dashed">
                                <Printer className="h-3 w-3" />
                                <span>Blank Issued</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-orange-500/10 text-orange-700 dark:text-orange-400 border border-orange-500/20">
                                <FileText className="h-3 w-3" />
                                <span>Offline Form</span>
                              </span>
                            )}
                          </td>

                          {/* Candidate & Guardian */}
                          <td className="py-3 px-4">
                            {isBlank ? (
                              <p className="italic text-muted-foreground text-xs">
                                — Blank Printed Form (Unfilled) —
                              </p>
                            ) : (
                              <>
                                <p className="font-bold text-foreground text-sm">{app.studentName}</p>
                                <p className="text-[10px] text-muted-foreground">
                                  Guardian: {app.guardianName || app.fatherName || "N/A"}
                                  {app.dob ? ` • DOB: ${app.dob}` : ""}
                                </p>
                              </>
                            )}
                          </td>

                          {/* Target Class / Admitted Assignment */}
                          <td className="py-3 px-4">
                            <div className="space-y-0.5">
                              <span className="px-2 py-0.5 rounded-md bg-muted text-foreground font-bold text-xs border inline-block">
                                Class {app.targetClass}
                              </span>
                              {isAdmitted && (
                                <p className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400">
                                  Sec {app.admittedSection || "A"} • Roll #{app.admittedRoll || 1}
                                </p>
                              )}
                            </div>
                          </td>

                          {/* Contact / Location */}
                          <td className="py-3 px-4">
                            <p className="font-mono text-foreground font-semibold">
                              {app.studentContact || "—"}
                            </p>
                            <p className="text-[10px] text-muted-foreground truncate max-w-xs">
                              {app.village || app.address || "—"}
                            </p>
                          </td>

                          {/* Status */}
                          <td className="py-3 px-4">
                            {isAdmitted ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
                                <CheckCircle2 className="h-3 w-3" />
                                <span>Admitted</span>
                              </span>
                            ) : isBlank ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/15 text-purple-700 dark:text-purple-400 border border-purple-500/30">
                                <Printer className="h-3 w-3" />
                                <span>Awaiting Form</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30">
                                <Clock className="h-3 w-3" />
                                <span>Pending</span>
                              </span>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {isBlank ? (
                                <Link
                                  href="/admission/new/ai-scan"
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl border border-purple-500/30 bg-purple-500/10 hover:bg-purple-500/20 text-purple-700 dark:text-purple-300 text-xs font-bold transition-colors"
                                  title="Digitize or Enter Data"
                                >
                                  <Sparkles className="h-3 w-3" />
                                  <span>Digitize</span>
                                </Link>
                              ) : (
                                <>
                                  <Link
                                    href={`/admission/receipt/${app.id}`}
                                    className="p-1.5 rounded-xl border hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                                    title="Print / View Receipt"
                                  >
                                    <Printer className="h-3.5 w-3.5" />
                                  </Link>

                                  {!isAdmitted && (
                                    <Button
                                      size="sm"
                                      onClick={() => openVerifyModal(app)}
                                      className="h-7 px-2.5 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-xs cursor-pointer flex items-center gap-1"
                                    >
                                      <UserCheck className="h-3 w-3" />
                                      <span>Verify &amp; Admit</span>
                                    </Button>
                                  )}
                                </>
                              )}
                            </div>
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
                      { value: "A", label: "A" },
                      { value: "B", label: "B" },
                      { value: "C", label: "C" },
                      { value: "D", label: "D" },
                    ]}
                    searchable={false}
                    placeholder="Sec"
                    triggerClassName="h-9 text-xs font-bold px-3"
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

export default function NewAdmissionDashboard() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          <span>Loading New Admission Hub...</span>
        </div>
      }
    >
      <NewAdmissionDashboardContent />
    </Suspense>
  );
}
