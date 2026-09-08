"use client";

import React, { useState, useEffect, useMemo, useTransition } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  Search,
  CheckCircle2,
  XCircle,
  Award,
  Calendar,
  User,
  Users,
  Building,
  RefreshCw,
  Download,
  Filter,
  Eye,
  Copy,
  Check,
  FileCheck,
  AlertTriangle,
  ExternalLink,
  GraduationCap,
  Sparkles,
  Layers,
  BarChart3,
  ChevronRight,
  Printer,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CustomSelect } from "@/components/ui/custom-select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { DBCertificateRow, CertificateStats, CertificateType } from "@/lib/supabase/db-certificates";
import {
  getLocalCachedCertificates,
  getLocalCertificateStats,
} from "@/lib/utils/certificate-registry";

const STANDARD_CLASSES = ["V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];
const STANDARD_SECTIONS = ["A", "B", "C", "D"];

export default function CertificateTrackerPage() {
  // Verification State
  const [verifyTerm, setVerifyTerm] = useState("");
  const [isVerifying, startVerifyTransition] = useTransition();
  const [verificationResult, setVerificationResult] = useState<{
    checked: boolean;
    valid: boolean;
    certificate: DBCertificateRow | null;
    message?: string;
  }>({ checked: false, valid: false, certificate: null });

  // Registry & Analytics State
  const [stats, setStats] = useState<CertificateStats | null>(null);
  const [certificates, setCertificates] = useState<DBCertificateRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDbSynced, setIsDbSynced] = useState(true);

  // Table Filters
  const [tableSearch, setTableSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [classFilter, setClassFilter] = useState<string>("ALL");
  const [sectionFilter, setSectionFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // Selected Certificate for Detail Modal
  const [selectedCert, setSelectedCert] = useState<DBCertificateRow | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Load Data
  const loadData = async () => {
    setIsLoading(true);
    try {
      // 1. Fetch Stats from DB
      const statsRes = await fetch("/api/certificates/stats");
      const statsData = await statsRes.json();
      if (statsRes.ok && statsData.stats && statsData.stats.totalCertificates > 0) {
        setStats(statsData.stats);
        setIsDbSynced(true);
      } else {
        setStats(getLocalCertificateStats());
        setIsDbSynced(false);
      }

      // 2. Fetch Certificates from DB
      const listRes = await fetch("/api/certificates?limit=200");
      const listData = await listRes.json();
      if (listRes.ok && Array.isArray(listData.data) && listData.data.length > 0) {
        setCertificates(listData.data);
      } else {
        const localList = getLocalCachedCertificates();
        setCertificates(localList);
      }
    } catch (err) {
      console.warn("Using local cache fallback for certificates:", err);
      setStats(getLocalCertificateStats());
      setCertificates(getLocalCachedCertificates());
      setIsDbSynced(false);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // Listen for live certificate prints in current window
    const handleCertRecorded = () => {
      loadData();
    };

    window.addEventListener("sms_certificate_recorded", handleCertRecorded);
    return () => {
      window.removeEventListener("sms_certificate_recorded", handleCertRecorded);
    };
  }, []);

  // Handle Verification Search
  const handleVerify = (termToSearch?: string) => {
    const term = (termToSearch ?? verifyTerm).trim();
    if (!term) return;

    startVerifyTransition(async () => {
      try {
        const res = await fetch(`/api/certificates/verify?number=${encodeURIComponent(term)}`);
        const data = await res.json();

        if (res.ok && data.certificate) {
          setVerificationResult({
            checked: true,
            valid: data.valid,
            certificate: data.certificate,
          });
        } else {
          // Local cache fallback lookup
          const localList = getLocalCachedCertificates();
          const found = localList.find(
            (c) =>
              c.certificate_no.toLowerCase() === term.toLowerCase() ||
              (c.student_id && c.student_id.toLowerCase() === term.toLowerCase())
          );

          if (found) {
            setVerificationResult({
              checked: true,
              valid: found.status === "Valid",
              certificate: found,
            });
          } else {
            setVerificationResult({
              checked: true,
              valid: false,
              certificate: null,
              message: `No certificate found matching '${term}'`,
            });
          }
        }
      } catch (e: any) {
        setVerificationResult({
          checked: true,
          valid: false,
          certificate: null,
          message: e?.message || "Failed to verify certificate",
        });
      }
    });
  };

  // Handle Status Toggle (Valid <-> Cancelled)
  const handleStatusToggle = async (cert: DBCertificateRow) => {
    const newStatus = cert.status === "Valid" ? "Cancelled" : "Valid";
    const confirmMsg =
      newStatus === "Cancelled"
        ? `Are you sure you want to CANCEL Certificate ${cert.certificate_no}? It will be flagged as invalid during verification.`
        : `Re-validate Certificate ${cert.certificate_no}?`;

    if (!confirm(confirmMsg)) return;

    try {
      const res = await fetch(`/api/certificates/${cert.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      // Update local state regardless
      setCertificates((prev) =>
        prev.map((c) => (c.id === cert.id ? { ...c, status: newStatus } : c))
      );

      if (verificationResult.certificate?.id === cert.id) {
        setVerificationResult((prev) => ({
          ...prev,
          valid: newStatus === "Valid",
          certificate: prev.certificate ? { ...prev.certificate, status: newStatus } : null,
        }));
      }

      if (selectedCert?.id === cert.id) {
        setSelectedCert((prev) => (prev ? { ...prev, status: newStatus } : null));
      }
    } catch (e) {
      console.error("Error updating status:", e);
    }
  };

  // Filtered List
  const filteredCertificates = useMemo(() => {
    return certificates.filter((c) => {
      // Type Filter
      if (typeFilter !== "ALL" && c.certificate_type !== typeFilter) return false;

      // Class Filter
      if (classFilter !== "ALL" && c.student_class !== classFilter) return false;

      // Section Filter
      if (sectionFilter !== "ALL" && c.section !== sectionFilter) return false;

      // Status Filter
      if (statusFilter !== "ALL" && c.status !== statusFilter) return false;

      // Search Filter
      if (tableSearch.trim()) {
        const q = tableSearch.toLowerCase().trim();
        const matchNo = c.certificate_no.toLowerCase().includes(q);
        const matchName = c.student_name.toLowerCase().includes(q);
        const matchId = c.student_id ? c.student_id.toLowerCase().includes(q) : false;
        const matchFather = c.father_name ? c.father_name.toLowerCase().includes(q) : false;
        if (!matchNo && !matchName && !matchId && !matchFather) return false;
      }

      return true;
    });
  }, [certificates, typeFilter, classFilter, sectionFilter, statusFilter, tableSearch]);

  // Copy to clipboard helper
  const handleCopyNo = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(text);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Export CSV
  const handleExportCSV = () => {
    if (!filteredCertificates.length) return;

    const headers = [
      "Certificate No",
      "Type",
      "Student Name",
      "Student ID",
      "Class",
      "Section",
      "Roll No",
      "Father Name",
      "Issue Date",
      "Status",
      "Session",
      "Copy Type",
    ];

    const rows = filteredCertificates.map((c) => [
      `"${c.certificate_no}"`,
      `"${getCertTypeLabel(c.certificate_type)}"`,
      `"${c.student_name}"`,
      `"${c.student_id || ""}"`,
      `"${c.student_class}"`,
      `"${c.section || ""}"`,
      `"${c.roll_no || ""}"`,
      `"${c.father_name || ""}"`,
      `"${c.issue_date}"`,
      `"${c.status}"`,
      `"${c.academic_session}"`,
      `"${c.copy_type}"`,
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `Certificates_Registry_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  function getCertTypeLabel(type: CertificateType): string {
    switch (type) {
      case "character-certificate":
        return "Character Certificate";
      case "pass-certificate":
        return "Pass Out Certificate";
      case "transfer-certificate":
        return "Transfer Certificate (TC)";
      case "kanyashree":
        return "Kanyashree Certificate";
      default:
        return type;
    }
  }

  function getCertTypeBadge(type: CertificateType) {
    switch (type) {
      case "character-certificate":
        return (
          <Badge variant="outline" className="bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-500/30 text-[10.5px]">
            Character Cert
          </Badge>
        );
      case "pass-certificate":
        return (
          <Badge variant="outline" className="bg-sky-500/10 text-sky-800 dark:text-sky-300 border-sky-500/30 text-[10.5px]">
            Pass Out Cert
          </Badge>
        );
      case "transfer-certificate":
        return (
          <Badge variant="outline" className="bg-indigo-500/10 text-indigo-800 dark:text-indigo-300 border-indigo-500/30 text-[10.5px]">
            Transfer (TC)
          </Badge>
        );
      case "kanyashree":
        return (
          <Badge variant="outline" className="bg-purple-500/10 text-purple-800 dark:text-purple-300 border-purple-500/30 text-[10.5px]">
            Kanyashree
          </Badge>
        );
    }
  }

  const totalCerts = stats?.totalCertificates || 0;

  return (
    <div className="p-4 sm:p-6 max-w-[1700px] mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 border border-amber-500/20 shadow-xs">
              <Award className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                Certificate Tracker &amp; Verification
                <Badge variant="secondary" className="font-mono text-xs">
                  {totalCerts} Issued
                </Badge>
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Centralized registry to verify validity, visualize class distributions, and track all student certificates
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            disabled={isLoading}
            className="h-8 text-xs gap-1.5"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", isLoading && "animate-spin")} />
            Refresh
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            disabled={!filteredCertificates.length}
            className="h-8 text-xs gap-1.5"
          >
            <Download className="h-3.5 w-3.5" />
            Export CSV
          </Button>

          {/* Quick Generator Links */}
          <div className="flex items-center gap-1.5 pl-2 border-l">
            <Link
              href="/generate/certificate"
              className="inline-flex items-center justify-center rounded-md text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 h-8 px-3 bg-amber-600 hover:bg-amber-700 text-white gap-1.5 shadow-xs"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Issue Certificate
            </Link>
          </div>
        </div>
      </div>

      {/* Database Setup Notice if empty or fallback */}
      {!isDbSynced && (
        <div className="flex items-start gap-3 p-3 rounded-xl border border-amber-500/30 bg-amber-500/5 text-xs text-amber-900 dark:text-amber-200">
          <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="font-semibold">Local Storage Safe Mode Active</p>
            <p className="text-muted-foreground text-[11px]">
              Certificates printed from your browser are safely stored in local client cache. Run the provided Supabase migration script (<code>certificates_registry</code>) to synchronize records across all admin users and devices.
            </p>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 1: INSTANT CERTIFICATE VERIFICATION                                */}
      {/* ========================================================================= */}
      <Card className="border-border/80 shadow-xs">
        <CardHeader className="pb-3 pt-4">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" />
            Instant Certificate Verification
          </CardTitle>
          <CardDescription className="text-xs">
            Verify certificate authenticity by entering the Certificate Number (e.g. MHS/CC/2026/0001) or Student ID
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Enter Certificate Number (e.g. MHS/CC/2026/0001) or Student ID..."
                value={verifyTerm}
                onChange={(e) => setVerifyTerm(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleVerify();
                }}
                className="pl-9 h-9 text-xs font-mono"
              />
            </div>
            <Button
              onClick={() => handleVerify()}
              disabled={isVerifying || !verifyTerm.trim()}
              className="h-9 text-xs px-5 gap-1.5 shrink-0"
            >
              {isVerifying ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <ShieldCheck className="h-3.5 w-3.5" />
              )}
              Verify Now
            </Button>
            {verificationResult.checked && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setVerifyTerm("");
                  setVerificationResult({ checked: false, valid: false, certificate: null });
                }}
                className="h-9 text-xs"
              >
                Clear
              </Button>
            )}
          </div>

          {/* Verification Result Card */}
          {verificationResult.checked && (
            <div
              className={cn(
                "p-4 rounded-xl border transition-all duration-200",
                verificationResult.valid && verificationResult.certificate
                  ? "bg-emerald-500/5 border-emerald-500/30 text-foreground"
                  : verificationResult.certificate && !verificationResult.valid
                  ? "bg-rose-500/5 border-rose-500/30 text-foreground"
                  : "bg-amber-500/5 border-amber-500/30 text-foreground"
              )}
            >
              {verificationResult.certificate ? (
                <div className="space-y-3">
                  {/* Status Banner */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3">
                    <div className="flex items-center gap-2">
                      {verificationResult.valid ? (
                        <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold text-sm">
                          <CheckCircle2 className="h-5 w-5" />
                          <span>VERIFIED &amp; AUTHENTIC</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400 font-bold text-sm">
                          <XCircle className="h-5 w-5" />
                          <span>INVALIDATED / CANCELLED CERTIFICATE</span>
                        </div>
                      )}
                      <span className="text-muted-foreground">•</span>
                      <span className="font-mono font-semibold text-xs">
                        {verificationResult.certificate.certificate_no}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {getCertTypeBadge(verificationResult.certificate.certificate_type)}
                      <Badge variant="secondary" className="text-[10px]">
                        Session {verificationResult.certificate.academic_session}
                      </Badge>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedCert(verificationResult.certificate);
                          setIsDetailModalOpen(true);
                        }}
                        className="h-7 text-xs gap-1"
                      >
                        <Eye className="h-3 w-3" />
                        Full Details
                      </Button>
                    </div>
                  </div>

                  {/* Student Details Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-background/60 p-3 rounded-lg border border-border/70">
                    <div>
                      <span className="text-[10.5px] text-muted-foreground block">Student Name</span>
                      <span className="font-bold text-foreground">
                        {verificationResult.certificate.student_name}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10.5px] text-muted-foreground block">Student ID / PEN</span>
                      <span className="font-bold font-mono text-foreground">
                        {verificationResult.certificate.student_id || "N/A"}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10.5px] text-muted-foreground block">Class &amp; Section</span>
                      <span className="font-bold font-mono text-foreground">
                        Class {verificationResult.certificate.student_class}
                        {verificationResult.certificate.section ? ` (${verificationResult.certificate.section})` : ""}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10.5px] text-muted-foreground block">Father / Guardian</span>
                      <span className="font-bold text-foreground">
                        {verificationResult.certificate.father_name || "N/A"}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10.5px] text-muted-foreground block">Issue Date</span>
                      <span className="font-mono text-foreground">
                        {verificationResult.certificate.issue_date}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10.5px] text-muted-foreground block">Copy Type</span>
                      <span className="font-medium text-foreground">
                        {verificationResult.certificate.copy_type}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10.5px] text-muted-foreground block">Printed By</span>
                      <span className="text-muted-foreground truncate block">
                        {verificationResult.certificate.printed_by || "Administrator"}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10.5px] text-muted-foreground block">Status Control</span>
                      <button
                        onClick={() => handleStatusToggle(verificationResult.certificate!)}
                        className={cn(
                          "text-[11px] font-semibold underline cursor-pointer",
                          verificationResult.certificate.status === "Valid"
                            ? "text-rose-600 hover:text-rose-700"
                            : "text-emerald-600 hover:text-emerald-700"
                        )}
                      >
                        {verificationResult.certificate.status === "Valid"
                          ? "Mark as Cancelled"
                          : "Re-validate Certificate"}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3 text-amber-700 dark:text-amber-400">
                  <XCircle className="h-5 w-5 shrink-0" />
                  <div>
                    <p className="font-bold text-xs">No Record Found</p>
                    <p className="text-[11px] text-muted-foreground">
                      {verificationResult.message ||
                        `No certificate in the registry matches '${verifyTerm}'. Please check the certificate number and try again.`}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ========================================================================= */}
      {/* SECTION 2: DATA VISUALISATION & ANALYTICS                                  */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* Total Certificates */}
        <div className="p-3.5 rounded-xl border border-border/80 bg-card space-y-1">
          <span className="text-[11px] text-muted-foreground font-semibold flex items-center justify-between">
            <span>Total Issued</span>
            <Award className="h-4 w-4 text-primary" />
          </span>
          <p className="text-2xl font-bold font-mono text-foreground">
            {stats?.totalCertificates || 0}
          </p>
          <div className="flex items-center gap-1.5 text-[10px]">
            <span className="text-emerald-600 font-semibold">{stats?.validCount || 0} valid</span>
            <span className="text-muted-foreground">•</span>
            <span className="text-rose-600 font-semibold">{stats?.cancelledCount || 0} cancelled</span>
          </div>
        </div>

        {/* Character Certificates */}
        <div className="p-3.5 rounded-xl border border-border/80 bg-card space-y-1">
          <span className="text-[11px] text-muted-foreground font-semibold flex items-center justify-between">
            <span>Character Certs</span>
            <FileCheck className="h-4 w-4 text-amber-500" />
          </span>
          <p className="text-2xl font-bold font-mono text-amber-600">
            {stats?.byType.character || 0}
          </p>
          <span className="text-[10px] text-muted-foreground">MP &amp; HS Passouts</span>
        </div>

        {/* Pass Out Certificates */}
        <div className="p-3.5 rounded-xl border border-border/80 bg-card space-y-1">
          <span className="text-[11px] text-muted-foreground font-semibold flex items-center justify-between">
            <span>Pass Out Certs</span>
            <GraduationCap className="h-4 w-4 text-sky-500" />
          </span>
          <p className="text-2xl font-bold font-mono text-sky-600">
            {stats?.byType.pass || 0}
          </p>
          <span className="text-[10px] text-muted-foreground">Class completion / Promotion</span>
        </div>

        {/* Transfer Certificates (TC) */}
        <div className="p-3.5 rounded-xl border border-border/80 bg-card space-y-1">
          <span className="text-[11px] text-muted-foreground font-semibold flex items-center justify-between">
            <span>Transfer (TC)</span>
            <Layers className="h-4 w-4 text-indigo-500" />
          </span>
          <p className="text-2xl font-bold font-mono text-indigo-600">
            {stats?.byType.transfer || 0}
          </p>
          <span className="text-[10px] text-muted-foreground">School leaving certificates</span>
        </div>

        {/* Kanyashree Certificates */}
        <div className="p-3.5 rounded-xl border border-border/80 bg-card space-y-1">
          <span className="text-[11px] text-muted-foreground font-semibold flex items-center justify-between">
            <span>Kanyashree</span>
            <Sparkles className="h-4 w-4 text-purple-500" />
          </span>
          <p className="text-2xl font-bold font-mono text-purple-600">
            {stats?.byType.kanyashree || 0}
          </p>
          <span className="text-[10px] text-muted-foreground">K1 &amp; K2 Scholarship</span>
        </div>
      </div>

      {/* Class & Section Distribution Visualizer */}
      <Card className="border-border/80 shadow-xs">
        <CardHeader className="pb-2 pt-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <BarChart3 className="h-3.5 w-3.5 text-primary" />
                Class-Wise Certificate Distribution
              </CardTitle>
            </div>
            <span className="text-xs text-muted-foreground">
              Based on {totalCerts} total records
            </span>
          </div>
        </CardHeader>
        <CardContent className="pt-2 pb-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-2">
            {STANDARD_CLASSES.map((cls) => {
              const count = stats?.byClass[cls] || 0;
              const pct = totalCerts > 0 ? Math.round((count / totalCerts) * 100) : 0;
              return (
                <div
                  key={cls}
                  onClick={() => setClassFilter((prev) => (prev === cls ? "ALL" : cls))}
                  className={cn(
                    "p-2.5 rounded-xl border text-center transition-all cursor-pointer select-none",
                    classFilter === cls
                      ? "border-primary bg-primary/10 shadow-xs"
                      : "border-border/70 hover:border-border hover:bg-muted/30"
                  )}
                >
                  <span className="text-[10.5px] font-semibold text-muted-foreground block">
                    Class {cls}
                  </span>
                  <p className="text-base font-bold font-mono text-foreground mt-0.5">
                    {count}
                  </p>
                  <div className="w-full bg-muted h-1 rounded-full overflow-hidden mt-1.5">
                    <div
                      style={{ width: `${pct}%` }}
                      className="h-full bg-primary rounded-full transition-all duration-300"
                    />
                  </div>
                  <span className="text-[9.5px] text-muted-foreground mt-1 block">{pct}%</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* ========================================================================= */}
      {/* SECTION 3: CERTIFICATES REGISTRY TABLE & FILTERS                           */}
      {/* ========================================================================= */}
      <Card className="border-border/80 shadow-xs">
        <CardHeader className="pb-3 pt-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Layers className="h-4 w-4 text-primary" />
                Certificates Registry ({filteredCertificates.length})
              </CardTitle>
              <CardDescription className="text-xs">
                Filter and track by student, certificate type, class, and section
              </CardDescription>
            </div>

            {/* Clear Filters */}
            {(typeFilter !== "ALL" || classFilter !== "ALL" || sectionFilter !== "ALL" || statusFilter !== "ALL" || tableSearch) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setTypeFilter("ALL");
                  setClassFilter("ALL");
                  setSectionFilter("ALL");
                  setStatusFilter("ALL");
                  setTableSearch("");
                }}
                className="h-7 text-xs text-muted-foreground hover:text-foreground"
              >
                Reset Filters
              </Button>
            )}
          </div>

          {/* Filter Toolbar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-2 pt-2">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search cert no, name, ID..."
                value={tableSearch}
                onChange={(e) => setTableSearch(e.target.value)}
                className="pl-8 text-xs h-8"
              />
            </div>

            {/* Type Filter */}
            <CustomSelect
              value={typeFilter}
              onChange={setTypeFilter}
              options={[
                { label: "All Certificate Types", value: "ALL" },
                { label: "Character Certificate", value: "character-certificate" },
                { label: "Pass Out Certificate", value: "pass-certificate" },
                { label: "Transfer Certificate (TC)", value: "transfer-certificate" },
                { label: "Kanyashree Certificate", value: "kanyashree" },
              ]}
              triggerClassName="h-8 text-xs"
            />

            {/* Class Filter */}
            <CustomSelect
              value={classFilter}
              onChange={setClassFilter}
              options={[
                { label: "All Classes", value: "ALL" },
                ...STANDARD_CLASSES.map((cls) => ({ label: `Class ${cls}`, value: cls })),
              ]}
              triggerClassName="h-8 text-xs"
            />

            {/* Section Filter */}
            <CustomSelect
              value={sectionFilter}
              onChange={setSectionFilter}
              options={[
                { label: "All Sections", value: "ALL" },
                ...STANDARD_SECTIONS.map((sec) => ({ label: `Section ${sec}`, value: sec })),
              ]}
              triggerClassName="h-8 text-xs"
            />

            {/* Status Filter */}
            <CustomSelect
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                { label: "All Statuses", value: "ALL" },
                { label: "Valid Only", value: "Valid" },
                { label: "Cancelled Only", value: "Cancelled" },
              ]}
              triggerClassName="h-8 text-xs"
            />
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto border-t">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/50 text-[11px] text-muted-foreground uppercase tracking-wider font-semibold border-b">
                <tr>
                  <th className="py-2.5 px-3">Cert No</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">Student Info</th>
                  <th className="py-2.5 px-3">Class &amp; Sec</th>
                  <th className="py-2.5 px-3">Issue Date</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-muted-foreground">
                      <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-primary" />
                      Loading certificate registry...
                    </td>
                  </tr>
                ) : filteredCertificates.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-muted-foreground">
                      <Award className="h-8 w-8 mx-auto mb-2 opacity-30" />
                      <p className="font-semibold text-xs text-foreground">No Certificates Found</p>
                      <p className="text-[11px] mt-0.5">
                        {certificates.length === 0
                          ? "No certificates have been issued yet. When certificates are printed, they will appear here automatically."
                          : "No certificates match the selected filters."}
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredCertificates.map((cert) => (
                    <tr
                      key={cert.id || cert.certificate_no}
                      className="hover:bg-muted/40 transition-colors group"
                    >
                      {/* Cert No */}
                      <td className="py-2.5 px-3 font-mono font-bold text-foreground">
                        <div className="flex items-center gap-1.5">
                          <span>{cert.certificate_no}</span>
                          <button
                            onClick={() => handleCopyNo(cert.certificate_no)}
                            title="Copy Certificate Number"
                            className="text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            {copiedId === cert.certificate_no ? (
                              <Check className="h-3 w-3 text-emerald-600" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </button>
                        </div>
                      </td>

                      {/* Type Badge */}
                      <td className="py-2.5 px-3">
                        {getCertTypeBadge(cert.certificate_type)}
                      </td>

                      {/* Student Info */}
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-foreground">{cert.student_name}</div>
                        <div className="text-[10px] text-muted-foreground font-mono flex items-center gap-1.5 mt-0.5">
                          {cert.student_id && <span>ID: {cert.student_id}</span>}
                          {cert.father_name && <span>• F: {cert.father_name}</span>}
                        </div>
                      </td>

                      {/* Class & Section */}
                      <td className="py-2.5 px-3 font-mono">
                        <span className="font-bold">Class {cert.student_class}</span>
                        {cert.section && (
                          <span className="text-muted-foreground ml-1">({cert.section})</span>
                        )}
                        {cert.roll_no && (
                          <span className="text-[10px] text-muted-foreground block">
                            Roll: {cert.roll_no}
                          </span>
                        )}
                      </td>

                      {/* Issue Date */}
                      <td className="py-2.5 px-3 font-mono text-muted-foreground">
                        {cert.issue_date}
                      </td>

                      {/* Status */}
                      <td className="py-2.5 px-3 text-center">
                        {cert.status === "Valid" ? (
                          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-[10px]">
                            Valid
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30 text-[10px]">
                            Cancelled
                          </Badge>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-2.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setSelectedCert(cert);
                              setIsDetailModalOpen(true);
                            }}
                            className="h-7 w-7 p-0"
                            title="View Certificate Details"
                          >
                            <Eye className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                          </Button>

                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleStatusToggle(cert)}
                            className={cn(
                              "h-7 px-2 text-[10.5px]",
                              cert.status === "Valid"
                                ? "text-rose-600 hover:text-rose-700 hover:bg-rose-500/10"
                                : "text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10"
                            )}
                            title={cert.status === "Valid" ? "Cancel Certificate" : "Re-validate"}
                          >
                            {cert.status === "Valid" ? "Cancel" : "Re-validate"}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* ========================================================================= */}
      {/* MODAL: CERTIFICATE FULL DETAILS PREVIEW                                    */}
      {/* ========================================================================= */}
      {selectedCert && (
        <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
          <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex items-center gap-2">
                {getCertTypeBadge(selectedCert.certificate_type)}
                <Badge
                  variant={selectedCert.status === "Valid" ? "default" : "destructive"}
                  className="text-[10.5px]"
                >
                  {selectedCert.status}
                </Badge>
              </div>
              <DialogTitle className="text-base font-bold font-mono mt-1">
                {selectedCert.certificate_no}
              </DialogTitle>
              <DialogDescription className="text-xs">
                Official issued record recorded on {selectedCert.created_at ? new Date(selectedCert.created_at).toLocaleString() : selectedCert.issue_date}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 pt-2 text-xs">
              {/* Student Identification */}
              <div className="p-3.5 rounded-xl border bg-muted/30 space-y-2">
                <h4 className="font-semibold text-foreground text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-primary" />
                  Student Information
                </h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-[10.5px] text-muted-foreground block">Full Name</span>
                    <span className="font-bold text-foreground">{selectedCert.student_name}</span>
                  </div>
                  <div>
                    <span className="text-[10.5px] text-muted-foreground block">Student ID / Registration</span>
                    <span className="font-mono font-semibold">{selectedCert.student_id || "N/A"}</span>
                  </div>
                  <div>
                    <span className="text-[10.5px] text-muted-foreground block">Father / Guardian</span>
                    <span>{selectedCert.father_name || "N/A"}</span>
                  </div>
                  <div>
                    <span className="text-[10.5px] text-muted-foreground block">Mother</span>
                    <span>{selectedCert.mother_name || "N/A"}</span>
                  </div>
                  <div>
                    <span className="text-[10.5px] text-muted-foreground block">Class &amp; Section</span>
                    <span className="font-mono font-bold">
                      Class {selectedCert.student_class}
                      {selectedCert.section ? ` - Sec ${selectedCert.section}` : ""}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10.5px] text-muted-foreground block">Roll Number</span>
                    <span className="font-mono">{selectedCert.roll_no || "N/A"}</span>
                  </div>
                  {selectedCert.date_of_birth && (
                    <div>
                      <span className="text-[10.5px] text-muted-foreground block">Date of Birth</span>
                      <span className="font-mono">{selectedCert.date_of_birth}</span>
                    </div>
                  )}
                  {selectedCert.gender && (
                    <div>
                      <span className="text-[10.5px] text-muted-foreground block">Gender</span>
                      <span>{selectedCert.gender}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Certificate Specific Metadata */}
              {selectedCert.metadata && Object.keys(selectedCert.metadata).length > 0 && (
                <div className="p-3.5 rounded-xl border bg-muted/30 space-y-2">
                  <h4 className="font-semibold text-foreground text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <FileCheck className="h-3.5 w-3.5 text-primary" />
                    Certificate Specifics &amp; Annotations
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {Object.entries(selectedCert.metadata).map(([key, value]) => {
                      if (value === null || value === undefined || value === "") return null;
                      if (typeof value === "object") return null;
                      return (
                        <div key={key} className={key === "remarks" ? "col-span-2" : ""}>
                          <span className="text-[10.5px] text-muted-foreground capitalize block">
                            {key.replace(/([A-Z])/g, " $1")}
                          </span>
                          <span className={cn("text-foreground", key === "remarks" && "italic")}>
                            {String(value)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Issuance Meta */}
              <div className="flex items-center justify-between text-[11px] text-muted-foreground border-t pt-3">
                <div>
                  Issue Date: <span className="font-mono font-semibold text-foreground">{selectedCert.issue_date}</span>
                </div>
                <div>
                  Printed by: <span className="font-semibold text-foreground">{selectedCert.printed_by || "Administrator"}</span>
                </div>
                <div>
                  Copy: <span className="font-semibold text-foreground">{selectedCert.copy_type}</span>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="flex items-center justify-between gap-2 pt-2 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleStatusToggle(selectedCert)}
                  className={cn(
                    "text-xs",
                    selectedCert.status === "Valid"
                      ? "text-rose-600 hover:text-rose-700"
                      : "text-emerald-600 hover:text-emerald-700"
                  )}
                >
                  {selectedCert.status === "Valid" ? "Cancel / Invalidate" : "Mark as Valid"}
                </Button>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCopyNo(selectedCert.certificate_no)}
                    className="text-xs gap-1"
                  >
                    <Copy className="h-3 w-3" />
                    Copy Cert No
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => setIsDetailModalOpen(false)}
                    className="text-xs"
                  >
                    Close
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
