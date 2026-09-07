"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  ChevronDown,
  Sparkles,
  Users,
  Maximize2,
} from "lucide-react";

import {
  getDynamicSubjectsForClasses,
  syncAllEmsConfigsFromDb,
} from "@/lib/ems/ems-config-loader";

export type PrintDocType = "admit" | "slips" | "attendance";

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
  const [zoom, setZoom] = useState<number>(0.75);
  const [schoolProfile, setSchoolProfile] = useState<SchoolProfileData>(getSavedSchoolProfile());
  const [showConfig, setShowConfig] = useState(false);

  // Dedicated Room Dropdown state
  const [isRoomDropdownOpen, setIsRoomDropdownOpen] = useState(false);
  const [roomSearch, setRoomSearch] = useState("");
  const roomDropdownRef = useRef<HTMLDivElement>(null);

  // Settings
  const [issueDate, setIssueDate] = useState<string>(() => {
    const d = new Date();
    return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
  });

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

  // Close room dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (roomDropdownRef.current && !roomDropdownRef.current.contains(e.target as Node)) {
        setIsRoomDropdownOpen(false);
      }
    };
    if (isRoomDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isRoomDropdownOpen]);

  // Keyboard shortcut: Ctrl + P to trigger print, Escape to close dropdown or modal
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "p") {
        e.preventDefault();
        handlePrint();
      } else if (e.key === "Escape") {
        if (isRoomDropdownOpen) {
          e.stopPropagation();
          setIsRoomDropdownOpen(false);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, isRoomDropdownOpen]);

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
    return (
      r.roomNumber.toLowerCase().includes(q) ||
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
      <DialogContent className="max-w-[98vw] xl:max-w-[1480px] w-full h-[95vh] p-0 flex flex-col bg-neutral-950 border-neutral-800 text-neutral-100 overflow-hidden shadow-2xl print:m-0 print:p-0 print:border-none print:w-full print:h-auto print:max-w-none print:bg-white print:text-black">
        
        {/* ============================================================== */}
        {/* TOP LEVEL 1 TOOLBAR: Document Switcher, Actions, and Close */}
        {/* ============================================================== */}
        <div className="relative z-40 flex items-center justify-between gap-3 px-4 py-2.5 border-b border-neutral-800/80 bg-neutral-900/90 backdrop-blur-md shrink-0 print:hidden">
          {/* Left: Brand & Exam Context */}
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-500 flex items-center justify-center text-white shadow-lg shadow-indigo-600/25 shrink-0">
              <Printer className="w-5 h-5" />
            </div>
            <div className="hidden sm:block">
              <div className="flex items-center space-x-2">
                <h2 className="text-sm font-bold text-white tracking-tight leading-tight">
                  EMS Print Studio
                </h2>
                <span className="text-[10px] font-semibold bg-neutral-800 text-neutral-300 px-2 py-0.5 rounded-md border border-neutral-700/80">
                  {allocation.examType}
                </span>
              </div>
              <p className="text-[11px] text-neutral-400 leading-tight mt-0.5">
                {schoolProfile.schoolName || "High School"} • Year {allocation.academicYear}
              </p>
            </div>
          </div>

          {/* Center: High-Contrast Document Switcher */}
          <div className="flex items-center p-1 bg-neutral-950/80 rounded-xl border border-neutral-800/90 shadow-inner">
            <button
              onClick={() => setActiveDoc("admit")}
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 ${
                activeDoc === "admit"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30 ring-1 ring-indigo-400/40"
                  : "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/50"
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Mini Admit Cards</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                activeDoc === "admit" ? "bg-indigo-700/80 text-indigo-100" : "bg-neutral-800 text-neutral-400"
              }`}>
                21/Page
              </span>
            </button>

            <button
              onClick={() => setActiveDoc("slips")}
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 ${
                activeDoc === "slips"
                  ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/30 ring-1 ring-emerald-400/40"
                  : "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/50"
              }`}
            >
              <Tag className="w-3.5 h-3.5" />
              <span>Bench Slips</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                activeDoc === "slips" ? "bg-emerald-700/80 text-emerald-100" : "bg-neutral-800 text-neutral-400"
              }`}>
                30/Page
              </span>
            </button>

            <button
              onClick={() => setActiveDoc("attendance")}
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 ${
                activeDoc === "attendance"
                  ? "bg-amber-600 text-white shadow-md shadow-amber-600/30 ring-1 ring-amber-400/40"
                  : "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/50"
              }`}
            >
              <ClipboardList className="w-3.5 h-3.5" />
              <span>Room Attendance</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                activeDoc === "attendance" ? "bg-amber-700/80 text-amber-100" : "bg-neutral-800 text-neutral-400"
              }`}>
                8-Exam
              </span>
            </button>
          </div>

          {/* Right: Print Button & Close */}
          <div className="flex items-center space-x-2">
            <Button
              onClick={handlePrint}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold h-9 px-4 text-xs shadow-lg shadow-indigo-600/25 transition-all flex items-center space-x-2"
              title="Print official document (Ctrl + P)"
            >
              <Printer className="w-4 h-4" />
              <span>Print Document</span>
              <span className="hidden md:inline-block text-[10px] opacity-75 font-normal bg-indigo-700/80 px-1 rounded">
                Ctrl+P
              </span>
            </Button>

            <button
              onClick={() => onOpenChange(false)}
              className="p-2 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
              title="Close Preview (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ============================================================== */}
        {/* TOP LEVEL 2 CONTROL STRIP: Non-clipping Room Picker, Stats, Zoom */}
        {/* ============================================================== */}
        <div className="relative z-30 flex flex-wrap items-center justify-between gap-3 px-4 py-2 border-b border-neutral-800 bg-neutral-900/60 shrink-0 print:hidden">
          
          {/* Left: Custom Non-Clipping Room Selector */}
          <div className="flex items-center space-x-2.5">
            <div className="relative" ref={roomDropdownRef}>
              <button
                type="button"
                onClick={() => setIsRoomDropdownOpen((prev) => !prev)}
                className="flex items-center justify-between gap-2.5 px-3 py-1.5 w-64 sm:w-80 rounded-xl border border-neutral-700 bg-neutral-800/90 hover:bg-neutral-800 hover:border-neutral-600 text-white transition-all duration-150 shadow-sm outline-none text-left"
              >
                <div className="flex items-center space-x-2 min-w-0">
                  <div className="w-6 h-6 rounded-md bg-neutral-700/60 flex items-center justify-center shrink-0 text-indigo-400">
                    <Building className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-neutral-100 truncate">
                      {targetRoomId === "ALL"
                        ? `All Rooms (${rooms.length} Rooms)`
                        : `Room ${activeRoomObj?.roomNumber || targetRoomId}`}
                    </div>
                    <div className="text-[10px] text-neutral-400 truncate">
                      {targetRoomId === "ALL"
                        ? `Total ${allRoomsTotalStudents} students allocated`
                        : `${activeRoomObj?.floor || "Ground Floor"} • ${activeRoomObj?.occupiedSeats || 0} students`}
                    </div>
                  </div>
                </div>
                <ChevronDown
                  className={`w-4 h-4 text-neutral-400 shrink-0 transition-transform duration-200 ${
                    isRoomDropdownOpen ? "rotate-180 text-indigo-400" : ""
                  }`}
                />
              </button>

              {/* Floating Dropdown Menu (Guaranteed High Z-Index & No Clipping) */}
              {isRoomDropdownOpen && (
                <div className="absolute left-0 top-full mt-1.5 w-80 max-h-80 rounded-xl border border-neutral-700 bg-neutral-900/95 backdrop-blur-xl shadow-2xl p-1.5 z-[100] flex flex-col animate-in fade-in-0 zoom-in-95 duration-150">
                  {/* Search input if more than 3 rooms */}
                  {rooms.length > 3 && (
                    <div className="p-1 pb-1.5 border-b border-neutral-800 mb-1">
                      <div className="relative flex items-center">
                        <Search className="absolute left-2.5 h-3 w-3 text-neutral-400 pointer-events-none" />
                        <input
                          type="text"
                          value={roomSearch}
                          onChange={(e) => setRoomSearch(e.target.value)}
                          placeholder="Search room number or floor..."
                          className="w-full pl-7 pr-2 py-1 text-xs bg-neutral-800 rounded-lg border-0 outline-none text-neutral-100 placeholder:text-neutral-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                          autoFocus
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                    </div>
                  )}

                  {/* Room Option List */}
                  <div className="overflow-y-auto max-h-64 space-y-1 pr-1">
                    {/* Option: ALL ROOMS */}
                    <button
                      type="button"
                      onClick={() => {
                        setTargetRoomId("ALL");
                        setIsRoomDropdownOpen(false);
                      }}
                      className={`w-full flex items-center justify-between rounded-lg px-2.5 py-2 text-xs transition-all ${
                        targetRoomId === "ALL"
                          ? "bg-indigo-600/20 text-indigo-300 font-bold border border-indigo-500/40"
                          : "text-neutral-200 hover:bg-neutral-800/80 hover:text-white"
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        <Sparkles className="w-4 h-4 text-indigo-400 shrink-0" />
                        <div className="text-left">
                          <span className="block font-bold">All Rooms</span>
                          <span className="text-[10px] text-neutral-400 font-normal">
                            All {rooms.length} allocated exam rooms ({allRoomsTotalStudents} students)
                          </span>
                        </div>
                      </div>
                      {targetRoomId === "ALL" && (
                        <Check className="w-4 h-4 text-indigo-400 shrink-0 ml-1.5" />
                      )}
                    </button>

                    <div className="h-px bg-neutral-800 my-1" />

                    {/* Individual Rooms */}
                    {filteredRooms.length === 0 ? (
                      <div className="p-3 text-center text-xs text-neutral-500">
                        No matching room found
                      </div>
                    ) : (
                      filteredRooms.map((r) => {
                        const isSelected = targetRoomId === r.roomId;
                        return (
                          <button
                            key={r.roomId}
                            type="button"
                            onClick={() => {
                              setTargetRoomId(r.roomId);
                              setIsRoomDropdownOpen(false);
                            }}
                            className={`w-full flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs transition-all ${
                              isSelected
                                ? "bg-indigo-600/20 text-indigo-300 font-bold border border-indigo-500/40"
                                : "text-neutral-200 hover:bg-neutral-800/80 hover:text-white"
                            }`}
                          >
                            <div className="flex items-center space-x-2 min-w-0">
                              <Building className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                              <div className="text-left min-w-0">
                                <span className="block font-semibold truncate">
                                  Room {r.roomNumber}
                                </span>
                                <span className="text-[10px] text-neutral-400 font-normal block truncate">
                                  {r.floor || "Ground Floor"} • {r.building || "Main Building"}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center space-x-1.5 shrink-0 ml-2">
                              <span className="text-[10px] font-mono bg-neutral-800 text-neutral-300 px-1.5 py-0.5 rounded border border-neutral-700">
                                {r.occupiedSeats} sts
                              </span>
                              {isSelected && (
                                <Check className="w-4 h-4 text-indigo-400" />
                              )}
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Quick Stats Pill */}
            <div className="hidden md:flex items-center space-x-2 text-xs text-neutral-400 bg-neutral-950/70 px-3 py-1.5 rounded-xl border border-neutral-800">
              <Users className="w-3.5 h-3.5 text-neutral-400" />
              <span>
                Students: <strong className="text-white">{totalOccupiedStudents}</strong>
              </span>
              <span className="text-neutral-600">•</span>
              <Layers className="w-3.5 h-3.5 text-indigo-400" />
              <span>
                Pages: <strong className="text-indigo-400">{currentTotalPages} A4</strong>
              </span>
            </div>
          </div>

          {/* Right: Options Drawer Button & Zoom Controls */}
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowConfig(!showConfig)}
              className={`h-8 text-xs border-neutral-700 transition-all ${
                showConfig
                  ? "bg-indigo-600/20 text-indigo-300 border-indigo-500/40"
                  : "bg-neutral-800 text-neutral-300 hover:bg-neutral-700 hover:text-white"
              }`}
            >
              <Settings2 className="w-3.5 h-3.5 mr-1 text-neutral-400" />
              <span>Document Options</span>
            </Button>

            <div className="flex items-center bg-neutral-950 rounded-lg border border-neutral-800 p-0.5 shadow-inner">
              <button
                onClick={() => setZoom((z) => Math.max(0.4, Number((z - 0.1).toFixed(2))))}
                className="p-1.5 hover:bg-neutral-800 text-neutral-400 hover:text-white rounded transition-colors"
                title="Zoom Out (-10%)"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="text-[11px] font-mono px-2 text-neutral-300 select-none min-w-[40px] text-center">
                {Math.round(zoom * 100)}%
              </span>
              <button
                onClick={() => setZoom((z) => Math.min(1.5, Number((z + 0.1).toFixed(2))))}
                className="p-1.5 hover:bg-neutral-800 text-neutral-400 hover:text-white rounded transition-colors"
                title="Zoom In (+10%)"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setZoom(0.75)}
                className="p-1.5 hover:bg-neutral-800 text-neutral-400 hover:text-white rounded ml-0.5 transition-colors"
                title="Reset to 75% standard view"
              >
                <RotateCcw className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>

        {/* ============================================================== */}
        {/* COLLAPSIBLE DOCUMENT OPTIONS DRAWER */}
        {/* ============================================================== */}
        {showConfig && (
          <div className="relative z-20 p-4 bg-neutral-900 border-b border-neutral-800 text-xs shrink-0 print:hidden animate-in slide-in-from-top-2 duration-150">
            <div className="max-w-5xl mx-auto flex flex-col gap-3">
              {/* Admit Cards: Issue Date */}
              {activeDoc === "admit" && (
                <div className="flex flex-wrap items-center justify-between gap-3 bg-neutral-950/70 p-3 rounded-xl border border-neutral-800">
                  <div className="flex items-center space-x-3">
                    <Calendar className="w-4 h-4 text-indigo-400" />
                    <div>
                      <span className="font-semibold text-neutral-200">Admit Card Issue Date:</span>
                      <p className="text-[11px] text-neutral-400">Printed on the bottom left corner of each student's card</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Input
                      value={issueDate}
                      onChange={(e) => setIssueDate(e.target.value)}
                      placeholder="DD/MM/YYYY"
                      className="h-8 w-36 text-xs bg-neutral-900 border-neutral-700 text-white font-mono"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={setTodayDate}
                      className="h-8 text-xs bg-neutral-800 border-neutral-700 text-neutral-300 hover:bg-neutral-700"
                    >
                      Today
                    </Button>
                  </div>
                </div>
              )}

              {/* Attendance Sheet: 8 Dynamic Headers */}
              {activeDoc === "attendance" && (
                <div className="bg-neutral-950/70 p-3.5 rounded-xl border border-neutral-800 flex flex-col space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-neutral-200">
                        8 Examination Column Headers (Subjects or Dates):
                      </span>
                      <p className="text-[11px] text-neutral-400">
                        Customize what appears in each of the 8 attendance table header boxes
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setExamHeaders(getDynamicSubjectsForClasses(uniqueClasses))}
                        className="h-7 text-[11px] bg-neutral-800 border-neutral-700 text-neutral-300 hover:text-white"
                      >
                        Auto-fill DB Subjects
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setExamHeaders([
                            "Date 1",
                            "Date 2",
                            "Date 3",
                            "Date 4",
                            "Date 5",
                            "Date 6",
                            "Date 7",
                            "Date 8",
                          ])
                        }
                        className="h-7 text-[11px] bg-neutral-800 border-neutral-700 text-neutral-300 hover:text-white"
                      >
                        Date 1-8
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setExamHeaders([
                            "Exam 1",
                            "Exam 2",
                            "Exam 3",
                            "Exam 4",
                            "Exam 5",
                            "Exam 6",
                            "Exam 7",
                            "Exam 8",
                          ])
                        }
                        className="h-7 text-[11px] bg-neutral-800 border-neutral-700 text-neutral-300 hover:text-white"
                      >
                        Exam 1-8
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 sm:grid-cols-8 gap-2 pt-1">
                    {examHeaders.map((header, idx) => (
                      <div key={`header-box-${idx}`} className="flex flex-col space-y-1">
                        <span className="text-[10px] text-neutral-400 font-mono">Day {idx + 1}:</span>
                        <Input
                          value={header}
                          onChange={(e) => handleHeaderChange(idx, e.target.value)}
                          placeholder={`Sub ${idx + 1}`}
                          className="h-7 text-xs bg-neutral-900 border-neutral-700 text-white px-2 text-center font-semibold"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Bench Slips note */}
              {activeDoc === "slips" && (
                <div className="bg-neutral-950/70 p-3 rounded-xl border border-neutral-800 flex items-center space-x-3 text-neutral-300">
                  <Tag className="w-4 h-4 text-emerald-400 shrink-0" />
                  <p className="text-[11px] text-neutral-400">
                    Bench slips are generated automatically with 30 cut-ready slips per A4 page, dual school logos, bold student roll numbers, and seat locations.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* MAIN PREVIEW CANVAS */}
        {/* ============================================================== */}
        <div className="relative z-10 flex-1 overflow-auto bg-neutral-950/90 p-4 sm:p-8 flex justify-center items-start print:p-0 print:m-0 print:overflow-visible print:bg-white">
          <div
            id="ems-printable-canvas"
            style={{
              transform: `scale(${zoom})`,
              transformOrigin: "top center",
              transition: "transform 0.15s ease-out",
            }}
            className="shadow-2xl print:shadow-none print:transform-none print:w-full print:m-0 print:p-0 flex flex-col items-center"
          >
            {activeDoc === "admit" && (
              <EmsAdmitCardPrintable
                rooms={allocation.roomAllocations || []}
                academicYear={allocation.academicYear}
                examType={allocation.examType}
                issueDate={issueDate}
                schoolProfile={schoolProfile}
                targetRoomId={targetRoomId}
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
