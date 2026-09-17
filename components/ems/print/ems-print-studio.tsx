"use client";

import React, { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ExamAllocation, AllocatedRoom } from "@/lib/ems/types";
import { getSavedSchoolProfile, SchoolProfileData } from "@/lib/utils/school-profile";
import { EmsAdmitCardPrintable } from "./ems-admit-card-printable";
import { EmsBenchSlipsPrintable } from "./ems-bench-slips-printable";
import { EmsAttendanceSheetPrintable } from "./ems-attendance-sheet-printable";
import { EmsGateNoticePrintable } from "./ems-gate-notice-printable";
import {
  Printer,
  FileText,
  Tag,
  ClipboardList,
  DoorOpen,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Calendar,
  Layers,
  Settings2,
  X,
  Building,
  Check,
  Search,
  Sparkles,
  Users,
  Sliders,
  CheckCircle2,
  ArrowLeft,
  Building2,
} from "lucide-react";
import {
  getDynamicSubjectsForClasses,
  syncAllEmsConfigsFromDb,
} from "@/lib/ems/ems-config-loader";
import { cn } from "@/lib/utils";

export type PrintDocType = "admit" | "slips" | "attendance" | "gate";

export interface EmsPrintStudioProps {
  allocation: ExamAllocation;
  defaultRoomId?: string;
  defaultDoc?: PrintDocType;
  onBackToStep4?: () => void;
  onViewBlueprint?: () => void;
  onClose?: () => void;
  isDialog?: boolean;
}

// Helper to format room name cleanly (avoid duplicate "Room ROOM 201")
function formatRoomName(rawName: string): string {
  if (!rawName) return "Room";
  const clean = rawName.trim().replace(/^Room\s+/i, "");
  return `Room ${clean}`;
}

