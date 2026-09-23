"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import { useQuery } from "@tanstack/react-query";
import {
  FileText,
  Filter,
  RefreshCw,
  Calendar,
  Layers,
  GraduationCap,
  Users,
  Download,
  Search,
  CheckCircle2,
  Clock,
  Archive,
  Printer,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  LayoutDashboard,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { CustomSelect } from "@/components/ui/custom-select";
import { useSchoolProfile } from "@/lib/utils/school-profile";
import { cn } from "@/lib/utils";

export function AdmissionFormTrackerModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      {/* 
        EXPANDED EXTRA LARGE MODAL CONTAINER:
        Spacious modern layout with fixed height ratio matching Invoice Tracker.
      */}
      <DialogContent className="w-[98vw] max-w-[1400px] h-[92vh] max-h-[920px] min-h-[640px] p-0 flex flex-col gap-0 overflow-hidden rounded-3xl border border-border/80 shadow-2xl bg-background">
        <AdmissionFormTracker onClose={onClose} />
      </DialogContent>
    </Dialog>
  );
}

export type DatePreset = "ALL" | "TODAY" | "YESTERDAY" | "LAST_7_DAYS" | "THIS_MONTH" | "CUSTOM";

interface TrackerItem {
  id: string;
  receiptNo: string;
  applicationNo: string;
  date: string;
  dateTime?: string;
  admissionType: "new" | "re";
  channel: "online" | "offline";
  targetClass: string;
  targetSection?: string;
  studentName: string;
  status: string;
  feeAmount: number;
  feePaid: boolean;
  academicYear: string;
}

interface TrackerResponse {
  success: boolean;
  stats: {
    totalGlobalCount: number;
    newAdmission: {
      total: number;
      online: number;
      offline: number;
    };
    reAdmission: {
      total: number;
      online: number;
      offline: number;
    };
    classBreakdown: Record<string, number>;
  };
  availableYears: string[];
  records: TrackerItem[];
}

function computeDateRange(preset: DatePreset, customStart: string, customEnd: string): { fromDate: string; toDate: string } {
  const today = new Date();
  const formatYMD = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const todayStr = formatYMD(today);

  if (preset === "TODAY") {
    return { fromDate: todayStr, toDate: todayStr };
  }
  if (preset === "YESTERDAY") {
    const y = new Date(today);
    y.setDate(y.getDate() - 1);
    const yStr = formatYMD(y);
    return { fromDate: yStr, toDate: yStr };
  }
  if (preset === "LAST_7_DAYS") {
    const l7 = new Date(today);
    l7.setDate(l7.getDate() - 7);
    return { fromDate: formatYMD(l7), toDate: todayStr };
  }
  if (preset === "THIS_MONTH") {
    const m = new Date(today.getFullYear(), today.getMonth(), 1);
    return { fromDate: formatYMD(m), toDate: todayStr };
  }
  if (preset === "CUSTOM") {
    return { fromDate: customStart, toDate: customEnd };
  }
  return { fromDate: "", toDate: "" };
}

