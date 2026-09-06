"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { EmsNavTabs } from "@/components/ems/ems-nav-tabs";
import { MismatchModal } from "@/components/ems/mismatch-modal";
import { getSavedRooms, saveAllocation } from "@/lib/ems/room-storage";
import {
  fetchContinuingStudents,
  generateAutoAllocation,
} from "@/lib/ems/allocation-engine";
import {
  EmsRoom,
  ExamType,
  EXAM_TYPES,
  AutoAllocationClassInput,
  AutoAllocationConfig,
  MismatchReport,
  ExamAllocation,
} from "@/lib/ems/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Wand2,
  Plus,
  Trash2,
  DoorOpen,
  Calendar,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Armchair,
} from "lucide-react";

const CLASS_OPTIONS = ["V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];
const SECTION_OPTIONS = ["A", "B", "C", "D"];

export default function EmsAutoAllocationPage() {
  const router = useRouter();
  const [rooms, setRooms] = useState<EmsRoom[]>([]);
  const [selectedRoomIds, setSelectedRoomIds] = useState<string[]>([]);
  const [examType, setExamType] = useState<ExamType>("1st Summative Evaluation");
  const [academicYear, setAcademicYear] = useState<number>(2026);
  const [strategy, setStrategy] = useState<"alternate-columns" | "interleaved-seats">(
    "alternate-columns"
  );
  const [loading, setLoading] = useState(false);

  // Classes list to allocate
  const [classes, setClasses] = useState<AutoAllocationClassInput[]>([
    { class: "VIII", section: "A", rollFrom: 1, rollTo: 35 },
    { class: "IX", section: "A", rollFrom: 1, rollTo: 35 },
  ]);

  // Mismatch Modal state
  const [mismatchReport, setMismatchReport] = useState<MismatchReport | null>(null);
  const [mismatchModalOpen, setMismatchModalOpen] = useState(false);
  const [pendingAllocation, setPendingAllocation] = useState<ExamAllocation | null>(null);

  useEffect(() => {
    const saved = getSavedRooms();
    setRooms(saved);
    // By default, select first 2 rooms if available
    setSelectedRoomIds(saved.slice(0, 2).map((r) => r.id));
  }, []);

  // Add a new class row
  const handleAddClass = () => {
    setClasses([
      ...classes,
      { class: "X", section: "A", rollFrom: 1, rollTo: 30 },
    ]);
  };

  // Remove a class row
  const handleRemoveClass = (index: number) => {
    if (classes.length <= 1) return;
    setClasses(classes.filter((_, i) => i !== index));
  };

  // Update a class row
  const updateClassRow = (
    index: number,
    field: keyof AutoAllocationClassInput,
    val: any
  ) => {
    const updated = [...classes];
    updated[index] = { ...updated[index], [field]: val };
    setClasses(updated);
  };

  // Toggle room selection
  const toggleRoom = (roomId: string) => {
    if (selectedRoomIds.includes(roomId)) {
      setSelectedRoomIds(selectedRoomIds.filter((id) => id !== roomId));
    } else {
      setSelectedRoomIds([...selectedRoomIds, roomId]);
    }
  };

  // Calculations
  const totalStudentsExpected = classes.reduce(
    (sum, c) => sum + Math.max(0, c.rollTo - c.rollFrom + 1),
    0
  );

  const selectedRooms = rooms.filter((r) => selectedRoomIds.includes(r.id));
  const totalSeatsAvailable = selectedRooms.reduce((sum, r) => sum + r.totalCapacity, 0);
  const capacityPercent =
    totalSeatsAvailable > 0
      ? Math.min(Math.round((totalStudentsExpected / totalSeatsAvailable) * 100), 100)
      : 0;

  const handleRunAutoAllocation = async () => {
    if (selectedRooms.length === 0) {
      alert("Please select at least one examination room.");
      return;
    }
    setLoading(true);

    try {
      // 1. Fetch live DB active students
      const allStudents = await fetchContinuingStudents();

      const config: AutoAllocationConfig = {
        academicYear,
        examType,
        classes,
        selectedRoomIds,
        strategy,
      };

      // 2. Run allocation algorithm
      const { allocation, mismatchReport: report } = generateAutoAllocation(
        selectedRooms,
        config,
        allStudents
      );

      setPendingAllocation(allocation);

      // 3. Show mismatch modal if any warnings or errors
      if (report.items.length > 0) {
        setMismatchReport(report);
        setMismatchModalOpen(true);
      } else {
        saveAllocation(allocation);
        router.push(`/ems/seating-map?id=${allocation.id}`);
      }
    } catch (err) {
      console.error("Error during auto allocation:", err);
      alert("Failed to run auto allocation.");
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
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground flex items-center gap-2.5">
          <span className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
            <Wand2 className="h-6 w-6" />
          </span>
          <span>Smart Auto Allocation Wizard</span>
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1">
          Select multiple classes & target rooms — the anti-copying algorithm will automatically balance and distribute students.
        </p>
      </div>

      {/* Navigation Tabs */}
      <EmsNavTabs activeTab="auto" />

      {/* Main Wizard Form */}
      <div className="rounded-2xl border border-border/80 bg-card p-5 sm:p-6 shadow-xs space-y-6">
        {/* Step 1: Session & Exam Type */}
        <div className="space-y-3 pb-5 border-b border-border/60">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />
            <span>Step 1: Examination Session & Type</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Academic Year</Label>
              <Input
                type="number"
                value={academicYear}
                onChange={(e) => setAcademicYear(parseInt(e.target.value) || 2026)}
                className="h-9 text-xs font-mono"
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
          </div>
        </div>

        {/* Step 2: Participating Classes & Roll Ranges */}
        <div className="space-y-3 pb-5 border-b border-border/60">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-purple-500" />
                <span>Step 2: Participating Classes & Roll Ranges</span>
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Add each class and section sitting for this examination
              </p>
            </div>

            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleAddClass}
              className="h-7 text-xs font-semibold gap-1"
            >
              <Plus className="h-3.5 w-3.5" /> Add Another Class
            </Button>
          </div>

          {/* Classes Table / Cards */}
          <div className="space-y-2.5">
            {classes.map((c, idx) => {
              const count = Math.max(0, c.rollTo - c.rollFrom + 1);
              return (
                <div
                  key={idx}
                  className="p-3 rounded-xl border border-border/80 bg-muted/20 flex flex-wrap items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-2">
                    <span className="h-6 w-6 rounded-md bg-purple-500/10 text-purple-600 dark:text-purple-400 font-bold text-xs flex items-center justify-center">
                      #{idx + 1}
                    </span>
                    <span className="font-bold text-xs text-foreground">Class Group</span>
                  </div>

                  <div className="flex items-center gap-3 flex-wrap flex-1 max-w-lg">
                    <div className="flex items-center gap-1.5">
                      <Label className="text-[11px] text-muted-foreground">Class:</Label>
                      <select
                        value={c.class}
                        onChange={(e) => updateClassRow(idx, "class", e.target.value)}
                        className="h-8 px-2 text-xs rounded-md border border-input bg-background font-semibold"
                      >
                        {CLASS_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Label className="text-[11px] text-muted-foreground">Sec:</Label>
                      <select
                        value={c.section}
                        onChange={(e) => updateClassRow(idx, "section", e.target.value)}
                        className="h-8 px-2 text-xs rounded-md border border-input bg-background font-semibold"
                      >
                        {SECTION_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Label className="text-[11px] text-muted-foreground">Roll:</Label>
                      <Input
                        type="number"
                        min={1}
                        value={c.rollFrom}
                        onChange={(e) =>
                          updateClassRow(idx, "rollFrom", parseInt(e.target.value) || 1)
                        }
                        className="h-8 w-16 text-center text-xs font-mono"
                      />
                      <span className="text-muted-foreground text-xs">to</span>
                      <Input
                        type="number"
                        min={1}
                        value={c.rollTo}
                        onChange={(e) =>
                          updateClassRow(idx, "rollTo", parseInt(e.target.value) || 1)
                        }
                        className="h-8 w-16 text-center text-xs font-mono"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-[10px] font-mono">
                      {count} Students
                    </Badge>
                    {classes.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => handleRemoveClass(idx)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="text-xs font-semibold text-right text-muted-foreground">
            Total Students to Seat: <strong className="text-foreground text-sm">{totalStudentsExpected}</strong>
          </div>
        </div>

        {/* Step 3: Available Rooms Selection */}
        <div className="space-y-3 pb-5 border-b border-border/60">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <DoorOpen className="h-4 w-4 text-primary" />
              <span>Step 3: Select Available Examination Rooms</span>
            </h3>
            <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-xs font-bold font-mono">
              {totalSeatsAvailable} Total Seats Available
            </Badge>
          </div>

          {/* Rooms Multi-Select Checklist */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {rooms.map((room) => {
              const isSelected = selectedRoomIds.includes(room.id);
              return (
                <div
                  key={room.id}
                  onClick={() => toggleRoom(room.id)}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all duration-200 flex items-start justify-between gap-3 ${isSelected
                      ? "border-primary bg-primary/10 shadow-xs ring-2 ring-primary/30"
                      : "border-border/80 bg-card hover:bg-muted/30"
                    }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-foreground">{room.roomNumber}</span>
                      {room.floor && (
                        <span className="text-[10px] text-muted-foreground">({room.floor})</span>
                      )}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {room.columns.length} Columns • {room.totalCapacity} Seats
                    </div>
                  </div>

                  <div
                    className={`h-5 w-5 rounded-md border flex items-center justify-center transition-colors ${isSelected
                        ? "bg-primary border-primary text-white"
                        : "border-muted-foreground/40 bg-background"
                      }`}
                  >
                    {isSelected && <CheckCircle2 className="h-3.5 w-3.5" />}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Capacity Progress Bar */}
          <div className="p-3.5 rounded-xl bg-muted/30 border border-border/60 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-foreground">Capacity Balance Gauge</span>
              <span className="text-muted-foreground font-mono">
                {totalStudentsExpected} / {totalSeatsAvailable} Seats ({capacityPercent}%)
              </span>
            </div>
            <Progress value={capacityPercent} className="h-2 rounded-full" />
            <p className="text-[11px] text-muted-foreground">
              {totalStudentsExpected > totalSeatsAvailable ? (
                <span className="text-rose-500 font-semibold flex items-center gap-1">
                  <AlertCircle className="h-3.5 w-3.5" /> Deficit: Need{" "}
                  {totalStudentsExpected - totalSeatsAvailable} more seats! Select another room.
                </span>
              ) : (
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                  <ShieldCheck className="h-3.5 w-3.5" /> Sufficient capacity:{" "}
                  {totalSeatsAvailable - totalStudentsExpected} vacant seats remaining.
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Step 4: Anti-Copying Seating Strategy */}
        <div className="space-y-3 pb-5 border-b border-border/60">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-500" />
            <span>Step 4: Anti-Copying Allocation Strategy</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Option A: Alternate Columns */}
            <div
              onClick={() => setStrategy("alternate-columns")}
              className={`p-4 rounded-xl border cursor-pointer transition-all ${strategy === "alternate-columns"
                  ? "border-primary bg-primary/10 ring-2 ring-primary/30"
                  : "border-border/80 bg-card hover:bg-muted/20"
                }`}
            >
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-foreground">
                  Alternate Columns (WB School Standard)
                </h4>
                {strategy === "alternate-columns" && (
                  <Badge className="bg-primary text-white text-[9px] uppercase">Selected</Badge>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                Col 1 = Class VIII, Col 2 = Class IX, Col 3 = Class VIII. Students in adjacent columns across aisles are always from different classes.
              </p>
            </div>

            {/* Option B: Interleaved Seats */}
            <div
              onClick={() => setStrategy("interleaved-seats")}
              className={`p-4 rounded-xl border cursor-pointer transition-all ${strategy === "interleaved-seats"
                  ? "border-primary bg-primary/10 ring-2 ring-primary/30"
                  : "border-border/80 bg-card hover:bg-muted/20"
                }`}
            >
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-foreground">Interleaved Seats per Bench</h4>
                {strategy === "interleaved-seats" && (
                  <Badge className="bg-primary text-white text-[9px] uppercase">Selected</Badge>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                Seat 1 = Class VIII, Seat 2 = Class IX on the same bench desk.
              </p>
            </div>
          </div>
        </div>

        {/* Generate Button */}
        <div className="pt-2 flex items-center justify-end">
          <Button
            onClick={handleRunAutoAllocation}
            disabled={loading || selectedRoomIds.length === 0}
            className="h-11 text-xs font-bold gap-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg px-6"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Executing Smart Seating Algorithm...
              </>
            ) : (
              <>
                <Wand2 className="h-4 w-4 text-purple-300" />
                Generate Smart Allocation & View 2D Map
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Mismatch Modal */}
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
