"use client";

import React, { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
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
  getDatabaseSubjectsForClass,
  syncAllEmsConfigsFromDb,
  formatRoomName,
} from "@/lib/ems/ems-config-loader";
import { isHigherSecondaryClass } from "@/lib/ems/seat-arrangement-algorithm";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { PinchZoomViewer } from "@/components/ui/pinch-zoom-viewer";
import { SearchInput } from "@/components/ui/search-input";

export interface EmsPrintDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  allocation: ExamAllocation;
  defaultRoomId?: string;
  defaultDoc?: PrintDocType;
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
  const [orientation, setOrientation] = useState<"portrait" | "landscape">("portrait");
  const [admitCardsPerPage, setAdmitCardsPerPage] = useState<number>(8);
  const [benchSlipsPerPage, setBenchSlipsPerPage] = useState<number>(33);
  const [examHalf, setExamHalf] = useState<ExamHalf>("1st Half");
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
  const [includeBackSideRoutine, setIncludeBackSideRoutine] = useState<boolean>(true);

  // Dynamically extract unique classes in this exam allocation
  const uniqueClasses = useMemo(() => {
    return Array.from(
      new Set(
        (allocation.summary?.classesAllocated || allocation.roomAllocations?.flatMap((r) => r.classesPresent || []) || [])
          .map((c) => c.split("-")[0].trim())
      )
    );
  }, [allocation]);

  // Dynamic subjects list based on loaded allocation classes
  const availableSubjects = useMemo(() => {
    const subsSet = new Set<string>();
    uniqueClasses.forEach((cls) => {
      const classSubs = getDatabaseSubjectsForClass(cls);
      if (classSubs && classSubs.length > 0) {
        classSubs.forEach((s) => subsSet.add(s));
      }
    });

    if (subsSet.size === 0) {
      return [
        "Bengali",
        "English",
        "Mathematics",
        "Physical Science",
        "Life Science",
        "History",
        "Geography",
        "Physics",
        "Chemistry",
        "Biology",
        "Computer Application",
        "Health & Physical Education",
      ];
    }

    return Array.from(subsSet);
  }, [uniqueClasses]);

  // Helper to load clean preset subjects for any class
  const loadPresetSubjectsForClass = (cls: string): string[] => {
    const cleanCls = (cls || "VII").trim().toUpperCase().replace(/^CLASS\s*[-_]?\s*/i, "");
    const subs = getDatabaseSubjectsForClass(cleanCls, [], false);
    if (subs && subs.length > 0) return subs;
    return isHigherSecondaryClass(cleanCls)
      ? ["Bengali", "English", "Physics", "Chemistry", "Mathematics", "Biology"]
      : ["Bengali", "English", "Mathematics", "Physical Science", "Life Science", "History", "Geography"];
  };

  const [classSubjectsConfig, setClassSubjectsConfig] = useState<Record<string, { headers: string[]; dates: string[] }>>(() => {
    const init: Record<string, { headers: string[]; dates: string[] }> = {};
    uniqueClasses.forEach((cls) => {
      const subs = loadPresetSubjectsForClass(cls);
      init[cls] = {
        headers: subs,
        dates: Array(subs.length).fill(""),
      };
    });
    return init;
  });

  const [selectedClassTab, setSelectedClassTab] = useState<string>(() => uniqueClasses[0] || "");

  // Update classSubjectsConfig whenever uniqueClasses change or missing
  useEffect(() => {
    setClassSubjectsConfig((prev) => {
      let changed = false;
      const updated = { ...prev };
      uniqueClasses.forEach((cls) => {
        if (!updated[cls] || updated[cls].headers.length === 0) {
          const subs = loadPresetSubjectsForClass(cls);
          updated[cls] = {
            headers: subs,
            dates: Array(subs.length).fill(""),
          };
          changed = true;
        }
      });
      return changed ? updated : prev;
    });

    if (uniqueClasses.length > 0 && (!selectedClassTab || !uniqueClasses.includes(selectedClassTab))) {
      setSelectedClassTab(uniqueClasses[0]);
    }
  }, [uniqueClasses]);

  const activeClass = selectedClassTab || uniqueClasses[0] || "";
  const activeClassConfig = classSubjectsConfig[activeClass] || {
    headers: getDynamicSubjectsForClasses(uniqueClasses, allocation.examType),
    dates: Array(getDynamicSubjectsForClasses(uniqueClasses, allocation.examType).length).fill(""),
  };

  const getClassesForSubject = (subjectName: string): string[] => {
    if (!subjectName) return [];
    const clean = subjectName.trim().toLowerCase();
    return uniqueClasses.filter((c) => {
      const list = classSubjectsConfig[c]?.headers || [];
      return list.some((s) => s.trim().toLowerCase() === clean);
    });
  };

  const handleActiveHeaderChange = (index: number, val: string) => {
    setClassSubjectsConfig((prev) => {
      const cur = prev[activeClass] || { headers: [...activeClassConfig.headers], dates: [...activeClassConfig.dates] };
      const nextHeaders = [...cur.headers];
      nextHeaders[index] = val;
      return { ...prev, [activeClass]: { ...cur, headers: nextHeaders } };
    });
  };

  const handleActiveDateChange = (index: number, val: string) => {
    setClassSubjectsConfig((prev) => {
      const cur = prev[activeClass] || { headers: [...activeClassConfig.headers], dates: [...activeClassConfig.dates] };
      const nextDates = [...cur.dates];
      nextDates[index] = val;
      return { ...prev, [activeClass]: { ...cur, dates: nextDates } };
    });
  };

  const handleActiveAddSubject = () => {
    setClassSubjectsConfig((prev) => {
      const cur = prev[activeClass] || { headers: [...activeClassConfig.headers], dates: [...activeClassConfig.dates] };
      if (cur.headers.length >= 10) return prev;
      return {
        ...prev,
        [activeClass]: {
          headers: [...cur.headers, `Subject ${cur.headers.length + 1}`],
          dates: [...cur.dates, ""],
        },
      };
    });
  };

  const handleActiveRemoveSubject = (index: number) => {
    setClassSubjectsConfig((prev) => {
      const cur = prev[activeClass] || { headers: [...activeClassConfig.headers], dates: [...activeClassConfig.dates] };
      if (cur.headers.length <= 1) return prev;
      return {
        ...prev,
        [activeClass]: {
          headers: cur.headers.filter((_, i) => i !== index),
          dates: cur.dates.filter((_, i) => i !== index),
        },
      };
    });
  };

  const handleActiveResetSubjects = () => {
    const defaults = loadPresetSubjectsForClass(activeClass);
    setClassSubjectsConfig((prev) => ({
      ...prev,
      [activeClass]: {
        headers: defaults,
        dates: Array(defaults.length).fill(""),
      },
    }));
  };

  const handleActiveFillConsecutiveDates = (startOffset = 0) => {
    const d = new Date();
    d.setDate(d.getDate() + startOffset);
    const newDates: string[] = [];
    const cur = new Date(d);
    const count = activeClassConfig.headers.length;
    while (newDates.length < count) {
      if (cur.getDay() !== 0) {
        const day = String(cur.getDate()).padStart(2, "0");
        const month = String(cur.getMonth() + 1).padStart(2, "0");
        newDates.push(`${day}/${month}`);
      }
      cur.setDate(cur.getDate() + 1);
    }
    setClassSubjectsConfig((prev) => ({
      ...prev,
      [activeClass]: {
        ...activeClassConfig,
        dates: newDates,
      },
    }));
  };

  const [examHeaders, setExamHeaders] = useState<string[]>(() =>
    getDynamicSubjectsForClasses(uniqueClasses, allocation.examType)
  );
  const [examDates, setExamDates] = useState<string[]>(() =>
    Array(getDynamicSubjectsForClasses(uniqueClasses, allocation.examType).length).fill("")
  );

  useEffect(() => {
    // When dialog opens, fetch freshest school profile & configs from database
    syncAllEmsConfigsFromDb().then(({ profile }) => {
      setSchoolProfile(profile);
    });
  }, [open]);

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

  const handlePrint = () => {
    setTimeout(() => {
      window.print();
    }, 120);
  };

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

  const cardsPerPage = orientation === "landscape" ? 20 : 21;
  const effectiveSlipsPerPage =
    benchSlipsPerPage === 33 || benchSlipsPerPage === 32
      ? 33
      : benchSlipsPerPage === 24
        ? 24
        : orientation === "landscape"
          ? 56
          : 57;

  const totalPagesAdmit = Math.ceil(totalOccupiedStudents / (admitCardsPerPage === 8 ? 8 : cardsPerPage)) || 1;
  const totalPagesSlips = Math.ceil(totalOccupiedStudents / effectiveSlipsPerPage) || 1;
  const totalPagesAttendance = selectedRooms.length || 1;
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

  const handleFillConsecutiveDates = (startOffset = 0) => {
    const d = new Date();
    d.setDate(d.getDate() + startOffset);
    const newDates: string[] = [];
    const cur = new Date(d);
    while (newDates.length < examHeaders.length) {
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
    const nextDates = [...examDates];
    const emptyIdx = nextDates.findIndex((d) => !d?.trim());
    if (emptyIdx !== -1) {
      nextDates[emptyIdx] = dateStr;
    } else if (nextDates.length > 0) {
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

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        overlayClassName="bg-slate-950/45 backdrop-blur-xl"
        className="max-w-[99vw] xl:max-w-[1680px] w-full h-[98vh] p-0 flex flex-col bg-white/70 dark:bg-slate-950/70 backdrop-blur-3xl border border-white/70 dark:border-white/15 text-slate-900 dark:text-slate-100 overflow-hidden shadow-[0_30px_90px_rgba(0,0,0,0.35),inset_0_1px_2px_rgba(255,255,255,0.8)] ring-1 ring-white/50 dark:ring-white/10 print:hidden"
      >

        {/* ============================================================== */}
        {/* PRO FULL-HEIGHT STUDIO: Left (Options & Print) | Right (Preview) */}
        {/* ============================================================== */}
        <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden print:overflow-visible">

          {/* ──────────────────────────────────────────────────────────── */}
          {/* LEFT SIDEBAR: Glossy Frosted Glass Options Panel            */}
          {/* ──────────────────────────────────────────────────────────── */}
          <div className="w-full md:w-[430px] xl:w-[470px] bg-white/60 dark:bg-slate-900/60 backdrop-blur-2xl border-r border-white/60 dark:border-white/10 flex flex-col shrink-0 overflow-y-auto p-4 sm:p-5 space-y-4 print:hidden shadow-xs relative z-10">

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

            {/* SECTION 1: Document Type Switcher (Modern 4-Column Segmented Grid) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  <span>Document Format</span>
                </span>
                <span className="text-[10px] font-mono text-indigo-600 dark:text-indigo-400 font-semibold">
                  4 Standards
                </span>
              </div>

              {/* 4-Card Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
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
                    <span
                      className={cn(
                        "text-[9px] font-mono px-1.5 py-0.5 rounded font-bold",
                        activeDoc === "admit" ? "bg-indigo-800 text-white" : "bg-slate-200/80 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                      )}
                    >
                      {orientation === "landscape" ? "20/A4" : "21/A4"}
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
                    <span
                      className={cn(
                        "text-[9px] font-mono px-1.5 py-0.5 rounded font-bold",
                        activeDoc === "slips" ? "bg-emerald-800 text-white" : "bg-slate-200/80 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                      )}
                    >
                      {benchSlipsPerPage === 33 || benchSlipsPerPage === 32
                        ? "33/A4"
                        : benchSlipsPerPage === 24
                          ? "24/A4"
                          : orientation === "landscape"
                            ? "56/A4"
                            : "57/A4"}
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
                  </div>
                  <div>
                    <span className="block text-xs font-bold leading-tight">Attendance</span>
                    <span className={cn("text-[9px] block truncate", activeDoc === "attendance" ? "text-amber-100" : "text-slate-400")}>
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
                      : "bg-slate-50/80 dark:bg-slate-950/60 text-slate-700 dark:text-slate-300 border-slate-200/80 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800"
                  )}
                >
                  <div className="flex items-center justify-between w-full">
                    <DoorOpen className={cn("w-4 h-4", activeDoc === "gate" ? "text-white" : "text-purple-600 dark:text-purple-400")} />
                    <span className={cn(
                      "text-[9px] font-mono px-1.5 py-0.2 rounded font-bold",
                      activeDoc === "gate" ? "bg-purple-800 text-white" : "bg-slate-200/80 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                    )}>
                      A4 Notice
                    </span>
                  </div>
                  <div>
                    <span className="block text-xs font-bold leading-tight">Gate Notice</span>
                    <span className={cn("text-[9px] block truncate", activeDoc === "gate" ? "text-purple-100" : "text-slate-400")}>
                      Hall door roster
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
                <SearchInput value={roomSearch} onChange={setRoomSearch} placeholder="Search room..." size="sm" className="flex items-center" />
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

              {/* Admit Cards: Orientation, Issue Date & Headmaster Signature */}
              {activeDoc === "admit" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {/* Cards Per Page Selector */}
                  <div className="p-3 bg-slate-50/90 dark:bg-slate-950/70 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1.5">
                    <div className="flex items-center justify-between text-slate-700 dark:text-slate-300">
                      <span className="font-semibold text-xs flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-indigo-500" /> Cards / Page
                      </span>
                      <span className="text-[10px] font-mono text-indigo-600 dark:text-indigo-400 font-bold">
                        {admitCardsPerPage === 8 ? "8 Cards" : "Mini"}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5 bg-slate-200/60 dark:bg-slate-900 p-1 rounded-lg border border-slate-200/80 dark:border-slate-800">
                      <button
                        type="button"
                        onClick={() => setAdmitCardsPerPage(8)}
                        className={cn(
                          "py-1.5 px-2 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5",
                          admitCardsPerPage === 8
                            ? "bg-white dark:bg-slate-800 text-indigo-700 dark:text-indigo-300 shadow-xs border border-slate-200/80 dark:border-slate-700"
                            : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                        )}
                      >
                        <span>8 / Page</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setAdmitCardsPerPage(21)}
                        className={cn(
                          "py-1.5 px-2 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5",
                          admitCardsPerPage !== 8
                            ? "bg-white dark:bg-slate-800 text-indigo-700 dark:text-indigo-300 shadow-xs border border-slate-200/80 dark:border-slate-700"
                            : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                        )}
                      >
                        <span>Mini ({orientation === "landscape" ? "20" : "21"})</span>
                      </button>
                    </div>
                  </div>

                  {/* Page Orientation Selector */}
                  <div className="p-3 bg-slate-50/90 dark:bg-slate-950/70 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1.5">
                    <div className="flex items-center justify-between text-slate-700 dark:text-slate-300">
                      <span className="font-semibold text-xs flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-indigo-500" /> Orientation
                      </span>
                      <span className="text-[10px] font-mono text-indigo-600 dark:text-indigo-400 font-bold">
                        {admitCardsPerPage === 8
                          ? (orientation === "landscape" ? "4×2 Grid (8/A4)" : "2×4 Grid (8/A4)")
                          : (orientation === "landscape" ? "4×5 Grid (20/A4)" : "3×7 Grid (21/A4)")}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5 bg-slate-200/60 dark:bg-slate-900 p-1 rounded-lg border border-slate-200/80 dark:border-slate-800">
                      <button
                        type="button"
                        onClick={() => setOrientation("portrait")}
                        className={cn(
                          "py-1.5 px-2 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5",
                          orientation === "portrait"
                            ? "bg-white dark:bg-slate-800 text-indigo-700 dark:text-indigo-300 shadow-xs border border-slate-200/80 dark:border-slate-700"
                            : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                        )}
                      >
                        <span>Portrait</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setOrientation("landscape")}
                        className={cn(
                          "py-1.5 px-2 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5",
                          orientation === "landscape"
                            ? "bg-white dark:bg-slate-800 text-indigo-700 dark:text-indigo-300 shadow-xs border border-slate-200/80 dark:border-slate-700"
                            : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                        )}
                      >
                        <span>Landscape</span>
                      </button>
                    </div>
                  </div>

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

                  <div className="p-3 bg-slate-50/90 dark:bg-slate-950/70 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <span className="font-semibold text-xs text-slate-800 dark:text-neutral-200 block">
                        Back Routine
                      </span>
                      <span className="text-[10px] text-slate-500 dark:text-neutral-400 truncate block">
                        Both-side duplex print
                      </span>
                    </div>

                    <label className="relative inline-flex items-center cursor-pointer shrink-0">
                      <input
                        type="checkbox"
                        checked={includeBackSideRoutine}
                        onChange={(e) => setIncludeBackSideRoutine(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-8 h-4.5 bg-slate-300 dark:bg-neutral-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-indigo-600"></div>
                    </label>
                  </div>
                </div>
              )}

              {/* Bench Slips: Layout & Cutting Space */}
              {activeDoc === "slips" && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="p-3 bg-slate-50/90 dark:bg-slate-950/70 rounded-2xl border border-slate-200/90 dark:border-slate-800 space-y-1.5 shadow-2xs">
                    <div className="flex items-center justify-between text-foreground">
                      <span className="font-bold text-xs flex items-center gap-1.5">
                        <Sliders className="w-3.5 h-3.5 text-emerald-500" />
                        <span>Slips / Page</span>
                      </span>
                      <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                        {benchSlipsPerPage === 33 || benchSlipsPerPage === 32 ? "33 Slips (3×11)" : benchSlipsPerPage === 24 ? "24 Slips (3×8)" : "57 Mini"}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-1 bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200/80 dark:border-slate-800">
                      <button
                        type="button"
                        onClick={() => setBenchSlipsPerPage(33)}
                        className={cn(
                          "py-1 px-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer text-center",
                          benchSlipsPerPage === 33 || benchSlipsPerPage === 32
                            ? "bg-slate-100 dark:bg-slate-800 text-emerald-600 dark:text-emerald-300 shadow-xs border border-slate-200/80 dark:border-slate-700"
                            : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        33 / Page
                      </button>
                      <button
                        type="button"
                        onClick={() => setBenchSlipsPerPage(24)}
                        className={cn(
                          "py-1 px-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer text-center",
                          benchSlipsPerPage === 24
                            ? "bg-slate-100 dark:bg-slate-800 text-emerald-600 dark:text-emerald-300 shadow-xs border border-slate-200/80 dark:border-slate-700"
                            : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        24 / Page
                      </button>
                      <button
                        type="button"
                        onClick={() => setBenchSlipsPerPage(57)}
                        className={cn(
                          "py-1 px-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer text-center",
                          benchSlipsPerPage === 57
                            ? "bg-slate-100 dark:bg-slate-800 text-emerald-600 dark:text-emerald-300 shadow-xs border border-slate-200/80 dark:border-slate-700"
                            : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        57 Mini
                      </button>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50/90 dark:bg-slate-950/70 rounded-2xl border border-slate-200/90 dark:border-slate-800 space-y-1.5 shadow-2xs">
                    <div className="flex items-center justify-between text-foreground">
                      <span className="font-bold text-xs flex items-center gap-1.5">
                        <Sliders className="w-3.5 h-3.5 text-emerald-500" />
                        <span>Orientation</span>
                      </span>
                      <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                        {orientation === "landscape" ? "Landscape" : "Portrait"}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-1 bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200/80 dark:border-slate-800">
                      <button
                        type="button"
                        onClick={() => setOrientation("portrait")}
                        className={cn(
                          "py-1 px-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer text-center",
                          orientation === "portrait"
                            ? "bg-slate-100 dark:bg-slate-800 text-emerald-600 dark:text-emerald-300 shadow-xs border border-slate-200/80 dark:border-slate-700"
                            : "text-muted-foreground hover:text-foreground"
                          )}
                      >
                        Portrait
                      </button>
                      <button
                        type="button"
                        onClick={() => setOrientation("landscape")}
                        className={cn(
                          "py-1 px-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer text-center",
                          orientation === "landscape"
                            ? "bg-slate-100 dark:bg-slate-800 text-emerald-600 dark:text-emerald-300 shadow-xs border border-slate-200/80 dark:border-slate-700"
                            : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        Landscape
                      </button>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50/90 dark:bg-slate-950/70 rounded-2xl border border-slate-200/90 dark:border-slate-800 flex items-center justify-between gap-2 shadow-2xs">
                    <div className="min-w-0">
                      <span className="font-bold text-xs text-foreground block">
                        Cutting Space
                      </span>
                      <span className="text-[11px] text-muted-foreground truncate block mt-0.5">
                        {benchSlipsPerPage === 33 || benchSlipsPerPage === 32 || benchSlipsPerPage === 24 ? "3mm Cut Margins & Dashed Lines" : "Compact Zero-Margin"}
                      </span>
                    </div>
                    <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-2 py-1 rounded-md">
                      ✂ Ready
                    </span>
                  </div>
                </div>
              )}

              {/* Attendance Sheet: Dynamic Headers & Dates per Class */}
              {activeDoc === "attendance" && (
                <div className="p-3.5 bg-slate-50/90 dark:bg-slate-950/70 rounded-2xl border border-slate-200/90 dark:border-slate-800 space-y-3 shadow-2xs">
                  {/* Class Tabs Switcher if Multiple Classes */}
                  {uniqueClasses.length > 1 && (
                    <div className="flex flex-wrap items-center gap-1.5 p-1.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800">
                      <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 px-2 uppercase tracking-wider">
                        Select Class:
                      </span>
                      {uniqueClasses.map((cls) => {
                        const isSelected = activeClass === cls;
                        const count = classSubjectsConfig[cls]?.headers?.length || 0;
                        return (
                          <button
                            key={cls}
                            type="button"
                            onClick={() => setSelectedClassTab(cls)}
                            className={cn(
                              "px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 select-none",
                              isSelected
                                ? "bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 shadow-xs border border-indigo-200/80 dark:border-indigo-800/80"
                                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100/60 dark:hover:bg-slate-800/60"
                            )}
                          >
                            <span>Class {cls}</span>
                            <span
                              className={cn(
                                "text-[10px] font-mono px-1.5 py-0.2 rounded font-bold",
                                isSelected
                                  ? "bg-indigo-100 dark:bg-indigo-900/80 text-indigo-800 dark:text-indigo-200"
                                  : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
                              )}
                            >
                              {count} subs
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/80 dark:border-slate-800 pb-2.5">
                    <div>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                        <Sliders className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                        <span>Class {activeClass} Subjects ({activeClassConfig.headers.length})</span>
                      </span>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Auto-loaded from presets. Each class prints its own subject columns & dates.
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleActiveAddSubject}
                        disabled={activeClassConfig.headers.length >= 10}
                        className="h-7 text-[10px] font-bold px-2 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-900/50 bg-indigo-50/50 hover:bg-indigo-100 dark:bg-indigo-950/30 dark:hover:bg-indigo-900/50 cursor-pointer rounded-lg gap-1"
                        title="Add Subject Column"
                      >
                        <span>+ Add Subject</span>
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleActiveResetSubjects}
                        className="h-7 text-[10px] font-bold px-2 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer rounded-lg gap-1"
                        title="Reset to default subjects for this class"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Reset</span>
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleActiveFillConsecutiveDates(0)}
                        className="h-7 text-[10px] font-bold px-2 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/50 hover:bg-emerald-100 dark:bg-emerald-950/30 dark:hover:bg-emerald-900/50 cursor-pointer rounded-lg gap-1"
                        title="Fill consecutive exam dates starting today"
                      >
                        <Calendar className="w-3 h-3 text-emerald-500" />
                        <span>Dates (Today+)</span>
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setClassSubjectsConfig((prev) => ({
                            ...prev,
                            [activeClass]: {
                              headers: Array(activeClassConfig.headers.length).fill(""),
                              dates: Array(activeClassConfig.dates.length).fill(""),
                            },
                          }));
                        }}
                        className="h-7 text-[10px] text-muted-foreground hover:text-destructive hover:bg-destructive/10 px-2 cursor-pointer rounded-lg"
                        title="Clear subjects and dates for this class"
                      >
                        Clear
                      </Button>
                    </div>
                  </div>

                  {/* Dynamic Columns Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                    {activeClassConfig.headers.map((headerVal, idx) => {
                      const sharedClasses = getClassesForSubject(headerVal);
                      const classBadgeText = sharedClasses.length > 0 ? sharedClasses.join(", ") : activeClass;

                      return (
                        <div
                          key={`header-box-${activeClass}-${idx}`}
                          className="rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-2 space-y-1.5 shadow-2xs focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500/30 transition-all group"
                        >
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-[10px] font-bold font-mono text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 px-1.5 py-0.5 rounded border border-indigo-200/60 dark:border-indigo-800/60 select-none">
                              Sub {idx + 1}
                            </span>

                            {/* Class Badge: Shows which classes have this subject! */}
                            <span
                              className="text-[9px] font-mono font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/60 px-1.5 py-0.5 rounded truncate max-w-[110px]"
                              title={`Assigned to: Class ${classBadgeText}`}
                            >
                              Class {classBadgeText}
                            </span>

                            {activeClassConfig.headers.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleActiveRemoveSubject(idx)}
                                className="text-muted-foreground hover:text-rose-600 p-0.5 rounded transition-colors cursor-pointer"
                                title="Remove this subject column"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>

                          {/* Subject Selector */}
                          <div className="space-y-0.5">
                            <span className="text-[9px] uppercase font-bold text-muted-foreground/80 tracking-wider block">
                              Subject
                            </span>
                            <Select
                              value={headerVal || ""}
                              onValueChange={(val: string | null) => {
                                handleActiveHeaderChange(idx, val || "");
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
                              value={activeClassConfig.dates[idx] || ""}
                              onChange={(e) => handleActiveDateChange(idx, e.target.value)}
                              placeholder="DD/MM/YYYY"
                              className="w-full text-xs bg-muted/30 hover:bg-muted/50 focus:bg-background rounded-md px-1.5 py-1 border border-border/60 outline-none text-foreground font-mono text-[11px] placeholder:text-muted-foreground/60 transition-colors"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Bench Slips: Orientation & Layout Specifications */}
              {activeDoc === "slips" && (
                <div className="space-y-2">
                  <div className="p-3 bg-slate-50/90 dark:bg-slate-950/70 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1.5">
                    <div className="flex items-center justify-between text-slate-700 dark:text-slate-300">
                      <span className="font-semibold text-xs flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-emerald-500" /> Page Orientation & Grid
                      </span>
                      <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                        {orientation === "landscape" ? "4×14 Grid (56 Slips/A4)" : "3×19 Grid (57 Slips/A4)"}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5 bg-slate-200/60 dark:bg-slate-900 p-1 rounded-lg border border-slate-200/80 dark:border-slate-800">
                      <button
                        type="button"
                        onClick={() => setOrientation("portrait")}
                        className={cn(
                          "py-1.5 px-2 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5",
                          orientation === "portrait"
                            ? "bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-300 shadow-xs border border-slate-200/80 dark:border-slate-700"
                            : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                        )}
                      >
                        <span>Portrait (3×19 • 57 Slips)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setOrientation("landscape")}
                        className={cn(
                          "py-1.5 px-2 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5",
                          orientation === "landscape"
                            ? "bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-300 shadow-xs border border-slate-200/80 dark:border-slate-700"
                            : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                        )}
                      >
                        <span>Landscape (4×14 • 56 Slips)</span>
                      </button>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50/90 dark:bg-slate-950/70 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
                    <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold text-xs">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>
                        {orientation === "landscape" ? "56 Desk Slips / A4 Sheet (4×14 Grid)" : "57 Desk Slips / A4 Sheet (3×19 Grid)"}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                      Pre-aligned scissor cutting lines, school watermark, bold student roll numbers, and column-bench desk placement.
                    </p>
                  </div>
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
                    A4 {orientation === "landscape" && (activeDoc === "admit" || activeDoc === "slips") ? "Landscape" : "Portrait"} ({currentTotalPages} Page{currentTotalPages > 1 ? "s" : ""})
                  </span>
                </div>
              </div>

              {/* Exam Shift (1st Half / 2nd Half) */}
              <div className="flex items-center justify-between p-1.5 bg-slate-100 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 pl-2">
                  Exam Shift:
                </span>
                <div className="flex items-center gap-1 bg-white/80 dark:bg-slate-950/80 p-0.5 rounded-lg border border-slate-200/80 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setExamHalf("1st Half")}
                    className={cn(
                      "px-2.5 py-1 text-xs font-bold rounded-md transition-all cursor-pointer",
                      examHalf === "1st Half"
                        ? "bg-indigo-600 text-white shadow-xs"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                    )}
                  >
                    1st Half
                  </button>
                  <button
                    type="button"
                    onClick={() => setExamHalf("2nd Half")}
                    className={cn(
                      "px-2.5 py-1 text-xs font-bold rounded-md transition-all cursor-pointer",
                      examHalf === "2nd Half"
                        ? "bg-indigo-600 text-white shadow-xs"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                    )}
                  >
                    2nd Half
                  </button>
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
          <div className="flex-1 flex flex-col bg-white/30 dark:bg-slate-950/30 backdrop-blur-2xl relative overflow-hidden print:overflow-visible print:bg-white">

            {/* Ambient Glossy Glow Spheres & Frosted Blur Canvas Backing (Hidden during print) */}
            <div className="print:hidden absolute -top-28 -left-28 w-[500px] h-[500px] rounded-full bg-gradient-to-tr from-blue-400/20 via-indigo-300/15 to-purple-300/15 dark:from-blue-600/15 dark:via-indigo-600/10 dark:to-transparent blur-[110px] pointer-events-none animate-pulse" />
            <div className="print:hidden absolute -bottom-28 -right-28 w-[540px] h-[540px] rounded-full bg-gradient-to-br from-violet-400/20 via-purple-300/15 to-pink-300/15 dark:from-violet-600/10 dark:via-pink-600/10 dark:to-transparent blur-[120px] pointer-events-none" />
            <div className="print:hidden absolute top-1/2 left-1/3 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-indigo-300/10 dark:bg-indigo-700/5 blur-[120px] pointer-events-none" />
            <div className="print:hidden absolute inset-0 bg-[radial-gradient(#6366f1_1px,transparent_1px)] [background-size:24px_24px] opacity-[0.03] dark:opacity-[0.05] pointer-events-none" />

            {/* Slim Floating Glossy Header: Quick status, Zoom controls & Close (X) */}
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/60 dark:border-white/10 bg-white/50 dark:bg-slate-900/50 backdrop-blur-2xl shrink-0 print:hidden shadow-xs relative z-10">
              <div className="flex items-center gap-2 text-xs">
                <span className="px-2.5 py-1 rounded-lg bg-white/80 dark:bg-neutral-800/80 backdrop-blur-md text-slate-800 dark:text-neutral-200 font-mono text-xs border border-white/80 dark:border-neutral-700 font-bold shadow-2xs">
                  {activeDoc === "admit"
                    ? `Mini Admit Cards (${orientation === "landscape" ? "4×5 Landscape • 20/Page" : "3×7 Portrait • 21/Page"})`
                    : activeDoc === "slips"
                      ? `Desk Bench Slips (${orientation === "landscape" ? "4×14 Landscape • 56/Page" : "3×19 Portrait • 57/Page"})`
                      : activeDoc === "attendance"
                        ? "Room Attendance Sheet"
                        : "Room Gate Notice"}
                </span>
                <span className="text-slate-500 dark:text-neutral-400 text-xs hidden sm:inline font-medium">
                  • {totalOccupiedStudents} students ({currentTotalPages} A4 Page{currentTotalPages > 1 ? "s" : ""})
                </span>
              </div>

              {/* Orientation Switcher for Admit & Slips in Preview Header */}
              {(activeDoc === "admit" || activeDoc === "slips") && (
                <div className="hidden sm:inline-flex p-0.5 rounded-xl bg-slate-200/70 dark:bg-slate-800/70 border border-slate-300/80 dark:border-slate-700 shadow-2xs">
                  <button
                    type="button"
                    onClick={() => setOrientation("portrait")}
                    className={cn(
                      "px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer select-none",
                      orientation === "portrait"
                        ? activeDoc === "admit"
                          ? "bg-indigo-600 text-white shadow-xs"
                          : "bg-emerald-600 text-white shadow-xs"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                    )}
                    title={activeDoc === "admit" ? "Portrait (3×7 • 21 Cards)" : "Portrait (3×19 • 57 Slips)"}
                  >
                    Portrait {activeDoc === "admit" ? "(21)" : "(57)"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setOrientation("landscape")}
                    className={cn(
                      "px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer select-none",
                      orientation === "landscape"
                        ? activeDoc === "admit"
                          ? "bg-indigo-600 text-white shadow-xs"
                          : "bg-emerald-600 text-white shadow-xs"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                    )}
                    title={activeDoc === "admit" ? "Landscape (4×5 • 20 Cards)" : "Landscape (4×14 • 56 Slips)"}
                  >
                    Landscape {activeDoc === "admit" ? "(20)" : "(56)"}
                  </button>
                </div>
              )}

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

            {/* Document Canvas Container with Full Height & Smooth Touch Pinch Zoom */}
            <div className="flex-1 overflow-auto p-3 sm:p-6 flex justify-center items-start print:p-0 print:m-0 print:overflow-visible print:bg-white relative z-0">
              <PinchZoomViewer
                scale={zoom}
                onScaleChange={setZoom}
                minScale={0.4}
                maxScale={2.0}
                showControls={false}
                enableScrollMode={true}
                canvasClassName="p-0 border-none bg-transparent shadow-none"
              >
                <div
                  id="ems-printable-canvas"
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
                      examHalf={examHalf}
                      orientation={orientation}
                      cardsPerPage={admitCardsPerPage}
                      routinesByClass={allocation.routinesByClass}
                      examStartTime={allocation.examStartTime}
                      includeBackSideRoutine={includeBackSideRoutine}
                    />
                  )}

                  {activeDoc === "slips" && (
                    <EmsBenchSlipsPrintable
                      rooms={allocation.roomAllocations || []}
                      academicYear={allocation.academicYear}
                      examType={allocation.examType}
                      schoolProfile={schoolProfile}
                      targetRoomId={targetRoomId}
                      orientation={orientation}
                      slipsPerPage={benchSlipsPerPage}
                    />
                  )}

                  {activeDoc === "attendance" && (
                    <EmsAttendanceSheetPrintable
                      rooms={allocation.roomAllocations || []}
                      academicYear={allocation.academicYear}
                      examType={allocation.examType}
                      schoolProfile={schoolProfile}
                      targetRoomId={targetRoomId}
                      classSubjectsMap={classSubjectsConfig}
                      examHeaders={activeClassConfig.headers}
                      examDates={activeClassConfig.dates}
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
              </PinchZoomViewer>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>

    {/* ============================================================== */}
    {/* DEDICATED DIRECT-TO-BODY PRINT PORTAL                          */}
    {/* Completely isolated from dialog zoom, flex, and transforms     */}
    {/* ============================================================== */}
    {mounted && open && typeof document !== "undefined" && createPortal(
      <div
        id="ems-print-isolated-portal"
        data-ems-dialog-portal="true"
        className={cn(
          orientation === "landscape" &&
            (activeDoc === "admit" || activeDoc === "slips") &&
            "ems-orientation-landscape"
        )}
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
            orientation={orientation}
            cardsPerPage={admitCardsPerPage}
            routinesByClass={allocation.routinesByClass}
            examStartTime={allocation.examStartTime}
            includeBackSideRoutine={includeBackSideRoutine}
          />
        )}

        {activeDoc === "slips" && (
          <EmsBenchSlipsPrintable
            rooms={allocation.roomAllocations || []}
            academicYear={allocation.academicYear}
            examType={allocation.examType}
            schoolProfile={schoolProfile}
            targetRoomId={targetRoomId}
            orientation={orientation}
            slipsPerPage={benchSlipsPerPage}
          />
        )}

        {activeDoc === "attendance" && (
          <EmsAttendanceSheetPrintable
            rooms={allocation.roomAllocations || []}
            academicYear={allocation.academicYear}
            examType={allocation.examType}
            schoolProfile={schoolProfile}
            targetRoomId={targetRoomId}
            classSubjectsMap={classSubjectsConfig}
            examHeaders={activeClassConfig.headers}
            examDates={activeClassConfig.dates}
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
    </>
  );
};
