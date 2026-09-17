"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
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
  Maximize2,
  Calendar,
  Layers,
  Settings2,
  Sliders,
  SlidersHorizontal,
  X,
  Building2,
  Check,
  Search,
  Sparkles,
  Users,
  CheckCircle2,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Info,
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
  const [zoom, setZoom] = useState<number>(0.85);
  const [isOptionsOpen, setIsOptionsOpen] = useState<boolean>(false);
  const [isRoomPopoverOpen, setIsRoomPopoverOpen] = useState<boolean>(false);
  const [roomSearch, setRoomSearch] = useState<string>("");
  const [schoolProfile, setSchoolProfile] = useState<SchoolProfileData>(getSavedSchoolProfile());
  const [mounted, setMounted] = useState<boolean>(false);

  const roomPopoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Click outside listener for room selector popover
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        roomPopoverRef.current &&
        !roomPopoverRef.current.contains(event.target as Node)
      ) {
        setIsRoomPopoverOpen(false);
      }
    };
    if (isRoomPopoverOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isRoomPopoverOpen]);

  // Options & Settings state
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
  const [examDates, setExamDates] = useState<string[]>(() => Array(8).fill(""));

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
    const updated = Array.from({ length: 8 }).map((_, i) => examHeaders[i] ?? "");
    updated[index] = val;
    setExamHeaders(updated);
  };

  const handleDateChange = (index: number, val: string) => {
    const updated = Array.from({ length: 8 }).map((_, i) => examDates[i] ?? "");
    updated[index] = val;
    setExamDates(updated);
  };

  const handleFillConsecutiveDates = (startOffset = 0) => {
    const d = new Date();
    d.setDate(d.getDate() + startOffset);
    const newDates: string[] = [];
    let cur = new Date(d);
    while (newDates.length < 8) {
      if (cur.getDay() !== 0) {
        const day = String(cur.getDate()).padStart(2, "0");
        const month = String(cur.getMonth() + 1).padStart(2, "0");
        newDates.push(`${day}/${month}`);
      }
      cur.setDate(cur.getDate() + 1);
    }
    setExamDates(newDates);
  };

  const handleAddQuickDate = (dateStr: string) => {
    const nextDates = Array.from({ length: 8 }).map((_, i) => examDates[i] ?? "");
    const emptyIdx = nextDates.findIndex((d) => !d.trim());
    if (emptyIdx !== -1) {
      nextDates[emptyIdx] = dateStr;
    } else {
      nextDates[0] = dateStr;
    }
    setExamDates(nextDates);
  };

  const setTodayDate = () => {
    const d = new Date();
    setIssueDate(
      `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`
    );
  };

  const backAction = onBackToStep4 || onClose;

  return (
    <div className={cn("flex flex-col gap-3 w-full", isDialog ? "h-full min-h-[90vh]" : "min-h-[860px]")}>
      {/* ============================================================== */}
      {/* 1. HEADER: Minimalist, Clean & Primary Print Action            */}
      {/* ============================================================== */}
      <header className="px-4 py-3 rounded-2xl border border-border/80 bg-card/95 backdrop-blur-md shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          {backAction && (
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={backAction}
              className="h-9 w-9 hover:border-primary/40 cursor-pointer shadow-2xs shrink-0 rounded-xl"
              title="Back"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base sm:text-lg font-bold text-foreground tracking-tight truncate">
                Print Suite
              </h1>
              {allocation.examType && (
                <span className="text-xs text-muted-foreground font-medium truncate">
                  • {allocation.examType} ({allocation.academicYear})
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground truncate">
              {schoolProfile.schoolName || "Institutional Examination Studio"}
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
              className="h-9 text-xs font-semibold gap-1.5 hover:border-primary/40 cursor-pointer shadow-2xs rounded-xl"
            >
              <Layers className="h-3.5 w-3.5 text-primary" />
              <span className="hidden sm:inline">View Blueprint</span>
            </Button>
          )}

          {/* Exactly ONE prominent primary Print Document button with keyboard shortcut */}
          <Button
            type="button"
            onClick={handlePrint}
            className="h-9 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white font-bold text-xs gap-2 cursor-pointer shadow-md shadow-indigo-600/25 px-4 rounded-xl hover:scale-[1.01] active:scale-[0.98] transition-all"
          >
            <Printer className="h-4 w-4" />
            <span>Print Document</span>
            <kbd className="text-[10px] font-mono bg-black/25 text-white/95 px-1.5 py-0.5 rounded ml-1 hidden md:inline">
              Ctrl+P
            </kbd>
          </Button>

          {isDialog && onClose && !onBackToStep4 && (
            <button
              onClick={onClose}
              className="h-9 w-9 rounded-xl bg-muted hover:bg-rose-50 text-muted-foreground hover:text-rose-600 dark:hover:bg-rose-950/60 dark:hover:text-rose-400 border border-border flex items-center justify-center transition-all cursor-pointer shadow-2xs shrink-0"
              title="Close (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </header>

      {/* ============================================================== */}
      {/* 2. TOP CONTROL DECK: Split into 2 Rows (Row 1 + Collapsible Row 2) */}
      {/* ============================================================== */}
      <div className="rounded-2xl border border-border/80 bg-card/90 shadow-2xs p-3 sm:p-4 space-y-3 shrink-0">
        {/* ── ROW 1: Always Visible Modern Controls ─────────────────── */}
        <div className="flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-3">
          {/* 4 Document Format Buttons */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 flex-1 max-w-3xl">
            {/* 1. Mini Admit Cards */}
            <button
              type="button"
              onClick={() => setActiveDoc("admit")}
              className={cn(
                "p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between gap-2 select-none",
                activeDoc === "admit"
                  ? "bg-indigo-600 text-white font-bold border-indigo-500 shadow-sm shadow-indigo-600/25 ring-2 ring-indigo-400/40"
                  : "bg-background text-foreground border-border hover:bg-muted/60"
              )}
            >
              <div className="flex items-center gap-2 min-w-0">
                <FileText className={cn("w-4 h-4 shrink-0", activeDoc === "admit" ? "text-white" : "text-indigo-600 dark:text-indigo-400")} />
                <div className="min-w-0">
                  <span className="block text-xs font-bold leading-tight truncate">Admit Cards</span>
                  <span className={cn("text-[10px] block truncate", activeDoc === "admit" ? "text-indigo-100" : "text-muted-foreground")}>
                    Candidate slips
                  </span>
                </div>
              </div>
              <span
                className={cn(
                  "text-[9px] font-mono px-1.5 py-0.5 rounded font-bold shrink-0",
                  activeDoc === "admit" ? "bg-indigo-800 text-white" : "bg-muted text-muted-foreground"
                )}
              >
                21/A4
              </span>
            </button>

            {/* 2. Bench Slips */}
            <button
              type="button"
              onClick={() => setActiveDoc("slips")}
              className={cn(
                "p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between gap-2 select-none",
                activeDoc === "slips"
                  ? "bg-emerald-600 text-white font-bold border-emerald-500 shadow-sm shadow-emerald-600/25 ring-2 ring-emerald-400/40"
                  : "bg-background text-foreground border-border hover:bg-muted/60"
              )}
            >
              <div className="flex items-center gap-2 min-w-0">
                <Tag className={cn("w-4 h-4 shrink-0", activeDoc === "slips" ? "text-white" : "text-emerald-600 dark:text-emerald-400")} />
                <div className="min-w-0">
                  <span className="block text-xs font-bold leading-tight truncate">Bench Slips</span>
                  <span className={cn("text-[10px] block truncate", activeDoc === "slips" ? "text-emerald-100" : "text-muted-foreground")}>
                    Desk labels
                  </span>
                </div>
              </div>
              <span
                className={cn(
                  "text-[9px] font-mono px-1.5 py-0.5 rounded font-bold shrink-0",
                  activeDoc === "slips" ? "bg-emerald-800 text-white" : "bg-muted text-muted-foreground"
                )}
              >
                30/A4
              </span>
            </button>

            {/* 3. Attendance Sheet */}
            <button
              type="button"
              onClick={() => setActiveDoc("attendance")}
              className={cn(
                "p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between gap-2 select-none",
                activeDoc === "attendance"
                  ? "bg-amber-600 text-white font-bold border-amber-500 shadow-sm shadow-amber-600/25 ring-2 ring-amber-400/40"
                  : "bg-background text-foreground border-border hover:bg-muted/60"
              )}
            >
              <div className="flex items-center gap-2 min-w-0">
                <ClipboardList className={cn("w-4 h-4 shrink-0", activeDoc === "attendance" ? "text-white" : "text-amber-600 dark:text-amber-400")} />
                <div className="min-w-0">
                  <span className="block text-xs font-bold leading-tight truncate">Attendance</span>
                  <span className={cn("text-[10px] block truncate", activeDoc === "attendance" ? "text-amber-100" : "text-muted-foreground")}>
                    Register sheet
                  </span>
                </div>
              </div>
              <span
                className={cn(
                  "text-[9px] font-mono px-1.5 py-0.5 rounded font-bold shrink-0",
                  activeDoc === "attendance" ? "bg-amber-800 text-white" : "bg-muted text-muted-foreground"
                )}
              >
                8-Days
              </span>
            </button>

            {/* 4. Gate Notice */}
            <button
              type="button"
              onClick={() => setActiveDoc("gate")}
              className={cn(
                "p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between gap-2 select-none",
                activeDoc === "gate"
                  ? "bg-purple-600 text-white font-bold border-purple-500 shadow-sm shadow-purple-600/25 ring-2 ring-purple-400/40"
                  : "bg-background text-foreground border-border hover:bg-muted/60"
              )}
            >
              <div className="flex items-center gap-2 min-w-0">
                <DoorOpen className={cn("w-4 h-4 shrink-0", activeDoc === "gate" ? "text-white" : "text-purple-600 dark:text-purple-400")} />
                <div className="min-w-0">
                  <span className="block text-xs font-bold leading-tight truncate">Gate Notice</span>
                  <span className={cn("text-[10px] block truncate", activeDoc === "gate" ? "text-purple-100" : "text-muted-foreground")}>
                    Hall poster
                  </span>
                </div>
              </div>
              <span
                className={cn(
                  "text-[9px] font-mono px-1.5 py-0.5 rounded font-bold shrink-0",
                  activeDoc === "gate" ? "bg-purple-800 text-white" : "bg-muted text-muted-foreground"
                )}
              >
                A4 Notice
              </span>
            </button>
          </div>

          {/* Target Room Selector + Customize Options Toggle + Print Summary */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {/* Target Room Selector Popover */}
            <div className="relative" ref={roomPopoverRef}>
              <button
                type="button"
                onClick={() => setIsRoomPopoverOpen((prev) => !prev)}
                className="h-10 px-3 rounded-xl border border-border bg-background hover:bg-muted/70 text-foreground text-xs font-semibold flex items-center gap-2 cursor-pointer shadow-2xs transition-all"
                title="Select target examination room"
              >
                <Building2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                <span className="truncate max-w-[130px] sm:max-w-[160px]">
                  {targetRoomId === "ALL"
                    ? "All Rooms"
                    : formatRoomName(activeRoomObj?.roomNumber || "")}
                </span>
                <span className="text-[10px] font-mono bg-muted text-muted-foreground px-1.5 py-0.5 rounded border border-border">
                  {totalOccupiedStudents} sts
                </span>
                <ChevronDown
                  className={cn(
                    "w-3.5 h-3.5 text-muted-foreground transition-transform duration-200",
                    isRoomPopoverOpen ? "rotate-180" : ""
                  )}
                />
              </button>

              {/* Popover Dropdown Menu */}
              {isRoomPopoverOpen && (
                <div className="absolute top-full left-0 mt-1.5 w-72 sm:w-80 rounded-2xl border border-border bg-popover text-popover-foreground shadow-xl z-50 p-3 space-y-2.5 animate-in fade-in-0 zoom-in-95">
                  <div className="flex items-center justify-between pb-1 border-b border-border/80">
                    <span className="text-xs font-bold text-foreground">Select Target Room</span>
                    <span className="text-[10px] font-mono text-muted-foreground">
                      {rooms.length} Room{rooms.length !== 1 ? "s" : ""}
                    </span>
                  </div>

                  {rooms.length > 3 && (
                    <div className="relative flex items-center">
                      <Search className="absolute left-2.5 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                      <input
                        type="text"
                        value={roomSearch}
                        onChange={(e) => setRoomSearch(e.target.value)}
                        placeholder="Search room, floor..."
                        className="w-full pl-8 pr-2 py-1.5 text-xs bg-muted/40 rounded-xl border border-border outline-none text-foreground placeholder:text-muted-foreground focus:border-indigo-500 transition-all"
                      />
                    </div>
                  )}

                  <div className="max-h-60 overflow-y-auto space-y-1 pr-1">
                    {/* All Examination Rooms option */}
                    <button
                      type="button"
                      onClick={() => {
                        setTargetRoomId("ALL");
                        setIsRoomPopoverOpen(false);
                      }}
                      className={cn(
                        "w-full flex items-center justify-between rounded-xl px-2.5 py-2 text-xs transition-all cursor-pointer border select-none",
                        targetRoomId === "ALL"
                          ? "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-200 font-bold border-indigo-400 dark:border-indigo-600/60 shadow-2xs"
                          : "bg-background text-foreground border-border hover:bg-muted/60"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                        <span>All Examination Rooms</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-mono bg-muted text-muted-foreground px-1.5 py-0.5 rounded border border-border">
                          {allRoomsTotalStudents} sts
                        </span>
                        {targetRoomId === "ALL" && (
                          <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                        )}
                      </div>
                    </button>

                    {/* Filtered Rooms List */}
                    {filteredRooms.map((r, rIdx) => {
                      const isSelected = targetRoomId === r.roomId;
                      return (
                        <button
                          key={r.roomId}
                          type="button"
                          onClick={() => {
                            setTargetRoomId(r.roomId);
                            setIsRoomPopoverOpen(false);
                          }}
                          className={cn(
                            "w-full flex items-center justify-between rounded-xl px-2.5 py-1.5 text-xs transition-all cursor-pointer border select-none",
                            isSelected
                              ? "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-200 font-bold border-indigo-400 dark:border-indigo-600/60 shadow-2xs"
                              : "bg-background text-foreground border-border hover:bg-muted/60"
                          )}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span
                              className={cn(
                                "px-1.5 py-0.5 rounded text-[10px] font-mono font-bold shrink-0",
                                isSelected ? "bg-indigo-600 text-white" : "bg-muted text-muted-foreground"
                              )}
                            >
                              #{rIdx + 1}
                            </span>
                            <div className="text-left min-w-0">
                              <span className="font-semibold block truncate">
                                {formatRoomName(r.roomNumber)}
                              </span>
                              {r.floor && (
                                <span className="text-[10px] text-muted-foreground block truncate">
                                  {r.floor} {r.building ? `• ${r.building}` : ""}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="text-[10px] font-mono text-muted-foreground">
                              {r.occupiedSeats} sts
                            </span>
                            {isSelected && (
                              <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Customize Options Toggle Button */}
            <Button
              type="button"
              variant={isOptionsOpen ? "default" : "outline"}
              size="sm"
              onClick={() => setIsOptionsOpen((prev) => !prev)}
              className={cn(
                "h-10 px-3 text-xs font-semibold gap-2 rounded-xl transition-all cursor-pointer",
                isOptionsOpen
                  ? "bg-indigo-600 text-white hover:bg-indigo-500 shadow-sm shadow-indigo-600/25"
                  : "border-border hover:bg-muted/70 text-foreground"
              )}
              title="Toggle customization options"
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span>Customize Options</span>
              {isOptionsOpen ? (
                <ChevronUp className="w-3.5 h-3.5 opacity-80" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5 opacity-80" />
              )}
            </Button>

            {/* Document & Print Summary snippet */}
            <div className="hidden lg:flex items-center gap-2 px-3 py-2 rounded-xl bg-muted/40 border border-border/80 text-xs text-muted-foreground font-medium select-none">
              <span className="font-semibold text-foreground">
                {targetRoomId === "ALL" ? "All Rooms" : formatRoomName(activeRoomObj?.roomNumber || "")}
              </span>
              <span>•</span>
              <span className="font-mono text-foreground font-bold">{totalOccupiedStudents} Students</span>
              <span>•</span>
              <span className="font-bold text-indigo-600 dark:text-indigo-400 font-mono">
                A4 ({currentTotalPages} Page{currentTotalPages > 1 ? "s" : ""})
              </span>
            </div>
          </div>
        </div>

        {/* ── ROW 2: Collapsible Options Drawer ─────────────────────── */}
        {isOptionsOpen && (
          <div className="pt-3 border-t border-border/70 rounded-xl bg-muted/25 p-3.5 sm:p-4 space-y-3 animate-in fade-in-0 slide-in-from-top-2 duration-200">
            <div className="flex items-center justify-between pb-2 border-b border-border/70">
              <div className="flex items-center gap-2">
                <Settings2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span className="text-xs font-bold text-foreground">
                  {activeDoc === "admit"
                    ? "Admit Card Print Options"
                    : activeDoc === "attendance"
                      ? "Attendance Table Column Headers"
                      : activeDoc === "slips"
                        ? "Bench Slip Layout Specifications"
                        : "Gate Notice Configuration & Summary"}
                </span>
              </div>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsOptionsOpen(false)}
                className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/80 rounded-lg gap-1"
              >
                <ChevronUp className="w-3.5 h-3.5" />
                <span>Hide Options</span>
              </Button>
            </div>

            {/* FOR ADMIT CARDS */}
            {activeDoc === "admit" && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="p-3 bg-card rounded-xl border border-border/90 space-y-1.5 shadow-2xs">
                  <div className="flex items-center justify-between text-foreground">
                    <span className="font-bold text-xs flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                      <span>Issue Date</span>
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={setTodayDate}
                      className="h-5 text-[10px] px-1.5 text-indigo-600 dark:text-indigo-400 hover:bg-muted font-bold"
                    >
                      Today
                    </Button>
                  </div>
                  <Input
                    value={issueDate}
                    onChange={(e) => setIssueDate(e.target.value)}
                    placeholder="DD/MM/YYYY"
                    className="h-8 text-xs bg-muted/30 border-border font-mono rounded-lg"
                  />
                </div>

                <div className="p-3 bg-card rounded-xl border border-border/90 flex items-center justify-between gap-2 shadow-2xs">
                  <div className="min-w-0">
                    <span className="font-bold text-xs text-foreground block">
                      Headmaster Signature
                    </span>
                    <span className="text-[11px] text-muted-foreground truncate block mt-0.5">
                      {schoolProfile.headmasterName || "Authorized Signatory"}
                    </span>
                  </div>

                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={showAdmitSignature}
                      onChange={(e) => setShowAdmitSignature(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>

                <div className="p-3 bg-card rounded-xl border border-border/90 flex items-center gap-2.5 text-xs text-muted-foreground shadow-2xs">
                  <Info className="w-4 h-4 text-indigo-500 shrink-0" />
                  <span className="text-[11px] leading-relaxed">
                    21 mini cards / A4 sheet (3×7 grid) with school watermark, student roll & desk location.
                  </span>
                </div>
              </div>
            )}

            {/* FOR ATTENDANCE SHEET */}
            {activeDoc === "attendance" && (
              <div className="space-y-3.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="text-xs font-bold text-foreground block">
                      Attendance Register Columns (8 Exam Slots)
                    </span>
                    <span className="text-[11px] text-muted-foreground block">
                      Set Subject names and Exam dates independently for each day.
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setExamHeaders(getDynamicSubjectsForClasses(uniqueClasses))}
                      className="h-7 text-[10px] font-bold px-2 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-900/50 bg-indigo-50/50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/60 cursor-pointer rounded-lg gap-1"
                      title="Auto-fill subjects from allocated classes"
                    >
                      <Sparkles className="w-3 h-3 text-indigo-500" />
                      <span>Auto Subjects</span>
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleFillConsecutiveDates(0)}
                      className="h-7 text-[10px] font-bold px-2 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/60 cursor-pointer rounded-lg gap-1"
                      title="Fill 8 consecutive exam dates starting today (skipping Sundays)"
                    >
                      <Calendar className="w-3 h-3 text-emerald-500" />
                      <span>Dates (Today+)</span>
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleFillConsecutiveDates(1)}
                      className="h-7 text-[10px] font-bold px-2 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/60 cursor-pointer rounded-lg gap-1"
                      title="Fill 8 consecutive exam dates starting tomorrow (skipping Sundays)"
                    >
                      <Calendar className="w-3 h-3 text-emerald-500" />
                      <span>Dates (Tmrw+)</span>
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setExamHeaders(Array(8).fill(""));
                        setExamDates(Array(8).fill(""));
                      }}
                      className="h-7 text-[10px] text-muted-foreground hover:text-destructive hover:bg-destructive/10 px-2 cursor-pointer rounded-lg"
                      title="Clear all subjects and dates"
                    >
                      Clear All
                    </Button>
                  </div>
                </div>

                {/* 8 Columns Grid: each day has Day Header + Subject Input + Date Input */}
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-2">
                  {Array.from({ length: 8 }).map((_, idx) => (
                    <div
                      key={`header-box-${idx}`}
                      className="rounded-xl border border-border bg-card p-2 space-y-1.5 shadow-2xs focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500/30 transition-all group"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold font-mono text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 px-1.5 py-0.5 rounded border border-indigo-200/60 dark:border-indigo-800/60 select-none">
                          Day {idx + 1}
                        </span>
                        {(examHeaders[idx] || examDates[idx]) && (
                          <button
                            type="button"
                            onClick={() => {
                              handleHeaderChange(idx, "");
                              handleDateChange(idx, "");
                            }}
                            className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground p-0.5 rounded transition-opacity cursor-pointer"
                            title="Clear this day's subject & date"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>

                      {/* Subject Name Input */}
                      <div className="space-y-0.5">
                        <span className="text-[9px] uppercase font-bold text-muted-foreground/80 tracking-wider block">
                          Subject
                        </span>
                        <input
                          type="text"
                          value={examHeaders[idx] || ""}
                          onChange={(e) => handleHeaderChange(idx, e.target.value)}
                          placeholder={`Sub ${idx + 1}`}
                          className="w-full text-xs bg-muted/30 hover:bg-muted/50 focus:bg-background rounded-md px-1.5 py-1 border border-border/60 outline-none text-foreground font-semibold placeholder:text-muted-foreground/60 transition-colors"
                        />
                      </div>

                      {/* Date Input */}
                      <div className="space-y-0.5">
                        <span className="text-[9px] uppercase font-bold text-muted-foreground/80 tracking-wider block">
                          Date
                        </span>
                        <input
                          type="text"
                          value={examDates[idx] || ""}
                          onChange={(e) => handleDateChange(idx, e.target.value)}
                          placeholder="DD/MM"
                          className="w-full text-xs bg-muted/30 hover:bg-muted/50 focus:bg-background rounded-md px-1.5 py-1 border border-border/60 outline-none text-foreground font-mono text-[11px] placeholder:text-muted-foreground/60 transition-colors"
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Quick Add Subject & Date Chips */}
                <div className="pt-2 border-t border-border/60 space-y-2">
                  {/* Subject Chips */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[10px] text-muted-foreground font-semibold shrink-0">
                      Quick Subject:
                    </span>
                    {["Bengali", "English", "Mathematics", "Phy Science", "Life Science", "History", "Geography", "Health & PE"].map((sub) => (
                      <button
                        key={sub}
                        type="button"
                        onClick={() => {
                          const nextHeaders = Array.from({ length: 8 }).map((_, i) => examHeaders[i] ?? "");
                          const emptyIdx = nextHeaders.findIndex(
                            (h) => !h.trim() || h.startsWith("Exam ")
                          );
                          if (emptyIdx !== -1) {
                            nextHeaders[emptyIdx] = sub;
                          } else {
                            nextHeaders[0] = sub;
                          }
                          setExamHeaders(nextHeaders);
                        }}
                        className="text-[10px] bg-card text-foreground hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 hover:border-indigo-300 border border-border px-2 py-0.5 rounded-md transition-all cursor-pointer select-none font-medium"
                      >
                        + {sub}
                      </button>
                    ))}
                  </div>

                  {/* Date Chips */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[10px] text-muted-foreground font-semibold shrink-0">
                      Quick Date:
                    </span>
                    {(() => {
                      const today = new Date();
                      const d1 = `${String(today.getDate()).padStart(2, "0")}/${String(today.getMonth() + 1).padStart(2, "0")}`;
                      const tomorrow = new Date(today);
                      tomorrow.setDate(tomorrow.getDate() + 1);
                      const d2 = `${String(tomorrow.getDate()).padStart(2, "0")}/${String(tomorrow.getMonth() + 1).padStart(2, "0")}`;
                      const dayAfter = new Date(today);
                      dayAfter.setDate(dayAfter.getDate() + 2);
                      const d3 = `${String(dayAfter.getDate()).padStart(2, "0")}/${String(dayAfter.getMonth() + 1).padStart(2, "0")}`;

                      return [
                        { label: `Today (${d1})`, val: d1 },
                        { label: `Tomorrow (${d2})`, val: d2 },
                        { label: `+2 Days (${d3})`, val: d3 },
                      ].map((chip) => (
                        <button
                          key={chip.val}
                          type="button"
                          onClick={() => handleAddQuickDate(chip.val)}
                          className="text-[10px] bg-card text-foreground hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 hover:border-emerald-300 border border-border px-2 py-0.5 rounded-md transition-all cursor-pointer select-none font-mono font-medium"
                        >
                          + {chip.label}
                        </button>
                      ));
                    })()}
                    <button
                      type="button"
                      onClick={() => setExamDates(Array(8).fill(""))}
                      className="text-[10px] text-muted-foreground hover:text-destructive hover:bg-destructive/10 border border-transparent px-2 py-0.5 rounded-md transition-all cursor-pointer select-none"
                    >
                      Clear Dates
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* FOR BENCH SLIPS */}
            {activeDoc === "slips" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-foreground">
                <div className="p-3 bg-card rounded-xl border border-border/90 space-y-1 shadow-2xs">
                  <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>30 Desk Slips / A4 Sheet (3×10 Grid)</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Designed for rapid scissor cutting with micro cut lines, institutional crest, and student roll numbers.
                  </p>
                </div>

                <div className="p-3 bg-card rounded-xl border border-border/90 space-y-1 shadow-2xs">
                  <div className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 font-bold">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Physical Desk Coordinates</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Includes Column Index, Bench Index, and Seat Position (S1/S2/S3) for orderly anti-copying placement.
                  </p>
                </div>
              </div>
            )}

            {/* FOR GATE NOTICE */}
            {activeDoc === "gate" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-foreground">
                <div className="p-3 bg-card rounded-xl border border-border/90 space-y-1 shadow-2xs">
                  <div className="flex items-center gap-1.5 text-purple-600 dark:text-purple-400 font-bold">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Examination Hall Door Noticeboard Poster</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Official door poster showing room location, floor, capacity, and allocated candidate roll ranges.
                  </p>
                </div>

                <div className="p-3 bg-card rounded-xl border border-border/90 space-y-1 shadow-2xs">
                  <div className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 font-bold">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Invigilator Verification Roster</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Includes student roll numbers, ID numbers, seated desks, invigilator check boxes, and board guidelines.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ============================================================== */}
      {/* 3. BOTTOM PREVIEW CANVAS: Full-Width Clean Document Viewport   */}
      {/* ============================================================== */}
      <div className="flex-1 flex flex-col rounded-2xl border border-border/80 bg-card overflow-hidden shadow-xs relative print:overflow-visible print:border-0 print:shadow-none">
        {/* Preview Toolbar */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/80 bg-muted/20 backdrop-blur-md shrink-0 print:hidden z-10">
          <div className="flex items-center gap-2 text-xs">
            <span className="px-2.5 py-1 rounded-lg bg-background text-foreground font-mono text-xs border border-border font-bold shadow-2xs">
              {activeDoc === "admit"
                ? "Mini Admit Cards (21/Page)"
                : activeDoc === "slips"
                  ? "Desk Bench Slips (30/Page)"
                  : activeDoc === "attendance"
                    ? "Room Attendance Sheet"
                    : "Room Gate Notice"}
            </span>
            <span className="text-muted-foreground text-xs hidden sm:inline font-medium">
              • {targetRoomId === "ALL" ? "All Rooms" : formatRoomName(activeRoomObj?.roomNumber || "")} ({totalOccupiedStudents} Students, {currentTotalPages} A4 Page{currentTotalPages > 1 ? "s" : ""})
            </span>
          </div>

          {/* Zoom Controls */}
          <div className="flex items-center gap-1.5">
            <div className="flex items-center bg-background rounded-xl border border-border p-0.5 shadow-2xs">
              <button
                type="button"
                onClick={() => setZoom((z) => Math.max(0.3, Number((z - 0.1).toFixed(2))))}
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
                onClick={() => setZoom((z) => Math.min(1.6, Number((z + 0.1).toFixed(2))))}
                className="p-1.5 hover:bg-muted text-muted-foreground hover:text-foreground rounded-lg transition-colors cursor-pointer"
                title="Zoom In (+10%)"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setZoom(0.85)}
                className="p-1.5 hover:bg-muted text-muted-foreground hover:text-foreground rounded-lg ml-0.5 transition-colors cursor-pointer"
                title="Reset to 85% view"
              >
                <RotateCcw className="w-3 h-3" />
              </button>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setZoom(1.0)}
              className="h-8 px-2.5 text-xs font-semibold text-muted-foreground hover:text-foreground rounded-xl hidden sm:flex items-center gap-1"
              title="Fit 100% scale"
            >
              <Maximize2 className="w-3 h-3" />
              <span>100%</span>
            </Button>
          </div>
        </div>

        {/* Scrollable Canvas Viewport */}
        <div className="flex-1 overflow-auto p-4 sm:p-8 flex justify-center items-start bg-muted/10 print:p-0 print:m-0 print:overflow-visible print:bg-white relative">
          <div
            id="ems-printable-canvas"
            style={{
              transform: `scale(${zoom})`,
              transformOrigin: "top center",
              transition: "transform 0.15s ease-out",
            }}
            className="shadow-[0_20px_50px_-15px_rgba(0,0,0,0.25),_0_0_0_1px_rgba(0,0,0,0.06)] dark:shadow-[0_20px_50px_-15px_rgba(0,0,0,0.7),_0_0_0_1px_rgba(255,255,255,0.1)] print:shadow-none print:transform-none print:w-full print:m-0 print:p-0 flex flex-col items-center"
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
                examDates={examDates}
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

      {/* ============================================================== */}
      {/* 4. DEDICATED DIRECT-TO-BODY PRINT PORTAL                        */}
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
              examDates={examDates}
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
