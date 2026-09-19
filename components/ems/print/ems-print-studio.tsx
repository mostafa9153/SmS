"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ExamAllocation, AllocatedRoom, PrintDocType, ExamHalf } from "@/lib/ems/types";
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
  getDatabaseSubjectsForClass,
  syncAllEmsConfigsFromDb,
  formatRoomName,
} from "@/lib/ems/ems-config-loader";
import { getSavedMarksSchemes } from "@/lib/utils/marks-config";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export interface EmsPrintStudioProps {
  allocation: ExamAllocation;
  defaultRoomId?: string;
  defaultDoc?: PrintDocType;
  onBackToStep4?: () => void;
  onViewBlueprint?: () => void;
  onClose?: () => void;
  isDialog?: boolean;
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
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    }
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
  const [examHalf, setExamHalf] = useState<ExamHalf>("1st Half");
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

  // Dynamically extract only the subjects saved in Settings for the classes in this exam allocation
  const availableSubjects = useMemo(() => {
    const subsSet = new Set<string>();
    uniqueClasses.forEach((cls) => {
      const classSubs = getDatabaseSubjectsForClass(cls);
      classSubs.forEach((sub) => {
        if (sub && sub.trim()) subsSet.add(sub.trim());
      });
    });

    if (subsSet.size === 0) {
      const allSchemes = getSavedMarksSchemes();
      allSchemes.forEach((s) => {
        (s.subjects || []).forEach((sub) => {
          if (sub && sub.trim()) subsSet.add(sub.trim().replace(/\s*\([^)]*\)/g, "").trim());
        });
      });
    }

    if (subsSet.size === 0) {
      return [
        "Bengali",
        "English",
        "Mathematics",
        "Physical Science",
        "Life Science",
        "History",
        "Geography",
        "Health & Physical Education",
      ];
    }

    return Array.from(subsSet);
  }, [uniqueClasses]);

  const [examHeaders, setExamHeaders] = useState<string[]>(() =>
    getDynamicSubjectsForClasses(uniqueClasses, allocation.examType)
  );
  const [examDates, setExamDates] = useState<string[]>(() =>
    Array(getDynamicSubjectsForClasses(uniqueClasses, allocation.examType).length || 6).fill("")
  );

  useEffect(() => {
    // Fetch freshest school profile & configs from database
    syncAllEmsConfigsFromDb().then(({ profile }) => {
      setSchoolProfile(profile);
    });

    // Auto-update subjects based on allocated classes
    const defaultSubs = getDynamicSubjectsForClasses(uniqueClasses, allocation.examType);
    setExamHeaders(defaultSubs);
    setExamDates(Array(defaultSubs.length).fill(""));
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
  const totalPagesSlips = Math.ceil(totalOccupiedStudents / 57) || 1;
  const totalPagesAttendance =
    selectedRooms.reduce((acc, r) => {
      const studentCount = r.seats.filter((s) => !s.isVacant && s.studentName).length;
      return acc + Math.max(1, Math.ceil(studentCount / 50));
    }, 0) || 1;
  const totalPagesGate = selectedRooms.length || 1;

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

  const handleDateChange = (index: number, val: string) => {
    const updated = [...examDates];
    updated[index] = val;
    setExamDates(updated);
  };

  const handleAddSubjectColumn = () => {
    if (examHeaders.length >= 10) return;
    const nextIdx = examHeaders.length + 1;
    setExamHeaders([...examHeaders, `Subject ${nextIdx}`]);
    setExamDates([...examDates, ""]);
  };

  const handleRemoveSubjectColumn = (index: number) => {
    if (examHeaders.length <= 1) return;
    setExamHeaders(examHeaders.filter((_, i) => i !== index));
    setExamDates(examDates.filter((_, i) => i !== index));
  };

  const handleResetSubjects = () => {
    const defaultSubs = getDynamicSubjectsForClasses(uniqueClasses, allocation.examType);
    setExamHeaders(defaultSubs);
    setExamDates(Array(defaultSubs.length).fill(""));
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
            <h1 className="text-base sm:text-lg font-bold text-foreground tracking-tight truncate">
              Print Suite
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 flex-wrap sm:flex-nowrap">
          {/* 1st Half / 2nd Half Switcher (Placed right before Print Document) */}
          <div className="inline-flex p-0.5 rounded-xl bg-muted/80 border border-border/80 shadow-2xs">
            <button
              type="button"
              onClick={() => setExamHalf("1st Half")}
              className={cn(
                "px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer select-none",
                examHalf === "1st Half"
                  ? "bg-amber-500 text-white shadow-xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
              title="Select 1st Half Examination Shift"
            >
              1st Half
            </button>
            <button
              type="button"
              onClick={() => setExamHalf("2nd Half")}
              className={cn(
                "px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer select-none",
                examHalf === "2nd Half"
                  ? "bg-amber-500 text-white shadow-xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
              title="Select 2nd Half Examination Shift"
            >
              2nd Half
            </button>
          </div>

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
                "h-10 px-3 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between gap-2 select-none group",
                activeDoc === "admit"
                  ? "bg-indigo-600 text-white font-bold border-indigo-500 shadow-sm shadow-indigo-600/25 ring-2 ring-indigo-400/40"
                  : "bg-background text-foreground border-border hover:bg-muted/60"
              )}
            >
              <div className="flex items-center gap-2 min-w-0">
                <FileText className={cn("w-4 h-4 shrink-0", activeDoc === "admit" ? "text-white" : "text-indigo-600 dark:text-indigo-400")} />
                <span className="block text-xs font-bold leading-tight truncate">Admit Cards</span>
              </div>
              <span
                className={cn(
                  "text-[9px] font-mono px-1.5 py-0.5 rounded font-bold shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-150",
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
                "h-10 px-3 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between gap-2 select-none group",
                activeDoc === "slips"
                  ? "bg-emerald-600 text-white font-bold border-emerald-500 shadow-sm shadow-emerald-600/25 ring-2 ring-emerald-400/40"
                  : "bg-background text-foreground border-border hover:bg-muted/60"
              )}
            >
              <div className="flex items-center gap-2 min-w-0">
                <Tag className={cn("w-4 h-4 shrink-0", activeDoc === "slips" ? "text-white" : "text-emerald-600 dark:text-emerald-400")} />
                <span className="block text-xs font-bold leading-tight truncate">Bench Slips</span>
              </div>
              <span
                className={cn(
                  "text-[9px] font-mono px-1.5 py-0.5 rounded font-bold shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-150",
                  activeDoc === "slips" ? "bg-emerald-800 text-white" : "bg-muted text-muted-foreground"
                )}
              >
                57/A4
              </span>
            </button>

            {/* 3. Attendance Sheet */}
            <button
              type="button"
              onClick={() => setActiveDoc("attendance")}
              className={cn(
                "h-10 px-3 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between gap-2 select-none group",
                activeDoc === "attendance"
                  ? "bg-amber-600 text-white font-bold border-amber-500 shadow-sm shadow-amber-600/25 ring-2 ring-amber-400/40"
                  : "bg-background text-foreground border-border hover:bg-muted/60"
              )}
            >
              <div className="flex items-center gap-2 min-w-0">
                <ClipboardList className={cn("w-4 h-4 shrink-0", activeDoc === "attendance" ? "text-white" : "text-amber-600 dark:text-amber-400")} />
                <span className="block text-xs font-bold leading-tight truncate">Attendance</span>
              </div>
              <span
                className={cn(
                  "text-[9px] font-mono px-1.5 py-0.5 rounded font-bold shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-150",
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
                "h-10 px-3 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between gap-2 select-none group",
                activeDoc === "gate"
                  ? "bg-purple-600 text-white font-bold border-purple-500 shadow-sm shadow-purple-600/25 ring-2 ring-purple-400/40"
                  : "bg-background text-foreground border-border hover:bg-muted/60"
              )}
            >
              <div className="flex items-center gap-2 min-w-0">
                <DoorOpen className={cn("w-4 h-4 shrink-0", activeDoc === "gate" ? "text-white" : "text-purple-600 dark:text-purple-400")} />
                <span className="block text-xs font-bold leading-tight truncate">Gate Notice</span>
              </div>
              <span
                className={cn(
                  "text-[9px] font-mono px-1.5 py-0.5 rounded font-bold shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-150",
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


          </div>
        </div>

        {/* ── ROW 2: Collapsible Options Drawer ─────────────────────── */}
        {isOptionsOpen && (
          <div className="pt-3 border-t border-border/70 rounded-xl bg-muted/25 p-3.5 sm:p-4 space-y-3 animate-in fade-in-0 slide-in-from-top-2 duration-200">
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
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-foreground">
                      Subject Columns ({examHeaders.length})
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      Columns dynamically resize on the printed attendance sheet
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleAddSubjectColumn}
                      disabled={examHeaders.length >= 10}
                      className="h-7 text-xs font-bold gap-1 rounded-lg border-indigo-500/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 cursor-pointer"
                    >
                      <span>+ Add Subject</span>
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleResetSubjects}
                      className="h-7 text-[11px] text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      Reset Defaults
                    </Button>
                  </div>
                </div>

                {/* Dynamic Subject Columns Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 lg:grid-cols-6 gap-2">
                  {examHeaders.map((headerVal, idx) => (
                    <div
                      key={`header-box-${idx}`}
                      className="rounded-xl border border-border bg-card p-2 space-y-1.5 shadow-2xs focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500/30 transition-all group"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold font-mono text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 px-1.5 py-0.5 rounded border border-indigo-200/60 dark:border-indigo-800/60 select-none">
                          Sub {idx + 1}
                        </span>
                        {examHeaders.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveSubjectColumn(idx)}
                            className="text-muted-foreground hover:text-rose-600 p-0.5 rounded transition-colors cursor-pointer"
                            title="Remove this subject column"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      {/* Subject Dropdown Selector */}
                      <div className="space-y-0.5">
                        <span className="text-[9px] uppercase font-bold text-muted-foreground/80 tracking-wider block">
                          Subject
                        </span>
                        <Select
                          value={headerVal || ""}
                          onValueChange={(val: string | null) => {
                            handleHeaderChange(idx, val || "");
                          }}
                        >
                          <SelectTrigger className="h-7 text-xs bg-muted/30 hover:bg-muted/50 focus-visible:bg-background border-border/60 rounded-md px-2 py-0.5 text-foreground font-semibold">
                            <SelectValue placeholder="Select Subject" />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl min-w-44 z-[60]">
                            {availableSubjects.map((sub) => (
                              <SelectItem key={sub} value={sub} className="text-xs">
                                {sub}
                              </SelectItem>
                            ))}
                            {headerVal && !availableSubjects.includes(headerVal) && (
                              <SelectItem value={headerVal} className="text-xs">
                                {headerVal}
                              </SelectItem>
                            )}
                          </SelectContent>
                        </Select>
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
                          placeholder="DD/MM/YYYY"
                          className="w-full text-xs bg-muted/30 hover:bg-muted/50 focus:bg-background rounded-md px-1.5 py-1 border border-border/60 outline-none text-foreground font-mono text-[11px] placeholder:text-muted-foreground/60 transition-colors"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* FOR BENCH SLIPS */}
            {activeDoc === "slips" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-foreground">
                <div className="p-3 bg-card rounded-xl border border-border/90 space-y-1 shadow-2xs">
                  <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>57 Desk Slips / A4 Sheet (3×19 Grid)</span>
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
                    <span>2D Seating Floor Plan / Gate Notice (1 Page Per Room)</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Official door poster showing blackboard, columns, benches, seat positions, student roll numbers, and entrance door.
                  </p>
                </div>

                <div className="p-3 bg-card rounded-xl border border-border/90 space-y-1 shadow-2xs">
                  <div className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 font-bold">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Desk-by-Desk Visual Blueprint</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Provides candidates and invigilators with an immediate, unambiguous visual map of every desk inside the examination hall.
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
                examHalf={examHalf}
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
                examHalf={examHalf}
              />
            )}

            {activeDoc === "gate" && (
              <EmsGateNoticePrintable
                rooms={allocation.roomAllocations || []}
                academicYear={allocation.academicYear}
                examType={allocation.examType}
                schoolProfile={schoolProfile}
                targetRoomId={targetRoomId}
                examHalf={examHalf}
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
              examHalf={examHalf}
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
              examHalf={examHalf}
            />
          )}

          {activeDoc === "gate" && (
            <EmsGateNoticePrintable
              rooms={allocation.roomAllocations || []}
              academicYear={allocation.academicYear}
              examType={allocation.examType}
              schoolProfile={schoolProfile}
              targetRoomId={targetRoomId}
              examHalf={examHalf}
            />
          )}
        </div>,
        document.body
      )}
    </div>
  );
};
