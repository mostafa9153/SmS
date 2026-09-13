"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { getStudents } from "@/lib/data/students";
import { getAdmissionApplications } from "@/lib/data/admission";
import {
  GraduationCap,
  UserPlus,
  RefreshCw,
  FileCheck2,
  Printer,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Clock,
  Users,
  Layers,
  FileText,
  BadgeCheck,
  TrendingUp,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";

type PortalFilter = "all" | "new" | "re";

function CardInfoHint({ text, align = "left" }: { text: string; align?: "left" | "right" }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
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
      <span
        role="button"
        tabIndex={0}
        aria-label="More information"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsOpen((prev) => !prev);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            e.stopPropagation();
            setIsOpen((prev) => !prev);
          }
        }}
        className={cn(
          "h-5 w-5 rounded-full inline-flex items-center justify-center text-muted-foreground/60 hover:text-foreground hover:bg-muted transition-all cursor-pointer",
          isOpen && "text-foreground bg-muted ring-1 ring-border"
        )}
        title="More information"
      >
        <Info className="h-3.5 w-3.5" />
      </span>

      {isOpen && (
        <div
          role="tooltip"
          className={cn(
            "absolute top-full mt-2 z-50 w-64 sm:w-72 p-3 rounded-xl bg-popover/95 backdrop-blur-md text-popover-foreground text-xs leading-relaxed shadow-xl border border-border animate-in fade-in zoom-in-95 duration-150 pointer-events-auto font-normal",
            align === "right" ? "right-0" : "left-0"
          )}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          <div className="flex items-start gap-2">
            <Info className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
            <p className="text-muted-foreground leading-normal">{text}</p>
          </div>
          <div
            className={cn(
              "absolute -top-1.5 border-4 border-transparent border-b-border",
              align === "right" ? "right-2" : "left-2"
            )}
          />
          <div
            className={cn(
              "absolute -top-1 border-4 border-transparent border-b-popover",
              align === "right" ? "right-2" : "left-2"
            )}
          />
        </div>
      )}
    </div>
  );
}

