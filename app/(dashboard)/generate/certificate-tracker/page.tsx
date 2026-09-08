"use client";

import React, { useState, useEffect, useMemo, useTransition } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  Search,
  CheckCircle2,
  XCircle,
  Award,
  RefreshCw,
  Download,
  Eye,
  Copy,
  Check,
  FileCheck,
  GraduationCap,
  Sparkles,
  Layers,
  ArrowRight,
  X,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import { getDynamicClassList, type DynamicClassItem } from "@/lib/ems/ems-config-loader";

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

  // School Profile & Dynamic Classes/Sections State
  const [schoolClasses, setSchoolClasses] = useState<DynamicClassItem[]>(getDynamicClassList);

  // Registry & Analytics State
  const [stats, setStats] = useState<CertificateStats | null>(null);
  const [certificates, setCertificates] = useState<DBCertificateRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Table Filters
  const [tableSearch, setTableSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [classFilter, setClassFilter] = useState<string>("ALL");
  const [sectionFilter, setSectionFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // Detail Modal & Copy
  const [selectedCert, setSelectedCert] = useState<DBCertificateRow | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Dynamic Class Management List from School Profile / Settings
  const dynamicClasses = useMemo<DynamicClassItem[]>(() => {
    if (Array.isArray(schoolClasses) && schoolClasses.length > 0) {
      return schoolClasses.map((c: any) => ({
        name: c.name || `Class ${c.code}`,
        code: String(c.code || c.name).trim().toUpperCase(),
        sections: Array.isArray(c.sections) && c.sections.length > 0 ? c.sections : ["A", "B"],
        stream: c.stream,
      }));
    }
    return getDynamicClassList();
  }, [schoolClasses]);

  const availableClasses = useMemo(() => {
    return dynamicClasses.map((c) => c.code);
  }, [dynamicClasses]);

  // Dynamic sections strictly from School Profile / Class Management
  const availableSections = useMemo(() => {
    if (classFilter !== "ALL") {
      const currentClassObj = dynamicClasses.find(
        (c) => c.code.toUpperCase() === classFilter.toUpperCase()
      );
      if (currentClassObj && Array.isArray(currentClassObj.sections) && currentClassObj.sections.length > 0) {
        return currentClassObj.sections;
      }
    }

    const set = new Set<string>();
    dynamicClasses.forEach((c) => {
      if (Array.isArray(c.sections)) {
        c.sections.forEach((s) => {
          if (s && s.trim()) set.add(s.trim().toUpperCase());
        });
      }
    });

    certificates.forEach((cert) => {
      if (cert.section && cert.section.trim()) {
        set.add(cert.section.trim().toUpperCase());
      }
    });

    const result = Array.from(set).sort();
    return result.length > 0 ? result : ["A", "B"];
  }, [dynamicClasses, classFilter, certificates]);

  // Auto-reset section filter if selected section is not available in new class
  useEffect(() => {
    if (sectionFilter !== "ALL" && !availableSections.includes(sectionFilter)) {
      setSectionFilter("ALL");
    }
  }, [availableSections, sectionFilter]);

  // Load Data
  const loadData = async () => {
    setIsLoading(true);
    try {
      // 1. Fetch Stats from DB
      const statsRes = await fetch("/api/certificates/stats");
      const statsData = await statsRes.json();
      if (statsRes.ok && statsData.stats && statsData.stats.totalCertificates > 0) {
        setStats(statsData.stats);
      } else {
        setStats(getLocalCertificateStats());
      }

      // 2. Fetch Certificates from DB
      const listRes = await fetch("/api/certificates?limit=200");
      const listData = await listRes.json();
      if (listRes.ok && Array.isArray(listData.data) && listData.data.length > 0) {
        setCertificates(listData.data);
      } else {
        setCertificates(getLocalCachedCertificates());
      }

      // 3. Fetch School Config for live Class Management & Sections from School Profile
      try {
        const configRes = await fetch("/api/school-config", { cache: "no-store" });
        if (configRes.ok) {
          const configJson = await configRes.json();
          if (configJson?.data?.class_management && Array.isArray(configJson.data.class_management)) {
            setSchoolClasses(configJson.data.class_management);
            if (typeof window !== "undefined") {
              localStorage.setItem("sms_class_management", JSON.stringify(configJson.data.class_management));
            }
          }
        }
      } catch {
        // use local cache
      }
    } catch {
      setStats(getLocalCertificateStats());
      setCertificates(getLocalCachedCertificates());
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    const handleCertRecorded = () => {
      loadData();
    };

    const handleStorage = (e: StorageEvent) => {
      if (e.key === "sms_class_management") {
        setSchoolClasses(getDynamicClassList());
      }
    };

    window.addEventListener("sms_certificate_recorded", handleCertRecorded);
    window.addEventListener("sms_school_profile_updated", loadData);
    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener("sms_certificate_recorded", handleCertRecorded);
      window.removeEventListener("sms_school_profile_updated", loadData);
      window.removeEventListener("storage", handleStorage);
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
              message: `No record found for '${term}'`,
            });
          }
        }
      } catch (e: any) {
        setVerificationResult({
          checked: true,
          valid: false,
          certificate: null,
          message: e?.message || "Verification request failed",
        });
      }
    });
  };

  // Handle Status Toggle (Valid <-> Cancelled)
  const handleStatusToggle = async (cert: DBCertificateRow) => {
    const newStatus = cert.status === "Valid" ? "Cancelled" : "Valid";
    const confirmMsg =
      newStatus === "Cancelled"
        ? `Cancel Certificate ${cert.certificate_no}? It will be marked as invalid.`
        : `Re-validate Certificate ${cert.certificate_no}?`;

    if (!confirm(confirmMsg)) return;

    try {
      await fetch(`/api/certificates/${cert.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

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
      if (typeFilter !== "ALL" && c.certificate_type !== typeFilter) return false;
      if (classFilter !== "ALL" && c.student_class !== classFilter) return false;
      if (sectionFilter !== "ALL" && c.section !== sectionFilter) return false;
      if (statusFilter !== "ALL" && c.status !== statusFilter) return false;

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

  const handleCopyNo = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(text);
    setTimeout(() => setCopiedId(null), 2000);
  };

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
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `Certificates_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  function getCertTypeLabel(type: CertificateType): string {
    switch (type) {
      case "character-certificate":
        return "Character";
      case "pass-certificate":
        return "Pass Out";
      case "transfer-certificate":
        return "Transfer (TC)";
      case "kanyashree":
        return "Kanyashree";
      default:
        return type;
    }
  }

  function getCertTypeBadge(type: CertificateType) {
    switch (type) {
      case "character-certificate":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20">
            Character
          </span>
        );
      case "pass-certificate":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-sky-500/10 text-sky-700 dark:text-sky-300 border border-sky-500/20">
            Pass Out
          </span>
        );
      case "transfer-certificate":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-500/20">
            Transfer (TC)
          </span>
        );
      case "kanyashree":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20">
            Kanyashree
          </span>
        );
    }
  }

  const totalCerts = stats?.totalCertificates || certificates.length;

  return (
    <div className="p-4 sm:p-6 max-w-[1600px] mx-auto space-y-5">
      {/* Clean Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3.5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 border border-amber-500/20">
            <Award className="h-4 w-4" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
              Certificate Tracker
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-mono">
                {totalCerts}
              </span>
            </h1>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
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

          <Link
            href="/generate/certificate"
            className="inline-flex items-center justify-center rounded-md text-xs font-semibold transition-colors h-8 px-3 bg-primary text-primary-foreground hover:bg-primary/90 gap-1.5 shadow-2xs"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Issue Certificate
          </Link>
        </div>
      </div>

      {/* Clean Unified Verification Bar */}
      <div className="space-y-2">
        <div className="flex flex-col sm:flex-row gap-2 bg-card p-2 rounded-xl border border-border/70 shadow-2xs">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search Certificate No (e.g. MHS/CC/2026/0001) or Student ID to verify..."
              value={verifyTerm}
              onChange={(e) => setVerifyTerm(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleVerify();
              }}
              className="pl-9 h-9 text-xs border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground/70"
            />
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {verificationResult.checked && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setVerifyTerm("");
                  setVerificationResult({ checked: false, valid: false, certificate: null });
                }}
                className="h-8 text-xs text-muted-foreground px-2"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            )}
            <Button
              onClick={() => handleVerify()}
              disabled={isVerifying || !verifyTerm.trim()}
              size="sm"
              className="h-8 text-xs px-4 gap-1.5"
            >
              {isVerifying ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <ShieldCheck className="h-3.5 w-3.5" />
              )}
              Verify
            </Button>
          </div>
        </div>

        {/* Verification Card Result (Only shown when searching) */}
        {verificationResult.checked && (
          <div
            className={cn(
              "p-3.5 rounded-xl border transition-all animate-in fade-in-50 duration-150",
              verificationResult.valid && verificationResult.certificate
                ? "bg-emerald-500/5 border-emerald-500/30"
                : verificationResult.certificate && !verificationResult.valid
                ? "bg-rose-500/5 border-rose-500/30"
                : "bg-muted/40 border-border"
            )}
          >
            {verificationResult.certificate ? (
              <div className="space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-2">
                  <div className="flex items-center gap-2">
                    {verificationResult.valid ? (
                      <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold text-xs">
                        <CheckCircle2 className="h-4 w-4" />
                        VALID CERTIFICATE
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-rose-600 dark:text-rose-400 font-bold text-xs">
                        <XCircle className="h-4 w-4" />
                        CANCELLED / INVALID
                      </span>
                    )}
                    <span className="text-muted-foreground">•</span>
                    <span className="font-mono font-bold text-xs text-foreground">
                      {verificationResult.certificate.certificate_no}
                    </span>
                    {getCertTypeBadge(verificationResult.certificate.certificate_type)}
                  </div>

                  <div className="flex items-center gap-2">
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
                        ? "Cancel Certificate"
                        : "Re-validate"}
                    </button>
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
                      View Full Details
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                  <div>
                    <span className="text-[10px] text-muted-foreground block">Student Name</span>
                    <span className="font-bold text-foreground">
                      {verificationResult.certificate.student_name}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground block">Student ID / PEN</span>
                    <span className="font-mono text-foreground font-semibold">
                      {verificationResult.certificate.student_id || "—"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground block">Class &amp; Section</span>
                    <span className="font-semibold text-foreground">
                      Class {verificationResult.certificate.student_class}
                      {verificationResult.certificate.section ? ` (${verificationResult.certificate.section})` : ""}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground block">Issue Date</span>
                    <span className="font-mono text-foreground">
                      {verificationResult.certificate.issue_date}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-muted-foreground text-xs py-1">
                <XCircle className="h-4 w-4 text-amber-500 shrink-0" />
                <span>
                  {verificationResult.message || `No certificate found matching '${verifyTerm}'`}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Clean Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
        <div
          onClick={() => setTypeFilter("ALL")}
          className={cn(
            "p-3 rounded-xl border bg-card cursor-pointer transition-all hover:border-primary/50",
            typeFilter === "ALL" ? "border-primary/60 ring-1 ring-primary/20 shadow-2xs" : "border-border/70"
          )}
        >
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-[11px] font-semibold">Total Issued</span>
            <Award className="h-3.5 w-3.5 text-primary" />
          </div>
          <div className="text-xl font-bold font-mono text-foreground">{totalCerts}</div>
        </div>

        <div
          onClick={() => setTypeFilter((prev) => (prev === "character-certificate" ? "ALL" : "character-certificate"))}
          className={cn(
            "p-3 rounded-xl border bg-card cursor-pointer transition-all hover:border-amber-500/50",
            typeFilter === "character-certificate" ? "border-amber-500 ring-1 ring-amber-500/20 shadow-2xs" : "border-border/70"
          )}
        >
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-[11px] font-semibold">Character</span>
            <FileCheck className="h-3.5 w-3.5 text-amber-500" />
          </div>
          <div className="text-xl font-bold font-mono text-amber-600">
            {stats?.byType.character || 0}
          </div>
        </div>

        <div
          onClick={() => setTypeFilter((prev) => (prev === "pass-certificate" ? "ALL" : "pass-certificate"))}
          className={cn(
            "p-3 rounded-xl border bg-card cursor-pointer transition-all hover:border-sky-500/50",
            typeFilter === "pass-certificate" ? "border-sky-500 ring-1 ring-sky-500/20 shadow-2xs" : "border-border/70"
          )}
        >
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-[11px] font-semibold">Pass Out</span>
            <GraduationCap className="h-3.5 w-3.5 text-sky-500" />
          </div>
          <div className="text-xl font-bold font-mono text-sky-600">
            {stats?.byType.pass || 0}
          </div>
        </div>

        <div
          onClick={() => setTypeFilter((prev) => (prev === "transfer-certificate" ? "ALL" : "transfer-certificate"))}
          className={cn(
            "p-3 rounded-xl border bg-card cursor-pointer transition-all hover:border-indigo-500/50",
            typeFilter === "transfer-certificate" ? "border-indigo-500 ring-1 ring-indigo-500/20 shadow-2xs" : "border-border/70"
          )}
        >
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-[11px] font-semibold">Transfer (TC)</span>
            <Layers className="h-3.5 w-3.5 text-indigo-500" />
          </div>
          <div className="text-xl font-bold font-mono text-indigo-600">
            {stats?.byType.transfer || 0}
          </div>
        </div>

        <div
          onClick={() => setTypeFilter((prev) => (prev === "kanyashree" ? "ALL" : "kanyashree"))}
          className={cn(
            "p-3 rounded-xl border bg-card cursor-pointer transition-all hover:border-purple-500/50",
            typeFilter === "kanyashree" ? "border-purple-500 ring-1 ring-purple-500/20 shadow-2xs" : "border-border/70"
          )}
        >
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-[11px] font-semibold">Kanyashree</span>
            <Sparkles className="h-3.5 w-3.5 text-purple-500" />
          </div>
          <div className="text-xl font-bold font-mono text-purple-600">
            {stats?.byType.kanyashree || 0}
          </div>
        </div>
      </div>

      {/* Class Quick Filters (Clean horizontal pills) */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
        <span className="text-[11px] font-semibold text-muted-foreground mr-1 shrink-0">
          Class:
        </span>
        <button
          onClick={() => setClassFilter("ALL")}
          className={cn(
            "px-2.5 py-1 rounded-lg text-xs font-medium transition-all shrink-0 select-none",
            classFilter === "ALL"
              ? "bg-foreground text-background font-semibold"
              : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
        >
          All
        </button>
        {availableClasses.map((cls) => {
          const count = stats?.byClass[cls] || 0;
          const isActive = classFilter === cls;
          return (
            <button
              key={cls}
              onClick={() => setClassFilter(isActive ? "ALL" : cls)}
              className={cn(
                "px-2.5 py-1 rounded-lg text-xs font-medium transition-all shrink-0 select-none flex items-center gap-1",
                isActive
                  ? "bg-primary text-primary-foreground font-semibold shadow-2xs"
                  : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <span>Class {cls}</span>
              {count > 0 && (
                <span
                  className={cn(
                    "text-[10px] px-1 rounded-full",
                    isActive ? "bg-primary-foreground/20 text-primary-foreground" : "bg-background text-muted-foreground"
                  )}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Registry Data Table */}
      <div className="rounded-xl border border-border/70 bg-card overflow-hidden shadow-2xs">
        {/* Table Toolbar */}
        <div className="p-3 border-b flex flex-col md:flex-row md:items-center justify-between gap-2.5 bg-muted/20">
          <div className="flex items-center gap-2 flex-1">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Filter by name, cert no, ID..."
                value={tableSearch}
                onChange={(e) => setTableSearch(e.target.value)}
                className="pl-8 text-xs h-8 bg-background"
              />
            </div>

            <CustomSelect
              value={typeFilter}
              onChange={setTypeFilter}
              options={[
                { label: "All Types", value: "ALL" },
                { label: "Character", value: "character-certificate" },
                { label: "Pass Out", value: "pass-certificate" },
                { label: "Transfer (TC)", value: "transfer-certificate" },
                { label: "Kanyashree", value: "kanyashree" },
              ]}
              className="w-[145px] shrink-0"
              triggerClassName="h-8 text-xs bg-background px-3"
            />

            <CustomSelect
              value={sectionFilter}
              onChange={setSectionFilter}
              options={[
                { label: "All Sec", value: "ALL" },
                ...availableSections.map((sec) => ({ label: `Sec ${sec}`, value: sec })),
              ]}
              className="w-[110px] shrink-0"
              triggerClassName="h-8 text-xs bg-background px-3"
            />

            <CustomSelect
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                { label: "All Status", value: "ALL" },
                { label: "Valid", value: "Valid" },
                { label: "Cancelled", value: "Cancelled" },
              ]}
              className="w-[135px] shrink-0"
              triggerClassName="h-8 text-xs bg-background px-3"
            />
          </div>

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
              className="h-8 text-xs text-muted-foreground hover:text-foreground shrink-0"
            >
              Reset Filters
            </Button>
          )}
        </div>

        {/* Table View */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-muted/40 text-[11px] text-muted-foreground uppercase tracking-wider font-semibold border-b">
              <tr>
                <th className="py-2.5 px-3.5">Cert No</th>
                <th className="py-2.5 px-3">Type</th>
                <th className="py-2.5 px-3">Student</th>
                <th className="py-2.5 px-3">Class</th>
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3 text-center">Status</th>
                <th className="py-2.5 px-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-muted-foreground">
                    <RefreshCw className="h-4 w-4 animate-spin mx-auto mb-1.5 text-primary" />
                    Loading records...
                  </td>
                </tr>
              ) : filteredCertificates.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-muted-foreground">
                    <Award className="h-8 w-8 mx-auto mb-2 opacity-25" />
                    <p className="font-semibold text-xs text-foreground">No Certificates Found</p>
                    <p className="text-[11px] mt-0.5 max-w-sm mx-auto">
                      {certificates.length === 0
                        ? "No certificates have been issued yet. Print a certificate to start tracking."
                        : "No records match your selected filters."}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredCertificates.map((cert) => (
                  <tr
                    key={cert.id || cert.certificate_no}
                    className="hover:bg-muted/30 transition-colors group"
                  >
                    {/* Cert No */}
                    <td className="py-2.5 px-3.5 font-mono font-semibold text-foreground">
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
                    <td className="py-2.5 px-3">{getCertTypeBadge(cert.certificate_type)}</td>

                    {/* Student Info */}
                    <td className="py-2.5 px-3">
                      <div className="font-semibold text-foreground">{cert.student_name}</div>
                      <div className="text-[10px] text-muted-foreground font-mono">
                        {cert.student_id || cert.father_name || "—"}
                      </div>
                    </td>

                    {/* Class & Sec */}
                    <td className="py-2.5 px-3 font-mono">
                      <span>Class {cert.student_class}</span>
                      {cert.section && (
                        <span className="text-muted-foreground ml-1">({cert.section})</span>
                      )}
                    </td>

                    {/* Date */}
                    <td className="py-2.5 px-3 font-mono text-muted-foreground">
                      {cert.issue_date}
                    </td>

                    {/* Status */}
                    <td className="py-2.5 px-3 text-center">
                      {cert.status === "Valid" ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                          Valid
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-rose-500/10 text-rose-700 dark:text-rose-300">
                          Cancelled
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-2.5 px-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setSelectedCert(cert);
                            setIsDetailModalOpen(true);
                          }}
                          className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                          title="View Details"
                        >
                          <Eye className="h-3.5 w-3.5 mr-1" />
                          View
                        </Button>

                        <button
                          onClick={() => handleStatusToggle(cert)}
                          className={cn(
                            "text-[10.5px] font-medium px-2 py-1 rounded transition-colors",
                            cert.status === "Valid"
                              ? "text-rose-600 hover:bg-rose-500/10"
                              : "text-emerald-600 hover:bg-emerald-500/10"
                          )}
                        >
                          {cert.status === "Valid" ? "Cancel" : "Re-validate"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Details Modal */}
      {selectedCert && (
        <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader className="pb-2 border-b">
              <div className="flex items-center gap-2">
                {getCertTypeBadge(selectedCert.certificate_type)}
                <span
                  className={cn(
                    "text-[10px] font-semibold px-2 py-0.5 rounded-full",
                    selectedCert.status === "Valid"
                      ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                      : "bg-rose-500/10 text-rose-700 dark:text-rose-300"
                  )}
                >
                  {selectedCert.status}
                </span>
              </div>
              <DialogTitle className="text-base font-bold font-mono mt-1">
                {selectedCert.certificate_no}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Issued on {selectedCert.issue_date} • {selectedCert.copy_type}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 pt-2 text-xs">
              <div className="grid grid-cols-2 gap-2 p-3 rounded-lg bg-muted/30 border">
                <div>
                  <span className="text-[10px] text-muted-foreground block">Student Name</span>
                  <span className="font-bold text-foreground">{selectedCert.student_name}</span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground block">Student ID</span>
                  <span className="font-mono font-semibold">{selectedCert.student_id || "—"}</span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground block">Class &amp; Section</span>
                  <span className="font-mono font-semibold">
                    Class {selectedCert.student_class}
                    {selectedCert.section ? ` (${selectedCert.section})` : ""}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground block">Roll No</span>
                  <span className="font-mono">{selectedCert.roll_no || "—"}</span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground block">Father Name</span>
                  <span>{selectedCert.father_name || "—"}</span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground block">Session</span>
                  <span className="font-mono">{selectedCert.academic_session}</span>
                </div>
              </div>

              {/* Metadata Details */}
              {selectedCert.metadata && Object.keys(selectedCert.metadata).length > 0 && (
                <div className="space-y-1.5 p-3 rounded-lg bg-muted/30 border">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                    Certificate Details
                  </span>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {Object.entries(selectedCert.metadata).map(([key, value]) => {
                      if (value === null || value === undefined || value === "") return null;
                      if (typeof value === "object") return null;
                      return (
                        <div key={key} className={key === "remarks" ? "col-span-2" : ""}>
                          <span className="text-[10px] text-muted-foreground capitalize block">
                            {key.replace(/([A-Z])/g, " $1")}
                          </span>
                          <span className="text-foreground">{String(value)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Modal Actions */}
              <div className="flex items-center justify-between pt-2 border-t">
                <button
                  onClick={() => handleStatusToggle(selectedCert)}
                  className={cn(
                    "text-xs font-semibold underline cursor-pointer",
                    selectedCert.status === "Valid"
                      ? "text-rose-600 hover:text-rose-700"
                      : "text-emerald-600 hover:text-emerald-700"
                  )}
                >
                  {selectedCert.status === "Valid" ? "Cancel Certificate" : "Mark as Valid"}
                </button>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCopyNo(selectedCert.certificate_no)}
                    className="text-xs h-8 gap-1"
                  >
                    <Copy className="h-3 w-3" />
                    Copy No
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => setIsDetailModalOpen(false)}
                    className="text-xs h-8"
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
