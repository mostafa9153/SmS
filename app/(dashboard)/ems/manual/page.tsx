"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { EmsNavTabs } from "@/components/ems/ems-nav-tabs";
import { MismatchModal } from "@/components/ems/mismatch-modal";
import { getSavedRooms, saveAllocation } from "@/lib/ems/room-storage";
import {
  fetchContinuingStudents,
  generateManualRoomAllocation,
} from "@/lib/ems/allocation-engine";
import {
  EmsRoom,
  ExamType,
  EXAM_TYPES,
  ManualColumnInput,
  ManualRoomAllocationConfig,
  MismatchReport,
  ExamAllocation,
} from "@/lib/ems/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Sliders,
  Columns,
  DoorOpen,
  Calendar,
  Sparkles,
  ArrowRight,
  Loader2,
  Armchair,
} from "lucide-react";

const CLASS_OPTIONS = ["V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];
const SECTION_OPTIONS = ["A", "B", "C", "D"];

export default function EmsManualAllocationPage() {
  const router = useRouter();
  const [rooms, setRooms] = useState<EmsRoom[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<string>("");
  const [examType, setExamType] = useState<ExamType>("1st Summative Evaluation");
  const [academicYear, setAcademicYear] = useState<number>(2026);
  const [columnInputs, setColumnInputs] = useState<ManualColumnInput[]>([]);
  const [loading, setLoading] = useState(false);

  // Mismatch Modal State
  const [mismatchReport, setMismatchReport] = useState<MismatchReport | null>(null);
  const [mismatchModalOpen, setMismatchModalOpen] = useState(false);
  const [pendingAllocation, setPendingAllocation] = useState<ExamAllocation | null>(null);

  useEffect(() => {
    const saved = getSavedRooms();
    setRooms(saved);
    if (saved.length > 0) {
      setSelectedRoomId(saved[0].id);
    }
  }, []);

  // When selected room changes, initialize columnInputs based on room's columns
  const selectedRoom = rooms.find((r) => r.id === selectedRoomId);

  useEffect(() => {
    if (!selectedRoom) return;
    setColumnInputs(
      selectedRoom.columns.map((c, idx) => ({
        columnIndex: c.columnIndex,
        class: idx % 2 === 0 ? "IX" : "VIII",
        section: "A",
        rollFrom: idx * 15 + 1,
        rollTo: idx * 15 + c.benchCount * c.seatsPerBench,
      }))
    );
  }, [selectedRoomId]);

  const updateColumn = (index: number, field: keyof ManualColumnInput, value: any) => {
    const updated = [...columnInputs];
    updated[index] = { ...updated[index], [field]: value };
    setColumnInputs(updated);
  };

  const handleGenerate = async () => {
    if (!selectedRoom) return;
    setLoading(true);

    try {
      // 1. Fetch DB continuing students
      const allStudents = await fetchContinuingStudents();

      const config: ManualRoomAllocationConfig = {
        academicYear,
        examType,
        roomId: selectedRoom.id,
        columns: columnInputs,
      };

      // 2. Generate manual allocation
      const { allocatedRoom, mismatchReport: report } = generateManualRoomAllocation(
        selectedRoom,
        config,
        allStudents
      );

      const allocation: ExamAllocation = {
        id: `alloc-man-${Date.now()}`,
        title: `${examType} (${academicYear}) - ${selectedRoom.roomNumber}`,
        academicYear,
        examType,
        mode: "manual",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        roomAllocations: [allocatedRoom],
        summary: {
          totalStudents: allocatedRoom.occupiedSeats,
          totalRooms: 1,
          classesAllocated: allocatedRoom.classesPresent,
          mismatches: report,
        },
      };

      setPendingAllocation(allocation);

      // 3. If any mismatches exist, show notification modal
      if (report.items.length > 0) {
        setMismatchReport(report);
        setMismatchModalOpen(true);
      } else {
        // No mismatches, proceed immediately
        saveAllocation(allocation);
        router.push(`/ems/seating-map?id=${allocation.id}`);
      }
    } catch (err) {
      console.error("Error during manual allocation:", err);
      alert("An error occurred during allocation.");
    } finally {
      setLoading(false);
    }
  };

  const handleProceedWithMismatch = () => {
    if (pendingAllocation) {
      saveAllocation(pendingAllocation);
      router.push(`/ems/seating-map?id=${pendingAllocation.id}`);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground flex items-center gap-2.5">
          <span className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <Sliders className="h-6 w-6" />
          </span>
          <span>Manual Room Allocation</span>
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1">
          Select a room and manually assign which class, section, and roll range sits in each column.
        </p>
      </div>

      {/* Navigation Tabs */}
      <EmsNavTabs activeTab="manual" />

      {/* Main Form Box */}
      <div className="rounded-2xl border border-border/80 bg-card p-5 sm:p-6 shadow-xs space-y-6">
        {/* Step 1: Session & Exam Type Selection */}
        <div className="space-y-3 pb-5 border-b border-border/60">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />
            <span>Step 1: Examination Session & Type</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Academic Year</Label>
              <Input
                type="number"
                value={academicYear}
                onChange={(e) => setAcademicYear(parseInt(e.target.value) || 2026)}
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Exam Type (মূল ৩টি পরীক্ষা)</Label>
              <select
                value={examType}
                onChange={(e) => setExamType(e.target.value as ExamType)}
                className="w-full h-9 px-3 text-xs rounded-md border border-input bg-background font-semibold"
              >
                {EXAM_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Select Classroom / Hall</Label>
              <select
                value={selectedRoomId}
                onChange={(e) => setSelectedRoomId(e.target.value)}
                className="w-full h-9 px-3 text-xs rounded-md border border-input bg-background font-semibold"
              >
                {rooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.roomNumber} ({r.totalCapacity} Seats • {r.columns.length} Columns)
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Step 2: Column-by-Column Assignment */}
        {selectedRoom ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Columns className="h-4 w-4 text-primary" />
                  <span>Step 2: Assign Classes to Columns ({selectedRoom.columns.length} Columns)</span>
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {selectedRoom.roomNumber} has a total capacity of{" "}
                  <strong className="text-foreground">{selectedRoom.totalCapacity}</strong> seats.
                </p>
              </div>

              <Badge className="bg-primary/10 text-primary border-primary/20 text-xs font-bold">
                {selectedRoom.roomNumber} Selected
              </Badge>
            </div>

            {/* Columns Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {selectedRoom.columns.map((colConfig, idx) => {
                const colInput = columnInputs[idx] || {
                  columnIndex: colConfig.columnIndex,
                  class: "IX",
                  section: "A",
                  rollFrom: 1,
                  rollTo: 10,
                };
                const colCapacity = colConfig.benchCount * colConfig.seatsPerBench;
                const assignedCount = Math.max(0, colInput.rollTo - colInput.rollFrom + 1);
                const isOver = assignedCount > colCapacity;

                return (
                  <div
                    key={colConfig.columnIndex}
                    className="p-4 rounded-xl border border-border/80 bg-muted/20 space-y-3 relative"
                  >
                    <div className="flex items-center justify-between border-b border-border/50 pb-2">
                      <div>
                        <span className="font-bold text-xs text-foreground">
                          {colConfig.columnLabel || `Column ${colConfig.columnIndex}`}
                        </span>
                        <div className="text-[10px] text-muted-foreground">
                          {colConfig.benchCount} Benches • {colCapacity} Seats
                        </div>
                      </div>

                      <Badge
                        variant={isOver ? "destructive" : "secondary"}
                        className="text-[10px] font-mono"
                      >
                        {assignedCount}/{colCapacity} Seats
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-[11px] font-semibold">Class</Label>
                        <select
                          value={colInput.class}
                          onChange={(e) => updateColumn(idx, "class", e.target.value)}
                          className="w-full h-8 px-2 text-xs rounded-md border border-input bg-background font-semibold"
                        >
                          {CLASS_OPTIONS.map((c) => (
                            <option key={c} value={c}>
                              Class {c}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-[11px] font-semibold">Section</Label>
                        <select
                          value={colInput.section}
                          onChange={(e) => updateColumn(idx, "section", e.target.value)}
                          className="w-full h-8 px-2 text-xs rounded-md border border-input bg-background font-semibold"
                        >
                          {SECTION_OPTIONS.map((s) => (
                            <option key={s} value={s}>
                              Sec {s}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-[11px] font-semibold">Roll From</Label>
                        <Input
                          type="number"
                          min={1}
                          value={colInput.rollFrom}
                          onChange={(e) =>
                            updateColumn(idx, "rollFrom", parseInt(e.target.value) || 1)
                          }
                          className="h-8 text-xs font-mono"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-[11px] font-semibold">Roll To</Label>
                        <Input
                          type="number"
                          min={1}
                          value={colInput.rollTo}
                          onChange={(e) =>
                            updateColumn(idx, "rollTo", parseInt(e.target.value) || 1)
                          }
                          className="h-8 text-xs font-mono"
                        />
                      </div>
                    </div>

                    {isOver && (
                      <p className="text-[11px] text-rose-500 font-medium">
                        ⚠️ Capacity overflow by {assignedCount - colCapacity} student(s)!
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">Please select a classroom first.</p>
        )}

        {/* Action Button */}
        <div className="pt-4 border-t border-border/60 flex items-center justify-end">
          <Button
            onClick={handleGenerate}
            disabled={loading || !selectedRoom}
            className="h-10 text-xs font-semibold gap-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-md px-5"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Checking DB & Allocating Seats...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 text-amber-300" />
                Verify & Open 2D Seating Map
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Mismatch Notification Modal */}
      <MismatchModal
        isOpen={mismatchModalOpen}
        onClose={() => setMismatchModalOpen(false)}
        onProceed={handleProceedWithMismatch}
        report={mismatchReport}
        allowProceedOnError={true}
      />
    </div>
  );
}
