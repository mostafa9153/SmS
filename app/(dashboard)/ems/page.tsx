"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { EmsStepperMap, StepItem } from "@/components/ems/ems-stepper-map";
import { VisualRoomBlueprint } from "@/components/ems/visual-room-blueprint";
import { RoomEditorDialog } from "@/components/ems/room-editor-dialog";
import { RoomsManagerDialog } from "@/components/ems/rooms-manager-dialog";
import { MismatchModal } from "@/components/ems/mismatch-modal";
import { CustomSelect } from "@/components/ui/custom-select";
import { cn } from "@/lib/utils";
import {
  getSavedRooms,
  saveRoom,
  deleteRoom,
  saveAllocation,
  getSavedAllocations,
  updateSeatSwap,
  calculateRoomCapacity,
} from "@/lib/ems/room-storage";
import {
  fetchContinuingStudents,
  generateAutoAllocation,
  generateManualRoomAllocation,
} from "@/lib/ems/allocation-engine";
import {
  EmsRoom,
  ExamType,
  EXAM_TYPES,
  AutoAllocationClassInput,
  AutoAllocationConfig,
  ManualColumnInput,
  ManualRoomAllocationConfig,
  ExamAllocation,
  SeatAssignment,
  MismatchReport,
} from "@/lib/ems/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  ArrowRight,
  Plus,
  Trash2,
  Wand2,
  Sliders,
  DoorOpen,
  Sparkles,
  History,
  RotateCcw,
  Armchair,
  Loader2,
  Edit2,
  Printer,
  AlertCircle,
  CheckCircle2,
  Users,
  CheckCheck,
  Building2,
} from "lucide-react";
import { EmsPrintDialog } from "@/components/ems/print/ems-print-dialog";
import {
  getDynamicClassCodes,
  getDynamicSectionsForClass,
  syncAllEmsConfigsFromDb,
} from "@/lib/ems/ems-config-loader";

const STEPS: StepItem[] = [
  { id: 1, title: "Session & Mode" },
  { id: 2, title: "Class & Students" },
  { id: 3, title: "Room & Benches" },
  { id: 4, title: "Visual Seating Map" },
];

