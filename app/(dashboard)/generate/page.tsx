"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import {
  Sparkles,
  Award,
  FileCheck2,
  Printer,
  Search,
  ShieldCheck,
  ArrowRight,
  CheckCircle2,
  GraduationCap,
  Receipt,
  Layers,
  Clock,
  ExternalLink,
  BookOpen,
  ClipboardList,
  Check,
  AlertCircle,
  Hash,
  RefreshCw,
  QrCode,
  School,
  FileBadge2,
  Info,
  SlidersHorizontal,
  Contact,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { DBCertificateRow, CertificateStats } from "@/lib/supabase/db-certificates";
import {
  getLocalCachedCertificates,
  getLocalCertificateStats,
} from "@/lib/utils/certificate-registry";
import { QRScannerModal } from "@/components/certificate/qr-scanner-modal";

type CategoryFilter = "all" | "certificates" | "exams" | "admissions" | "tracker";

interface GeneratorModule {
  id: string;
  title: string;
  category: "certificates" | "exams" | "admissions" | "tracker";
  categoryLabel: string;
  formatBadge: string;
  formatVariant?: "default" | "emerald" | "amber" | "sky" | "purple" | "outline";
  description: string;
  href: string;
  trackerHref?: string;
  icon: React.ElementType;
  iconBg: string;
  accentBorder: string;
  gradientGlow: string;
  highlights: string[];
  isFeatured?: boolean;
}