export default function AdmissionHubPage() {
  const [activeFilter, setActiveFilter] = useState<PortalFilter>("all");

  const { data: students = [], isLoading: loadingStudents } = useQuery({
    queryKey: ["students"],
    queryFn: () => getStudents("summary"),
    staleTime: 5 * 60 * 1000,
  });

  const { data: applications = [], isLoading: loadingApps } = useQuery({
    queryKey: ["admission-applications"],
    queryFn: () => getAdmissionApplications(),
    staleTime: 60 * 1000,
  });

  // Calculate statistics
  const pendingApps = applications.filter((a) => a.status === "pending");
  const admittedApps = applications.filter((a) => a.status === "admitted");

  const continuingStudents = students.filter((s) => s.currentStatus === "Continuing");
  const reAdmittedStudents = continuingStudents.filter(
    (s) => s.reAdmissionStatus === "admitted"
  );
  const notAdmittedStudents = continuingStudents.filter(
    (s) => s.reAdmissionStatus === "not_admitted"
  );
  const pendingReAdmitStudents = continuingStudents.filter(
    (s) => !s.reAdmissionStatus || s.reAdmissionStatus === "pending"
  );

  const queuedForInvoice = continuingStudents.filter((s) => s.isInvoiceQueued);
  const admissionRate =
    continuingStudents.length > 0
      ? Math.round((reAdmittedStudents.length / continuingStudents.length) * 100)
      : 0;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-5">
        <div>
          <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider mb-1">
            <GraduationCap className="h-4 w-4 text-orange-500" />
            <span>Student Lifecycle &amp; Enrollment Hub</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
            Admission &amp; Re-admission Portal
          </h1>
        </div>

        {/* Header Action Shortcuts */}
        <div className="flex items-center gap-2">
          <Link
            href="/admission/new"
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold shadow-xs transition-all active:scale-95 cursor-pointer"
          >
            <UserPlus className="h-4 w-4" />
            <span>New Admission</span>
          </Link>
          <Link
            href="/admission/re-admission"
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs sm:text-sm font-bold shadow-xs transition-all active:scale-95 cursor-pointer"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Re-admission</span>
          </Link>
        </div>
      </div>

      {/* Overview Metrics: Color-coded to pair with New Admission (Emerald) vs Re-admission (Orange/Purple) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        {/* Metric 1: New Admission Pending */}
        <div className="bg-card border border-emerald-500/20 rounded-2xl p-4 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
              New: Pending Apps
            </span>
            <span className="p-1.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Clock className="h-4 w-4" />
            </span>
          </div>
          <p className="text-2xl font-black mt-2 text-foreground">
            {loadingApps ? "..." : pendingApps.length}
          </p>
        </div>

        {/* Metric 2: New Admission Admitted */}
        <div className="bg-card border border-emerald-500/20 rounded-2xl p-4 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
              New: Confirmed 2026
            </span>
            <span className="p-1.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-4 w-4" />
            </span>
          </div>
          <p className="text-2xl font-black mt-2 text-foreground">
            {loadingApps ? "..." : admittedApps.length}
          </p>
        </div>

        {/* Metric 3: Re-admission Continuing */}
        <div className="bg-card border border-orange-500/20 rounded-2xl p-4 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-orange-700 dark:text-orange-400">
              Re-admitted 2026
            </span>
            <span className="p-1.5 rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400">
              <RefreshCw className="h-4 w-4" />
            </span>
          </div>
          <p className="text-2xl font-black mt-2 text-foreground">
            {loadingStudents ? "..." : reAdmittedStudents.length}
          </p>
        </div>

        {/* Metric 4: Re-admission Invoices */}
        <div className="bg-card border border-purple-500/20 rounded-2xl p-4 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-purple-700 dark:text-purple-400">
              Invoice Print Queue
            </span>
            <span className="p-1.5 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <Printer className="h-4 w-4" />
            </span>
          </div>
          <p className="text-2xl font-black mt-2 text-foreground">
            {loadingStudents ? "..." : queuedForInvoice.length}
          </p>
        </div>
      </div>

      {/* Practical Quick-Filter Toggle Bar */}
      <div className="flex items-center justify-between gap-3 bg-muted/40 p-1.5 rounded-2xl border">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setActiveFilter("all")}
            className={cn(
              "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer",
              activeFilter === "all"
                ? "bg-card text-foreground shadow-xs border"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            All Portals
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter("new")}
            className={cn(
              "flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer",
              activeFilter === "new"
                ? "bg-emerald-600 text-white shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <span className="h-2 w-2 rounded-full bg-emerald-400 inline-block" />
            <span>New Admission Hub</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-700/50 text-white font-mono">
              3
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter("re")}
            className={cn(
              "flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer",
              activeFilter === "re"
                ? "bg-orange-500 text-white shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <span className="h-2 w-2 rounded-full bg-orange-300 inline-block" />
            <span>Re-admission Hub</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-orange-700/50 text-white font-mono">
              3
            </span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* PORTAL 1: NEW ADMISSION HUB (EMERALD THEME • ISOLATED STAGING PLATFORM)  */}
      {/* ========================================================================= */}
      {(activeFilter === "all" || activeFilter === "new") && (
        <div className="rounded-3xl border-2 border-emerald-500/20 bg-gradient-to-br from-emerald-500/[0.03] via-card to-card p-5 sm:p-6 shadow-xs space-y-4">
          {/* Section Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-emerald-500/15 pb-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold shrink-0">
                <UserPlus className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg font-black tracking-tight text-foreground">
                    New Admission Portal
                  </h2>
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/25">
                    External Applicants • Isolated Staging
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Link
                href="/admission/new"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                <span>+ Online Application</span>
              </Link>
              <Link
                href="/admission/applications"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-card border border-emerald-500/30 hover:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-xs font-bold transition-all cursor-pointer"
              >
                <span>Verify Desk ({pendingApps.length})</span>
              </Link>
            </div>
          </div>

          {/* Cards Grid: 3 Practical Workflow Steps */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Card 1: Online Form */}
            <Link
              href="/admission/new"
              className="group bg-card hover:bg-emerald-500/[0.04] border border-border/80 hover:border-emerald-500/40 rounded-2xl p-5 transition-all duration-200 shadow-xs hover:shadow-md flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3.5">
                  <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                    <UserPlus className="h-5 w-5" />
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                    Step 1A • Digital Apply
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <h3 className="text-sm sm:text-base font-bold text-foreground group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                    Online Admission Form
                  </h3>
                  <CardInfoHint
                    text="Direct online candidate registration. Submit student details online to instantly generate an official Application Receipt slip."
                    align="left"
                  />
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                <span>Open Online Form</span>
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
              </div>
            </Link>

            {/* Card 2: Offline Form Hub & AI Scanner */}
            <Link
              href="/admission/new/offline"
              className="group bg-card hover:bg-purple-500/[0.04] border border-border/80 hover:border-purple-500/40 rounded-2xl p-5 transition-all duration-200 shadow-xs hover:shadow-md flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3.5">
                  <div className="h-10 w-10 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
                    <Printer className="h-5 w-5" />
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-700 dark:text-purple-400 border border-purple-500/20 flex items-center gap-1">
                    <Sparkles className="h-2.5 w-2.5" />
                    <span>Step 1B • Print &amp; OCR</span>
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <h3 className="text-sm sm:text-base font-bold text-foreground group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                    Offline Form &amp; AI Scanner
                  </h3>
                  <CardInfoHint
                    text="Generate blank printable forms with auto-serial numbers (Class V–IX & XI), or scan physically filled forms with Gemini AI."
                    align="left"
                  />
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between text-xs font-semibold text-purple-600 dark:text-purple-400">
                <span>Open Offline Center</span>
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
              </div>
            </Link>

            {/* Card 3: Application Verification Desk */}
            <Link
              href="/admission/applications"
              className="group bg-card hover:bg-blue-500/[0.04] border border-border/80 hover:border-blue-500/40 rounded-2xl p-5 transition-all duration-200 shadow-xs hover:shadow-md flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3.5">
                  <div className="h-10 w-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                    <FileCheck2 className="h-5 w-5" />
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20">
                    Step 2 • Verify &amp; Enroll
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <h3 className="text-sm sm:text-base font-bold text-foreground group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    Application Verification Desk
                  </h3>
                  <CardInfoHint
                    text="Verify receipt copies when parents submit fees at school. Assign Section & Roll to confirm and officially enroll into the Student Register."
                    align="right"
                  />
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between text-xs font-semibold text-blue-600 dark:text-blue-400">
                <span>Review Pending ({pendingApps.length})</span>
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
              </div>
            </Link>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PORTAL 2: RE-ADMISSION HUB (ORANGE THEME • CONTINUING STUDENT ROLLOVER)   */}
      {/* ========================================================================= */}
      {(activeFilter === "all" || activeFilter === "re") && (
        <div className="rounded-3xl border-2 border-orange-500/20 bg-gradient-to-br from-orange-500/[0.03] via-card to-card p-5 sm:p-6 shadow-xs space-y-4">
          {/* Section Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-orange-500/15 pb-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-orange-500/15 text-orange-600 dark:text-orange-400 flex items-center justify-center font-bold shrink-0">
                <RefreshCw className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg font-black tracking-tight text-foreground">
                    Student Re-admission Portal
                  </h2>
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-orange-500/10 text-orange-700 dark:text-orange-400 border border-orange-500/25">
                    Continuing Students • Session 2026 Rollover
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Link
                href="/admission/re-admission"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                <span>Class Roster Desk</span>
              </Link>
              <Link
                href="/admission/invoices"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-card border border-purple-500/30 hover:bg-purple-500/10 text-purple-700 dark:text-purple-300 text-xs font-bold transition-all cursor-pointer"
              >
                <Printer className="h-3.5 w-3.5" />
                <span>Batch Invoices ({queuedForInvoice.length})</span>
              </Link>
            </div>
          </div>

          {/* Cards Grid: 3 Practical Operations */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Card 1: Re-admission Desk */}
            <Link
              href="/admission/re-admission"
              className="group bg-card hover:bg-orange-500/[0.04] border border-border/80 hover:border-orange-500/40 rounded-2xl p-5 transition-all duration-200 shadow-xs hover:shadow-md flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3.5">
                  <div className="h-10 w-10 rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center font-bold">
                    <RefreshCw className="h-5 w-5" />
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-700 dark:text-orange-400 border border-orange-500/20">
                    Step 1 • Class Roster
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <h3 className="text-sm sm:text-base font-bold text-foreground group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">
                    Class Re-admission Desk
                  </h3>
                  <CardInfoHint
                    text="Review promoted students class-by-class (Class V–XI). Mark candidates as &quot;Admitted&quot; when they pay fees, or flag as &quot;Not Admitted&quot;."
                    align="left"
                  />
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between text-xs font-semibold text-orange-600 dark:text-orange-400">
                <span>Manage Class Roster</span>
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
              </div>
            </Link>

            {/* Card 2: Bulk Invoices Queue */}
            <Link
              href="/admission/invoices"
              className="group bg-card hover:bg-purple-500/[0.04] border border-border/80 hover:border-purple-500/40 rounded-2xl p-5 transition-all duration-200 shadow-xs hover:shadow-md flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3.5">
                  <div className="h-10 w-10 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
                    <Printer className="h-5 w-5" />
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-700 dark:text-purple-400 border border-purple-500/20">
                    Step 2 • 1-Click Print
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <h3 className="text-sm sm:text-base font-bold text-foreground group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                    Bulk Invoices Queue
                  </h3>
                  <CardInfoHint
                    text="Invoices automatically queued by Class & Section (e.g. Class VI-A, VI-B). Print all student receipts with a single click."
                    align="left"
                  />
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between text-xs font-semibold text-purple-600 dark:text-purple-400">
                <span>Print Ready Batches ({queuedForInvoice.length})</span>
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
              </div>
            </Link>

            {/* Card 3: Session Promotion Progress */}
            <div className="bg-card border border-border/80 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3.5">
                  <div className="h-10 w-10 rounded-xl bg-slate-500/10 text-slate-600 dark:text-slate-400 flex items-center justify-center font-bold">
                    <TrendingUp className="h-5 w-5" />
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-muted text-foreground border">
                    Session 2026
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <h3 className="text-sm sm:text-base font-bold text-foreground">
                    Session Rollover Progress
                  </h3>
                  <CardInfoHint
                    text="Track progress of continuing students transitioning into Session 2026. Monitors fee confirmation and roster completion."
                    align="right"
                  />
                </div>
                <div className="space-y-2 mt-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Completion Rate</span>
                    <span className="font-bold text-foreground">{admissionRate}%</span>
                  </div>
                  <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-orange-500 to-amber-500 rounded-full transition-all duration-500"
                      style={{ width: `${admissionRate}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[11px] text-muted-foreground pt-1">
                    <span>{reAdmittedStudents.length} Confirmed</span>
                    <span>{pendingReAdmitStudents.length} Pending</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between text-xs font-semibold text-muted-foreground">
                <span className="text-[11px] text-muted-foreground">Academic Year: 2026–2027</span>
                <Link
                  href="/admission/re-admission"
                  className="text-orange-600 dark:text-orange-400 hover:underline"
                >
                  View All &rarr;
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
