"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ExamAllocation, AllocatedRoom } from "@/lib/ems/types";
import { getSavedSchoolProfile, SchoolProfileData } from "@/lib/utils/school-profile";
import { EmsAdmitCardPrintable } from "./ems-admit-card-printable";
import { EmsBenchSlipsPrintable } from "./ems-bench-slips-printable";
import { EmsAttendanceSheetPrintable } from "./ems-attendance-sheet-printable";
import {
  Printer,
  FileText,
  Tag,
  ClipboardList,
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
} from "lucide-react";

import {
  getDynamicSubjectsForClasses,
  syncAllEmsConfigsFromDb,
} from "@/lib/ems/ems-config-loader";
import { cn } from "@/lib/utils";

export type PrintDocType = "admit" | "slips" | "attendance";

export interface EmsPrintDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  allocation: ExamAllocation;
  defaultRoomId?: string;
  defaultDoc?: PrintDocType;
}

// Helper to format room name cleanly (avoid duplicate "Room ROOM 201")
function formatRoomName(rawName: string): string {
  if (!rawName) return "Room";
  const clean = rawName.trim().replace(/^Room\s+/i, "");
  return `Room ${clean}`;
}

export const EmsPrintDialog: React.FC<EmsPrintDialogProps> = ({
  open,
  onOpenChange,
  allocation,
  defaultRoomId = "ALL",
  defaultDoc = "admit",
}) => {
  const [activeDoc, setActiveDoc] = useState<PrintDocType>(defaultDoc);
  const [targetRoomId, setTargetRoomId] = useState<string>(defaultRoomId);
  const [zoom, setZoom] = useState<number>(0.8);
  const [schoolProfile, setSchoolProfile] = useState<SchoolProfileData>(getSavedSchoolProfile());
  const [roomSearch, setRoomSearch] = useState("");

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
    // When dialog opens, fetch freshest school profile & configs from database
    syncAllEmsConfigsFromDb().then(({ profile }) => {
      setSchoolProfile(profile);
    });

    // Auto-update subjects based on allocated classes
    setExamHeaders(getDynamicSubjectsForClasses(uniqueClasses));
  }, [open, allocation, uniqueClasses]);

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

  // Keyboard shortcut: Ctrl + P to trigger print, Escape to close
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "p") {
        e.preventDefault();
        handlePrint();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open]);

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
  const totalPagesAttendance = selectedRooms.length || 1;

  const currentTotalPages =
    activeDoc === "admit"
      ? totalPagesAdmit
      : activeDoc === "slips"
      ? totalPagesSlips
      : totalPagesAttendance;

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
    }, 80);
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="max-w-[99vw] xl:max-w-[1680px] w-full h-[98vh] p-0 flex flex-col bg-white/80 dark:bg-slate-950/80 backdrop-blur-3xl border border-white/60 dark:border-white/10 text-slate-900 dark:text-slate-100 overflow-hidden shadow-[0_25px_70px_rgba(0,0,0,0.25)] ring-1 ring-white/40 dark:ring-white/5 print:m-0 print:p-0 print:border-none print:w-full print:h-auto print:max-w-none print:bg-white print:text-black"
      >
        
        {/* ============================================================== */}
        {/* PRO FULL-HEIGHT STUDIO: Left (Options & Print) | Right (Preview) */}
        {/* ============================================================== */}
        <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden print:overflow-visible">
          
          {/* ──────────────────────────────────────────────────────────── */}
          {/* LEFT SIDEBAR: Glossy Frosted Glass Options Panel            */}
          {/* ──────────────────────────────────────────────────────────── */}
          <div className="w-full md:w-[430px] xl:w-[470px] bg-white/70 dark:bg-slate-900/70 backdrop-blur-3xl border-r border-white/60 dark:border-slate-800/80 flex flex-col shrink-0 overflow-y-auto p-4 sm:p-5 space-y-4 print:hidden shadow-xs relative z-10">
            
            {/* Header: Title, Exam Badge & School Context */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200/80 dark:border-slate-800/80">
              <div className="flex items-center space-x-3 min-w-0">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-lg shadow-indigo-600/25 shrink-0">
                  <Printer className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">
                      EMS Print Studio
                    </h2>
                    <span className="text-[10px] font-bold bg-indigo-500/15 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-300 px-2 py-0.5 rounded-md border border-indigo-500/25">
                      {allocation.examType}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                    {schoolProfile.schoolName || "High School"} • Academic Year {allocation.academicYear}
                  </p>
                </div>
              </div>

              {/* Close Button in Sidebar */}
              <button
                onClick={() => onOpenChange(false)}
                className="h-8 w-8 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-500 hover:text-rose-600 dark:bg-slate-800 dark:hover:bg-rose-950/60 dark:hover:text-rose-400 border border-slate-200/80 dark:border-slate-700 flex items-center justify-center transition-all cursor-pointer shadow-2xs shrink-0"
                title="Close Print Studio (Esc)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* SECTION 1: Document Type Switcher (Modern 3-Column Segmented Grid) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  <span>Document Format</span>
                </span>
                <span className="text-[10px] font-mono text-indigo-600 dark:text-indigo-400 font-semibold">
                  3 Standards
                </span>
              </div>

              {/* 3-Card Grid */}
              <div className="grid grid-cols-3 gap-2">
                {/* 1. Mini Admit Cards */}
                <button
                  type="button"
                  onClick={() => setActiveDoc("admit")}
                  className={cn(
                    "p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between h-20 select-none",
                    activeDoc === "admit"
                      ? "bg-indigo-600 text-white font-bold border-indigo-500 shadow-md shadow-indigo-600/25 ring-2 ring-indigo-400/40"
                      : "bg-slate-50/80 dark:bg-slate-950/60 text-slate-700 dark:text-slate-300 border-slate-200/80 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800"
                  )}
                >
                  <div className="flex items-center justify-between w-full">
                    <FileText className={cn("w-4 h-4", activeDoc === "admit" ? "text-white" : "text-indigo-600 dark:text-indigo-400")} />
                    <span className={cn(
                      "text-[9px] font-mono px-1.5 py-0.2 rounded font-bold",
                      activeDoc === "admit" ? "bg-indigo-800 text-white" : "bg-slate-200/80 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                    )}>
                      21/A4
                    </span>
                  </div>
                  <div>
                    <span className="block text-xs font-bold leading-tight">Admit Cards</span>
                    <span className={cn("text-[9px] block truncate", activeDoc === "admit" ? "text-indigo-100" : "text-slate-400")}>
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
                      : "bg-slate-50/80 dark:bg-slate-950/60 text-slate-700 dark:text-slate-300 border-slate-200/80 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800"
                  )}
                >
                  <div className="flex items-center justify-between w-full">
                    <Tag className={cn("w-4 h-4", activeDoc === "slips" ? "text-white" : "text-emerald-600 dark:text-emerald-400")} />
                    <span className={cn(
                      "text-[9px] font-mono px-1.5 py-0.2 rounded font-bold",
                      activeDoc === "slips" ? "bg-emerald-800 text-white" : "bg-slate-200/80 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                    )}>
                      30/A4
                    </span>
                  </div>
                  <div>
                    <span className="block text-xs font-bold leading-tight">Bench Slips</span>
                    <span className={cn("text-[9px] block truncate", activeDoc === "slips" ? "text-emerald-100" : "text-slate-400")}>
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
                      : "bg-slate-50/80 dark:bg-slate-950/60 text-slate-700 dark:text-slate-300 border-slate-200/80 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800"
                  )}
                >
                  <div className="flex items-center justify-between w-full">
                    <ClipboardList className={cn("w-4 h-4", activeDoc === "attendance" ? "text-white" : "text-amber-600 dark:text-amber-400")} />
                    <span className={cn(
                      "text-[9px] font-mono px-1.5 py-0.2 rounded font-bold",
                      activeDoc === "attendance" ? "bg-amber-800 text-white" : "bg-slate-200/80 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                    )}>
                      8-Days
                    </span>
                  </div>
                  <div>
                    <span className="block text-xs font-bold leading-tight">Attendance</span>
                    <span className={cn("text-[9px] block truncate", activeDoc === "attendance" ? "text-amber-100" : "text-slate-400")}>
                      Signature sheet
                    </span>
                  </div>
                </button>
              </div>
            </div>

            {/* SECTION 2: Target Room Filter (Spacious & Clean Chips) */}
            <div className="space-y-2 pt-1 border-t border-slate-200/80 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <Building className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  <span>Target Examination Room</span>
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                  {rooms.length} Rooms Available
                </span>
              </div>

              {/* Room Search Filter (if > 3 rooms) */}
              {rooms.length > 3 && (
                <div className="relative flex items-center">
                  <Search className="absolute left-2.5 h-3 w-3 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    value={roomSearch}
                    onChange={(e) => setRoomSearch(e.target.value)}
                    placeholder="Search room..."
                    className="w-full pl-7 pr-2 py-1 text-xs bg-slate-50/80 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 outline-none text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:border-indigo-500 transition-all"
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
                      : "bg-slate-50/70 dark:bg-slate-950/60 text-slate-700 dark:text-slate-300 border-slate-200/80 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800"
                  )}
                >
                  <div className="flex items-center space-x-2">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                    <span>All Examination Rooms</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <span className="text-[10px] font-mono bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 font-semibold">
                      {allRoomsTotalStudents} students
                    </span>
                    {targetRoomId === "ALL" && (
                      <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                    )}
                  </div>
                </button>

                {/* 2. Individual Rooms Grid (2 Columns if multiple) */}
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
                            : "bg-slate-50/70 dark:bg-slate-950/60 text-slate-700 dark:text-slate-300 border-slate-200/80 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800"
                        )}
                      >
                        <div className="flex items-center space-x-1.5 min-w-0">
                          <span
                            className={cn(
                              "px-1.5 py-0.5 rounded text-[10px] font-mono font-bold shrink-0",
                              isSelected ? "bg-indigo-600 text-white" : "bg-slate-200/80 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                            )}
                          >
                            #{rIdx + 1}
                          </span>
                          <span className="font-semibold truncate">
                            {formatRoomName(r.roomNumber)}
                          </span>
                        </div>

                        <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 shrink-0 ml-1">
                          {r.occupiedSeats} sts
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* SECTION 3: Document Customization Options */}
            <div className="space-y-2 pt-1 border-t border-slate-200/80 dark:border-slate-800">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Settings2 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>
                  {activeDoc === "admit"
                    ? "Admit Card Options"
                    : activeDoc === "attendance"
                    ? "Attendance Table Headers"
                    : "Bench Slip Layout"}
                </span>
              </span>

              {/* Admit Cards: Issue Date & Headmaster Signature */}
              {activeDoc === "admit" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="p-3 bg-slate-50/90 dark:bg-slate-950/70 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1.5">
                    <div className="flex items-center justify-between text-slate-700 dark:text-slate-300">
                      <span className="font-semibold text-xs flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-indigo-500" /> Issue Date
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={setTodayDate}
                        className="h-5 text-[10px] px-1.5 text-indigo-600 dark:text-indigo-400 hover:bg-slate-200/60 dark:hover:bg-slate-800"
                      >
                        Today
                      </Button>
                    </div>
                    <Input
                      value={issueDate}
                      onChange={(e) => setIssueDate(e.target.value)}
                      placeholder="DD/MM/YYYY"
                      className="h-7 text-xs bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono"
                    />
                  </div>

                  <div className="p-3 bg-slate-50/90 dark:bg-slate-950/70 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <span className="font-semibold text-xs text-slate-800 dark:text-neutral-200 block">
                        Head Signature
                      </span>
                      <span className="text-[10px] text-slate-500 dark:text-neutral-400 truncate block">
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
                      <div className="w-8 h-4.5 bg-slate-300 dark:bg-neutral-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-indigo-600"></div>
                    </label>
                  </div>
                </div>
              )}

              {/* Attendance Sheet: 8 Dynamic Headers (Spacious & Clean Inputs) */}
              {activeDoc === "attendance" && (
                <div className="p-3.5 bg-slate-50/90 dark:bg-slate-950/70 rounded-2xl border border-slate-200/90 dark:border-slate-800 space-y-3 shadow-2xs">
                  <div className="flex items-center justify-between gap-2 border-b border-slate-200/80 dark:border-slate-800 pb-2.5">
                    <div>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                        <Sliders className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                        <span>8 Exam Column Headers</span>
                      </span>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
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
                        className="h-7 text-[10px] font-medium px-2 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer rounded-lg"
                        title="Set default Date 1 to Date 8 labels"
                      >
                        Date 1-8
                      </Button>
                    </div>
                  </div>

                  {/* 2-Column Wide Inputs with Day Badges */}
                  <div className="grid grid-cols-2 gap-2">
                    {examHeaders.map((header, idx) => (
                      <div
                        key={`header-box-${idx}`}
                        className="flex items-center rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-1 pl-2 gap-1.5 shadow-2xs focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all group"
                      >
                        <span className="text-[10px] font-bold font-mono text-indigo-700 dark:text-indigo-300 shrink-0 bg-indigo-50 dark:bg-indigo-950/60 px-1.5 py-0.5 rounded-md border border-indigo-200/60 dark:border-indigo-800/60 select-none">
                          D{idx + 1}
                        </span>
                        <input
                          type="text"
                          value={header}
                          onChange={(e) => handleHeaderChange(idx, e.target.value)}
                          placeholder={`Subject ${idx + 1}`}
                          className="w-full text-xs bg-transparent border-0 outline-none text-slate-900 dark:text-white font-medium placeholder:text-slate-400"
                        />
                        {header && (
                          <button
                            type="button"
                            onClick={() => handleHeaderChange(idx, "")}
                            className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-slate-600 p-0.5 rounded transition-opacity cursor-pointer mr-1"
                            title="Clear"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Quick Subject Suggestion Tags */}
                  <div className="pt-1.5 border-t border-slate-200/60 dark:border-slate-800">
                    <span className="text-[10px] text-slate-400 font-semibold block mb-1">
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
                          className="text-[10px] bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 hover:border-indigo-300 border border-slate-200 dark:border-slate-800 px-2 py-0.5 rounded-md transition-all cursor-pointer select-none font-medium"
                        >
                          + {sub}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Bench Slips: Layout Specifications */}
              {activeDoc === "slips" && (
                <div className="p-3 bg-slate-50/90 dark:bg-slate-950/70 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
                  <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold text-xs">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>30 Desk Slips / A4 Sheet (Standard 3×10 Grid)</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                    Pre-aligned scissor cutting lines, dual school logos, bold student roll numbers, and anti-copying desk placement.
                  </p>
                </div>
              )}
            </div>

            {/* SECTION 4: Document Summary Pill & Master Print Button */}
            <div className="mt-auto pt-3 border-t border-slate-200/80 dark:border-slate-800 space-y-2.5">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1.5 text-xs">
                <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                  <span>Target Scope:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {targetRoomId === "ALL" ? "All Rooms" : formatRoomName(activeRoomObj?.roomNumber || "")}
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                  <span>Candidates Included:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 font-mono">
                    {totalOccupiedStudents} Students
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                  <span>Paper Output:</span>
                  <span className="font-bold text-indigo-600 dark:text-indigo-400 font-mono">
                    A4 ({currentTotalPages} Page{currentTotalPages > 1 ? "s" : ""})
                  </span>
                </div>
              </div>

              {/* Master Print Button: Prominent, Glowing, Bottom of Sidebar */}
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
          {/* RIGHT VIEWPORT: Glossy Glass Document Preview Studio Canvas */}
          {/* ──────────────────────────────────────────────────────────── */}
          <div className="flex-1 flex flex-col bg-gradient-to-br from-slate-100/90 via-indigo-50/50 to-purple-50/60 dark:from-slate-950 dark:via-indigo-950/20 dark:to-slate-950 relative overflow-hidden print:overflow-visible print:bg-white">
            
            {/* Ambient Glossy Glow Spheres & Frosted Blur Canvas Backing */}
            <div className="absolute -top-28 -left-28 w-[460px] h-[460px] rounded-full bg-gradient-to-tr from-blue-400/25 via-indigo-300/20 to-purple-300/15 dark:from-blue-600/15 dark:via-indigo-600/10 dark:to-transparent blur-[100px] pointer-events-none animate-pulse" />
            <div className="absolute -bottom-28 -right-28 w-[520px] h-[520px] rounded-full bg-gradient-to-br from-violet-400/20 via-purple-300/15 to-pink-300/20 dark:from-violet-600/10 dark:via-pink-600/10 dark:to-transparent blur-[110px] pointer-events-none" />
            <div className="absolute top-1/2 left-1/3 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-indigo-300/10 dark:bg-indigo-700/5 blur-[120px] pointer-events-none" />
            <div className="absolute inset-0 bg-[radial-gradient(#6366f1_1px,transparent_1px)] [background-size:24px_24px] opacity-[0.035] dark:opacity-[0.06] pointer-events-none" />

            {/* Slim Floating Glossy Header: Quick status, Zoom controls & Close (X) */}
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/60 dark:border-white/10 bg-white/60 dark:bg-slate-900/60 backdrop-blur-2xl shrink-0 print:hidden shadow-xs relative z-10">
              <div className="flex items-center gap-2 text-xs">
                <span className="px-2.5 py-1 rounded-lg bg-white/80 dark:bg-neutral-800/80 backdrop-blur-md text-slate-800 dark:text-neutral-200 font-mono text-xs border border-white/80 dark:border-neutral-700 font-bold shadow-2xs">
                  {activeDoc === "admit" ? "Mini Admit Cards (21/Page)" : activeDoc === "slips" ? "Desk Bench Slips (30/Page)" : "Room Attendance Sheet"}
                </span>
                <span className="text-slate-500 dark:text-neutral-400 text-xs hidden sm:inline font-medium">
                  • {totalOccupiedStudents} students ({currentTotalPages} A4 Page{currentTotalPages > 1 ? "s" : ""})
                </span>
              </div>

              {/* Zoom Controls & Prominent Close Button */}
              <div className="flex items-center gap-2">
                <div className="flex items-center bg-white/70 dark:bg-neutral-950/70 backdrop-blur-md rounded-xl border border-white/80 dark:border-neutral-800 p-0.5 shadow-2xs">
                  <button
                    onClick={() => setZoom((z) => Math.max(0.4, Number((z - 0.1).toFixed(2))))}
                    className="p-1.5 hover:bg-white/80 dark:hover:bg-neutral-800 text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white rounded-lg transition-colors cursor-pointer"
                    title="Zoom Out (-10%)"
                  >
                    <ZoomOut className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-xs font-mono px-2 text-slate-700 dark:text-neutral-300 select-none min-w-[44px] text-center font-bold">
                    {Math.round(zoom * 100)}%
                  </span>
                  <button
                    onClick={() => setZoom((z) => Math.min(1.5, Number((z + 0.1).toFixed(2))))}
                    className="p-1.5 hover:bg-white/80 dark:hover:bg-neutral-800 text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white rounded-lg transition-colors cursor-pointer"
                    title="Zoom In (+10%)"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setZoom(0.8)}
                    className="p-1.5 hover:bg-white/80 dark:hover:bg-neutral-800 text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white rounded-lg ml-0.5 transition-colors cursor-pointer"
                    title="Reset to 80% view"
                  >
                    <RotateCcw className="w-3 h-3" />
                  </button>
                </div>

                {/* Prominent High-Contrast Close Button */}
                <button
                  onClick={() => onOpenChange(false)}
                  className="h-8.5 px-3 rounded-xl bg-white/80 hover:bg-rose-50 text-slate-700 hover:text-rose-600 dark:bg-slate-800/80 dark:text-slate-200 dark:hover:bg-rose-950/60 dark:hover:text-rose-400 border border-white/80 dark:border-slate-700 flex items-center gap-1.5 text-xs font-bold transition-all cursor-pointer shadow-2xs hover:border-rose-300 dark:hover:border-rose-800 group backdrop-blur-md"
                  title="Close Print Studio (Esc)"
                >
                  <X className="w-4 h-4 transition-transform group-hover:scale-110" />
                  <span>Close</span>
                  <span className="text-[10px] font-mono text-slate-400 group-hover:text-rose-500 ml-0.5 hidden sm:inline">
                    Esc
                  </span>
                </button>
              </div>
            </div>

            {/* Document Canvas Container with Full Height & Smooth Zoom */}
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
              </div>
            </div>
          </div>
        </div>

        {/* ============================================================== */}
        {/* EMBEDDED ZERO-MARGIN PRINT STYLESHEET */}
        {/* ============================================================== */}
        <style jsx global>{`
          @media print {
            @page {
              size: 210mm 297mm;
              margin: 0 !important;
            }

            body,
            html {
              background: white !important;
              color: black !important;
              margin: 0 !important;
              padding: 0 !important;
              width: 210mm !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }

            /* Hide everything outside the canvas */
            header,
            aside,
            nav,
            button,
            .print\\:hidden {
              display: none !important;
            }

            /* Reset canvas zoom and positioning in native print */
            #ems-printable-canvas {
              transform: none !important;
              width: 210mm !important;
              margin: 0 !important;
              padding: 0 !important;
              box-shadow: none !important;
              border: none !important;
            }

            .ems-admit-sheet,
            .ems-slips-sheet,
            .ems-attendance-sheet {
              width: 210mm !important;
              height: 295mm !important;
              max-height: 295mm !important;
              margin: 0 !important;
              box-sizing: border-box !important;
              overflow: hidden !important;
              page-break-inside: avoid !important;
              break-inside: avoid !important;
            }
          }
        `}</style>
      </DialogContent>
    </Dialog>
  );
};