const GENERATOR_MODULES: GeneratorModule[] = [
  {
    id: "certificate-tracker",
    title: "Certificate Tracker & Registry",
    category: "tracker",
    categoryLabel: "Registry & Audit",
    formatBadge: "Live Registry",
    formatVariant: "emerald",
    description:
      "Centralized verification hub and real-time audit ledger for all issued school certificates with duplicate prevention and QR verification.",
    href: "/generate/certificate-tracker",
    icon: ShieldCheck,
    iconBg: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
    accentBorder: "hover:border-emerald-500/50 hover:shadow-emerald-500/10",
    gradientGlow: "from-emerald-500/10 via-transparent to-transparent",
    highlights: ["Serial Number Tracking", "Anti-Tamper QR Verification", "Audit History & Logs", "Cancel / Re-issue Control"],
    isFeatured: true,
  },
  {
    id: "character-certificate",
    title: "Character Certificate",
    category: "certificates",
    categoryLabel: "Certificates",
    formatBadge: "A5 Landscape",
    formatVariant: "amber",
    description:
      "Official institutional conduct and character certificate with dynamic school crest watermark, anti-tamper QR, and customizable remarks.",
    href: "/generate/certificate",
    trackerHref: "/generate/certificate-tracker?type=character-certificate",
    icon: Award,
    iconBg: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
    accentBorder: "hover:border-amber-500/50 hover:shadow-amber-500/10",
    gradientGlow: "from-amber-500/10 via-transparent to-transparent",
    highlights: ["Auto-fill from Student DB", "Custom Conduct Remarks", "Embedded Verification QR", "Strict 1-Page A5 Layout"],
  },
  {
    id: "student-id-cards",
    title: "Student ID Card Studio",
    category: "certificates",
    categoryLabel: "Certificates & IDs",
    formatBadge: "CR80 PVC Single",
    formatVariant: "sky",
    description:
      "Bulk student identity card generator with photo, Code 128 barcode, father name, and direct single CR80 PVC printing.",
    href: "/generate/id-card",
    icon: Contact,
    iconBg: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30",
    accentBorder: "hover:border-blue-500/50 hover:shadow-blue-500/10",
    gradientGlow: "from-blue-500/10 via-transparent to-transparent",
    highlights: ["Single-Sided CR80 PVC", "Class & Section Batching", "Code 128 Barcode Engine", "Database Auto-Fill"],
  },
  {
    id: "transfer-certificate",
    title: "Transfer Certificate (TC)",
    category: "certificates",
    categoryLabel: "Certificates",
    formatBadge: "A4 Portrait",
    formatVariant: "sky",
    description:
      "Official school-leaving clearance & transfer certificate compliant with board directives, reason for transfer, and character evaluation.",
    href: "/generate/transfer-certificate",
    trackerHref: "/generate/certificate-tracker?type=transfer-certificate",
    icon: FileBadge2,
    iconBg: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30",
    accentBorder: "hover:border-blue-500/50 hover:shadow-blue-500/10",
    gradientGlow: "from-blue-500/10 via-transparent to-transparent",
    highlights: ["WBBSE/WBCHSE Format", "Clearance Status Check", "Auto Student Status Update", "Zero Margin Full-Bleed"],
  },
  {
    id: "pass-certificate",
    title: "Pass Out Certificate",
    category: "certificates",
    categoryLabel: "Certificates",
    formatBadge: "A4 Landscape",
    formatVariant: "purple",
    description:
      "High school graduation & completion certificate highlighting division/grade, passing year, board credentials, and institutional seal.",
    href: "/generate/pass-certificate",
    trackerHref: "/generate/certificate-tracker?type=pass-certificate",
    icon: GraduationCap,
    iconBg: "bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30",
    accentBorder: "hover:border-purple-500/50 hover:shadow-purple-500/10",
    gradientGlow: "from-purple-500/10 via-transparent to-transparent",
    highlights: ["Board Roll & Year Verification", "Academic Honors & Division", "Official Seal & Watermark", "A4 Landscape Presentation"],
  },
  {
    id: "kanyashree-certificate",
    title: "Kanyashree Certificate",
    category: "certificates",
    categoryLabel: "Certificates",
    formatBadge: "A4 Portrait",
    formatVariant: "default",
    description:
      "Specialized institutional declaration & certificate for West Bengal Kanyashree Prakalpa (K1/K2) applicants with auto-populated beneficiary IDs.",
    href: "/generate/kanyashree",
    trackerHref: "/generate/certificate-tracker?type=kanyashree",
    icon: FileCheck2,
    iconBg: "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30",
    accentBorder: "hover:border-rose-500/50 hover:shadow-rose-500/10",
    gradientGlow: "from-rose-500/10 via-transparent to-transparent",
    highlights: ["Kanyashree Beneficiary ID Auto-fetch", "Govt Declaration Clause", "Institutional Seal & Signatures", "Zero-Waste Layout"],
  },
  {
    id: "cce-marksheet",
    title: "CCE Marksheet Generator",
    category: "exams",
    categoryLabel: "Examinations",
    formatBadge: "A4 Portrait",
    formatVariant: "sky",
    description:
      "Continuous & Comprehensive Evaluation academic report cards with term-wise formative and summative breakdown, grades, and teacher remarks.",
    href: "/generate/marksheet",
    icon: BookOpen,
    iconBg: "bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border-cyan-500/30",
    accentBorder: "hover:border-cyan-500/50 hover:shadow-cyan-500/10",
    gradientGlow: "from-cyan-500/10 via-transparent to-transparent",
    highlights: ["Formative + Summative Matrix", "Automatic Grade Computation", "Bulk Class Printing", "Subject Teacher Remarks"],
  },
  {
    id: "tabulation-sheet",
    title: "Tabulation Sheet",
    category: "exams",
    categoryLabel: "Examinations",
    formatBadge: "A4 Landscape",
    formatVariant: "emerald",
    description:
      "Class-wide marks ledger summarizing all students across all academic subjects with grand totals, percentages, merit ranks, and pass/fail summary.",
    href: "/generate/tabulation",
    icon: ClipboardList,
    iconBg: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
    accentBorder: "hover:border-emerald-500/50 hover:shadow-emerald-500/10",
    gradientGlow: "from-emerald-500/10 via-transparent to-transparent",
    highlights: ["Class-wide Merit Ranking", "Subject Matrix Breakdown", "Landscape Master Grid", "Exam Board Ready"],
  },
  {
    id: "ems-materials",
    title: "EMS Suite (Admit & Seating)",
    category: "exams",
    categoryLabel: "Examinations",
    formatBadge: "Multi-Format",
    formatVariant: "purple",
    description:
      "Complete examination management pack: generate student photo admit cards with QR, examination hall attendance sheets, and desk seating stickers.",
    href: "/ems",
    icon: Layers,
    iconBg: "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/30",
    accentBorder: "hover:border-indigo-500/50 hover:shadow-indigo-500/10",
    gradientGlow: "from-indigo-500/10 via-transparent to-transparent",
    highlights: ["Photo Admit Cards with QR", "Hall Attendance Sign-sheets", "Desk Seating Roll Tags", "Exam Timetable Integration"],
  },
  {
    id: "admission-form",
    title: "Admission Form Studio",
    category: "admissions",
    categoryLabel: "Admissions",
    formatBadge: "A4 Multi-page",
    formatVariant: "amber",
    description:
      "Standard institutional student admission application forms for Class V to XII with student biodata, subject choices, and parent declarations.",
    href: "/generate/admission-form",
    icon: School,
    iconBg: "bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30",
    accentBorder: "hover:border-orange-500/50 hover:shadow-orange-500/10",
    gradientGlow: "from-orange-500/10 via-transparent to-transparent",
    highlights: ["Class V-XII Curated Presets", "HS Subject Choice Sections", "Parent Undertaking Slip", "Document Checklist Grid"],
  },
  {
    id: "admission-invoice",
    title: "Admission & Fee Invoices",
    category: "admissions",
    categoryLabel: "Admissions",
    formatBadge: "A5 2-Part",
    formatVariant: "emerald",
    description:
      "Instant official fee challans and admission invoices featuring itemized fee heads, student copy & school counter copy on a single page.",
    href: "/generate/invoice",
    icon: Receipt,
    iconBg: "bg-teal-500/15 text-teal-600 dark:text-teal-400 border-teal-500/30",
    accentBorder: "hover:border-teal-500/50 hover:shadow-teal-500/10",
    gradientGlow: "from-teal-500/10 via-transparent to-transparent",
    highlights: ["Dual Student & Counter Copy", "Itemized Fee Head Breakdown", "Single & Bulk Batch Print", "Bank / Counter Stamp Ready"],
  },
];