const CLASS_LIST = ["V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];

export function AdmissionFormTracker({ onClose }: { onClose?: () => void }) {
  const currentYearStr = String(new Date().getFullYear());
  const { profile: schoolProfile } = useSchoolProfile();
  const [mounted, setMounted] = useState(false);
  const [isPrintingLedger, setIsPrintingLedger] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Draft Filter States (Edited by UI Controls before Proceed is clicked)
  const [draftSession, setDraftSession] = useState<string>("2026");
  const [draftClass, setDraftClass] = useState<string>("ALL");
  const [draftType, setDraftType] = useState<string>("ALL");
  const [draftChannel, setDraftChannel] = useState<string>("ALL");
  const [draftDatePreset, setDraftDatePreset] = useState<DatePreset>("ALL");
  const [draftStartDate, setDraftStartDate] = useState<string>("");
  const [draftEndDate, setDraftEndDate] = useState<string>("");
  const [draftSearch, setDraftSearch] = useState<string>("");

  // Applied Filters State (Triggered ONLY when Proceed or Initial Mount executes)
  const [appliedFilters, setAppliedFilters] = useState<{
    session: string;
    targetClass: string;
    admissionType: string;
    channel: string;
    datePreset: DatePreset;
    startDate: string;
    endDate: string;
    search: string;
  }>({
    session: "2026",
    targetClass: "ALL",
    admissionType: "ALL",
    channel: "ALL",
    datePreset: "ALL",
    startDate: "",
    endDate: "",
    search: "",
  });

  // Pagination
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 25;

  // Calculate actual Date strings from applied preset
  const { fromDate: appliedFromDate, toDate: appliedToDate } = useMemo(() => {
    return computeDateRange(appliedFilters.datePreset, appliedFilters.startDate, appliedFilters.endDate);
  }, [appliedFilters.datePreset, appliedFilters.startDate, appliedFilters.endDate]);

  // Query API with Applied Filters
  const { data, isLoading, isFetching, refetch } = useQuery<TrackerResponse>({
    queryKey: [
      "admission-tracker",
      appliedFilters.session,
      appliedFromDate,
      appliedToDate,
      appliedFilters.targetClass,
      appliedFilters.admissionType,
      appliedFilters.channel,
    ],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (appliedFilters.session && appliedFilters.session !== "ALL") {
        params.append("academicYear", appliedFilters.session);
      }
      if (appliedFromDate) params.append("fromDate", appliedFromDate);
      if (appliedToDate) params.append("toDate", appliedToDate);
      if (appliedFilters.targetClass !== "ALL") params.append("targetClass", appliedFilters.targetClass);
      if (appliedFilters.admissionType !== "ALL") params.append("admissionType", appliedFilters.admissionType.toLowerCase());
      if (appliedFilters.channel !== "ALL") params.append("channel", appliedFilters.channel.toLowerCase());

      const res = await fetch(`/api/admission/tracker?${params.toString()}`);
      if (!res.ok) {
        throw new Error("Failed to load admission tracker records");
      }
      return res.json();
    },
    staleTime: 30 * 1000,
  });

  const availableYears = useMemo(() => {
    return data?.availableYears || [currentYearStr, String(Number(currentYearStr) - 1), "2025", "2024"];
  }, [data?.availableYears, currentYearStr]);

  const isHistoryMode = appliedFilters.session !== currentYearStr && appliedFilters.session !== "ALL";

  // Handle Proceed / Apply Filters
  const handleProceed = useCallback(() => {
    setAppliedFilters({
      session: draftSession,
      targetClass: draftClass,
      admissionType: draftType,
      channel: draftChannel,
      datePreset: draftDatePreset,
      startDate: draftStartDate,
      endDate: draftEndDate,
      search: draftSearch,
    });
    setCurrentPage(1);
  }, [draftSession, draftClass, draftType, draftChannel, draftDatePreset, draftStartDate, draftEndDate, draftSearch]);

  // Client-side search filtering on loaded records
  const filteredRecords = useMemo(() => {
    if (!data?.records) return [];
    if (!appliedFilters.search.trim()) return data.records;

    const q = appliedFilters.search.toLowerCase().trim();
    return data.records.filter((rec) => {
      return (
        rec.receiptNo?.toLowerCase().includes(q) ||
        rec.applicationNo?.toLowerCase().includes(q) ||
        rec.studentName?.toLowerCase().includes(q) ||
        rec.targetClass?.toLowerCase().includes(q)
      );
    });
  }, [data?.records, appliedFilters.search]);

  // Paginated records
  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / pageSize));
  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRecords.slice(start, start + pageSize);
  }, [filteredRecords, currentPage, pageSize]);

  // Trigger A4 Full Audit Ledger Print
  const handlePrintLedger = useCallback(() => {
    if (filteredRecords.length === 0) return;
    setIsPrintingLedger(true);
    setTimeout(() => {
      window.print();
      setTimeout(() => {
        setIsPrintingLedger(false);
      }, 500);
    }, 120);
  }, [filteredRecords.length]);

  const stats = data?.stats || {
    totalGlobalCount: 0,
    newAdmission: { total: 0, online: 0, offline: 0 },
    reAdmission: { total: 0, online: 0, offline: 0 },
    classBreakdown: {},
  };

  // Options for Dropdowns
  const sessionOptions = useMemo(() => {
    const set = new Set<string>(availableYears);
    set.add("2026");
    set.add("2025");
    set.add("2024");
    const sorted = Array.from(set).sort((a, b) => b.localeCompare(a));
    return [
      { label: "All Sessions", value: "ALL" },
      ...sorted.map((s) => ({
        label: s === currentYearStr ? `Session ${s} (Active)` : `Session ${s}`,
        value: s,
      })),
    ];
  }, [availableYears, currentYearStr]);

  const classSelectOptions = useMemo(() => {
    return [
      { label: "All Classes", value: "ALL" },
      ...CLASS_LIST.map((cls) => ({
        label: `Class ${cls}`,
        value: cls,
      })),
    ];
  }, []);

  const admissionTypeOptions = useMemo(() => {
    return [
      { label: "All Types", value: "ALL" },
      { label: "New Admission", value: "NEW" },
      { label: "Re-Admission", value: "RE" },
    ];
  }, []);

  const channelOptions = useMemo(() => {
    return [
      { label: "All Channels", value: "ALL" },
      { label: "Online (Admitted)", value: "ONLINE" },
      { label: "Offline (Printed)", value: "OFFLINE" },
    ];
  }, []);

  const datePresetOptions = useMemo(() => {
    return [
      { label: "All Dates", value: "ALL" },
      { label: "Today", value: "TODAY" },
      { label: "Yesterday", value: "YESTERDAY" },
      { label: "Last 7 Days", value: "LAST_7_DAYS" },
      { label: "This Month", value: "THIS_MONTH" },
      { label: "Custom Range...", value: "CUSTOM" },
    ];
  }, []);

  return (
    <div className="flex flex-col h-full overflow-hidden bg-background">
      {/* FIXED MODAL HEADER */}
      <DialogHeader className="p-4 sm:px-6 sm:py-3.5 border-b border-border/70 shrink-0 bg-muted/20 space-y-0 pr-12">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center ring-1 ring-primary/20 shrink-0 shadow-2xs">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
                <span>Global Form &amp; Receipt Tracker</span>
                {isHistoryMode ? (
                  <Badge variant="outline" className="text-[10px] font-mono border-amber-500/30 text-amber-700 dark:text-amber-400 bg-amber-500/10">
                    Archive History
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-[10px] font-mono border-emerald-500/30 text-emerald-700 dark:text-emerald-400 bg-emerald-500/10">
                    Live Active Session
                  </Badge>
                )}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Sequential tracking of online admitted students and offline form sales batches.
              </DialogDescription>
            </div>
          </div>

          {/* Header Actions */}
          <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
            <Button
              size="sm"
              onClick={handlePrintLedger}
              disabled={filteredRecords.length === 0}
              className="h-8 px-3.5 text-xs font-bold rounded-xl cursor-pointer bg-purple-600 hover:bg-purple-700 text-white shadow-2xs flex items-center gap-1.5"
              title="Print A4 Official Admission Form Audit Ledger"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Print Ledger</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isFetching}
              className="h-8 px-3 text-xs font-semibold gap-1.5 cursor-pointer rounded-xl border-border/80 hover:bg-muted shadow-2xs"
            >
              <RefreshCw className={cn("h-3.5 w-3.5 text-primary", isFetching && "animate-spin")} />
              <span>{isFetching ? "Syncing..." : "Refresh"}</span>
            </Button>
          </div>
        </div>
      </DialogHeader>

      {/* SCROLLABLE BODY */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
        {/* 4 SUMMARY STAT CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* Card 1: Total Global Count */}
          <div className="p-3.5 rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/[0.04] to-card space-y-1.5 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-muted-foreground">Total Forms Issued</span>
              <div className="h-7 w-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <FileText className="h-4 w-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-1.5 text-sm font-bold">
              <span className="text-foreground font-mono text-xl font-black">
                {isLoading ? "..." : stats.totalGlobalCount}
              </span>
              <span className="text-muted-foreground text-[11px] font-normal">forms/receipts</span>
            </div>
            <div className="text-[10px] text-muted-foreground truncate">
              Sequential count for Session {appliedFilters.session}
            </div>
          </div>

          {/* Card 2: New Admission */}
          <div className="p-3.5 rounded-2xl border border-emerald-500/25 bg-gradient-to-br from-emerald-500/[0.04] to-card space-y-1.5 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">New Admission</span>
              <div className="h-7 w-7 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <Users className="h-4 w-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-1.5 text-sm font-bold">
              <span className="text-emerald-700 dark:text-emerald-400 font-mono text-xl font-black">
                {isLoading ? "..." : stats.newAdmission.total}
              </span>
              <span className="text-muted-foreground text-[11px] font-normal">total</span>
              <span className="text-muted-foreground">&bull;</span>
              <span className="text-blue-700 dark:text-blue-400 text-xs font-mono font-bold">
                Online: {stats.newAdmission.online}
              </span>
              <span className="text-muted-foreground">&bull;</span>
              <span className="text-purple-700 dark:text-purple-400 text-xs font-mono font-bold">
                Offline: {stats.newAdmission.offline}
              </span>
            </div>
            <div className="text-[10px] text-muted-foreground truncate">
              Admitted Online + Offline sales
            </div>
          </div>

          {/* Card 3: Re-Admission */}
          <div className="p-3.5 rounded-2xl border border-orange-500/25 bg-gradient-to-br from-orange-500/[0.04] to-card space-y-1.5 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-orange-700 dark:text-orange-400">Re-Admission</span>
              <div className="h-7 w-7 rounded-lg bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center">
                <RefreshCw className="h-4 w-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-1.5 text-sm font-bold">
              <span className="text-orange-700 dark:text-orange-400 font-mono text-xl font-black">
                {isLoading ? "..." : stats.reAdmission.total}
              </span>
              <span className="text-muted-foreground text-[11px] font-normal">total</span>
              <span className="text-muted-foreground">&bull;</span>
              <span className="text-blue-700 dark:text-blue-400 text-xs font-mono font-bold">
                Online: {stats.reAdmission.online}
              </span>
              <span className="text-muted-foreground">&bull;</span>
              <span className="text-purple-700 dark:text-purple-400 text-xs font-mono font-bold">
                Offline: {stats.reAdmission.offline}
              </span>
            </div>
            <div className="text-[10px] text-muted-foreground truncate">
              Continuing student renewal forms
            </div>
          </div>

          {/* Card 4: Class Distribution */}
          <div className="p-3.5 rounded-2xl border border-border/80 bg-card space-y-1.5 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-muted-foreground">Class Breakdown</span>
              <div className="h-7 w-7 rounded-lg bg-muted text-muted-foreground flex items-center justify-center">
                <GraduationCap className="h-4 w-4" />
              </div>
            </div>
            <div className="flex flex-wrap gap-1 max-h-12 overflow-y-auto pt-0.5">
              {Object.keys(stats.classBreakdown).length > 0 ? (
                Object.entries(stats.classBreakdown).map(([cls, count]) => (
                  <Badge
                    key={cls}
                    variant="secondary"
                    className="text-[10px] font-mono font-bold px-1.5 py-0"
                  >
                    Cls {cls}: <span className="text-primary font-black ml-0.5">{count}</span>
                  </Badge>
                ))
              ) : (
                <span className="text-xs text-muted-foreground">No class distribution</span>
              )}
            </div>
          </div>
        </div>

        {/* TOOLBAR: ONE SINGLE LINE FILTER BAR WITH CUSTOM SELECT & PROCEED BUTTON */}
        <div className="p-3 rounded-2xl border border-border/80 bg-muted/20 space-y-2.5">
          <div className="flex flex-wrap items-center gap-2">
            {/* Search Input */}
            <div className="relative min-w-[180px] flex-1">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search receipt, student, class..."
                value={draftSearch}
                onChange={(e) => setDraftSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleProceed();
                }}
                className="pl-8 text-xs h-8 rounded-xl bg-background"
              />
            </div>

            {/* 1. Academic Session Dropdown Selector */}
            <div className="w-[140px] shrink-0">
              <CustomSelect
                value={draftSession}
                onChange={(val) => setDraftSession(String(val))}
                options={sessionOptions}
                searchable={false}
                placeholder="Session: 2026"
                triggerClassName="h-8 text-xs font-semibold rounded-xl bg-background border-primary/40 text-primary"
              />
            </div>

            {/* 2. Class Dropdown Selector */}
            <div className="w-[130px] shrink-0">
              <CustomSelect
                value={draftClass}
                onChange={(val) => setDraftClass(String(val))}
                options={classSelectOptions}
                searchable={false}
                placeholder="Class: All"
                triggerClassName="h-8 text-xs font-semibold rounded-xl bg-background"
              />
            </div>

            {/* 3. Admission Type (New / Re) Filter */}
            <div className="w-[150px] shrink-0">
              <CustomSelect
                value={draftType}
                onChange={(val) => setDraftType(String(val))}
                options={admissionTypeOptions}
                searchable={false}
                placeholder="Type: All"
                triggerClassName="h-8 text-xs font-semibold rounded-xl bg-background"
              />
            </div>

            {/* 4. Channel (Online / Offline) Filter */}
            <div className="w-[150px] shrink-0">
              <CustomSelect
                value={draftChannel}
                onChange={(val) => setDraftChannel(String(val))}
                options={channelOptions}
                searchable={false}
                placeholder="Channel: All"
                triggerClassName="h-8 text-xs font-semibold rounded-xl bg-background"
              />
            </div>

            {/* 5. Date Range Preset Filter (Matching Image 2 Dropdown) */}
            <div className="w-[140px] shrink-0">
              <CustomSelect
                value={draftDatePreset}
                onChange={(val) => setDraftDatePreset(val as DatePreset)}
                options={datePresetOptions}
                searchable={false}
                placeholder="Date: All"
                triggerClassName="h-8 text-xs font-semibold rounded-xl bg-background text-primary border-primary/30"
              />
            </div>

            {/* 6. Proceed / Apply Filters Button */}
            <Button
              size="sm"
              onClick={handleProceed}
              className="h-8 px-4 text-xs font-bold rounded-xl shrink-0 cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90 shadow-2xs flex items-center gap-1.5"
            >
              <span>Proceed</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>

          {/* Custom Date Inputs Row when Custom Range is selected */}
          {draftDatePreset === "CUSTOM" && (
            <div className="flex items-center gap-2 pt-2 border-t border-border/50 text-xs">
              <span className="text-muted-foreground font-semibold flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5 text-primary" /> Custom Range:
              </span>
              <Input
                type="date"
                value={draftStartDate}
                onChange={(e) => setDraftStartDate(e.target.value)}
                className="h-7 text-xs w-[140px] rounded-lg bg-background"
                placeholder="Start Date"
              />
              <span className="text-muted-foreground">to</span>
              <Input
                type="date"
                value={draftEndDate}
                onChange={(e) => setDraftEndDate(e.target.value)}
                className="h-7 text-xs w-[140px] rounded-lg bg-background"
                placeholder="End Date"
              />
            </div>
          )}
        </div>

        {/* LEDGER DATA TABLE */}
        <Card className="rounded-2xl border-border/80 shadow-xs overflow-hidden">
          <CardHeader className="p-3.5 border-b bg-muted/20 flex flex-row items-center justify-between">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              <span>Form &amp; Receipt Ledger</span>
              <span className="font-mono text-foreground font-bold">({filteredRecords.length} records)</span>
            </CardTitle>
            <span className="text-[11px] text-muted-foreground font-medium">
              Page {currentPage} of {totalPages}
            </span>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/50 border-b text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                <tr>
                  <th className="py-2.5 px-3">Form / Receipt No</th>
                  <th className="py-2.5 px-3">Date &amp; Time</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3">Channel</th>
                  <th className="py-2.5 px-3">Class</th>
                  <th className="py-2.5 px-3">Student Name</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60 font-medium">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-muted-foreground text-xs">
                      <div className="flex items-center justify-center gap-2">
                        <RefreshCw className="h-4 w-4 animate-spin text-primary" />
                        <span>Loading records from database...</span>
                      </div>
                    </td>
                  </tr>
                ) : paginatedRecords.length > 0 ? (
                  paginatedRecords.map((item) => (
                    <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-2.5 px-3 font-mono font-bold text-foreground">
                        {item.receiptNo || item.applicationNo}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap text-muted-foreground">
                        <div className="font-semibold text-foreground">{item.date}</div>
                        {item.dateTime && (
                          <div className="text-[10px] text-muted-foreground">
                            {new Date(item.dateTime).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                              hour12: true,
                            })}
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        {item.admissionType === "re" ? (
                          <Badge className="bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/30 font-bold text-[10px]">
                            Re-Admission
                          </Badge>
                        ) : (
                          <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 font-bold text-[10px]">
                            New Admission
                          </Badge>
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        {item.channel === "online" ? (
                          <Badge variant="outline" className="border-blue-500/40 bg-blue-500/10 text-blue-700 dark:text-blue-300 font-bold text-[10px]">
                            Online (Admitted)
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="border-purple-500/40 bg-purple-500/10 text-purple-700 dark:text-purple-300 font-bold text-[10px]">
                            Offline (Printed)
                          </Badge>
                        )}
                      </td>
                      <td className="py-2.5 px-3 font-bold font-mono">
                        Class {item.targetClass || "N/A"}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={cn(item.studentName === "Blank Form / Unassigned" ? "text-muted-foreground italic text-[11px]" : "font-semibold text-foreground")}>
                          {item.studentName}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        {item.status === "admitted" ? (
                          <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold text-[11px]">
                            <CheckCircle2 className="h-3 w-3" />
                            Admitted
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-muted-foreground text-[11px]">
                            <Clock className="h-3 w-3" />
                            Printed / Issued
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-muted-foreground text-xs">
                      No admission form records match the selected filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="p-3 border-t bg-muted/20 flex items-center justify-between text-xs">
              <span className="text-muted-foreground">
                Showing {(currentPage - 1) * pageSize + 1} to{" "}
                {Math.min(currentPage * pageSize, filteredRecords.length)} of {filteredRecords.length} records
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="h-7 w-7 p-0 cursor-pointer"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
                <span className="px-2 font-bold">{currentPage}</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="h-7 w-7 p-0 cursor-pointer"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* PORTAL: A4 PRINTABLE AUDIT LEDGER */}
      {mounted && isPrintingLedger
        ? createPortal(
            <div id="admission-ledger-print-portal" className="hidden print:block bg-white text-black p-6 font-sans">
              <style dangerouslySetInnerHTML={{ __html: `
                @media print {
                  @page { size: A4 landscape; margin: 8mm; }
                  body * { visibility: hidden; }
                  #admission-ledger-print-portal, #admission-ledger-print-portal * { visibility: visible; }
                  #admission-ledger-print-portal { position: absolute; left: 0; top: 0; width: 100%; display: block !important; }
                }
              `}} />
              {/* Header */}
              <div className="border-b-2 border-slate-900 pb-3 mb-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {schoolProfile?.schoolLogoUrl ? (
                    <img src={schoolProfile.schoolLogoUrl} alt="Logo" className="h-14 w-14 object-contain" />
                  ) : null}
                  <div>
                    <h1 className="text-xl font-black tracking-tight text-slate-900 uppercase">
                      {schoolProfile?.schoolName || "MARIGACHI HIGH SCHOOL (H.S.)"}
                    </h1>
                    <p className="text-[11px] font-semibold text-slate-600">
                      ESTD: {schoolProfile?.establishedYear || "1965"} • UDISE: {schoolProfile?.udiseCode || "19111305602"}
                    </p>
                    <p className="text-[10px] text-slate-500">
                      {schoolProfile?.schoolAddress || "Marigachi, Mathurapur II, South 24 Parganas, West Bengal - 743349"}
                    </p>
                  </div>
                </div>
                <div className="text-right border-l pl-4 border-slate-300">
                  <h2 className="text-xs font-black uppercase tracking-wider text-slate-900">
                    Official Admission Form &amp; Receipt Audit Ledger
                  </h2>
                  <p className="text-[10px] font-bold text-slate-600 mt-0.5">
                    Academic Session: {appliedFilters.session === "ALL" ? "All Sessions" : appliedFilters.session}
                  </p>
                  <p className="text-[9.5px] font-mono text-slate-500">
                    Generated: {new Date().toLocaleDateString("en-GB")} {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>

              {/* Filter Summary Banner */}
              <div className="bg-slate-100 p-2.5 rounded-lg border border-slate-300 text-[10px] font-semibold mb-4 flex items-center justify-between">
                <div className="space-x-2">
                  <span>Session: <strong className="text-slate-900">{appliedFilters.session === "ALL" ? "All Sessions" : appliedFilters.session}</strong></span>
                  <span>•</span>
                  <span>Class: <strong className="text-slate-900">{appliedFilters.targetClass === "ALL" ? "All Classes" : `Class ${appliedFilters.targetClass}`}</strong></span>
                  <span>•</span>
                  <span>Category: <strong className="text-slate-900">{appliedFilters.admissionType === "ALL" ? "All Types" : appliedFilters.admissionType === "NEW" ? "New Admission" : "Re-Admission"}</strong></span>
                  <span>•</span>
                  <span>Channel: <strong className="text-slate-900">{appliedFilters.channel === "ALL" ? "All Channels" : appliedFilters.channel}</strong></span>
                  <span>•</span>
                  <span>Date Range: <strong className="text-slate-900">{appliedFilters.datePreset}</strong></span>
                </div>
                <div>
                  <span>Total Issued Forms: <strong className="text-slate-900">{filteredRecords.length}</strong></span>
                  <span className="mx-2">•</span>
                  <span>Online Admitted: <strong className="text-slate-900">{filteredRecords.filter(r => r.channel === 'online').length}</strong></span>
                  <span className="mx-2">•</span>
                  <span>Offline Printed: <strong className="text-slate-900">{filteredRecords.filter(r => r.channel === 'offline').length}</strong></span>
                </div>
              </div>

              {/* Table */}
              <table className="w-full border-collapse text-[10px] text-slate-800">
                <thead>
                  <tr className="bg-slate-900 text-white font-bold text-left">
                    <th className="p-1.5 border border-slate-900 w-8 text-center">#</th>
                    <th className="p-1.5 border border-slate-900">Form / Receipt No</th>
                    <th className="p-1.5 border border-slate-900">Issue Date &amp; Time</th>
                    <th className="p-1.5 border border-slate-900">Category</th>
                    <th className="p-1.5 border border-slate-900">Channel</th>
                    <th className="p-1.5 border border-slate-900">Class</th>
                    <th className="p-1.5 border border-slate-900">Student Name</th>
                    <th className="p-1.5 border border-slate-900 text-center">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRecords.map((item, idx) => (
                    <tr
                      key={item.id}
                      className={`border-b border-slate-300 ${idx % 2 === 1 ? "bg-slate-50" : "bg-white"}`}
                    >
                      <td className="p-1.5 border border-slate-300 text-center font-mono">{idx + 1}</td>
                      <td className="p-1.5 border border-slate-300 font-mono font-bold">{item.receiptNo || item.applicationNo}</td>
                      <td className="p-1.5 border border-slate-300 whitespace-nowrap">
                        {item.date} {item.dateTime ? new Date(item.dateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ""}
                      </td>
                      <td className="p-1.5 border border-slate-300 font-semibold">
                        {item.admissionType === "re" ? "Re-Admission" : "New Admission"}
                      </td>
                      <td className="p-1.5 border border-slate-300 font-semibold">
                        {item.channel === "online" ? "Online (Admitted)" : "Offline (Printed)"}
                      </td>
                      <td className="p-1.5 border border-slate-300 font-mono font-bold">
                        Class {item.targetClass || "N/A"}
                      </td>
                      <td className="p-1.5 border border-slate-300 font-medium">
                        {item.studentName}
                      </td>
                      <td className="p-1.5 border border-slate-300 text-center font-bold">
                        {item.status === "admitted" ? "ADMITTED" : "PRINTED / ISSUED"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Signatures */}
              <div className="mt-14 pt-6 border-t border-slate-400 flex items-end justify-between text-[11px] font-bold text-slate-800">
                <div className="text-center w-48 border-t border-slate-400 pt-1">
                  Dealing Assistant / Cashier
                </div>
                <div className="text-center w-48 border-t border-slate-400 pt-1">
                  Admission In-Charge
                </div>
                <div className="text-center w-52 border-t border-slate-400 pt-1">
                  Headmaster / Principal (Seal)
                </div>
              </div>
            </div>,
            document.body
          )
        : null}
    </div>
  );
}
