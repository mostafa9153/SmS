"use client";

import React, { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { ExamAllocation, AllocatedRoom } from "@/lib/ems/types";
import { getSavedSchoolProfile, SchoolProfileData } from "@/lib/utils/school-profile";
import { syncAllEmsConfigsFromDb, getDynamicSubjectsForClasses } from "@/lib/ems/ems-config-loader";
import { EmsAdmitCardPrintable } from "./ems-admit-card-printable";
import { EmsAttendanceSheetPrintable } from "./ems-attendance-sheet-printable";
import { EmsBenchSlipsPrintable } from "./ems-bench-slips-printable";
import { EmsGateNoticePrintable } from "./ems-gate-notice-printable";
import { EmsPrintDialog, PrintDocType } from "./ems-print-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Printer,
  FileText,
  Tag,
  ClipboardList,
  DoorOpen,
  Sliders,
  Sparkles,
  ArrowLeft,
  CheckCircle2,
  Users,
  Building2,
  Calendar,
  Layers,
  ChevronRight,
  RotateCcw,
  Check,
  X,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface EmsPrintSuiteHubProps {
  allocation: ExamAllocation;
  onBackToStep4: () => void;
  onViewBlueprint?: () => void;
}

export function EmsPrintSuiteHub({
  allocation,
  onBackToStep4,
  onViewBlueprint,
}: EmsPrintSuiteHubProps) {
  const [selectedRoomId, setSelectedRoomId] = useState<string>("ALL");
  const [schoolProfile, setSchoolProfile] = useState<SchoolProfileData>(getSavedSchoolProfile());
  const [mounted, setMounted] = useState(false);

  // Studio dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogDoc, setDialogDoc] = useState<PrintDocType>("admit");

  // Direct 1-Click Quick Print state (renders into isolated print portal and triggers window.print)
  const [quickPrintDoc, setQuickPrintDoc] = useState<PrintDocType | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);

  // Batch Print Modal state
  const [batchModalOpen, setBatchModalOpen] = useState(false);
  const [batchSelectedDocs, setBatchSelectedDocs] = useState<Record<PrintDocType, boolean>>({
    admit: true,
    attendance: true,
    slips: true,
    gate: true,
  });

  const rooms = allocation.roomAllocations || [];

  // Filtered rooms based on selectedRoomId
  const targetRooms = useMemo(() => {
    if (selectedRoomId === "ALL") return rooms;
    return rooms.filter((r) => r.roomId === selectedRoomId);
  }, [rooms, selectedRoomId]);

  // Total students for current target rooms
  const targetTotalStudents = useMemo(() => {
    return targetRooms.reduce(
      (sum, r) => sum + r.seats.filter((s) => !s.isVacant && s.studentName).length,
      0
    );
  }, [targetRooms]);

  const allAllocatedStudents = useMemo(() => {
    return rooms.reduce(
      (sum, r) => sum + r.seats.filter((s) => !s.isVacant && s.studentName).length,
      0
    );
  }, [rooms]);

  // Unique classes for subject retrieval
  const uniqueClasses = useMemo(() => {
    return Array.from(
      new Set(
        (allocation.summary?.classesAllocated || rooms.flatMap((r) => r.classesPresent || []))
          .map((c) => c.split("-")[0].trim())
      )
    );
  }, [allocation, rooms]);

  const examHeaders = useMemo(() => {
    return getDynamicSubjectsForClasses(uniqueClasses);
  }, [uniqueClasses]);

  useEffect(() => {
    setMounted(true);
    syncAllEmsConfigsFromDb().then(({ profile }) => {
      setSchoolProfile(profile);
    });

    const handleProfileUpdate = (e: any) => {
      if (e.detail) setSchoolProfile(e.detail);
    };
    window.addEventListener("sms_school_profile_updated", handleProfileUpdate);
    return () => window.removeEventListener("sms_school_profile_updated", handleProfileUpdate);
  }, []);

  // Quick Print execution handler
  const triggerQuickPrint = (docType: PrintDocType) => {
    setQuickPrintDoc(docType);
    setIsPrinting(true);
    setTimeout(() => {
      window.print();
      setIsPrinting(false);
      // Clean up isolated print portal from DOM after print dialog
      setTimeout(() => {
        setQuickPrintDoc(null);
      }, 500);
    }, 200);
  };

  // Open full studio modal with pre-selected document
  const openCustomStudio = (docType: PrintDocType) => {
    setDialogDoc(docType);
    setDialogOpen(true);
  };

  // Batch Print execution: opens dialog with the first selected document or prints
  const handleStartBatchPrint = () => {
    const selected = (Object.keys(batchSelectedDocs) as PrintDocType[]).filter(
      (k) => batchSelectedDocs[k]
    );
    if (selected.length === 0) return;
    setBatchModalOpen(false);
    setDialogDoc(selected[0]);
    setDialogOpen(true);
  };

  // Page estimate helpers
  const pagesAdmit = Math.ceil(targetTotalStudents / 21) || 1;
  const pagesSlips = Math.ceil(targetTotalStudents / 30) || 1;
  const pagesAttendance = targetRooms.reduce((acc, r) => {
    const studentCount = r.seats.filter((s) => !s.isVacant && s.studentName).length;
    return acc + Math.max(1, Math.ceil(Math.max(25, studentCount + 1) / 28));
  }, 0) || 1;
  const pagesGate = targetRooms.reduce((acc, r) => {
    const studentCount = r.seats.filter((s) => !s.isVacant && s.studentName).length;
    return acc + Math.max(1, Math.ceil(studentCount / 26));
  }, 0) || 1;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* ──────────────────────────────────────────────────────────── */}
      {/* STEP 5 MASTER HEADER: Dedicated Print Suite & Document Hub   */}
      {/* ──────────────────────────────────────────────────────────── */}
      <div className="p-4 sm:p-5 rounded-2xl border border-border/80 bg-card/95 backdrop-blur-md shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-border/60 pb-3.5">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-md shadow-indigo-600/25 shrink-0">
              <Printer className="h-5 w-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight text-foreground">
                  Official Examination Print Suite
                </h2>
                <Badge className="bg-primary/15 text-primary border-primary/25 text-xs font-bold px-2 py-0.5">
                  Ready to Print
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Institutional documents formatted for zero-margin A4 paper printouts.
              </p>
            </div>
          </div>

          {/* Top Master Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            {onViewBlueprint && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onViewBlueprint}
                className="h-8.5 text-xs font-semibold gap-1.5 hover:border-primary/40 cursor-pointer shadow-2xs"
              >
                <Layers className="h-3.5 w-3.5 text-primary" />
                <span>2D Blueprint</span>
              </Button>
            )}

            <Button
              type="button"
              size="sm"
              onClick={() => setBatchModalOpen(true)}
              className="h-8.5 text-xs font-bold gap-1.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white shadow-md shadow-indigo-500/25 cursor-pointer px-3.5 hover:scale-[1.01] active:scale-[0.98] transition-all"
            >
              <Sparkles className="h-3.5 w-3.5 text-amber-300" />
              <span>Batch Print Suite</span>
            </Button>
          </div>
        </div>

        {/* Room Filter Selector & Live Stats Bar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 text-xs">
          {/* Target Room Switcher Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto bg-muted/40 p-1 rounded-xl border border-border/60 shadow-2xs">
            <button
              type="button"
              onClick={() => setSelectedRoomId("ALL")}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer select-none shrink-0 flex items-center gap-1.5",
                selectedRoomId === "ALL"
                  ? "bg-background text-foreground font-bold shadow-xs border border-primary/30 ring-1 ring-primary/20"
                  : "text-muted-foreground hover:text-foreground hover:bg-background/50"
              )}
            >
              <Building2 className="h-3.5 w-3.5 text-primary" />
              <span>All Rooms ({rooms.length})</span>
            </button>

            {rooms.map((room, rIdx) => {
              const isSelected = room.roomId === selectedRoomId;
              const occupied = room.seats.filter((s) => !s.isVacant && s.studentName).length;

              return (
                <button
                  key={room.roomId}
                  type="button"
                  onClick={() => setSelectedRoomId(room.roomId)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer select-none shrink-0 flex items-center gap-1.5",
                    isSelected
                      ? "bg-background text-foreground font-bold shadow-xs border border-primary/30 ring-1 ring-primary/20"
                      : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                  )}
                >
                  <span
                    className={cn(
                      "px-1 py-0.2 rounded text-[10px] font-mono font-bold",
                      isSelected
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    #{rIdx + 1}
                  </span>
                  <span>{room.roomNumber}</span>
                  <span className="text-[10px] opacity-75 font-mono">({occupied})</span>
                </button>
              );
            })}
          </div>

          {/* Target Scope Summary Pill */}
          <div className="flex items-center gap-2 self-start lg:self-auto shrink-0">
            <span className="text-muted-foreground">Scope:</span>
            <Badge variant="secondary" className="font-mono text-xs font-bold gap-1 py-0.5 px-2.5">
              <Users className="h-3.5 w-3.5 text-primary" />
              <span>
                {targetTotalStudents} Student{targetTotalStudents !== 1 ? "s" : ""}
              </span>
              <span className="text-muted-foreground">•</span>
              <span>
                {targetRooms.length} Room{targetRooms.length !== 1 ? "s" : ""}
              </span>
            </Badge>
          </div>
        </div>
      </div>

      {/* ──────────────────────────────────────────────────────────── */}
      {/* 4-CARD DOCUMENT PREVIEW GRID                                  */}
      {/* ──────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* ============================================================ */}
        {/* CARD 1: ADMIT CARDS                                         */}
        {/* ============================================================ */}
        <div className="p-4 sm:p-5 rounded-2xl border border-border/80 bg-card hover:border-indigo-500/40 hover:shadow-md transition-all duration-200 flex flex-col justify-between space-y-4 relative group">
          <div className="space-y-3">
            {/* Card Header: Icon, Badge, Title */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 flex items-center justify-center shrink-0 shadow-2xs">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-foreground">
                    1. Student Admit Cards
                  </h3>
                  <p className="text-[11px] text-muted-foreground">
                    Hall ticket with exam timetable & signature
                  </p>
                </div>
              </div>

              <Badge
                variant="outline"
                className="text-[10px] font-mono font-bold bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/25 shrink-0"
              >
                21 Cards / Page
              </Badge>
            </div>

            {/* Stylized Miniature Document Preview */}
            <div className="p-3 rounded-xl border border-indigo-500/20 bg-indigo-500/[0.02] space-y-2">
              <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground border-b border-border/40 pb-1.5">
                <span className="font-semibold text-foreground uppercase tracking-wider">
                  Layout: 3-Column Grid
                </span>
                <span>
                  ~{pagesAdmit} Page{pagesAdmit !== 1 ? "s" : ""} ({targetTotalStudents} Cards)
                </span>
              </div>

              {/* Visual Mini Mockup */}
              <div className="grid grid-cols-3 gap-1.5 pt-0.5">
                {[1, 2, 3].map((sampleIdx) => (
                  <div
                    key={sampleIdx}
                    className="p-1.5 rounded-lg border border-border/80 bg-background text-[8px] space-y-1 shadow-2xs"
                  >
                    <div className="flex items-center justify-between border-b border-border/40 pb-0.5">
                      <span className="font-black text-[7px] truncate max-w-[45px]">
                        {schoolProfile.schoolName || "HIGH SCHOOL"}
                      </span>
                      <span className="font-mono text-[6.5px] text-indigo-600 dark:text-indigo-400 font-bold">
                        ADMIT
                      </span>
                    </div>
                    <div className="space-y-0.5">
                      <div className="font-bold text-[7.5px] truncate">
                        {sampleIdx === 1 ? "RAHUL MONDAL" : sampleIdx === 2 ? "PRIYA DAS" : "AMIT ROY"}
                      </div>
                      <div className="flex justify-between text-[6.5px] text-muted-foreground font-mono">
                        <span>Roll: {sampleIdx * 12}</span>
                        <span>Cls: VIII-A</span>
                      </div>
                      <div className="bg-muted/60 p-0.5 rounded text-[6px] text-center font-bold">
                        {targetRooms[0]?.roomNumber || "Room 106"} • Desk {sampleIdx}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Summary details */}
            <p className="text-xs text-muted-foreground leading-relaxed">
              Official student hall tickets featuring student registration details, allocated room number, bench location, subject dates, and headmaster signature space.
            </p>
          </div>

          {/* Action Row */}
          <div className="pt-2 border-t border-border/40 flex items-center justify-between gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => openCustomStudio("admit")}
              className="h-8 text-xs font-semibold gap-1.5 hover:border-indigo-500/40 cursor-pointer"
            >
              <Sliders className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>Customize & View</span>
            </Button>

            <Button
              type="button"
              size="sm"
              onClick={() => triggerQuickPrint("admit")}
              className="h-8 text-xs font-bold gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white shadow-xs hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer px-3.5"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Quick Print</span>
            </Button>
          </div>
        </div>

        {/* ============================================================ */}
        {/* CARD 2: EXAMINATION HALL ATTENDANCE SHEETS                  */}
        {/* ============================================================ */}
        <div className="p-4 sm:p-5 rounded-2xl border border-border/80 bg-card hover:border-amber-500/40 hover:shadow-md transition-all duration-200 flex flex-col justify-between space-y-4 relative group">
          <div className="space-y-3">
            {/* Card Header: Icon, Badge, Title */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center justify-center shrink-0 shadow-2xs">
                  <ClipboardList className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-foreground">
                    2. Exam Attendance Sheets
                  </h3>
                  <p className="text-[11px] text-muted-foreground">
                    8-subject invigilator daily signature register
                  </p>
                </div>
              </div>

              <Badge
                variant="outline"
                className="text-[10px] font-mono font-bold bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/25 shrink-0"
              >
                8-Day Matrix
              </Badge>
            </div>

            {/* Stylized Miniature Document Preview */}
            <div className="p-3 rounded-xl border border-amber-500/20 bg-amber-500/[0.02] space-y-2">
              <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground border-b border-border/40 pb-1.5">
                <span className="font-semibold text-foreground uppercase tracking-wider">
                  Layout: Tabular Matrix
                </span>
                <span>
                  {pagesAttendance} Sheet{pagesAttendance !== 1 ? "s" : ""} ({targetRooms.length} Rooms)
                </span>
              </div>

              {/* Visual Mini Mockup */}
              <div className="p-1.5 rounded-lg border border-border/80 bg-background text-[8px] space-y-1 shadow-2xs">
                <div className="flex items-center justify-between border-b border-border/40 pb-0.5">
                  <span className="font-black text-[7px] truncate">
                    ATTENDANCE REGISTER — {targetRooms[0]?.roomNumber || "ROOM 106"}
                  </span>
                  <span className="font-mono text-[6.5px] text-amber-600 dark:text-amber-400 font-bold">
                    8 DATES
                  </span>
                </div>
                <div className="grid grid-cols-6 gap-0.5 text-[6.5px] font-mono text-center pt-0.5">
                  <span className="font-bold bg-muted/60 p-0.5 rounded-xs">Roll</span>
                  <span className="font-bold bg-muted/60 p-0.5 rounded-xs col-span-2">Name</span>
                  <span className="bg-muted/40 p-0.5 rounded-xs">D1</span>
                  <span className="bg-muted/40 p-0.5 rounded-xs">D2</span>
                  <span className="bg-muted/40 p-0.5 rounded-xs">D3</span>
                </div>
                {[1, 2].map((rowIdx) => (
                  <div key={rowIdx} className="grid grid-cols-6 gap-0.5 text-[6.5px] font-mono text-center">
                    <span className="p-0.5 border border-border/40 rounded-xs font-bold">{rowIdx * 11}</span>
                    <span className="p-0.5 border border-border/40 rounded-xs col-span-2 truncate text-left pl-1">
                      {rowIdx === 1 ? "RAHUL M." : "PRIYA D."}
                    </span>
                    <span className="p-0.5 border border-border/40 rounded-xs text-neutral-300">___</span>
                    <span className="p-0.5 border border-border/40 rounded-xs text-neutral-300">___</span>
                    <span className="p-0.5 border border-border/40 rounded-xs text-neutral-300">___</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Summary details */}
            <p className="text-xs text-muted-foreground leading-relaxed">
              Formal examination hall attendance roster grouped by class and room, featuring 8 custom subject/date columns for invigilator verification and signatures.
            </p>
          </div>

          {/* Action Row */}
          <div className="pt-2 border-t border-border/40 flex items-center justify-between gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => openCustomStudio("attendance")}
              className="h-8 text-xs font-semibold gap-1.5 hover:border-amber-500/40 cursor-pointer"
            >
              <Sliders className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
              <span>Customize & View</span>
            </Button>

            <Button
              type="button"
              size="sm"
              onClick={() => triggerQuickPrint("attendance")}
              className="h-8 text-xs font-bold gap-1.5 bg-amber-600 hover:bg-amber-500 text-white shadow-xs hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer px-3.5"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Quick Print</span>
            </Button>
          </div>
        </div>

        {/* ============================================================ */}
        {/* CARD 3: DESK / BENCH SEATING SLIPS                          */}
        {/* ============================================================ */}
        <div className="p-4 sm:p-5 rounded-2xl border border-border/80 bg-card hover:border-emerald-500/40 hover:shadow-md transition-all duration-200 flex flex-col justify-between space-y-4 relative group">
          <div className="space-y-3">
            {/* Card Header: Icon, Badge, Title */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center justify-center shrink-0 shadow-2xs">
                  <Tag className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-foreground">
                    3. Desk & Bench Slips
                  </h3>
                  <p className="text-[11px] text-muted-foreground">
                    Cut-out labels for physical student desks
                  </p>
                </div>
              </div>

              <Badge
                variant="outline"
                className="text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/25 shrink-0"
              >
                30 Slips / Page
              </Badge>
            </div>

            {/* Stylized Miniature Document Preview */}
            <div className="p-3 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.02] space-y-2">
              <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground border-b border-border/40 pb-1.5">
                <span className="font-semibold text-foreground uppercase tracking-wider">
                  Layout: Cut Grid (3x10)
                </span>
                <span>
                  ~{pagesSlips} Page{pagesSlips !== 1 ? "s" : ""} ({targetTotalStudents} Labels)
                </span>
              </div>

              {/* Visual Mini Mockup */}
              <div className="grid grid-cols-3 gap-1.5 pt-0.5">
                {[1, 2, 3].map((sIdx) => (
                  <div
                    key={sIdx}
                    className="p-1 rounded-lg border border-dashed border-emerald-600/40 bg-background text-[8px] space-y-0.5 shadow-2xs"
                  >
                    <div className="flex justify-between font-mono text-[6.5px] font-bold text-emerald-700 dark:text-emerald-300">
                      <span>{targetRooms[0]?.roomNumber || "R106"}</span>
                      <span>C1-B{sIdx}</span>
                    </div>
                    <div className="font-black text-[9px] text-center font-mono">
                      Roll {sIdx * 15}
                    </div>
                    <div className="text-[6.5px] text-center font-semibold truncate text-muted-foreground">
                      Class VIII-A
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Summary details */}
            <p className="text-xs text-muted-foreground leading-relaxed">
              Pre-formatted cut-out labels showing Column, Bench, Seat position, Class, and Student Roll number for pasting directly onto hall desks.
            </p>
          </div>

          {/* Action Row */}
          <div className="pt-2 border-t border-border/40 flex items-center justify-between gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => openCustomStudio("slips")}
              className="h-8 text-xs font-semibold gap-1.5 hover:border-emerald-500/40 cursor-pointer"
            >
              <Sliders className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Customize & View</span>
            </Button>

            <Button
              type="button"
              size="sm"
              onClick={() => triggerQuickPrint("slips")}
              className="h-8 text-xs font-bold gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer px-3.5"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Quick Print</span>
            </Button>
          </div>
        </div>

        {/* ============================================================ */}
        {/* CARD 4: ROOM GATE NOTICES / SUMMARY                         */}
        {/* ============================================================ */}
        <div className="p-4 sm:p-5 rounded-2xl border border-border/80 bg-card hover:border-purple-500/40 hover:shadow-md transition-all duration-200 flex flex-col justify-between space-y-4 relative group">
          <div className="space-y-3">
            {/* Card Header: Icon, Badge, Title */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 flex items-center justify-center shrink-0 shadow-2xs">
                  <DoorOpen className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-foreground">
                    4. Room Gate Notice & Roster
                  </h3>
                  <p className="text-[11px] text-muted-foreground">
                    Hall door entrance notice & seat schedule
                  </p>
                </div>
              </div>

              <Badge
                variant="outline"
                className="text-[10px] font-mono font-bold bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/25 shrink-0"
              >
                A4 Door Poster
              </Badge>
            </div>

            {/* Stylized Miniature Document Preview */}
            <div className="p-3 rounded-xl border border-purple-500/20 bg-purple-500/[0.02] space-y-2">
              <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground border-b border-border/40 pb-1.5">
                <span className="font-semibold text-foreground uppercase tracking-wider">
                  Layout: Noticeboard Poster
                </span>
                <span>
                  {pagesGate} Notice{pagesGate !== 1 ? "s" : ""} ({targetRooms.length} Rooms)
                </span>
              </div>

              {/* Visual Mini Mockup */}
              <div className="p-1.5 rounded-lg border border-border/80 bg-background text-[8px] space-y-1 shadow-2xs">
                <div className="bg-neutral-900 text-white p-1 rounded-xs flex items-center justify-between text-[7px] font-bold">
                  <span>ROOM: {targetRooms[0]?.roomNumber || "ROOM 106"}</span>
                  <span className="font-mono">{targetRooms[0]?.occupiedSeats || 35} CANDIDATES</span>
                </div>
                <div className="bg-purple-50 dark:bg-purple-950/40 p-1 rounded-xs text-[6.5px] font-semibold text-purple-900 dark:text-purple-300 flex justify-between">
                  <span>Classes: VIII-A, IX-B</span>
                  <span>Rolls 11–98, 301..</span>
                </div>
                <div className="grid grid-cols-4 gap-0.5 text-[6.5px] font-mono text-center pt-0.5">
                  <span className="font-bold bg-muted/60 p-0.5 rounded-xs">Seat</span>
                  <span className="font-bold bg-muted/60 p-0.5 rounded-xs">Roll</span>
                  <span className="font-bold bg-muted/60 p-0.5 rounded-xs col-span-2">Name</span>
                </div>
                <div className="grid grid-cols-4 gap-0.5 text-[6.5px] font-mono text-center">
                  <span className="p-0.5 border border-border/40 rounded-xs">C1-B1</span>
                  <span className="p-0.5 border border-border/40 rounded-xs font-bold">11</span>
                  <span className="p-0.5 border border-border/40 rounded-xs col-span-2 truncate text-left pl-1">
                    RAHUL MONDAL
                  </span>
                </div>
              </div>
            </div>

            {/* Summary details */}
            <p className="text-xs text-muted-foreground leading-relaxed">
              Comprehensive entrance notice for classroom doors and school bulletin boards listing room capacity, assigned classes, roll ranges, and student seating roster.
            </p>
          </div>

          {/* Action Row */}
          <div className="pt-2 border-t border-border/40 flex items-center justify-between gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => openCustomStudio("gate")}
              className="h-8 text-xs font-semibold gap-1.5 hover:border-purple-500/40 cursor-pointer"
            >
              <Sliders className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
              <span>Customize & View</span>
            </Button>

            <Button
              type="button"
              size="sm"
              onClick={() => triggerQuickPrint("gate")}
              className="h-8 text-xs font-bold gap-1.5 bg-purple-600 hover:bg-purple-500 text-white shadow-xs hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer px-3.5"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Quick Print</span>
            </Button>
          </div>
        </div>
      </div>

      {/* ──────────────────────────────────────────────────────────── */}
      {/* BOTTOM NAVIGATION: Return to Blueprint or Start New Setup   */}
      {/* ──────────────────────────────────────────────────────────── */}
      <div className="pt-3 border-t border-border/60 flex items-center justify-between">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onBackToStep4}
          className="text-xs font-semibold gap-1.5 hover:border-primary/40 cursor-pointer shadow-2xs"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Seat Arrangement</span>
        </Button>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            onClick={() => setBatchModalOpen(true)}
            className="text-xs font-bold gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground cursor-pointer shadow-sm"
          >
            <Printer className="h-3.5 w-3.5" />
            <span>Print All Documents</span>
          </Button>
        </div>
      </div>

      {/* ──────────────────────────────────────────────────────────── */}
      {/* BATCH PRINT SUITE SELECTION MODAL                            */}
      {/* ──────────────────────────────────────────────────────────── */}
      {batchModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl border border-border/80 bg-card p-5 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20">
                  <Printer className="h-4.5 w-4.5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">
                    Batch Examination Print Suite
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Select the documents you wish to prepare and print.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setBatchModalOpen(false)}
                className="h-8 w-8 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-2">
              {[
                { id: "admit" as PrintDocType, title: "Student Admit Cards", desc: "Hall entry tickets (21/A4)", icon: FileText, color: "text-indigo-600" },
                { id: "attendance" as PrintDocType, title: "Exam Attendance Sheets", desc: "8-subject invigilator matrix", icon: ClipboardList, color: "text-amber-600" },
                { id: "slips" as PrintDocType, title: "Desk / Bench Slips", desc: "Cut-out desk stickers (30/A4)", icon: Tag, color: "text-emerald-600" },
                { id: "gate" as PrintDocType, title: "Room Gate Notices", desc: "Hall door entrance notice posters", icon: DoorOpen, color: "text-purple-600" },
              ].map((item) => {
                const isChecked = batchSelectedDocs[item.id];
                const Icon = item.icon;

                return (
                  <div
                    key={item.id}
                    onClick={() =>
                      setBatchSelectedDocs((prev) => ({
                        ...prev,
                        [item.id]: !prev[item.id],
                      }))
                    }
                    className={cn(
                      "p-3 rounded-xl border flex items-center justify-between gap-3 cursor-pointer select-none transition-all",
                      isChecked
                        ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                        : "border-border/70 bg-card hover:bg-muted/30"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn("p-2 rounded-lg bg-muted/60", item.color)}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-foreground">{item.title}</h4>
                        <p className="text-[11px] text-muted-foreground">{item.desc}</p>
                      </div>
                    </div>

                    <div
                      className={cn(
                        "h-5 w-5 rounded-md border flex items-center justify-center transition-all",
                        isChecked
                          ? "bg-primary border-primary text-primary-foreground"
                          : "border-muted-foreground/40 bg-background"
                      )}
                    >
                      {isChecked && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-2 border-t border-border/60 flex items-center justify-between gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setBatchModalOpen(false)}
                className="text-xs font-semibold cursor-pointer"
              >
                Cancel
              </Button>

              <Button
                type="button"
                size="sm"
                onClick={handleStartBatchPrint}
                className="text-xs font-bold gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground cursor-pointer px-4 shadow-sm"
              >
                <Printer className="h-3.5 w-3.5" />
                <span>Launch Print Suite</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────── */}
      {/* FULL CUSTOMIZE & STUDIO DIALOG                               */}
      {/* ──────────────────────────────────────────────────────────── */}
      <EmsPrintDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        allocation={allocation}
        defaultRoomId={selectedRoomId}
        defaultDoc={dialogDoc}
      />

      {/* ──────────────────────────────────────────────────────────── */}
      {/* DIRECT NATIVE 1-CLICK QUICK PRINT PORTAL                     */}
      {/* ──────────────────────────────────────────────────────────── */}
      {mounted && quickPrintDoc && typeof document !== "undefined" && createPortal(
        <div id="ems-print-isolated-portal">
          {quickPrintDoc === "admit" && (
            <EmsAdmitCardPrintable
              rooms={targetRooms}
              academicYear={allocation.academicYear}
              examType={allocation.examType}
              schoolProfile={schoolProfile}
              targetRoomId={selectedRoomId}
            />
          )}

          {quickPrintDoc === "slips" && (
            <EmsBenchSlipsPrintable
              rooms={targetRooms}
              academicYear={allocation.academicYear}
              examType={allocation.examType}
              schoolProfile={schoolProfile}
              targetRoomId={selectedRoomId}
            />
          )}

          {quickPrintDoc === "attendance" && (
            <EmsAttendanceSheetPrintable
              rooms={targetRooms}
              academicYear={allocation.academicYear}
              examType={allocation.examType}
              schoolProfile={schoolProfile}
              targetRoomId={selectedRoomId}
              examHeaders={examHeaders}
            />
          )}

          {quickPrintDoc === "gate" && (
            <EmsGateNoticePrintable
              rooms={targetRooms}
              academicYear={allocation.academicYear}
              examType={allocation.examType}
              schoolProfile={schoolProfile}
              targetRoomId={selectedRoomId}
            />
          )}
        </div>,
        document.body
      )}
    </div>
  );
}