/**
 * Clean, interactive Info Popover (shows description + key highlights on hover or click)
 */
function CardInfoPopover({
  module,
  align = "right",
}: {
  module: GeneratorModule;
  align?: "left" | "right";
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  return (
    <div
      ref={containerRef}
      className="relative inline-flex items-center"
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      <button
        type="button"
        aria-label="View specifications & features"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsOpen((v) => !v);
        }}
        className={cn(
          "h-7 w-7 rounded-full inline-flex items-center justify-center text-muted-foreground/60 hover:text-foreground hover:bg-accent/80 active:scale-95 transition-all cursor-pointer",
          isOpen && "text-primary bg-primary/10 ring-1 ring-primary/30"
        )}
        title="View details"
      >
        <Info className="h-3.5 w-3.5" />
      </button>

      {isOpen && (
        <div
          role="tooltip"
          className={cn(
            "absolute top-full mt-2 z-50 w-72 max-w-[calc(100vw-3rem)] p-3.5 rounded-2xl bg-popover/98 backdrop-blur-md text-popover-foreground text-xs shadow-2xl border border-border/80 animate-in fade-in zoom-in-95 duration-150 pointer-events-auto space-y-2.5",
            align === "right" ? "right-0" : "left-0"
          )}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border/50 pb-2">
            <span className="font-bold text-foreground text-xs">{module.title}</span>
            <Badge variant="outline" className="text-[9px] px-1.5 py-0">
              {module.formatBadge}
            </Badge>
          </div>

          {/* Description */}
          <p className="text-muted-foreground text-[11px] leading-relaxed">
            {module.description}
          </p>

          {/* Features */}
          <div className="space-y-1.5 pt-1 border-t border-border/40">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Key Specifications:
            </p>
            <div className="grid grid-cols-1 gap-1">
              {module.highlights.map((h, i) => (
                <div key={i} className="flex items-center gap-1.5 text-[11px] text-foreground/90">
                  <Check className="h-3 w-3 text-emerald-500 shrink-0" />
                  <span className="truncate">{h}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Arrow */}
          <div
            className={cn(
              "absolute -top-1.5 border-4 border-transparent border-b-border",
              align === "right" ? "right-2.5" : "left-2.5"
            )}
          />
        </div>
      )}
    </div>
  );
}

export default function GenerateHubPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>("all");
  const [stats, setStats] = useState<CertificateStats | null>(null);
  const [recentCerts, setRecentCerts] = useState<DBCertificateRow[]>([]);
  const [isLoadingStats, setIsLoadingStats] = useState(true);

  // Quick verify inline state
  const [verifyTerm, setVerifyTerm] = useState("");
  const [isQRScannerOpen, setIsQRScannerOpen] = useState(false);
  const [verifyResult, setVerifyResult] = useState<{
    searched: boolean;
    found: boolean;
    cert?: DBCertificateRow;
    message?: string;
  } | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  // Load tracker stats & recent certificates
  useEffect(() => {
    async function loadData() {
      setIsLoadingStats(true);
      try {
        const localStats = getLocalCertificateStats();
        const localList = getLocalCachedCertificates();
        if (localStats) setStats(localStats);
        if (localList.length > 0) setRecentCerts(localList.slice(0, 5));

        const statsRes = await fetch("/api/certificates/stats");
        if (statsRes.ok) {
          const remoteStats = await statsRes.json();
          setStats(remoteStats);
        }

        const certsRes = await fetch("/api/certificates?limit=5");
        if (certsRes.ok) {
          const remoteCerts = await certsRes.json();
          if (Array.isArray(remoteCerts) && remoteCerts.length > 0) {
            setRecentCerts(remoteCerts);
          }
        }
      } catch (err) {
        console.warn("Using offline certificate statistics fallback:", err);
      } finally {
        setIsLoadingStats(false);
      }
    }

    loadData();
  }, []);

  // Reusable verification executor
  const executeVerification = async (termToVerify: string) => {
    const cleanTerm = termToVerify.trim().toUpperCase();
    if (!cleanTerm) return;

    setIsVerifying(true);
    setVerifyResult(null);

    try {
      const cached = getLocalCachedCertificates();
      const localMatch = cached.find(
        (c) =>
          c.certificate_no.toUpperCase() === cleanTerm ||
          (c.student_id && c.student_id.toUpperCase() === cleanTerm)
      );

      if (localMatch) {
        setVerifyResult({
          searched: true,
          found: true,
          cert: localMatch,
          message: "Matched in verified certificate cache.",
        });
        setIsVerifying(false);
        return;
      }

      const res = await fetch(`/api/certificates/verify?number=${encodeURIComponent(cleanTerm)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.valid && data.certificate) {
          setVerifyResult({
            searched: true,
            found: true,
            cert: data.certificate,
            message: "Official record verified in school database registry.",
          });
        } else {
          setVerifyResult({
            searched: true,
            found: false,
            message: data.message || "No verified certificate found with this serial.",
          });
        }
      } else {
        setVerifyResult({
          searched: true,
          found: false,
          message: "Certificate serial not registered or unverified.",
        });
      }
    } catch {
      setVerifyResult({
        searched: true,
        found: false,
        message: "Verification service temporarily unreachable.",
      });
    } finally {
      setIsVerifying(false);
    }
  };

  // Quick verify form submit handler
  const handleQuickVerify = (e: React.FormEvent) => {
    e.preventDefault();
    executeVerification(verifyTerm);
  };

  // QR scan success handler
  const handleScanSuccess = (extractedCode: string) => {
    setVerifyTerm(extractedCode);
    executeVerification(extractedCode);
  };

  // Filter modules
  const filteredModules = useMemo(() => {
    return GENERATOR_MODULES.filter((mod) => {
      const matchesCategory =
        selectedCategory === "all" || mod.category === selectedCategory;

      const q = searchQuery.toLowerCase().trim();
      if (!q) return matchesCategory;

      const matchesSearch =
        mod.title.toLowerCase().includes(q) ||
        mod.description.toLowerCase().includes(q) ||
        mod.categoryLabel.toLowerCase().includes(q) ||
        mod.formatBadge.toLowerCase().includes(q) ||
        mod.highlights.some((h) => h.toLowerCase().includes(q));

      return matchesCategory && matchesSearch;
    });
  }, [searchQuery, selectedCategory]);

  const currentYear = new Date().getFullYear();

  return (
    <div className="p-3.5 sm:p-6 space-y-4 sm:space-y-5 max-w-7xl mx-auto">
      {/* 1. Fresh & Clean Header */}
      <div className="rounded-2xl sm:rounded-3xl bg-gradient-to-r from-purple-600/10 via-indigo-600/10 to-blue-600/10 border border-purple-500/20 p-3.5 sm:p-5 shadow-xs relative overflow-hidden">
        <div className="absolute right-0 top-0 -mt-10 -mr-10 h-48 w-48 rounded-full bg-gradient-to-br from-purple-500/15 to-transparent blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 relative z-10">
          <div className="space-y-0.5">
            <h1 className="text-lg sm:text-2xl font-extrabold tracking-tight text-foreground">
              Document & Certificate Generator
            </h1>
          </div>

          {/* Clean Action Buttons (Full width 2-column grid on mobile phones) */}
          <div className="grid grid-cols-2 gap-2 w-full sm:w-auto sm:flex sm:items-center">
            <Link
              href="/generate/certificate-tracker"
              className="flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-3 py-2 text-xs font-semibold text-white hover:from-emerald-700 hover:to-teal-700 shadow-xs transition-all active:scale-95 text-center"
            >
              <ShieldCheck className="h-4 w-4 shrink-0" />
              <span className="truncate">Tracker</span>
            </Link>
            <Link
              href="/admission"
              className="flex items-center justify-center gap-1.5 rounded-xl border border-border bg-background/80 px-3 py-2 text-xs font-semibold hover:bg-muted text-foreground transition-all active:scale-95 text-center"
            >
              <GraduationCap className="h-4 w-4 text-primary shrink-0" />
              <span className="truncate">Admission Portal</span>
            </Link>
          </div>
        </div>
      </div>

      {/* 2. Compact Tracker & Quick Verification Strip */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4">
        {/* Tracker Overview (7 Cols) */}
        <div className="lg:col-span-7 rounded-2xl border bg-card/90 p-3.5 sm:p-4 shadow-2xs space-y-2.5 sm:space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 ring-1 ring-purple-500/20">
                <ShieldCheck className="h-4 w-4" />
              </div>
              <h2 className="text-xs sm:text-sm font-bold tracking-tight text-foreground">
                Certificate Issuance Tracker
              </h2>
            </div>
            <Link
              href="/generate/certificate-tracker"
              className="text-xs font-semibold text-primary hover:underline flex items-center gap-1 group"
            >
              Full Registry
              <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="rounded-xl border bg-background/50 p-2 sm:p-2.5">
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Total</p>
              <p className="text-base sm:text-lg font-black text-foreground mt-0.5">
                {isLoadingStats ? "..." : stats?.totalCertificates ?? recentCerts.length ?? 0}
              </p>
            </div>

            <div className="rounded-xl border bg-background/50 p-2 sm:p-2.5">
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Character</p>
              <p className="text-base sm:text-lg font-black text-amber-600 dark:text-amber-400 mt-0.5">
                {isLoadingStats ? "..." : stats?.byType?.character ?? 0}
              </p>
            </div>

            <div className="rounded-xl border bg-background/50 p-2 sm:p-2.5">
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Transfer (TC)</p>
              <p className="text-base sm:text-lg font-black text-blue-600 dark:text-blue-400 mt-0.5">
                {isLoadingStats ? "..." : stats?.byType?.transfer ?? 0}
              </p>
            </div>

            <div className="rounded-xl border bg-background/50 p-2 sm:p-2.5">
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Pass / Kanya</p>
              <p className="text-base sm:text-lg font-black text-purple-600 dark:text-purple-400 mt-0.5">
                {isLoadingStats
                  ? "..."
                  : (stats?.byType?.pass ?? 0) + (stats?.byType?.kanyashree ?? 0)}
              </p>
            </div>
          </div>

          {/* Clean recent issuances pills (Touch swipe on phone) */}
          {recentCerts.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto pt-0.5 scrollbar-none touch-pan-x -mx-1 px-1">
              <span className="text-[10px] font-semibold text-muted-foreground shrink-0">Recent:</span>
              {recentCerts.slice(0, 4).map((cert) => (
                <Link
                  key={cert.id}
                  href={`/generate/certificate-tracker?search=${encodeURIComponent(cert.certificate_no)}`}
                  className="inline-flex items-center gap-1 rounded-md border bg-muted/30 hover:bg-muted px-2 py-0.5 text-[10px] text-foreground transition-all shrink-0 active:scale-95"
                >
                  <span className="font-mono font-bold text-primary">{cert.certificate_no}</span>
                  <span className="text-muted-foreground">·</span>
                  <span className="truncate max-w-[85px] sm:max-w-[110px]">{cert.student_name}</span>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Quick Verification (5 Cols) */}
        <div className="lg:col-span-5 rounded-2xl border bg-card/90 p-3.5 sm:p-4 shadow-2xs flex flex-col justify-between space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="p-1.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 ring-1 ring-blue-500/20 shrink-0">
                <QrCode className="h-4 w-4" />
              </div>
              <h2 className="text-xs sm:text-sm font-bold tracking-tight text-foreground truncate">
                Quick Verification
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setIsQRScannerOpen(true)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-primary/10 hover:bg-primary/15 text-primary text-[11px] font-semibold transition-all cursor-pointer shadow-2xs active:scale-95 shrink-0"
            >
              <QrCode className="h-3.5 w-3.5" />
              QR Scanner
            </button>
          </div>

          <form onSubmit={handleQuickVerify} className="space-y-2">
            <div className="flex items-center gap-1.5">
              <div className="relative flex-1 min-w-0">
                <Hash className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Certificate Serial (e.g. CC-2026-001)"
                  value={verifyTerm}
                  onChange={(e) => setVerifyTerm(e.target.value)}
                  className="pl-8 text-xs font-mono uppercase h-9 rounded-xl w-full"
                />
              </div>
              <Button
                type="submit"
                disabled={isVerifying || !verifyTerm.trim()}
                size="sm"
                className="h-9 px-3 sm:px-3.5 rounded-xl text-xs font-semibold gap-1 shrink-0 active:scale-95"
              >
                {isVerifying ? (
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Search className="h-3.5 w-3.5" />
                )}
                Verify
              </Button>
            </div>

            {verifyResult && (
              <div
                className={cn(
                  "px-2.5 py-1.5 rounded-xl border text-[11px] flex items-center justify-between gap-2 animate-in fade-in-50",
                  verifyResult.found
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-300"
                    : "bg-rose-500/10 border-rose-500/30 text-rose-800 dark:text-rose-300"
                )}
              >
                <div className="flex items-center gap-1.5 truncate">
                  {verifyResult.found ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  ) : (
                    <AlertCircle className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400 shrink-0" />
                  )}
                  <span className="font-semibold truncate">
                    {verifyResult.found
                      ? `${verifyResult.cert?.student_name} (${verifyResult.cert?.certificate_no})`
                      : verifyResult.message}
                  </span>
                </div>
                {verifyResult.cert && (
                  <Link
                    href={`/generate/certificate-tracker?search=${encodeURIComponent(verifyResult.cert.certificate_no)}`}
                    className="shrink-0 font-bold underline hover:opacity-80"
                  >
                    Details
                  </Link>
                )}
              </div>
            )}
          </form>
        </div>
      </div>

      {/* 3. Clean Filter Tabs & Search Bar (Touch scroll on phone) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-0.5">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 pt-0.5 scrollbar-none touch-pan-x -mx-3.5 px-3.5 sm:mx-0 sm:px-0">
          <button
            type="button"
            onClick={() => setSelectedCategory("all")}
            className={cn(
              "px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 cursor-pointer active:scale-95 whitespace-nowrap",
              selectedCategory === "all"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
          >
            All ({GENERATOR_MODULES.length})
          </button>
          <button
            type="button"
            onClick={() => setSelectedCategory("certificates")}
            className={cn(
              "px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 cursor-pointer active:scale-95 whitespace-nowrap",
              selectedCategory === "certificates"
                ? "bg-amber-600 text-white shadow-xs"
                : "bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
          >
            Certificates (4)
          </button>
          <button
            type="button"
            onClick={() => setSelectedCategory("exams")}
            className={cn(
              "px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 cursor-pointer active:scale-95 whitespace-nowrap",
              selectedCategory === "exams"
                ? "bg-cyan-600 text-white shadow-xs"
                : "bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
          >
            Examinations (3)
          </button>
          <button
            type="button"
            onClick={() => setSelectedCategory("admissions")}
            className={cn(
              "px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 cursor-pointer active:scale-95 whitespace-nowrap",
              selectedCategory === "admissions"
                ? "bg-teal-600 text-white shadow-xs"
                : "bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
          >
            Admissions (2)
          </button>
          <button
            type="button"
            onClick={() => setSelectedCategory("tracker")}
            className={cn(
              "px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 cursor-pointer active:scale-95 whitespace-nowrap",
              selectedCategory === "tracker"
                ? "bg-emerald-600 text-white shadow-xs"
                : "bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
          >
            Tracker (1)
          </button>
        </div>

        {/* Live Filter Input */}
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search tools..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 text-xs h-9 rounded-xl bg-card w-full"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs p-1"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* 4. Ultra-Clean Box-by-Box Grid */}
      {filteredModules.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-8 text-center space-y-2">
          <p className="text-sm font-bold text-foreground">No generator tools matched</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSearchQuery("");
              setSelectedCategory("all");
            }}
          >
            Reset Filters
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {filteredModules.map((mod) => {
            const IconComponent = mod.icon;
            return (
              <div
                key={mod.id}
                className={cn(
                  "group relative rounded-2xl border bg-card/90 p-3.5 sm:p-4 flex flex-col justify-between transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md overflow-visible",
                  mod.accentBorder,
                  mod.isFeatured && "ring-1 ring-emerald-500/25"
                )}
              >
                {/* Background Hover Accent */}
                <div
                  className={cn(
                    "absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none rounded-2xl",
                    mod.gradientGlow
                  )}
                />

                <div className="relative z-10 space-y-2.5 sm:space-y-3">
                  {/* Top: Icon + Format Badge + Info Popover */}
                  <div className="flex items-center justify-between">
                    <div
                      className={cn(
                        "p-2 sm:p-2.5 rounded-xl border group-hover:scale-105 transition-transform duration-200 shrink-0",
                        mod.iconBg
                      )}
                    >
                      <IconComponent className="h-4.5 w-4.5 sm:h-5 sm:w-5" />
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Badge variant={mod.formatVariant || "outline"} className="text-[10px] px-2 py-0.5">
                        {mod.formatBadge}
                      </Badge>

                      {/* Info Icon Button -> Popover */}
                      <CardInfoPopover module={mod} align="right" />
                    </div>
                  </div>

                  {/* Title & Category */}
                  <div>
                    <h3 className="text-sm font-bold tracking-tight text-foreground group-hover:text-primary transition-colors flex items-center gap-1.5">
                      {mod.title}
                      {mod.isFeatured && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                          Active
                        </span>
                      )}
                    </h3>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {mod.categoryLabel}
                    </p>
                  </div>
                </div>

                {/* Bottom Action Footer */}
                <div className="relative z-10 pt-2.5 mt-2.5 sm:pt-3 sm:mt-3 border-t border-border/50 flex items-center justify-between gap-2">
                  {mod.trackerHref ? (
                    <Link
                      href={mod.trackerHref}
                      className="text-[11px] font-semibold text-muted-foreground hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors flex items-center gap-1 py-1 px-1.5 rounded-lg active:scale-95"
                    >
                      <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                      Track
                    </Link>
                  ) : (
                    <span className="text-[10px] font-medium text-muted-foreground/70 px-1">
                      Standard Print
                    </span>
                  )}

                  <Link
                    href={mod.href}
                    className="inline-flex items-center gap-1 rounded-xl bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-all active:scale-95 shadow-2xs"
                  >
                    Generate Now
                    <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 5. Minimal Zero-Waste Print Guidance Strip (Responsive stack on phone) */}
      <div className="rounded-xl border bg-muted/20 px-3.5 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-muted-foreground">
        <div className="flex items-center gap-2">
          <Printer className="h-3.5 w-3.5 text-primary shrink-0" />
          <span>
            <strong>Print Standard:</strong> Margins: None • Scale: 100% • Background Graphics: ON
          </span>
        </div>
        <Link
          href="/generate/certificate-tracker"
          className="text-primary font-medium hover:underline flex items-center gap-1 self-start sm:self-auto"
        >
          View Full Audit Ledger <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      {/* Interactive QR Scanner Modal */}
      <QRScannerModal
        open={isQRScannerOpen}
        onOpenChange={setIsQRScannerOpen}
        onScanSuccess={handleScanSuccess}
      />
    </div>
  );
}