export const EmsPrintStudio: React.FC<EmsPrintStudioProps> = ({
  allocation,
  defaultRoomId = "ALL",
  defaultDoc = "admit",
  onBackToStep4,
  onViewBlueprint,
  onClose,
  isDialog = false,
}) => {
  const [activeDoc, setActiveDoc] = useState<PrintDocType>(defaultDoc);
  const [targetRoomId, setTargetRoomId] = useState<string>(defaultRoomId);
  const [zoom, setZoom] = useState<number>(0.8);
  const [schoolProfile, setSchoolProfile] = useState<SchoolProfileData>(getSavedSchoolProfile());
  const [roomSearch, setRoomSearch] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Settings
  const [issueDate, setIssueDate] = useState<string>(() => {
    const d = new Date();
    return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
  });
  const [showAdmitSignature, setShowAdmitSignature] = useState<boolean>(true);

  // Dynamically extract unique classes in this exam allocation
  const uniqueClasses = useMemo(() => {
    return Array.from(
      new Set(
        (allocation.summary?.classesAllocated || allocation.roomAllocations?.flatMap((r) => r.classesPresent || []) || [])
          .map((c) => c.split("-")[0].trim())
      )
    );
  }, [allocation]);

  const [examHeaders, setExamHeaders] = useState<string[]>(() =>
    getDynamicSubjectsForClasses(uniqueClasses)
  );

  useEffect(() => {
    // Fetch freshest school profile & configs from database
    syncAllEmsConfigsFromDb().then(({ profile }) => {
      setSchoolProfile(profile);
    });

    // Auto-update subjects based on allocated classes
    setExamHeaders(getDynamicSubjectsForClasses(uniqueClasses));
  }, [allocation, uniqueClasses]);

  // Real-time listener for school profile changes across tabs/windows
  useEffect(() => {
    const handleProfileUpdate = (e: any) => {
      if (e.detail) {
        setSchoolProfile(e.detail);
      }
    };
    window.addEventListener("sms_school_profile_updated", handleProfileUpdate);
    return () => window.removeEventListener("sms_school_profile_updated", handleProfileUpdate);
  }, []);

  useEffect(() => {
    if (defaultRoomId) {
      setTargetRoomId(defaultRoomId);
    }
  }, [defaultRoomId]);

  useEffect(() => {
    if (defaultDoc) {
      setActiveDoc(defaultDoc);
    }
  }, [defaultDoc]);

  // Keyboard shortcut: Ctrl + P to trigger print
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "p") {
        e.preventDefault();
        handlePrint();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Total student & room calculations
  const rooms = allocation.roomAllocations || [];
  const selectedRooms =
    targetRoomId === "ALL"
      ? rooms
      : rooms.filter((r) => r.roomId === targetRoomId);

  const totalOccupiedStudents = selectedRooms.reduce(
    (acc, r) => acc + r.seats.filter((s) => !s.isVacant && s.studentName).length,
    0
  );

  const allRoomsTotalStudents = rooms.reduce(
    (acc, r) => acc + r.seats.filter((s) => !s.isVacant && s.studentName).length,
    0
  );

  const totalPagesAdmit = Math.ceil(totalOccupiedStudents / 21) || 1;
  const totalPagesSlips = Math.ceil(totalOccupiedStudents / 30) || 1;
  const totalPagesAttendance =
    selectedRooms.reduce((acc, r) => {
      const studentCount = r.seats.filter((s) => !s.isVacant && s.studentName).length;
      return acc + Math.max(1, Math.ceil(Math.max(25, studentCount + 1) / 28));
    }, 0) || 1;
  const totalPagesGate =
    selectedRooms.reduce((acc, r) => {
      const studentCount = r.seats.filter((s) => !s.isVacant && s.studentName).length;
      return acc + Math.max(1, Math.ceil(studentCount / 26));
    }, 0) || 1;

  const currentTotalPages =
    activeDoc === "admit"
      ? totalPagesAdmit
      : activeDoc === "slips"
        ? totalPagesSlips
        : activeDoc === "attendance"
          ? totalPagesAttendance
          : totalPagesGate;

  // Selected room metadata for display
  const activeRoomObj = rooms.find((r) => r.roomId === targetRoomId);

  // Filtered rooms for room selector search
  const filteredRooms = rooms.filter((r) => {
    if (!roomSearch.trim()) return true;
    const q = roomSearch.toLowerCase();
    const formatted = formatRoomName(r.roomNumber).toLowerCase();
    return (
      formatted.includes(q) ||
      (r.floor && r.floor.toLowerCase().includes(q)) ||
      (r.building && r.building.toLowerCase().includes(q))
    );
  });

  const handlePrint = () => {
    setTimeout(() => {
      window.print();
    }, 120);
  };

  const handleHeaderChange = (index: number, val: string) => {
    const updated = [...examHeaders];
    updated[index] = val;
    setExamHeaders(updated);
  };

  const setTodayDate = () => {
    const d = new Date();
    setIssueDate(
      `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`
    );
  };

  return (
    <div className={cn("space-y-4", isDialog ? "h-full flex flex-col" : "")}>
      {/* ============================================================== */}
      {/* TOP HEADER (Embedded Mode): Navigation & Primary Actions      */}
      {/* ============================================================== */}
      {!isDialog && (
        <div className="p-3.5 sm:p-4 rounded-2xl border border-border/80 bg-card shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {onBackToStep4 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onBackToStep4}
                className="h-9 px-3 text-xs font-semibold gap-1.5 hover:border-primary/40 cursor-pointer shadow-2xs shrink-0"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Back to Seat Arrangement</span>
              </Button>
            )}

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-bold text-foreground tracking-tight">
                  Examination Print Suite
                </h2>
                <span className="text-[10px] font-bold bg-indigo-500/15 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-300 px-2 py-0.5 rounded-md border border-indigo-500/25">
                  {allocation.examType}
                </span>
              </div>
              <p className="text-xs text-muted-foreground truncate mt-0.5">
                {schoolProfile.schoolName || "Institutional Examination Studio"} • Academic Year {allocation.academicYear}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {onViewBlueprint && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onViewBlueprint}
                className="h-9 text-xs font-semibold gap-1.5 hover:border-primary/40 cursor-pointer shadow-2xs"
              >
                <Layers className="h-3.5 w-3.5 text-primary" />
                <span className="hidden sm:inline">View Blueprint</span>
              </Button>
            )}

            <Button
              type="button"
              onClick={handlePrint}
              className="h-9 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white font-bold text-xs gap-2 cursor-pointer shadow-md shadow-indigo-600/20 px-3.5 rounded-xl hover:scale-[1.01] active:scale-[0.98] transition-all"
            >
              <Printer className="h-4 w-4" />
              <span>Print Document</span>
              <span className="text-[10px] opacity-80 font-mono hidden md:inline">Ctrl+P</span>
            </Button>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* PRO FULL-HEIGHT STUDIO: Left (Options & Print) | Right (Preview) */}
      {/* ============================================================== */}
      <div
        className={cn(
          "flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden print:overflow-visible rounded-2xl border border-border/80 bg-card shadow-sm",
          isDialog ? "h-full" : "min-h-[750px] lg:h-[820px] xl:h-[880px]"
        )}
      >
        {/* ──────────────────────────────────────────────────────────── */}
        {/* LEFT SIDEBAR: Frosted Glass Options Panel                    */}
        {/* ──────────────────────────────────────────────────────────── */}
        <div className="w-full md:w-[410px] xl:w-[450px] bg-muted/20 border-r border-border/70 flex flex-col shrink-0 overflow-y-auto p-4 sm:p-5 space-y-4 print:hidden shadow-xs relative z-10">
          {/* Header (Dialog Mode only) */}
          {isDialog && (
            <div className="flex items-center justify-between pb-3 border-b border-border/80">
              <div className="flex items-center space-x-3 min-w-0">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-lg shadow-indigo-600/25 shrink-0">
                  <Printer className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-bold text-foreground tracking-tight">
                      EMS Print Studio
                    </h2>
                    <span className="text-[10px] font-bold bg-indigo-500/15 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-300 px-2 py-0.5 rounded-md border border-indigo-500/25">
                      {allocation.examType}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                    {schoolProfile.schoolName || "High School"} • Academic Year {allocation.academicYear}
                  </p>
                </div>
              </div>

              {onClose && (
                <button
                  onClick={onClose}
                  className="h-8 w-8 rounded-xl bg-muted hover:bg-rose-50 text-muted-foreground hover:text-rose-600 dark:hover:bg-rose-950/60 dark:hover:text-rose-400 border border-border flex items-center justify-center transition-all cursor-pointer shadow-2xs shrink-0"
                  title="Close Print Studio (Esc)"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          )}

          {/* SECTION 1: Document Type Switcher (Modern 4-Card Grid) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>Document Format</span>
              </span>
              <span className="text-[10px] font-mono text-indigo-600 dark:text-indigo-400 font-semibold">
                4 Standards
              </span>
            </div>

            {/* 4-Card Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-2 lg:grid-cols-4 gap-2">
              {/* 1. Mini Admit Cards */}
              <button
                type="button"
                onClick={() => setActiveDoc("admit")}
                className={cn(
                  "p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between h-20 select-none",
                  activeDoc === "admit"
                    ? "bg-indigo-600 text-white font-bold border-indigo-500 shadow-md shadow-indigo-600/25 ring-2 ring-indigo-400/40"
                    : "bg-background text-foreground border-border hover:bg-muted/60"
                )}
              >
                <div className="flex items-center justify-between w-full">
                  <FileText className={cn("w-4 h-4", activeDoc === "admit" ? "text-white" : "text-indigo-600 dark:text-indigo-400")} />
                  <span
                    className={cn(
                      "text-[9px] font-mono px-1.5 py-0.2 rounded font-bold",
                      activeDoc === "admit" ? "bg-indigo-800 text-white" : "bg-muted text-muted-foreground"
                    )}
                  >
                    21/A4
                  </span>
                </div>
                <div>
                  <span className="block text-xs font-bold leading-tight">Admit Cards</span>
                  <span className={cn("text-[9px] block truncate", activeDoc === "admit" ? "text-indigo-100" : "text-muted-foreground")}>
                    Roll & details
                  </span>
                </div>
              </button>

              {/* 2. Desk / Bench Slips */}
              <button
                type="button"
                onClick={() => setActiveDoc("slips")}
                className={cn(
                  "p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between h-20 select-none",
                  activeDoc === "slips"
                    ? "bg-emerald-600 text-white font-bold border-emerald-500 shadow-md shadow-emerald-600/25 ring-2 ring-emerald-400/40"
                    : "bg-background text-foreground border-border hover:bg-muted/60"
                )}
              >
                <div className="flex items-center justify-between w-full">
                  <Tag className={cn("w-4 h-4", activeDoc === "slips" ? "text-white" : "text-emerald-600 dark:text-emerald-400")} />
                  <span
                    className={cn(
                      "text-[9px] font-mono px-1.5 py-0.2 rounded font-bold",
                      activeDoc === "slips" ? "bg-emerald-800 text-white" : "bg-muted text-muted-foreground"
                    )}
                  >
                    30/A4
                  </span>
                </div>
                <div>
                  <span className="block text-xs font-bold leading-tight">Bench Slips</span>
                  <span className={cn("text-[9px] block truncate", activeDoc === "slips" ? "text-emerald-100" : "text-muted-foreground")}>
                    Desk cut labels
                  </span>
                </div>
              </button>

              {/* 3. Room Attendance */}
              <button
                type="button"
                onClick={() => setActiveDoc("attendance")}
                className={cn(
                  "p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between h-20 select-none",
                  activeDoc === "attendance"
                    ? "bg-amber-600 text-white font-bold border-amber-500 shadow-md shadow-amber-600/25 ring-2 ring-amber-400/40"
                    : "bg-background text-foreground border-border hover:bg-muted/60"
                )}
              >
                <div className="flex items-center justify-between w-full">
                  <ClipboardList className={cn("w-4 h-4", activeDoc === "attendance" ? "text-white" : "text-amber-600 dark:text-amber-400")} />
                  <span
                    className={cn(
                      "text-[9px] font-mono px-1.5 py-0.2 rounded font-bold",
                      activeDoc === "attendance" ? "bg-amber-800 text-white" : "bg-muted text-muted-foreground"
                    )}
                  >
                    8-Days
                  </span>
                </div>
                <div>
                  <span className="block text-xs font-bold leading-tight">Attendance</span>
                  <span className={cn("text-[9px] block truncate", activeDoc === "attendance" ? "text-amber-100" : "text-muted-foreground")}>
                    Signature sheet
                  </span>
                </div>
              </button>

              {/* 4. Room Gate Notice */}
              <button
                type="button"
                onClick={() => setActiveDoc("gate")}
                className={cn(
                  "p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between h-20 select-none",
                  activeDoc === "gate"
                    ? "bg-purple-600 text-white font-bold border-purple-500 shadow-md shadow-purple-600/25 ring-2 ring-purple-400/40"
                    : "bg-background text-foreground border-border hover:bg-muted/60"
                )}
              >
                <div className="flex items-center justify-between w-full">
                  <DoorOpen className={cn("w-4 h-4", activeDoc === "gate" ? "text-white" : "text-purple-600 dark:text-purple-400")} />
                  <span
                    className={cn(
                      "text-[9px] font-mono px-1.5 py-0.2 rounded font-bold",
                      activeDoc === "gate" ? "bg-purple-800 text-white" : "bg-muted text-muted-foreground"
                    )}
                  >
                    A4 Notice
                  </span>
                </div>
                <div>
                  <span className="block text-xs font-bold leading-tight">Gate Notice</span>
                  <span className={cn("text-[9px] block truncate", activeDoc === "gate" ? "text-purple-100" : "text-muted-foreground")}>
                    Hall door roster
                  </span>
                </div>
              </button>
            </div>
          </div>

          {/* SECTION 2: Target Room Filter (Spacious & Clean Chips) */}
          <div className="space-y-2 pt-1 border-t border-border/80">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>Target Examination Room</span>
              </span>
              <span className="text-[10px] text-muted-foreground font-mono">
                {rooms.length} Room{rooms.length !== 1 ? "s" : ""} Available
              </span>
            </div>

            {/* Room Search Filter (if > 3 rooms) */}
            {rooms.length > 3 && (
              <div className="relative flex items-center">
                <Search className="absolute left-2.5 h-3 w-3 text-muted-foreground pointer-events-none" />
                <input
                  type="text"
                  value={roomSearch}
                  onChange={(e) => setRoomSearch(e.target.value)}
                  placeholder="Search room..."
                  className="w-full pl-7 pr-2 py-1.5 text-xs bg-background rounded-lg border border-border outline-none text-foreground placeholder:text-muted-foreground focus:border-indigo-500 transition-all"
                />
              </div>
            )}

            {/* Room Choice Chips Grid */}
            <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
              {/* 1. All Examination Rooms Button */}
              <button
                type="button"
                onClick={() => setTargetRoomId("ALL")}
                className={cn(
                  "w-full flex items-center justify-between rounded-xl px-3 py-2 text-xs transition-all cursor-pointer border select-none",
                  targetRoomId === "ALL"
                    ? "bg-indigo-50 dark:bg-indigo-600/20 text-indigo-700 dark:text-indigo-200 font-bold border-indigo-400 dark:border-indigo-500/50 shadow-2xs"
                    : "bg-background text-foreground border-border hover:bg-muted/60"
                )}
              >
                <div className="flex items-center space-x-2">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                  <span>All Examination Rooms</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <span className="text-[10px] font-mono bg-muted text-muted-foreground px-1.5 py-0.5 rounded border border-border font-semibold">
                    {allRoomsTotalStudents} students
                  </span>
                  {targetRoomId === "ALL" && (
                    <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  )}
                </div>
              </button>

              {/* 2. Individual Rooms Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {filteredRooms.map((r, rIdx) => {
                  const isSelected = targetRoomId === r.roomId;
                  return (
                    <button
                      key={r.roomId}
                      type="button"
                      onClick={() => setTargetRoomId(r.roomId)}
                      className={cn(
                        "flex items-center justify-between rounded-xl p-2 text-xs transition-all cursor-pointer border select-none",
                        isSelected
                          ? "bg-indigo-50 dark:bg-indigo-600/20 text-indigo-700 dark:text-indigo-200 font-bold border-indigo-400 dark:border-indigo-500/50 shadow-2xs"
                          : "bg-background text-foreground border-border hover:bg-muted/60"
                      )}
                    >
                      <div className="flex items-center space-x-1.5 min-w-0">
                        <span
                          className={cn(
                            "px-1.5 py-0.5 rounded text-[10px] font-mono font-bold shrink-0",
                            isSelected ? "bg-indigo-600 text-white" : "bg-muted text-muted-foreground"
                          )}
                        >
                          #{rIdx + 1}
                        </span>
                        <span className="font-semibold truncate">
                          {formatRoomName(r.roomNumber)}
                        </span>
                      </div>

                      <span className="text-[10px] font-mono text-muted-foreground shrink-0 ml-1">
                        {r.occupiedSeats} sts
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* SECTION 3: Document Customization Options */}
          <div className="space-y-2 pt-1 border-t border-border/80">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Settings2 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>
                {activeDoc === "admit"
                  ? "Admit Card Options"
                  : activeDoc === "attendance"
                    ? "Attendance Table Headers"
                    : activeDoc === "slips"
                      ? "Bench Slip Layout"
                      : "Gate Notice Overview"}
              </span>
            </span>

            {/* Admit Cards: Issue Date & Headmaster Signature */}
            {activeDoc === "admit" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="p-3 bg-background rounded-xl border border-border space-y-1.5">
                  <div className="flex items-center justify-between text-foreground">
                    <span className="font-semibold text-xs flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-indigo-500" /> Issue Date
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={setTodayDate}
                      className="h-5 text-[10px] px-1.5 text-indigo-600 dark:text-indigo-400 hover:bg-muted"
                    >
                      Today
                    </Button>
                  </div>
                  <Input
                    value={issueDate}
                    onChange={(e) => setIssueDate(e.target.value)}
                    placeholder="DD/MM/YYYY"
                    className="h-7 text-xs bg-muted/40 border-border font-mono"
                  />
                </div>

                <div className="p-3 bg-background rounded-xl border border-border flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <span className="font-semibold text-xs text-foreground block">
                      Head Signature
                    </span>
                    <span className="text-[10px] text-muted-foreground truncate block">
                      {schoolProfile.headmasterName || "Headmaster"}
                    </span>
                  </div>

                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={showAdmitSignature}
                      onChange={(e) => setShowAdmitSignature(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-8 h-4.5 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>
              </div>
            )}

            {/* Attendance Sheet: 8 Dynamic Headers */}
            {activeDoc === "attendance" && (
              <div className="p-3.5 bg-background rounded-2xl border border-border space-y-3 shadow-2xs">
                <div className="flex items-center justify-between gap-2 border-b border-border/80 pb-2.5">
                  <div>
                    <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <Sliders className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                      <span>8 Exam Column Headers</span>
                    </span>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      Subject names or dates for attendance columns
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setExamHeaders(getDynamicSubjectsForClasses(uniqueClasses))}
                      className="h-7 text-[10px] font-bold px-2 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-900/50 bg-indigo-50/50 hover:bg-indigo-100 dark:bg-indigo-950/30 dark:hover:bg-indigo-900/50 cursor-pointer rounded-lg gap-1"
                      title="Auto-fill subjects from database"
                    >
                      <Sparkles className="w-3 h-3 text-indigo-500" />
                      <span>Auto-fill</span>
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setExamHeaders([
                          "Date 1", "Date 2", "Date 3", "Date 4",
                          "Date 5", "Date 6", "Date 7", "Date 8"
                        ])
                      }
                      className="h-7 text-[10px] font-medium px-2 text-muted-foreground border-border hover:bg-muted cursor-pointer rounded-lg"
                      title="Set default Date 1 to Date 8 labels"
                    >
                      Date 1-8
                    </Button>
                  </div>
                </div>

                {/* 2-Column Inputs */}
                <div className="grid grid-cols-2 gap-2">
                  {examHeaders.map((header, idx) => (
                    <div
                      key={`header-box-${idx}`}
                      className="flex items-center rounded-xl border border-border bg-muted/30 p-1 pl-2 gap-1.5 shadow-2xs focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all group"
                    >
                      <span className="text-[10px] font-bold font-mono text-indigo-700 dark:text-indigo-300 shrink-0 bg-indigo-50 dark:bg-indigo-950/60 px-1.5 py-0.5 rounded-md border border-indigo-200/60 dark:border-indigo-800/60 select-none">
                        D{idx + 1}
                      </span>
                      <input
                        type="text"
                        value={header}
                        onChange={(e) => handleHeaderChange(idx, e.target.value)}
                        placeholder={`Subject ${idx + 1}`}
                        className="w-full text-xs bg-transparent border-0 outline-none text-foreground font-medium placeholder:text-muted-foreground"
                      />
                      {header && (
                        <button
                          type="button"
                          onClick={() => handleHeaderChange(idx, "")}
                          className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground p-0.5 rounded transition-opacity cursor-pointer mr-1"
                          title="Clear"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {/* Quick Subject Suggestions */}
                <div className="pt-1.5 border-t border-border/60">
                  <span className="text-[10px] text-muted-foreground font-semibold block mb-1">
                    Quick Add Common Subjects:
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {["Bengali", "English", "Mathematics", "Phy Science", "Life Science", "History", "Geography", "Health & PE"].map((sub) => (
                      <button
                        key={sub}
                        type="button"
                        onClick={() => {
                          const nextHeaders = [...examHeaders];
                          const emptyIdx = nextHeaders.findIndex(
                            (h) => !h || h.startsWith("Exam ") || h.startsWith("Date ")
                          );
                          if (emptyIdx !== -1) {
                            nextHeaders[emptyIdx] = sub;
                          } else {
                            nextHeaders[0] = sub;
                          }
                          setExamHeaders(nextHeaders);
                        }}
                        className="text-[10px] bg-background text-foreground hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 hover:border-indigo-300 border border-border px-2 py-0.5 rounded-md transition-all cursor-pointer select-none font-medium"
                      >
                        + {sub}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Bench Slips: Layout Info */}
            {activeDoc === "slips" && (
              <div className="p-3 bg-background rounded-xl border border-border space-y-1.5 text-xs text-foreground">
                <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold text-xs">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>30 Desk Slips / A4 Sheet (Standard 3×10 Grid)</span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Pre-aligned scissor cutting lines, school logo, student roll numbers, and anti-copying desk placement.
                </p>
              </div>
            )}

            {/* Gate Notice: Overview Info */}
            {activeDoc === "gate" && (
              <div className="p-3 bg-background rounded-xl border border-border space-y-1.5 text-xs text-foreground">
                <div className="flex items-center gap-1.5 text-purple-600 dark:text-purple-400 font-bold text-xs">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Door Noticeboard Poster / A4 Sheet</span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Institutional examination hall gate notices detailing allocated class roll ranges and room capacity roster.
                </p>
              </div>
            )}
          </div>

          {/* SECTION 4: Document Summary Pill & Master Print Button */}
          <div className="mt-auto pt-3 border-t border-border/80 space-y-2.5">
            <div className="p-3 rounded-xl bg-background border border-border space-y-1.5 text-xs">
              <div className="flex items-center justify-between text-muted-foreground">
                <span>Target Scope:</span>
                <span className="font-bold text-foreground">
                  {targetRoomId === "ALL" ? "All Rooms" : formatRoomName(activeRoomObj?.roomNumber || "")}
                </span>
              </div>
              <div className="flex items-center justify-between text-muted-foreground">
                <span>Candidates Included:</span>
                <span className="font-bold text-foreground font-mono">
                  {totalOccupiedStudents} Students
                </span>
              </div>
              <div className="flex items-center justify-between text-muted-foreground">
                <span>Paper Output:</span>
                <span className="font-bold text-indigo-600 dark:text-indigo-400 font-mono">
                  A4 ({currentTotalPages} Page{currentTotalPages > 1 ? "s" : ""})
                </span>
              </div>
            </div>

            {/* Master Print Button */}
            <Button
              onClick={handlePrint}
              className="w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white font-black h-12 text-sm tracking-wide shadow-xl shadow-indigo-600/25 hover:shadow-indigo-600/40 hover:scale-[1.01] active:scale-98 transition-all cursor-pointer rounded-xl border border-indigo-400/30 gap-2.5"
              title="Print official document (Ctrl + P)"
            >
              <Printer className="w-4.5 h-4.5" />
              <span>Print Document</span>
              <span className="text-[11px] opacity-85 font-normal bg-black/25 px-2 py-0.5 rounded-md font-mono">
                Ctrl+P
              </span>
              <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse ml-0.5" />
            </Button>
          </div>
        </div>

        {/* ──────────────────────────────────────────────────────────── */}
        {/* RIGHT VIEWPORT: Document Preview Studio Canvas              */}
        {/* ──────────────────────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col bg-muted/10 relative overflow-hidden print:overflow-visible print:bg-white">
          {/* Ambient Glossy Glow Spheres (Hidden during print) */}
          <div className="print:hidden absolute -top-28 -left-28 w-[500px] h-[500px] rounded-full bg-gradient-to-tr from-blue-400/15 via-indigo-300/10 to-purple-300/10 dark:from-blue-600/10 dark:via-indigo-600/10 dark:to-transparent blur-[110px] pointer-events-none" />
          <div className="print:hidden absolute -bottom-28 -right-28 w-[540px] h-[540px] rounded-full bg-gradient-to-br from-violet-400/15 via-purple-300/10 to-pink-300/10 dark:from-violet-600/10 dark:via-pink-600/10 dark:to-transparent blur-[120px] pointer-events-none" />

          {/* Slim Floating Header: Quick status, Zoom controls */}
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/80 bg-background/80 backdrop-blur-md shrink-0 print:hidden shadow-2xs relative z-10">
            <div className="flex items-center gap-2 text-xs">
              <span className="px-2.5 py-1 rounded-lg bg-muted text-foreground font-mono text-xs border border-border font-bold shadow-2xs">
                {activeDoc === "admit"
                  ? "Mini Admit Cards (21/Page)"
                  : activeDoc === "slips"
                    ? "Desk Bench Slips (30/Page)"
                    : activeDoc === "attendance"
                      ? "Room Attendance Sheet"
                      : "Room Gate Notice"}
              </span>
              <span className="text-muted-foreground text-xs hidden sm:inline font-medium">
                • {totalOccupiedStudents} students ({currentTotalPages} A4 Page{currentTotalPages > 1 ? "s" : ""})
              </span>
            </div>

            {/* Zoom Controls & Optional Close Button */}
            <div className="flex items-center gap-2">
              <div className="flex items-center bg-background rounded-xl border border-border p-0.5 shadow-2xs">
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.max(0.4, Number((z - 0.1).toFixed(2))))}
                  className="p-1.5 hover:bg-muted text-muted-foreground hover:text-foreground rounded-lg transition-colors cursor-pointer"
                  title="Zoom Out (-10%)"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <span className="text-xs font-mono px-2 text-foreground select-none min-w-[44px] text-center font-bold">
                  {Math.round(zoom * 100)}%
                </span>
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.min(1.5, Number((z + 0.1).toFixed(2))))}
                  className="p-1.5 hover:bg-muted text-muted-foreground hover:text-foreground rounded-lg transition-colors cursor-pointer"
                  title="Zoom In (+10%)"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setZoom(0.8)}
                  className="p-1.5 hover:bg-muted text-muted-foreground hover:text-foreground rounded-lg ml-0.5 transition-colors cursor-pointer"
                  title="Reset to 80% view"
                >
                  <RotateCcw className="w-3 h-3" />
                </button>
              </div>

              {isDialog && onClose && (
                <button
                  type="button"
                  onClick={onClose}
                  className="h-8.5 px-3 rounded-xl bg-background hover:bg-rose-50 text-foreground hover:text-rose-600 dark:hover:bg-rose-950/60 dark:hover:text-rose-400 border border-border flex items-center gap-1.5 text-xs font-bold transition-all cursor-pointer shadow-2xs hover:border-rose-300 dark:hover:border-rose-800 group"
                  title="Close Print Studio (Esc)"
                >
                  <X className="w-4 h-4 transition-transform group-hover:scale-110" />
                  <span>Close</span>
                  <span className="text-[10px] font-mono text-muted-foreground group-hover:text-rose-500 ml-0.5 hidden sm:inline">
                    Esc
                  </span>
                </button>
              )}
            </div>
          </div>

          {/* Document Canvas Container with Smooth Zoom */}
          <div className="flex-1 overflow-auto p-3 sm:p-6 flex justify-center items-start print:p-0 print:m-0 print:overflow-visible print:bg-white relative z-0">
            <div
              id="ems-printable-canvas"
              style={{
                transform: `scale(${zoom})`,
                transformOrigin: "top center",
                transition: "transform 0.15s ease-out",
              }}
              className="shadow-[0_25px_60px_-15px_rgba(15,23,42,0.25),_0_0_0_1px_rgba(0,0,0,0.06)] dark:shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8),_0_0_0_1px_rgba(255,255,255,0.1)] print:shadow-none print:transform-none print:w-full print:m-0 print:p-0 flex flex-col items-center"
            >
              {activeDoc === "admit" && (
                <EmsAdmitCardPrintable
                  rooms={allocation.roomAllocations || []}
                  academicYear={allocation.academicYear}
                  examType={allocation.examType}
                  issueDate={issueDate}
                  schoolProfile={schoolProfile}
                  targetRoomId={targetRoomId}
                  showSignature={showAdmitSignature}
                />
              )}

              {activeDoc === "slips" && (
                <EmsBenchSlipsPrintable
                  rooms={allocation.roomAllocations || []}
                  academicYear={allocation.academicYear}
                  examType={allocation.examType}
                  schoolProfile={schoolProfile}
                  targetRoomId={targetRoomId}
                />
              )}

              {activeDoc === "attendance" && (
                <EmsAttendanceSheetPrintable
                  rooms={allocation.roomAllocations || []}
                  academicYear={allocation.academicYear}
                  examType={allocation.examType}
                  schoolProfile={schoolProfile}
                  targetRoomId={targetRoomId}
                  examHeaders={examHeaders}
                />
              )}

              {activeDoc === "gate" && (
                <EmsGateNoticePrintable
                  rooms={allocation.roomAllocations || []}
                  academicYear={allocation.academicYear}
                  examType={allocation.examType}
                  schoolProfile={schoolProfile}
                  targetRoomId={targetRoomId}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* DEDICATED DIRECT-TO-BODY PRINT PORTAL                          */}
      {/* Completely isolated from zoom, flex, and transforms            */}
      {/* ============================================================== */}
      {mounted && typeof document !== "undefined" && createPortal(
        <div id="ems-print-isolated-portal">
          {activeDoc === "admit" && (
            <EmsAdmitCardPrintable
              rooms={allocation.roomAllocations || []}
              academicYear={allocation.academicYear}
              examType={allocation.examType}
              issueDate={issueDate}
              schoolProfile={schoolProfile}
              targetRoomId={targetRoomId}
              showSignature={showAdmitSignature}
            />
          )}

          {activeDoc === "slips" && (
            <EmsBenchSlipsPrintable
              rooms={allocation.roomAllocations || []}
              academicYear={allocation.academicYear}
              examType={allocation.examType}
              schoolProfile={schoolProfile}
              targetRoomId={targetRoomId}
            />
          )}

          {activeDoc === "attendance" && (
            <EmsAttendanceSheetPrintable
              rooms={allocation.roomAllocations || []}
              academicYear={allocation.academicYear}
              examType={allocation.examType}
              schoolProfile={schoolProfile}
              targetRoomId={targetRoomId}
              examHeaders={examHeaders}
            />
          )}

          {activeDoc === "gate" && (
            <EmsGateNoticePrintable
              rooms={allocation.roomAllocations || []}
              academicYear={allocation.academicYear}
              examType={allocation.examType}
              schoolProfile={schoolProfile}
              targetRoomId={targetRoomId}
            />
          )}
        </div>,
        document.body
      )}
    </div>
  );
};
