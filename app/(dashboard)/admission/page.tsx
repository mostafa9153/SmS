"use client";

import React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { getStudents } from "@/lib/data/students";
import { getAdmissionApplications } from "@/lib/data/admission";
import {
  GraduationCap,
  UserPlus,
  RefreshCw,
  Printer,
  ArrowRight,
  CheckCircle2,
  Clock,
  BarChart3,
} from "lucide-react";

export default function AdmissionHubPage() {
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

  const { data: statsData } = useQuery({
    queryKey: ["admission-stats"],
    queryFn: async () => {
      const res = await fetch("/api/admission/stats");
      if (!res.ok) return { reAdmissionVasul: 0, newAdmissionVasul: 0 };
      return res.json();
    },
    staleTime: 60 * 1000,
  });

  // Calculate statistics
  const newApps = applications.filter((a) => a.admissionType === "new");
  const pendingApps = newApps.filter((a) => a.status === "pending");
  const admittedApps = newApps.filter((a) => a.status === "admitted");

  const continuingStudents = students.filter((s) => s.currentStatus === "Continuing");
  const reAdmittedStudents = continuingStudents.filter(
    (s) => s.reAdmissionStatus === "admitted"
  );
  const reAdmissionVasul =
    statsData?.reAdmissionVasul ??
    (reAdmittedStudents.length > 0 ? reAdmittedStudents.length * 600 : 0);

  const queuedForInvoice = continuingStudents.filter((s) => s.isInvoiceQueued);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/50 pb-5">
        <div className="flex items-center gap-3.5">
          <div className="h-12 w-12 rounded-full bg-orange-100 dark:bg-orange-950/60 text-orange-500 dark:text-orange-400 flex items-center justify-center shrink-0">
            <GraduationCap className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight text-foreground">
              Admission &amp; Re-admission Portal
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Online applications &bull; Document verification &bull; Class rollover &bull; Session 2026-27
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:flex sm:items-center gap-2.5 w-full sm:w-auto">
          <Link
            href="/generate/admission-form?tab=tracker"
            className="inline-flex items-center justify-center gap-2 min-h-[44px] px-4 py-2.5 rounded-2xl bg-blue-50 hover:bg-blue-100/80 text-blue-700 dark:bg-blue-950/40 dark:hover:bg-blue-950/60 dark:text-blue-300 border border-blue-200/80 dark:border-blue-800/40 text-xs sm:text-sm font-bold transition-all active:scale-95 shadow-2xs text-center"
          >
            <BarChart3 className="h-4 w-4 shrink-0" />
            <span className="truncate">Form Tracker</span>
          </Link>

          <Link
            href="/admission/invoices"
            className="inline-flex items-center justify-center gap-2 min-h-[44px] px-4 py-2.5 rounded-2xl bg-purple-50 hover:bg-purple-100/80 text-purple-700 dark:bg-purple-950/40 dark:hover:bg-purple-950/60 dark:text-purple-300 border border-purple-200/80 dark:border-purple-800/40 text-xs sm:text-sm font-bold transition-all active:scale-95 shadow-2xs text-center"
          >
            <Printer className="h-4 w-4 shrink-0" />
            <span className="truncate">Invoices Queue</span>
            {queuedForInvoice.length > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-purple-600 text-white text-[11px] font-mono font-bold">
                {queuedForInvoice.length}
              </span>
            )}
          </Link>

          <Link
            href="/admission/new/apply"
            target="_blank"
            className="col-span-2 sm:col-span-1 inline-flex items-center justify-center gap-2 min-h-[44px] px-5 py-2.5 rounded-2xl bg-[#1d4ed8] hover:bg-[#1e40af] text-white text-xs sm:text-sm font-bold transition-all active:scale-95 shadow-xs text-center"
          >
            <UserPlus className="h-4 w-4 shrink-0" />
            <span className="truncate">Online Portal</span>
          </Link>
        </div>
      </div>

      {/* Visual Overview Metrics (NEW: Pending, Confirmed, Re-Admitted, Invoice Print Queue) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        {/* Metric 1: New Admission Pending */}
        <div className="bg-white dark:bg-card border border-emerald-300/80 dark:border-emerald-800/40 rounded-3xl p-4 sm:p-5 shadow-2xs hover:shadow-xs transition-all relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-800 dark:text-emerald-400">
              NEW: PENDING APPS
            </span>
            <span className="p-1.5 rounded-full bg-orange-100/80 text-orange-500 dark:bg-orange-950/50 dark:text-orange-400">
              <Clock className="h-4 w-4" />
            </span>
          </div>
          <p className="text-3xl font-black mt-2.5 text-foreground">
            {loadingApps ? "..." : pendingApps.length}
          </p>
        </div>

        {/* Metric 2: New Admission Admitted */}
        <div className="bg-white dark:bg-card border border-emerald-300/80 dark:border-emerald-800/40 rounded-3xl p-4 sm:p-5 shadow-2xs hover:shadow-xs transition-all relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-800 dark:text-emerald-400">
              NEW: CONFIRMED 2026
            </span>
            <span className="p-1.5 rounded-full bg-emerald-100/80 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">
              <CheckCircle2 className="h-4 w-4" />
            </span>
          </div>
          <p className="text-3xl font-black mt-2.5 text-foreground">
            {loadingApps ? "..." : admittedApps.length}
          </p>
        </div>

        {/* Metric 3: Re-admission Continuing */}
        <div className="bg-white dark:bg-card border border-orange-300/80 dark:border-orange-800/40 rounded-3xl p-4 sm:p-5 shadow-2xs hover:shadow-xs transition-all relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-orange-700 dark:text-orange-400">
              RE-ADMITTED 2026
            </span>
            <span className="p-1.5 rounded-full bg-orange-100/80 text-orange-500 dark:bg-orange-950/50 dark:text-orange-400">
              <RefreshCw className="h-4 w-4" />
            </span>
          </div>
          <div className="flex items-baseline justify-between mt-2.5">
            <p className="text-3xl font-black text-foreground">
              {loadingStudents ? "..." : reAdmittedStudents.length}
            </p>
            <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-orange-50 text-orange-600 border border-orange-200 text-xs font-bold font-mono dark:bg-orange-950/50 dark:border-orange-800/50 dark:text-orange-400">
              <span>Collected: ₹{reAdmissionVasul.toLocaleString("en-IN")}</span>
            </div>
          </div>
        </div>

        {/* Metric 4: Re-admission Invoices */}
        <div className="bg-white dark:bg-card border border-purple-300/80 dark:border-purple-800/40 rounded-3xl p-4 sm:p-5 shadow-2xs hover:shadow-xs transition-all relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-purple-700 dark:text-purple-400">
              INVOICE PRINT QUEUE
            </span>
            <span className="p-1.5 rounded-full bg-purple-100/80 text-purple-600 dark:bg-purple-950/50 dark:text-purple-400">
              <Printer className="h-4 w-4" />
            </span>
          </div>
          <p className="text-3xl font-black mt-2.5 text-foreground">
            {loadingStudents ? "..." : queuedForInvoice.length}
          </p>
        </div>
      </div>

      {/* TWO CLEAN SECTIONS: NEW ADMISSION & RE-ADMISSION */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
        {/* SECTION 1: NEW ADMISSION */}
        <div className="rounded-[2.2rem] border-2 border-emerald-300/80 dark:border-emerald-800/50 bg-white/90 dark:bg-card p-6 sm:p-8 shadow-xs hover:shadow-md transition-all flex flex-col justify-between relative overflow-hidden">
          <div>
            <div className="h-12 w-12 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold mb-5">
              <UserPlus className="h-6 w-6" />
            </div>

            <h2 className="text-2xl font-black text-foreground mb-5 tracking-tight">
              New Admission
            </h2>

            {/* Quick Summary Info */}
            <div className="grid grid-cols-2 gap-4 mb-6 p-4 sm:p-5 rounded-2xl bg-slate-50/90 dark:bg-muted/40 border border-slate-200/80 dark:border-border/60">
              <div>
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-muted-foreground block mb-1">
                  PENDING APPLICATIONS
                </span>
                <span className="text-2xl sm:text-3xl font-black text-foreground">
                  {loadingApps ? "..." : pendingApps.length}
                </span>
              </div>
              <div>
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block mb-1">
                  CONFIRMED ADMITTED
                </span>
                <span className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400">
                  {loadingApps ? "..." : admittedApps.length}
                </span>
              </div>
            </div>
          </div>

          <Link
            href="/admission/new"
            className="w-full inline-flex items-center justify-center gap-2 min-h-[50px] px-6 py-3.5 rounded-2xl bg-[#00875a] hover:bg-[#00744e] active:scale-[0.98] text-white font-extrabold text-base shadow-sm hover:shadow transition-all cursor-pointer"
          >
            <span>Open New Admission</span>
            <ArrowRight className="h-5 w-5" />
          </Link>
        </div>

        {/* SECTION 2: RE-ADMISSION */}
        <div className="rounded-[2.2rem] border-2 border-orange-300/80 dark:border-orange-800/50 bg-white/90 dark:bg-card p-6 sm:p-8 shadow-xs hover:shadow-md transition-all flex flex-col justify-between relative overflow-hidden">
          <div>
            <div className="h-12 w-12 rounded-full bg-orange-100 dark:bg-orange-950/60 text-orange-500 dark:text-orange-400 flex items-center justify-center font-bold mb-5">
              <RefreshCw className="h-6 w-6" />
            </div>

            <h2 className="text-2xl font-black text-foreground mb-5 tracking-tight">
              Re-Admission
            </h2>

            {/* Quick Summary Info */}
            <div className="grid grid-cols-2 gap-4 mb-6 p-4 sm:p-5 rounded-2xl bg-slate-50/90 dark:bg-muted/40 border border-slate-200/80 dark:border-border/60">
              <div>
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-muted-foreground block mb-1">
                  RE-ADMITTED STUDENTS
                </span>
                <span className="text-2xl sm:text-3xl font-black text-foreground">
                  {loadingStudents ? "..." : reAdmittedStudents.length}
                </span>
              </div>
              <div>
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-purple-600 dark:text-purple-400 block mb-1">
                  IN INVOICE QUEUE
                </span>
                <span className="text-2xl sm:text-3xl font-black text-purple-600 dark:text-purple-400">
                  {loadingStudents ? "..." : queuedForInvoice.length}
                </span>
              </div>
            </div>
          </div>

          <Link
            href="/admission/re"
            className="w-full inline-flex items-center justify-center gap-2 min-h-[50px] px-6 py-3.5 rounded-2xl bg-[#ff5722] hover:bg-[#f4511e] active:scale-[0.98] text-white font-extrabold text-base shadow-sm hover:shadow transition-all cursor-pointer"
          >
            <span>Open Re-Admission</span>
            <ArrowRight className="h-5 w-5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
