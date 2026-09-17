"use client";

import React, { useState, useMemo } from "react";
import { ExamAllocation } from "@/lib/ems/types";
import { EmsPrintDialog, PrintDocType } from "./ems-print-dialog";
import { CustomSelect } from "@/components/ui/custom-select";
import { Button } from "@/components/ui/button";
import {
  Printer,
  FileText,
  Tag,
  ClipboardList,
  DoorOpen,
  ArrowLeft,
  Building2,
  Layers,
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
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogDoc, setDialogDoc] = useState<PrintDocType>("admit");

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

  // Open print studio modal with pre-selected document
  const openCustomStudio = (docType: PrintDocType) => {
    setDialogDoc(docType);
    setDialogOpen(true);
  };

  // Page estimate calculations
  const pagesAdmit = Math.ceil(targetTotalStudents / 21) || 1;
  const pagesSlips = Math.ceil(targetTotalStudents / 30) || 1;
  const pagesAttendance =
    targetRooms.reduce((acc, r) => {
      const studentCount = r.seats.filter((s) => !s.isVacant && s.studentName).length;
      return acc + Math.max(1, Math.ceil(Math.max(25, studentCount + 1) / 28));
    }, 0) || 1;
  const pagesGate =
    targetRooms.reduce((acc, r) => {
      const studentCount = r.seats.filter((s) => !s.isVacant && s.studentName).length;
      return acc + Math.max(1, Math.ceil(studentCount / 26));
    }, 0) || 1;

  // Document card specifications
  const documents = [
    {
      id: "admit" as PrintDocType,
      title: "Student Admit Cards",
      description: "Official hall tickets with student details, exam timetable & signature.",
      formatSpec: "21 Cards / A4 Sheet",
      pageEstimate: `~${pagesAdmit} Page${pagesAdmit !== 1 ? "s" : ""} (${targetTotalStudents} Students)`,
      buttonLabel: "Print Admit Cards",
      icon: FileText,
      iconColor: "text-indigo-600 dark:text-indigo-400",
      iconBg: "bg-indigo-50 dark:bg-indigo-950/50",
      iconBorder: "border-indigo-200/60 dark:border-indigo-800/60",
      buttonBg: "bg-indigo-600 hover:bg-indigo-500",
      hoverBorder: "hover:border-indigo-500/40",
    },
    {
      id: "attendance" as PrintDocType,
      title: "Exam Attendance Sheets",
      description: "Daily invigilator attendance register with 8-subject signature columns.",
      formatSpec: "8-Subject Matrix / A4",
      pageEstimate: `${pagesAttendance} Sheet${pagesAttendance !== 1 ? "s" : ""} (${targetRooms.length} Room${targetRooms.length !== 1 ? "s" : ""})`,
      buttonLabel: "Print Attendance Sheets",
      icon: ClipboardList,
      iconColor: "text-amber-600 dark:text-amber-400",
      iconBg: "bg-amber-50 dark:bg-amber-950/50",
      iconBorder: "border-amber-200/60 dark:border-amber-800/60",
      buttonBg: "bg-amber-600 hover:bg-amber-500",
      hoverBorder: "hover:border-amber-500/40",
    },
    {
      id: "slips" as PrintDocType,
      title: "Desk & Bench Slips",
      description: "Cut-out position labels with roll number and class details for desks.",
      formatSpec: "30 Slips / A4 Sheet",
      pageEstimate: `~${pagesSlips} Page${pagesSlips !== 1 ? "s" : ""} (${targetTotalStudents} Labels)`,
      buttonLabel: "Print Desk Slips",
      icon: Tag,
      iconColor: "text-emerald-600 dark:text-emerald-400",
      iconBg: "bg-emerald-50 dark:bg-emerald-950/50",
      iconBorder: "border-emerald-200/60 dark:border-emerald-800/60",
      buttonBg: "bg-emerald-600 hover:bg-emerald-500",
      hoverBorder: "hover:border-emerald-500/40",
    },
    {
      id: "gate" as PrintDocType,
      title: "Room Gate Notice & Roster",
      description: "Entrance notices listing assigned classes, roll ranges, and seating roster.",
      formatSpec: "Door Noticeboard Poster / A4",
      pageEstimate: `${pagesGate} Notice${pagesGate !== 1 ? "s" : ""} (${targetRooms.length} Room${targetRooms.length !== 1 ? "s" : ""})`,
      buttonLabel: "Print Gate Notices",
      icon: DoorOpen,
      iconColor: "text-purple-600 dark:text-purple-400",
      iconBg: "bg-purple-50 dark:bg-purple-950/50",
      iconBorder: "border-purple-200/60 dark:border-purple-800/60",
      buttonBg: "bg-purple-600 hover:bg-purple-500",
      hoverBorder: "hover:border-purple-500/40",
    },
  ];

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* ──────────────────────────────────────────────────────────── */}
      {/* MASTER HEADER: Clean, Spacious & Focused                      */}
      {/* ──────────────────────────────────────────────────────────── */}
      <div className="p-4 sm:p-5 rounded-2xl border border-border/80 bg-card shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-3.5">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0">
              <Printer className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-foreground">
                Examination Print Suite
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Print ready institutional examination documents.
              </p>
            </div>
          </div>

          {/* Master Actions */}
          {onViewBlueprint && (
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onViewBlueprint}
                className="h-8.5 text-xs font-semibold gap-1.5 hover:border-primary/40 cursor-pointer shadow-2xs"
              >
                <Layers className="h-3.5 w-3.5 text-primary" />
                <span>View Blueprint</span>
              </Button>
            </div>
          )}
        </div>

        {/* ──────────────────────────────────────────────────────────── */}
        {/* ROOM FILTER SELECTOR: Compact Tabs & Quick Dropdown          */}
        {/* ──────────────────────────────────────────────────────────── */}
        <div className="p-1.5 rounded-xl bg-muted/40 border border-border/70 flex items-center justify-between gap-2 shadow-2xs">
          {/* Left: Sleek, compact room pills */}
          <div className="flex-1 min-w-0 flex items-center gap-1.5 overflow-x-auto py-0.5 scrollbar-none">
            <button
              type="button"
              onClick={() => setSelectedRoomId("ALL")}
              className={cn(
                "px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer select-none shrink-0 flex items-center gap-1.5 border",
                selectedRoomId === "ALL"
                  ? "bg-background text-foreground font-bold shadow-xs border-primary/40 ring-1 ring-primary/20"
                  : "bg-transparent text-muted-foreground hover:text-foreground border-transparent hover:bg-background/50"
              )}
            >
              <Building2
                className={cn(
                  "h-3.5 w-3.5 shrink-0",
                  selectedRoomId === "ALL" ? "text-primary" : "text-muted-foreground"
                )}
              />
              <span>All Rooms</span>
              <span
                className={cn(
                  "text-[10px] px-1.5 py-0.2 rounded-md font-mono font-bold",
                  selectedRoomId === "ALL"
                    ? "bg-primary/10 text-primary"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {allAllocatedStudents}
              </span>
            </button>

            {rooms.map((room, rIdx) => {
              const isSelected = room.roomId === selectedRoomId;
              const occupied = room.seats.filter((s) => !s.isVacant && s.studentName).length;
              const total = room.totalSeats || room.seats.length;
              const displayRoomNumber = room.roomNumber.replace(/^Room\s+/i, "");

              return (
                <button
                  key={room.roomId}
                  type="button"
                  onClick={() => setSelectedRoomId(room.roomId)}
                  className={cn(
                    "px-2.5 py-1.5 rounded-lg text-xs transition-all flex items-center gap-1.5 cursor-pointer select-none shrink-0 border",
                    isSelected
                      ? "bg-background text-foreground font-bold shadow-xs border-primary/40 ring-1 ring-primary/20"
                      : "bg-transparent text-muted-foreground hover:text-foreground border-transparent hover:bg-background/50"
                  )}
                  title={`Room ${room.roomNumber} - ${occupied}/${total} Students`}
                >
                  <span
                    className={cn(
                      "px-1 py-0.2 rounded-md text-[9px] font-black font-mono tracking-tight",
                      isSelected
                        ? "bg-primary text-primary-foreground shadow-2xs"
                        : "bg-muted text-muted-foreground border border-border/50"
                    )}
                  >
                    #{rIdx + 1}
                  </span>
                  <DoorOpen
                    className={cn(
                      "h-3.5 w-3.5 shrink-0",
                      isSelected ? "text-primary" : "text-muted-foreground"
                    )}
                  />
                  <span className="font-semibold whitespace-nowrap">{displayRoomNumber}</span>
                  <span
                    className={cn(
                      "text-[10px] px-1.5 py-0.2 rounded-md font-mono font-semibold shrink-0",
                      isSelected
                        ? "bg-primary/10 text-primary"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    {occupied}/{total}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Right: Quick Room Dropdown for fast jumping */}
          {rooms.length > 2 && (
            <div className="w-36 sm:w-44 shrink-0">
              <CustomSelect
                options={[
                  { label: `All Rooms (${allAllocatedStudents} Students)`, value: "ALL" },
                  ...rooms.map((r, i) => ({
                    label: `#${i + 1} ${r.roomNumber} (${r.seats.filter((s) => !s.isVacant && s.studentName).length}/${r.totalSeats || r.seats.length})`,
                    value: r.roomId,
                  })),
                ]}
                value={selectedRoomId}
                onChange={(val) => setSelectedRoomId(String(val))}
                placeholder="Filter Room..."
                triggerClassName="h-8 text-xs py-0"
                searchable={rooms.length > 4}
              />
            </div>
          )}
        </div>
      </div>

      {/* ──────────────────────────────────────────────────────────── */}
      {/* 4 CLEAN MINIMAL PRINT CARDS                                  */}
      {/* ──────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
        {documents.map((doc) => {
          const Icon = doc.icon;
          return (
            <div
              key={doc.id}
              className={cn(
                "p-5 sm:p-6 rounded-2xl border border-border/80 bg-card transition-all duration-200 flex flex-col justify-between gap-5 group hover:shadow-md",
                doc.hoverBorder
              )}
            >
              {/* Card Top: Icon & Clean Details */}
              <div className="space-y-4">
                <div className="flex items-start gap-3.5">
                  <div
                    className={cn(
                      "h-11 w-11 rounded-xl flex items-center justify-center shrink-0 border transition-transform duration-200 group-hover:scale-105 shadow-2xs",
                      doc.iconBg,
                      doc.iconBorder,
                      doc.iconColor
                    )}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-base font-bold text-foreground tracking-tight">
                      {doc.title}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                      {doc.description}
                    </p>
                  </div>
                </div>

                {/* Minimal Specs Info Row */}
                <div className="flex items-center justify-between text-xs text-muted-foreground border-y border-border/50 py-2.5 px-1">
                  <span className="font-medium text-foreground/80">{doc.formatSpec}</span>
                  <span className="font-mono text-[11px] font-semibold text-muted-foreground">
                    {doc.pageEstimate}
                  </span>
                </div>
              </div>

              {/* Single Sleek Action Button */}
              <Button
                type="button"
                onClick={() => openCustomStudio(doc.id)}
                className={cn(
                  "w-full h-9 rounded-xl font-semibold text-xs gap-2 text-white shadow-xs cursor-pointer transition-all duration-200 hover:shadow-md hover:scale-[1.01] active:scale-[0.99]",
                  doc.buttonBg
                )}
              >
                <Printer className="h-3.5 w-3.5" />
                <span>{doc.buttonLabel}</span>
              </Button>
            </div>
          );
        })}
      </div>

      {/* ──────────────────────────────────────────────────────────── */}
      {/* BOTTOM NAVIGATION: Back to Seat Arrangement                  */}
      {/* ──────────────────────────────────────────────────────────── */}
      <div className="pt-2 flex items-center justify-start">
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
      </div>

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
    </div>
  );
}


