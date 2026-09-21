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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-5">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center font-bold shrink-0 border border-orange-500/20 shadow-2xs">
            <GraduationCap className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-3xl font-black tracking-tight text-foreground">
              Admission &amp; Re-admission Portal
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Online applications &bull; Document verification &bull; Class rollover &bull; Session 2026-27
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 w-full sm:w-auto">
          <Link
            href="/admission/invoices"
            className="inline-flex items-center justify-center gap-2 min-h-[44px] px-4 py-2.5 rounded-2xl bg-purple-600/10 hover:bg-purple-600/20 text-purple-700 dark:text-purple-300 border border-purple-500/25 text-xs sm:text-sm font-extrabold transition-all active:scale-95 shadow-2xs text-center"
          >
            <Printer className="h-4 w-4 shrink-0" />
            <span className="truncate">Invoices Queue</span>
            {queuedForInvoice.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-md bg-purple-600 text-white text-[10px] font-mono font-bold">
                {queuedForInvoice.length}
              </span>
            )}
          </Link>

          <Link
            href="/admission/new/apply"
            target="_blank"
            className="inline-flex items-center justify-center gap-2 min-h-[44px] px-4 py-2.5 rounded-2xl bg-primary text-primary-foreground text-xs sm:text-sm font-extrabold hover:bg-primary/90 transition-all active:scale-95 shadow-sm text-center"
          >
            <UserPlus className="h-4 w-4 shrink-0" />
            <span className="truncate">Online Portal</span>
          </Link>
        </div>
      </div>

      {/* Visual Overview Metrics (NEW: Pending, Confirmed, Re-Admitted, Invoice Print Queue) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        {/* Metric 1: New Admission Pending */}
        <div className="bg-card border border-emerald-500/20 rounded-2xl p-4 shadow-2xs hover:shadow-md transition-all duration-200 relative overflow-hidden">
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
        <div className="bg-card border border-emerald-500/20 rounded-2xl p-4 shadow-2xs hover:shadow-md transition-all duration-200 relative overflow-hidden">
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
        <div className="bg-card border border-orange-500/20 rounded-2xl p-4 shadow-2xs hover:shadow-md transition-all duration-200 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-orange-700 dark:text-orange-400">
              Re-admitted 2026
            </span>
            <span className="p-1.5 rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400">
              <RefreshCw className="h-4 w-4" />
            </span>
          </div>
          <div className="flex items-baseline justify-between mt-2">
            <p className="text-2xl font-black text-foreground">
              {loadingStudents ? "..." : reAdmittedStudents.length}
            </p>
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-orange-500/10 text-orange-700 dark:text-orange-400 border border-orange-500/25 text-xs font-bold font-mono">
              <span>Collected: ₹{reAdmissionVasul.toLocaleString("en-IN")}</span>
            </div>
          </div>
        </div>

        {/* Metric 4: Re-admission Invoices */}
        <div className="bg-card border border-purple-500/20 rounded-2xl p-4 shadow-2xs hover:shadow-md transition-all duration-200 relative overflow-hidden">
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

      {/* TWO CLEAN SECTIONS: NEW ADMISSION & RE-ADMISSION */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
        {/* SECTION 1: NEW ADMISSION */}
        <div className="rounded-3xl border-2 border-emerald-500/20 bg-gradient-to-br from-emerald-500/[0.04] via-card to-card p-6 sm:p-7 shadow-xs flex flex-col justify-between relative overflow-hidden group hover:border-emerald-500/40 transition-all">
          <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="h-12 w-12 rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                <UserPlus className="h-6 w-6" />
              </div>
            </div>

            <h2 className="text-xl font-black text-foreground mb-4">
              New Admission
            </h2>

            {/* Quick Summary Info */}
            <div className="grid grid-cols-2 gap-3 mb-6 p-3 rounded-2xl bg-muted/40 border">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                  Pending Applications
                </span>
                <span className="text-lg font-black text-foreground">
                  {loadingApps ? "..." : pendingApps.length}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block">
                  Confirmed Admitted
                </span>
                <span className="text-lg font-black text-emerald-700 dark:text-emerald-400">
                  {loadingApps ? "..." : admittedApps.length}
                </span>
              </div>
            </div>
          </div>

          <Link
            href="/admission/new"
            className="w-full inline-flex items-center justify-center gap-2 min-h-[48px] px-5 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm shadow-md hover:shadow-lg transition-all active:scale-95 cursor-pointer"
          >
            <span>Open New Admission</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {/* SECTION 2: RE-ADMISSION */}
        <div className="rounded-3xl border-2 border-orange-500/20 bg-gradient-to-br from-orange-500/[0.04] via-card to-card p-6 sm:p-7 shadow-xs flex flex-col justify-between relative overflow-hidden group hover:border-orange-500/40 transition-all">
          <div className="absolute top-0 right-0 w-48 h-48 bg-orange-500/5 rounded-full blur-3xl pointer-events-none" />

          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="h-12 w-12 rounded-2xl bg-orange-500/15 text-orange-600 dark:text-orange-400 flex items-center justify-center font-bold">
                <RefreshCw className="h-6 w-6" />
              </div>
            </div>

            <h2 className="text-xl font-black text-foreground mb-4">
              Re-Admission
            </h2>

            {/* Quick Summary Info */}
            <div className="grid grid-cols-2 gap-3 mb-6 p-3 rounded-2xl bg-muted/40 border">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                  Re-Admitted Students
                </span>
                <span className="text-lg font-black text-foreground">
                  {loadingStudents ? "..." : reAdmittedStudents.length}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 block">
                  In Invoice Queue
                </span>
                <span className="text-lg font-black text-purple-700 dark:text-purple-400">
                  {loadingStudents ? "..." : queuedForInvoice.length}
                </span>
              </div>
            </div>
          </div>

          <Link
            href="/admission/re"
            className="w-full inline-flex items-center justify-center gap-2 min-h-[48px] px-5 py-3 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white font-extrabold text-sm shadow-md hover:shadow-lg transition-all active:scale-95 cursor-pointer"
          >
            <span>Open Re-Admission</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