export default function EmsMasterPage() {
  const router = useRouter();

  // Wizard Step State
  const [step, setStep] = useState<number>(1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);

  // Step 1: Session & Mode
  const [academicYear, setAcademicYear] = useState<number>(2026);
  const [examType, setExamType] = useState<ExamType>("1st Summative Evaluation");
  const [allocationMode, setAllocationMode] = useState<"auto" | "manual">("auto");

  // Step 2: Class & Students
  const [classes, setClasses] = useState<AutoAllocationClassInput[]>([
    { class: "VIII", section: "A", rollFrom: 1, rollTo: 35 },
    { class: "IX", section: "A", rollFrom: 1, rollTo: 35 },
  ]);

  // Step 3: Room & Benches Setup
  const [studentsPerBench, setStudentsPerBench] = useState<number>(2); // DIRECT INPUT!
  const [rooms, setRooms] = useState<EmsRoom[]>([]);
  const [selectedRoomIds, setSelectedRoomIds] = useState<string[]>([]);
  const [strategy, setStrategy] = useState<"alternate-columns" | "interleaved-seats">(
    "alternate-columns"
  );
  const [manualColumnInputs, setManualColumnInputs] = useState<ManualColumnInput[]>([]);
  const [manualTargetRoomId, setManualTargetRoomId] = useState<string>("");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<EmsRoom | null>(null);
  const [roomsManagerOpen, setRoomsManagerOpen] = useState(false);

  // Step 4: Visual Seating Blueprint & History
  const [savedAllocations, setSavedAllocations] = useState<ExamAllocation[]>([]);
  const [generatedAllocation, setGeneratedAllocation] = useState<ExamAllocation | null>(null);
  const [activeBlueprintRoomId, setActiveBlueprintRoomId] = useState<string>("");
  const [printDialogOpen, setPrintDialogOpen] = useState(false);

  // Loading & Mismatch Modal
  const [loading, setLoading] = useState(false);
  const [mismatchReport, setMismatchReport] = useState<MismatchReport | null>(null);
  const [mismatchModalOpen, setMismatchModalOpen] = useState(false);
  const [pendingAllocation, setPendingAllocation] = useState<ExamAllocation | null>(null);

  // Dynamic classes from DB
  const [availableClasses, setAvailableClasses] = useState<string[]>(() => getDynamicClassCodes());

  useEffect(() => {
    // Sync fresh configs (classes, school profile, rooms) from database
    syncAllEmsConfigsFromDb().then(() => {
      const freshClasses = getDynamicClassCodes();
      setAvailableClasses(freshClasses);
      const freshRooms = getSavedRooms();
      setRooms(freshRooms);
      if (freshRooms.length > 0) {
        setSelectedRoomIds((prev) => (prev.length === 0 ? [freshRooms[0].id] : prev));
        setManualTargetRoomId((prev) => (!prev ? freshRooms[0].id : prev));
      }
    });

    const saved = getSavedRooms();
    setRooms(saved);
    if (saved.length > 0) {
      setSelectedRoomIds([saved[0].id]);
      setManualTargetRoomId(saved[0].id);
    }
    setSavedAllocations(getSavedAllocations());
  }, []);

  // Update manual column assignments when target room or studentsPerBench changes
  useEffect(() => {
    const targetRoom = rooms.find((r) => r.id === manualTargetRoomId);
    if (targetRoom) {
      setManualColumnInputs(
        targetRoom.columns.map((c, idx) => ({
          columnIndex: c.columnIndex,
          class: idx % 2 === 0 ? "IX" : "VIII",
          section: "A",
          rollFrom: idx * 15 + 1,
          rollTo: idx * 15 + c.benchCount * studentsPerBench,
        }))
      );
    }
  }, [manualTargetRoomId, studentsPerBench, rooms]);

  const toggleRoom = (roomId: string) => {
    if (selectedRoomIds.includes(roomId)) {
      if (selectedRoomIds.length > 1) {
        setSelectedRoomIds(selectedRoomIds.filter((id) => id !== roomId));
      }
    } else {
      setSelectedRoomIds([...selectedRoomIds, roomId]);
    }
  };

  const handleOpenEditRoom = (room: EmsRoom) => {
    setEditingRoom(room);
    setEditorOpen(true);
  };

  const handleOpenNewRoom = () => {
    setEditingRoom(null);
    setEditorOpen(true);
  };

  const handleDeleteRoom = (roomId: string) => {
    deleteRoom(roomId);
    const updated = getSavedRooms();
    setRooms(updated);
    setSelectedRoomIds((prev) => prev.filter((id) => id !== roomId));
    if (manualTargetRoomId === roomId && updated.length > 0) {
      setManualTargetRoomId(updated[0].id);
    }
  };

  // Calculations
  const allRoomsTotalBenches = rooms.reduce(
    (acc, r) => acc + r.columns.reduce((colAcc, c) => colAcc + c.benchCount, 0),
    0
  );
  const allRoomsTotalCapacity = allRoomsTotalBenches * studentsPerBench;

  const selectedRooms = rooms.filter((r) => selectedRoomIds.includes(r.id));
  const totalBenches = selectedRooms.reduce(
    (acc, r) => acc + r.columns.reduce((colAcc, c) => colAcc + c.benchCount, 0),
    0
  );
  const totalDynamicCapacity = totalBenches * studentsPerBench;

  const totalStudentsExpected = classes.reduce(
    (sum, c) => sum + Math.max(0, c.rollTo - c.rollFrom + 1),
    0
  );

  const handleToggleSelectAllRooms = () => {
    if (selectedRoomIds.length === rooms.length) {
      if (rooms.length > 0) setSelectedRoomIds([rooms[0].id]);
    } else {
      setSelectedRoomIds(rooms.map((r) => r.id));
    }
  };

  const markStepDone = (stepId: number) => {
    if (!completedSteps.includes(stepId)) {
      setCompletedSteps((prev) => [...prev, stepId]);
    }
  };

  // Step transitions
  const handleProceedFromStep1 = () => {
    markStepDone(1);
    setStep(2);
  };

  const handleProceedFromStep2 = () => {
    if (classes.length === 0 || totalStudentsExpected <= 0) {
      alert("Please configure at least one class group with valid rolls.");
      return;
    }
    // If selected room capacity is short, but all rooms combined can seat all candidates,
    // auto-select all rooms so the user starts with 100% sufficient seats!
    if (totalDynamicCapacity < totalStudentsExpected && allRoomsTotalCapacity >= totalStudentsExpected) {
      setSelectedRoomIds(rooms.map((r) => r.id));
    }
    markStepDone(2);
    setStep(3);
  };

  // Execute Allocation (Step 3 -> Step 4)
  const handleExecuteAllocation = async () => {
    setLoading(true);

    try {
      const allStudents = await fetchContinuingStudents();

      if (allocationMode === "auto") {
        const config: AutoAllocationConfig = {
          academicYear,
          examType,
          classes,
          selectedRoomIds,
          strategy,
          studentsPerBench,
        };

        const { allocation, mismatchReport: report } = generateAutoAllocation(
          selectedRooms,
          config,
          allStudents
        );

        setPendingAllocation(allocation);

        if (report.items.length > 0) {
          setMismatchReport(report);
          setMismatchModalOpen(true);
        } else {
          finishAllocation(allocation);
        }
      } else {
        const targetRoom = rooms.find((r) => r.id === manualTargetRoomId);
        if (!targetRoom) throw new Error("No room selected");

        const config: ManualRoomAllocationConfig = {
          academicYear,
          examType,
          roomId: targetRoom.id,
          columns: manualColumnInputs,
          studentsPerBench,
        };

        const { allocatedRoom, mismatchReport: report } = generateManualRoomAllocation(
          targetRoom,
          config,
          allStudents
        );

        const allocation: ExamAllocation = {
          id: `alloc-man-${Date.now()}`,
          title: `${examType} (${academicYear}) - ${targetRoom.roomNumber}`,
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

        if (report.items.length > 0) {
          setMismatchReport(report);
          setMismatchModalOpen(true);
        } else {
          finishAllocation(allocation);
        }
      }
    } catch (err) {
      console.error("Allocation error:", err);
      alert("Failed to complete allocation.");
    } finally {
      setLoading(false);
    }
  };

  const finishAllocation = (allocation: ExamAllocation) => {
    saveAllocation(allocation);
    setGeneratedAllocation(allocation);
    setSavedAllocations(getSavedAllocations());
    if (allocation.roomAllocations.length > 0) {
      setActiveBlueprintRoomId(allocation.roomAllocations[0].roomId);
    }
    markStepDone(3);
    setStep(4);
  };

  const handleProceedWithMismatch = () => {
    if (pendingAllocation) {
      finishAllocation(pendingAllocation);
    }
  };

  const handleSwapSeats = (seat1: SeatAssignment, seat2: SeatAssignment) => {
    if (!generatedAllocation) return;
    const updated = updateSeatSwap(
      generatedAllocation.id,
      activeBlueprintRoomId,
      seat1.seatId,
      seat2.seatId
    );
    if (updated) {
      setGeneratedAllocation(updated);
    }
  };

  const activeBlueprintRoom = generatedAllocation?.roomAllocations.find(
    (r) => r.roomId === activeBlueprintRoomId
  );

  return (
    <div className="p-3.5 sm:p-6 max-w-5xl mx-auto space-y-4 sm:space-y-6">
      {/* Header matching Bulk Upload with Classrooms & Halls Management Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => (step > 1 ? setStep(step - 1) : router.back())}
            title="Back"
            className="rounded-lg p-1.5 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h1 className="text-lg sm:text-xl font-bold tracking-tight text-foreground">
              EMS — Exam Seating Management
            </h1>
          </div>
        </div>

        {/* Classrooms & Halls Section in header */}
        <Button
          type="button"
          variant="outline"
          onClick={() => setRoomsManagerOpen(true)}
          className="flex items-center gap-2 rounded-xl border border-border/80 bg-card text-foreground px-3.5 py-2 text-xs font-semibold hover:bg-muted hover:border-primary/40 transition-all shadow-2xs cursor-pointer self-start sm:self-auto"
        >
          <DoorOpen className="h-4 w-4 text-primary" />
          <span>Classrooms & Halls ({rooms.length})</span>
        </Button>
      </div>

      {/* Stepper Progress matching Bulk Upload */}
      <EmsStepperMap
        steps={STEPS}
        currentStep={step}
        completedSteps={completedSteps}
        onStepClick={(sId) => setStep(sId)}
      />

      {/* ──────────────────────────────────────────────────────────── */}
      {/* STEP 1: Session & Allocation Mode Selection                  */}
      {/* ──────────────────────────────────────────────────────────── */}
      {step === 1 && (
        <div className="space-y-5">
          {/* Mode Selection Cards matching Bulk Upload */}
          <div className="space-y-2.5">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              1. Select Allocation Mode
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Card 1: Auto Mode */}
              <div
                onClick={() => setAllocationMode("auto")}
                className={cn(
                  "relative rounded-xl border p-4 cursor-pointer transition-all flex items-center justify-between gap-3",
                  allocationMode === "auto"
                    ? "border-primary bg-primary/5 ring-2 ring-primary/20 shadow-xs"
                    : "border-border bg-card hover:border-primary/40 hover:bg-muted/20"
                )}
              >
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-purple-100 dark:bg-purple-950/40 p-2.5 text-purple-600 dark:text-purple-400">
                    <Wand2 className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm">Smart Auto Allocation</h3>
                    <p className="text-xs text-muted-foreground">
                      Automatic anti-copy distribution across multiple halls
                    </p>
                  </div>
                </div>
                <div
                  className={cn(
                    "h-3.5 w-3.5 rounded-full border-2 transition-all flex items-center justify-center",
                    allocationMode === "auto"
                      ? "border-primary bg-primary"
                      : "border-muted-foreground/30 bg-transparent"
                  )}
                >
                  {allocationMode === "auto" && (
                    <div className="h-1.5 w-1.5 rounded-full bg-primary-foreground" />
                  )}
                </div>
              </div>

              {/* Card 2: Manual Mode */}
              <div
                onClick={() => setAllocationMode("manual")}
                className={cn(
                  "relative rounded-xl border p-4 cursor-pointer transition-all flex items-center justify-between gap-3",
                  allocationMode === "manual"
                    ? "border-amber-600 bg-amber-50/40 dark:bg-amber-950/20 ring-2 ring-amber-500/20 shadow-xs"
                    : "border-border bg-card hover:border-amber-500/40 hover:bg-muted/20"
                )}
              >
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-amber-100 dark:bg-amber-950/40 p-2.5 text-amber-700 dark:text-amber-400">
                    <Sliders className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm">Manual Column Allocation</h3>
                    <p className="text-xs text-muted-foreground">
                      Precision control assigning classes per room column
                    </p>
                  </div>
                </div>
                <div
                  className={cn(
                    "h-3.5 w-3.5 rounded-full border-2 transition-all flex items-center justify-center",
                    allocationMode === "manual"
                      ? "border-amber-600 bg-amber-600"
                      : "border-muted-foreground/30 bg-transparent"
                  )}
                >
                  {allocationMode === "manual" && (
                    <div className="h-1.5 w-1.5 rounded-full bg-white" />
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Session Details Box */}
          <div className="rounded-xl border bg-card p-4 sm:p-5 shadow-xs space-y-4">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              2. Examination Session Details
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">
                  Academic Year *
                </label>
                <Input
                  type="number"
                  value={academicYear}
                  onChange={(e) => setAcademicYear(parseInt(e.target.value) || 2026)}
                  className="h-10 text-xs font-mono font-bold rounded-xl"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">
                  Exam Type (Summative Evaluation) *
                </label>
                <CustomSelect
                  value={examType}
                  onChange={(val) => setExamType(val as ExamType)}
                  options={EXAM_TYPES.map((t) => ({ label: t, value: t }))}
                  searchable={false}
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <Button
                onClick={handleProceedFromStep1}
                className="text-xs font-semibold gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground cursor-pointer"
              >
                Configure Classes & Students <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────── */}
      {/* STEP 2: Class & Students Selection                           */}
      {/* ──────────────────────────────────────────────────────────── */}
      {step === 2 && (
        <div className="rounded-xl border bg-card p-4 sm:p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <div>
              <h2 className="text-sm font-bold text-foreground">
                Participating Classes & Roll Ranges
              </h2>
              <p className="text-xs text-muted-foreground">
                Configure participating classes, sections, and roll ranges
              </p>
            </div>

            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() =>
                setClasses([
                  ...classes,
                  { class: "X", section: "A", rollFrom: 1, rollTo: 30 },
                ])
              }
              className="h-8 text-xs font-semibold gap-1 hover:border-primary/40 cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" /> Add Class Group
            </Button>
          </div>

          {/* Spacious Class Cards with Clean CustomSelect Dropdowns */}
          <div className="space-y-3">
            {classes.map((c, idx) => {
              const count = Math.max(0, c.rollTo - c.rollFrom + 1);
              return (
                <div
                  key={idx}
                  className="p-3.5 sm:p-4 rounded-xl border border-border/80 bg-background hover:border-primary/30 transition-all shadow-2xs space-y-3"
                >
                  <div className="flex items-center justify-between border-b border-border/50 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="h-6 w-6 rounded-md bg-primary/10 text-primary font-bold text-xs flex items-center justify-center font-mono">
                        #{idx + 1}
                      </span>
                      <span className="font-bold text-xs text-foreground">
                        Class Group: Class {c.class} — Section {c.section}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs font-mono font-semibold">
                        {count} Students
                      </Badge>
                      {classes.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg cursor-pointer"
                          onClick={() => setClasses(classes.filter((_, i) => i !== idx))}
                          title="Remove Class Group"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* Class Dropdown */}
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">
                        Class *
                      </label>
                      <CustomSelect
                        value={c.class}
                        onChange={(val) => {
                          const updated = [...classes];
                          const newClass = String(val);
                          updated[idx].class = newClass;
                          const validSecs = getDynamicSectionsForClass(newClass);
                          if (!validSecs.includes(updated[idx].section)) {
                            updated[idx].section = validSecs[0] || "A";
                          }
                          setClasses(updated);
                        }}
                        options={availableClasses.map((opt) => ({
                          label: `Class ${opt}`,
                          value: opt,
                        }))}
                        searchable={false}
                      />
                    </div>

                    {/* Section Dropdown (Dynamically loaded for selected class) */}
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">
                        Section *
                      </label>
                      <CustomSelect
                        value={c.section}
                        onChange={(val) => {
                          const updated = [...classes];
                          updated[idx].section = String(val);
                          setClasses(updated);
                        }}
                        options={getDynamicSectionsForClass(c.class).map((opt) => ({
                          label: `Section ${opt}`,
                          value: opt,
                        }))}
                        searchable={false}
                      />
                    </div>

                    {/* Roll Range */}
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">
                        Roll Range (From - To) *
                      </label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min={1}
                          value={c.rollFrom}
                          onChange={(e) => {
                            const updated = [...classes];
                            updated[idx].rollFrom = parseInt(e.target.value) || 1;
                            setClasses(updated);
                          }}
                          className="h-10 text-center text-xs font-mono font-bold rounded-xl"
                          placeholder="From"
                        />
                        <span className="text-muted-foreground text-xs font-medium">to</span>
                        <Input
                          type="number"
                          min={1}
                          value={c.rollTo}
                          onChange={(e) => {
                            const updated = [...classes];
                            updated[idx].rollTo = parseInt(e.target.value) || 1;
                            setClasses(updated);
                          }}
                          className="h-10 text-center text-xs font-mono font-bold rounded-xl"
                          placeholder="To"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-2 flex items-center justify-between text-xs text-muted-foreground">
            <span>Total Students to Seat:</span>
            <span className="font-bold text-sm text-foreground">{totalStudentsExpected} Students</span>
          </div>

          <div className="pt-3 border-t border-border/60 flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setStep(1)}
              className="text-xs font-semibold gap-1 cursor-pointer"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back
            </Button>
            <Button
              size="sm"
              onClick={handleProceedFromStep2}
              className="text-xs font-semibold gap-1 bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer"
            >
              Configure Rooms & Benches <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────── */}
      {/* STEP 3: Room & Benches Configuration                         */}
      {/* ──────────────────────────────────────────────────────────── */}
      {step === 3 && (
        <div className="rounded-xl border bg-card p-4 sm:p-5 shadow-xs space-y-5">
          {/* USER REQUIREMENT: DIRECT STUDENTS PER BENCH INPUT */}
          <div className="p-3.5 sm:p-4 rounded-xl border bg-muted/20 space-y-2.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <Label className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                <Armchair className="h-4 w-4 text-primary" />
                <span>Students Per Bench</span>
              </Label>

              <div className="flex items-center gap-2">
                {[1, 2, 3].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setStudentsPerBench(num)}
                    className={cn(
                      "px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer",
                      studentsPerBench === num
                        ? "bg-primary text-primary-foreground border-primary shadow-xs"
                        : "bg-background text-foreground hover:bg-muted border-input"
                    )}
                  >
                    {num} Student{num > 1 ? "s" : ""}
                  </button>
                ))}

                <div className="flex items-center gap-1.5 pl-2 border-l border-border/60">
                  <span className="text-xs text-muted-foreground font-medium">Custom:</span>
                  <Input
                    type="number"
                    min={1}
                    max={5}
                    value={studentsPerBench}
                    onChange={(e) => setStudentsPerBench(parseInt(e.target.value) || 2)}
                    className="w-14 h-8 text-center text-xs font-bold font-mono rounded-xl"
                  />
                </div>
              </div>
            </div>

            {/* TOTAL SEATS VS TOTAL EXAM STUDENTS DUAL ANIMATED VISUALIZER */}
            {(() => {
              const isSufficientCapacity = totalDynamicCapacity >= totalStudentsExpected;
              const accommodatedStudents = Math.min(totalStudentsExpected, totalDynamicCapacity);
              const availableSeats = Math.max(0, totalDynamicCapacity - totalStudentsExpected);
              const deficitStudents = Math.max(0, totalStudentsExpected - totalDynamicCapacity);

              // Percentage of capacity occupied by accommodated students
              const capacityOccupancyPercent = totalDynamicCapacity > 0
                ? Math.min(100, Math.round((accommodatedStudents / totalDynamicCapacity) * 100))
                : 0;
              const availablePercent = totalDynamicCapacity > 0
                ? Math.max(0, 100 - capacityOccupancyPercent)
                : 0;

              // Percentage of exam candidates who have seats
              const studentCoveragePercent = totalStudentsExpected > 0
                ? Math.round((accommodatedStudents / totalStudentsExpected) * 100)
                : 100;

              return (
                <div className="pt-3 border-t border-border/50 space-y-2.5">
                  {/* Top Stats Cards: Total Seats vs Total Exam Students */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    {/* Stat 1: Total Exam Candidates */}
                    <div className="p-2.5 rounded-xl border border-border/60 bg-muted/30 flex flex-col justify-between">
                      <span className="text-[11px] text-muted-foreground flex items-center gap-1 font-medium">
                        <Users className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                        <span>Total Exam Students:</span>
                      </span>
                      <div className="mt-1 flex items-baseline justify-between">
                        <span className="text-base font-bold font-mono text-foreground">
                          {totalStudentsExpected}
                        </span>
                        <span className="text-[10px] text-muted-foreground">Candidates</span>
                      </div>
                    </div>

                    {/* Stat 2: Total Seats in Selected Rooms */}
                    <div className="p-2.5 rounded-xl border border-border/60 bg-muted/30 flex flex-col justify-between">
                      <span className="text-[11px] text-muted-foreground flex items-center gap-1 font-medium">
                        <Armchair className="h-3.5 w-3.5 text-primary shrink-0" />
                        <span>Selected Rooms Seats:</span>
                      </span>
                      <div className="mt-1 flex items-baseline justify-between">
                        <span className="text-base font-bold font-mono text-primary">
                          {totalDynamicCapacity}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {selectedRooms.length} of {rooms.length} Rooms
                        </span>
                      </div>
                    </div>

                    {/* Stat 3: Seated / Accommodated Students */}
                    <div className="p-2.5 rounded-xl border border-border/60 bg-indigo-500/5 dark:bg-indigo-500/10 flex flex-col justify-between">
                      <span className="text-[11px] text-indigo-700 dark:text-indigo-300 flex items-center gap-1 font-medium">
                        <span className="h-2 w-2 rounded-full bg-indigo-500 animate-pulse shrink-0" />
                        <span>Seated / Accommodated:</span>
                      </span>
                      <div className="mt-1 flex items-baseline justify-between">
                        <span className="text-base font-bold font-mono text-indigo-600 dark:text-indigo-400">
                          {accommodatedStudents}
                        </span>
                        <span className="text-[10px] text-indigo-600/80 dark:text-indigo-400/80 font-mono">
                          {studentCoveragePercent}% Seated
                        </span>
                      </div>
                    </div>

                    {/* Stat 4: Available / Vacant Seats or Deficit */}
                    <div
                      className={cn(
                        "p-2.5 rounded-xl border flex flex-col justify-between",
                        deficitStudents > 0
                          ? "border-rose-500/40 bg-rose-500/5 dark:bg-rose-500/10 text-rose-700 dark:text-rose-300"
                          : "border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                      )}
                    >
                      <span className="text-[11px] flex items-center gap-1 font-medium">
                        {deficitStudents > 0 ? (
                          <>
                            <AlertCircle className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                            <span>Shortage / Need:</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                            <span>Available Vacant Seats:</span>
                          </>
                        )}
                      </span>
                      <div className="mt-1 flex items-baseline justify-between">
                        <span className="text-base font-bold font-mono">
                          {deficitStudents > 0 ? deficitStudents : availableSeats}
                        </span>
                        <span className="text-[10px] font-mono">
                          {deficitStudents > 0 ? "Seats Short" : `${availablePercent}% Free`}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Dual Animated Progress Bar: Reserved Students vs Available Seats */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-semibold text-foreground flex items-center gap-1.5">
                        <span>Total Seats vs Exam Students:</span>
                        <span className="text-muted-foreground font-normal">
                          {totalDynamicCapacity > 0
                            ? `${accommodatedStudents} of ${totalDynamicCapacity} seats reserved for candidates`
                            : "No rooms selected"}
                        </span>
                      </span>
                      <span className="font-mono text-muted-foreground">
                        All Rooms Combined: <strong>{allRoomsTotalCapacity}</strong> Seats
                      </span>
                    </div>

                    <div className="h-4 sm:h-5 rounded-full bg-muted/80 overflow-hidden relative border border-border/70 flex p-0.5 shadow-inner">
                      {totalDynamicCapacity === 0 ? (
                        <div className="w-full h-full flex items-center justify-center text-[10px] text-muted-foreground font-medium">
                          Select examination rooms below to activate capacity
                        </div>
                      ) : (
                        <>
                          {/* Segment 1: Reserved / Seated Students */}
                          {capacityOccupancyPercent > 0 && (
                            <div
                              className={cn(
                                "h-full transition-all duration-700 ease-out relative flex items-center justify-center overflow-hidden",
                                availablePercent === 0 ? "rounded-full" : "rounded-l-full",
                                deficitStudents > 0
                                  ? "bg-gradient-to-r from-amber-500 via-rose-500 to-rose-600 shadow-sm"
                                  : "bg-gradient-to-r from-indigo-600 via-indigo-500 to-indigo-500 shadow-sm"
                              )}
                              style={{ width: `${capacityOccupancyPercent}%` }}
                              title={`Reserved: ${accommodatedStudents} seats for exam candidates (${capacityOccupancyPercent}%)`}
                            >
                              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse" />
                              {capacityOccupancyPercent >= 16 && (
                                <span className="relative z-10 text-[9px] font-bold text-white font-mono drop-shadow-xs truncate px-1">
                                  Reserved: {accommodatedStudents} ({capacityOccupancyPercent}%)
                                </span>
                              )}
                            </div>
                          )}

                          {/* Segment 2: Available Vacant Seats */}
                          {availablePercent > 0 && (
                            <div
                              className={cn(
                                "h-full transition-all duration-700 ease-out relative flex items-center justify-center overflow-hidden bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-400 shadow-sm",
                                capacityOccupancyPercent === 0 ? "rounded-full" : "rounded-r-full"
                              )}
                              style={{ width: `${availablePercent}%` }}
                              title={`Available: ${availableSeats} vacant seats remaining (${availablePercent}%)`}
                            >
                              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse" />
                              {availablePercent >= 16 && (
                                <span className="relative z-10 text-[9px] font-bold text-white font-mono drop-shadow-xs truncate px-1">
                                  Available: {availableSeats} ({availablePercent}%)
                                </span>
                              )}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {/* Contextual Action Banner */}
                  {deficitStudents > 0 ? (
                    <div className="p-2.5 rounded-xl border border-rose-500/30 bg-rose-500/5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
                        <AlertCircle className="h-4 w-4 shrink-0" />
                        <span>
                          <strong>Seat Shortage:</strong> {deficitStudents} students do not have seats. Selected rooms provide {totalDynamicCapacity} seats for {totalStudentsExpected} students.
                        </span>
                      </div>
                      {allRoomsTotalCapacity >= totalStudentsExpected && selectedRoomIds.length < rooms.length && (
                        <Button
                          size="sm"
                          type="button"
                          onClick={() => setSelectedRoomIds(rooms.map((r) => r.id))}
                          className="h-7 text-xs bg-rose-600 hover:bg-rose-500 text-white font-semibold shrink-0 cursor-pointer shadow-xs"
                        >
                          Select All Rooms ({allRoomsTotalCapacity} Seats)
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center justify-between text-[11px] text-muted-foreground pt-0.5">
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full bg-indigo-500 shrink-0" />
                          <span>Reserved: Students taking exam</span>
                        </span>
                        <span className="flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                          <span>Available: Vacant room seats</span>
                        </span>
                      </div>
                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                        All {totalStudentsExpected} students accommodated ({availableSeats} extra seats available)
                      </span>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>

          {/* Rooms Selection Header with Select All button */}
          <div className="space-y-2.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5 text-primary" />
                  <span>Select Examination Rooms</span>
                  <span className="text-[10px] font-normal text-muted-foreground">
                    ({selectedRooms.length} of {rooms.length} Selected • {totalDynamicCapacity} Seats)
                  </span>
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  type="button"
                  variant={selectedRoomIds.length === rooms.length ? "secondary" : "outline"}
                  onClick={handleToggleSelectAllRooms}
                  className="h-7 text-xs font-semibold gap-1.5 hover:border-primary/40 cursor-pointer"
                >
                  <CheckCheck className="h-3.5 w-3.5 text-primary" />
                  {selectedRoomIds.length === rooms.length
                    ? "Deselect Others"
                    : `Select All Rooms (${rooms.length})`}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setRoomsManagerOpen(true)}
                  className="h-7 text-xs font-semibold gap-1 hover:border-primary/40 cursor-pointer"
                >
                  <DoorOpen className="h-3.5 w-3.5 text-primary" /> View All ({rooms.length})
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleOpenNewRoom}
                  className="h-7 text-xs font-semibold gap-1 text-primary hover:bg-primary/10 cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" /> New Room
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {rooms.map((room) => {
                const isSelected = selectedRoomIds.includes(room.id);
                const roomBenchCount = room.columns.reduce((sum, c) => sum + c.benchCount, 0);
                const roomDynamicSeats = roomBenchCount * studentsPerBench;

                return (
                  <div
                    key={room.id}
                    className={cn(
                      "p-3 rounded-xl border transition-all flex flex-col justify-between gap-2.5 shadow-2xs",
                      isSelected
                        ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                        : "border-border bg-card hover:bg-muted/20"
                    )}
                  >
                    <div
                      onClick={() => toggleRoom(room.id)}
                      className="cursor-pointer flex items-start justify-between gap-2"
                    >
                      <div>
                        <div className="font-semibold text-xs text-foreground flex items-center gap-1.5">
                          <span>{room.roomNumber}</span>
                          {room.floor && (
                            <span className="text-[10px] text-muted-foreground font-normal">
                              ({room.floor})
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-muted-foreground mt-0.5">
                          {room.columns.length} Columns • {roomBenchCount} Benches
                        </div>
                        <div className="text-xs font-semibold text-primary font-mono mt-1">
                          {roomDynamicSeats} Seats ({studentsPerBench}/bench)
                        </div>
                      </div>

                      <div
                        className={cn(
                          "h-4 w-4 rounded-full border-2 transition-all flex items-center justify-center shrink-0 mt-0.5",
                          isSelected
                            ? "border-primary bg-primary"
                            : "border-muted-foreground/30 bg-transparent"
                        )}
                      >
                        {isSelected && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                      </div>
                    </div>

                    <div className="pt-2 border-t border-border/50 flex items-center justify-end">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenEditRoom(room);
                        }}
                        className="text-[11px] text-primary hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                      >
                        <Edit2 className="h-3 w-3" /> Edit Layout
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Strategy or Manual Setup depending on mode */}
          {allocationMode === "auto" ? (
            <div className="space-y-2.5">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Anti-Copying Seating Strategy
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div
                  onClick={() => setStrategy("alternate-columns")}
                  className={cn(
                    "p-3 rounded-xl border cursor-pointer transition-all",
                    strategy === "alternate-columns"
                      ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                      : "border-border bg-card hover:bg-muted/20"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-semibold text-foreground">
                      Alternate Columns (WB Standard)
                    </h4>
                    {strategy === "alternate-columns" && (
                      <Badge className="bg-primary text-white text-[9px] uppercase font-bold">
                        Selected
                      </Badge>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Separate class in each column.
                  </p>
                </div>

                <div
                  onClick={() => setStrategy("interleaved-seats")}
                  className={cn(
                    "p-3 rounded-xl border cursor-pointer transition-all",
                    strategy === "interleaved-seats"
                      ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                      : "border-border bg-card hover:bg-muted/20"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-semibold text-foreground">
                      Interleaved Seats per Bench
                    </h4>
                    {strategy === "interleaved-seats" && (
                      <Badge className="bg-primary text-white text-[9px] uppercase font-bold">
                        Selected
                      </Badge>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Alternate classes across seats on each bench.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Manual Column Assignments
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-muted-foreground">Target Room:</span>
                  <div className="w-48">
                    <CustomSelect
                      value={manualTargetRoomId}
                      onChange={(val) => setManualTargetRoomId(String(val))}
                      options={rooms.map((r) => ({ label: r.roomNumber, value: r.id }))}
                      searchable={false}
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {manualColumnInputs.map((colInput, idx) => {
                  const targetRoom = rooms.find((r) => r.id === manualTargetRoomId);
                  const colConfig = targetRoom?.columns[idx];
                  const colCapacity = (colConfig?.benchCount || 5) * studentsPerBench;
                  const assigned = Math.max(0, colInput.rollTo - colInput.rollFrom + 1);

                  return (
                    <div
                      key={colInput.columnIndex}
                      className="p-3.5 rounded-xl border border-border bg-muted/20 space-y-2.5 shadow-2xs"
                    >
                      <div className="flex items-center justify-between text-xs border-b border-border/50 pb-1.5">
                        <span className="font-bold text-foreground">
                          {colConfig?.columnLabel || `Column ${colInput.columnIndex}`}
                        </span>
                        <Badge variant="secondary" className="text-[10px] font-mono font-bold">
                          {assigned}/{colCapacity}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] font-semibold text-muted-foreground mb-1 block">
                            Class
                          </label>
                          <CustomSelect
                            value={colInput.class}
                            onChange={(val) => {
                              const updated = [...manualColumnInputs];
                              const newClass = String(val);
                              updated[idx].class = newClass;
                              const validSecs = getDynamicSectionsForClass(newClass);
                              if (!validSecs.includes(updated[idx].section)) {
                                updated[idx].section = validSecs[0] || "A";
                              }
                              setManualColumnInputs(updated);
                            }}
                            options={availableClasses.map((c) => ({
                              label: `Class ${c}`,
                              value: c,
                            }))}
                            searchable={false}
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-semibold text-muted-foreground mb-1 block">
                            Section
                          </label>
                          <CustomSelect
                            value={colInput.section}
                            onChange={(val) => {
                              const updated = [...manualColumnInputs];
                              updated[idx].section = String(val);
                              setManualColumnInputs(updated);
                            }}
                            options={getDynamicSectionsForClass(colInput.class).map((s) => ({
                              label: `Sec ${s}`,
                              value: s,
                            }))}
                            searchable={false}
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 text-xs pt-1">
                        <Input
                          type="number"
                          value={colInput.rollFrom}
                          onChange={(e) => {
                            const updated = [...manualColumnInputs];
                            updated[idx].rollFrom = parseInt(e.target.value) || 1;
                            setManualColumnInputs(updated);
                          }}
                          className="h-8 text-xs font-mono font-bold rounded-lg text-center"
                          placeholder="From"
                        />
                        <span className="text-muted-foreground text-xs font-medium">to</span>
                        <Input
                          type="number"
                          value={colInput.rollTo}
                          onChange={(e) => {
                            const updated = [...manualColumnInputs];
                            updated[idx].rollTo = parseInt(e.target.value) || 1;
                            setManualColumnInputs(updated);
                          }}
                          className="h-8 text-xs font-mono font-bold rounded-lg text-center"
                          placeholder="To"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Bottom Execution */}
          <div className="pt-3 border-t border-border/60 flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setStep(2)}
              className="text-xs font-semibold gap-1 cursor-pointer"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back
            </Button>
            <Button
              size="sm"
              onClick={handleExecuteAllocation}
              disabled={loading}
              className="text-xs font-semibold gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating Map...
                </>
              ) : (
                <>
                  <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                  Generate Seating Blueprint <ArrowRight className="h-3.5 w-3.5" />
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────── */}
      {/* STEP 4: Visual 2D Seating Blueprint                          */}
      {/* ──────────────────────────────────────────────────────────── */}
      {step === 4 && (
        <div className="space-y-4">
          {/* Header Bar with Room Switcher Pills */}
          {generatedAllocation && (
            <div className="p-3.5 sm:p-4 rounded-xl border bg-card shadow-xs flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-foreground">
                    {generatedAllocation.title}
                  </h3>
                  <Badge className="bg-primary/15 text-primary border-primary/20 text-xs font-bold">
                    {generatedAllocation.examType}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Total Students: <strong>{generatedAllocation.summary.totalStudents}</strong> •{" "}
                  <strong>{studentsPerBench} Students/Bench</strong>
                </p>
              </div>

              {/* Room Pills & Print Suite Button */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1.5 overflow-x-auto">
                  {generatedAllocation.roomAllocations.map((room) => {
                    const isSelected = room.roomId === activeBlueprintRoomId;
                    return (
                      <button
                        key={room.roomId}
                        onClick={() => setActiveBlueprintRoomId(room.roomId)}
                        className={cn(
                          "px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer",
                          isSelected
                            ? "bg-primary text-primary-foreground shadow-xs"
                            : "bg-muted/60 text-muted-foreground hover:text-foreground border border-border/60"
                        )}
                      >
                        <DoorOpen className="h-3.5 w-3.5" />
                        <span>{room.roomNumber}</span>
                        <span className="text-[10px] opacity-80">
                          ({room.occupiedSeats}/{room.totalSeats})
                        </span>
                      </button>
                    );
                  })}
                </div>

                <Button
                  size="sm"
                  onClick={() => setPrintDialogOpen(true)}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs gap-1.5 shadow-md ml-1 cursor-pointer shrink-0"
                >
                  <Printer className="h-3.5 w-3.5" />
                  Print Exam Suite
                </Button>
              </div>
            </div>
          )}

          {/* 2D Visual Blueprint */}
          {activeBlueprintRoom ? (
            <VisualRoomBlueprint
              room={activeBlueprintRoom}
              onSwapSeats={handleSwapSeats}
              examTitle={generatedAllocation?.title}
              examType={generatedAllocation?.examType}
            />
          ) : (
            <div className="p-10 text-center border border-dashed rounded-xl">
              <Armchair className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm font-semibold">No room selected</p>
            </div>
          )}
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────── */}
      {/* USER REQUIREMENT: View Recent Allocation moved to bottom     */}
      {/* ──────────────────────────────────────────────────────────── */}
      {savedAllocations.length > 0 && (
        <div className="rounded-xl border border-border/80 bg-muted/20 p-3.5 sm:p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary shrink-0 border border-primary/20">
              <History className="h-4 w-4" />
            </div>
            <div>
              <div className="font-semibold text-foreground flex items-center gap-2">
                <span>Recent Exam Seating Plan: {savedAllocations[0].title}</span>
                <Badge variant="secondary" className="text-[10px] font-mono">
                  {savedAllocations[0].summary.totalStudents} Students
                </Badge>
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Saved on {new Date(savedAllocations[0].createdAt).toLocaleDateString()} •{" "}
                {savedAllocations[0].summary.totalRooms} Room(s) allocated ({savedAllocations.length} saved plans)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setGeneratedAllocation(savedAllocations[0]);
                setActiveBlueprintRoomId(savedAllocations[0].roomAllocations[0]?.roomId || "");
                setStep(4);
              }}
              className="text-xs font-semibold gap-1.5 hover:border-primary/40 cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5 text-primary" /> View Seating Blueprint
            </Button>

            <Button
              size="sm"
              onClick={() => {
                setGeneratedAllocation(savedAllocations[0]);
                setActiveBlueprintRoomId(savedAllocations[0].roomAllocations[0]?.roomId || "");
                setPrintDialogOpen(true);
              }}
              className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold gap-1.5 cursor-pointer shadow-xs"
            >
              <Printer className="h-3.5 w-3.5" /> Print Suite
            </Button>
          </div>
        </div>
      )}

      {/* Rooms Manager Dialog */}
      <RoomsManagerDialog
        isOpen={roomsManagerOpen}
        onClose={() => setRoomsManagerOpen(false)}
        rooms={rooms}
        onAddNewRoom={handleOpenNewRoom}
        onEditRoom={handleOpenEditRoom}
        onDeleteRoom={handleDeleteRoom}
      />

      {/* Room Editor Dialog */}
      <RoomEditorDialog
        isOpen={editorOpen}
        onClose={() => setEditorOpen(false)}
        onSave={(room) => {
          saveRoom(room);
          const updated = getSavedRooms();
          setRooms(updated);
        }}
        initialRoom={editingRoom}
      />

      {/* Mismatch Notification Modal */}
      <MismatchModal
        isOpen={mismatchModalOpen}
        onClose={() => setMismatchModalOpen(false)}
        onProceed={handleProceedWithMismatch}
        report={mismatchReport}
        allowProceedOnError={true}
      />

      {/* EMS Print Suite Modal */}
      {generatedAllocation && (
        <EmsPrintDialog
          open={printDialogOpen}
          onOpenChange={setPrintDialogOpen}
          allocation={generatedAllocation}
          defaultRoomId={activeBlueprintRoomId || "ALL"}
        />
      )}
    </div>
  );
}
