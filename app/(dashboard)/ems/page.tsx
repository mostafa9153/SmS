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
  saveRooms,
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
import { Student } from "@/lib/types";
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
  Check,
  CheckCheck,
  Building2,
  X,
  GraduationCap,
  Layers,
  GripVertical,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
} from "lucide-react";
import { EmsPrintDialog } from "@/components/ems/print/ems-print-dialog";
import { SeatArrangementEditor } from "@/components/ems/seat-arrangement/seat-arrangement-editor";
import { getClassColorStyle } from "@/components/ems/seat-card";
import {
  getDynamicClassCodes,
  getDynamicSectionsForClass,
  getClassNumericRank,
  syncAllEmsConfigsFromDb,
} from "@/lib/ems/ems-config-loader";

// Normalize class for matching
const normalizeClassCode = (c: string): string => {
  const clean = (c || "").trim().toUpperCase().replace(/^CLASS\s*[-_]?\s*/i, "");
  const romanMap: Record<string, string> = {
    "1": "I", "2": "II", "3": "III", "4": "IV", "5": "V",
    "6": "VI", "7": "VII", "8": "VIII", "9": "IX", "10": "X",
    "11": "XI", "12": "XII",
  };
  return romanMap[clean] || clean;
};

// Sort class groups strictly in consecutive order: 5, 6, 7, 8, 9, 10, 11, 12 (V..XII)
const sortClassGroups = (groups: ClassGroupConfig[]): ClassGroupConfig[] => {
  return [...groups].sort((a, b) => getClassNumericRank(a.class) - getClassNumericRank(b.class));
};

// Normalize section for matching
const normalizeSectionCode = (sec: string): string => {
  return (sec || "").trim().toUpperCase().replace(/^SEC(TION)?\s*[-_]?\s*/i, "");
};

// Calculate enrolled student stats & roll range for a given class and section
const calculateSectionStudentStats = (
  students: Student[],
  className: string,
  sectionName: string
): { count: number; rollFrom: number; rollTo: number } => {
  const targetClass = normalizeClassCode(className);
  const targetSec = normalizeSectionCode(sectionName);

  const matched = students.filter((s) => {
    if (s.currentStatus && s.currentStatus !== "Continuing") return false;
    const sClass = normalizeClassCode(s.presentClass);
    const sSec = normalizeSectionCode(s.presentSection);
    return sClass === targetClass && sSec === targetSec;
  });

  if (matched.length === 0) {
    return { count: 0, rollFrom: 1, rollTo: 35 };
  }

  // Count is the exact number of active students in DB for this class & section
  const totalEnrolled = matched.length;

  return {
    count: totalEnrolled,
    rollFrom: 1,
    rollTo: totalEnrolled,
  };
};

// Get all available sections for a class (configured + present in student records)
const getSectionsForClass = (
  classCode: string,
  students: Student[] = []
): string[] => {
  const configured = getDynamicSectionsForClass(classCode);
  const targetClass = normalizeClassCode(classCode);
  const fromStudents = students
    .filter((s) => normalizeClassCode(s.presentClass) === targetClass)
    .map((s) => normalizeSectionCode(s.presentSection))
    .filter(Boolean);

  const merged = Array.from(new Set([...configured, ...fromStudents])).sort();
  return merged.length > 0 ? merged : ["A", "B"];
};

export interface ClassGroupSectionConfig {
  section: string;
  rollFrom: number;
  rollTo: number;
  enrolledCount: number;
}

export interface ClassGroupConfig {
  id: string;
  class: string;
  sections: ClassGroupSectionConfig[];
}

const STEPS: StepItem[] = [
  { id: 1, title: "Session & Exam" },
  { id: 2, title: "Class & Students" },
  { id: 3, title: "Room & Benches" },
  { id: 4, title: "Seat Arrangement" },
  { id: 5, title: "Visual Seating Map" },
];

export default function EmsMasterPage() {
  const router = useRouter();

  // Wizard Step State
  const [step, setStep] = useState<number>(1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);

  // Step 1: Session & Exam
  const [academicYear, setAcademicYear] = useState<number>(2026);
  const [examType, setExamType] = useState<ExamType>("1st Summative Evaluation");

  // Step 2: Class & Students (Group-wise with multi-section auto-select & DB roll ranges)
  const [classGroups, setClassGroups] = useState<ClassGroupConfig[]>([]);
  const [classes, setClasses] = useState<AutoAllocationClassInput[]>([]);
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [studentsLoading, setStudentsLoading] = useState<boolean>(true);

  // Step 3: Room & Benches Setup
  const [studentsPerBench, setStudentsPerBench] = useState<number>(3); // DIRECT INPUT! (Default 3 Students per Bench)
  const [rooms, setRooms] = useState<EmsRoom[]>([]);
  const [selectedRoomIds, setSelectedRoomIds] = useState<string[]>([]);
  // Room-wise Assigned Classes mapping (roomId -> class codes array, e.g. ["VIII", "IX"])
  const [roomClassMap, setRoomClassMap] = useState<Record<string, string[]>>({});
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<EmsRoom | null>(null);
  const [roomsManagerOpen, setRoomsManagerOpen] = useState(false);

  // Drag-and-drop room serial reordering state
  const [draggedRoomIndex, setDraggedRoomIndex] = useState<number | null>(null);
  const [dragOverRoomIndex, setDragOverRoomIndex] = useState<number | null>(null);

  // Reorder rooms helper (updates state, localStorage, and DB)
  const reorderRooms = (fromIndex: number, toIndex: number) => {
    if (
      fromIndex === toIndex ||
      fromIndex < 0 ||
      toIndex < 0 ||
      fromIndex >= rooms.length ||
      toIndex >= rooms.length
    )
      return;
    const updated = [...rooms];
    const [moved] = updated.splice(fromIndex, 1);
    updated.splice(toIndex, 0, moved);
    setRooms(updated);
    saveRooms(updated);
  };

  const handleMoveRoom = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    reorderRooms(index, targetIndex);
  };

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
      }
    });

    const saved = getSavedRooms();
    setRooms(saved);
    if (saved.length > 0) {
      setSelectedRoomIds([saved[0].id]);
    }
    setSavedAllocations(getSavedAllocations());

    // Fetch continuing students & initialize class groups with all sections and auto-fetched roll ranges
    fetchContinuingStudents().then((loadedStudents) => {
      setAllStudents(loadedStudents);
      setStudentsLoading(false);

      const defaultClassCodes = ["V", "VI"];
      const initialGroups: ClassGroupConfig[] = defaultClassCodes.map((code, idx) => {
        const availSecs = getSectionsForClass(code, loadedStudents);
        return {
          id: `grp-${code.toLowerCase()}-${idx}-${Date.now()}`,
          class: code,
          sections: availSecs.map((sec) => {
            const stats = calculateSectionStudentStats(loadedStudents, code, sec);
            return {
              section: sec,
              rollFrom: stats.rollFrom,
              rollTo: stats.rollTo,
              enrolledCount: stats.count,
            };
          }),
        };
      });

      setClassGroups((prev) => {
        if (prev.length === 0) return sortClassGroups(initialGroups);
        // If already present, refresh roll ranges and enrolled counts with loaded students
        const updated = prev.map((g) => {
          const availSecs = getSectionsForClass(g.class, loadedStudents);
          return {
            ...g,
            sections: (g.sections.length > 0 ? g.sections : availSecs.map((s) => ({
              section: s,
              rollFrom: 1,
              rollTo: 35,
              enrolledCount: 0,
            }))).map((sec) => {
              const stats = calculateSectionStudentStats(loadedStudents, g.class, sec.section);
              return {
                ...sec,
                rollFrom: stats.count > 0 ? stats.rollFrom : sec.rollFrom,
                rollTo: stats.count > 0 ? stats.rollTo : sec.rollTo,
                enrolledCount: stats.count,
              };
            }),
          };
        });
        return sortClassGroups(updated);
      });
    });
  }, []);

  // Sync classes (AutoAllocationClassInput[]) whenever classGroups changes
  useEffect(() => {
    const flattened: AutoAllocationClassInput[] = classGroups.flatMap((g) =>
      g.sections.map((s) => ({
        class: g.class,
        section: s.section,
        rollFrom: s.rollFrom,
        rollTo: s.rollTo,
      }))
    );
    setClasses(flattened);
  }, [classGroups]);

  // Handler: Add a new class group with ALL its sections pre-selected (only picks unassigned classes)
  const handleAddClassGroup = () => {
    const existingCodes = new Set(classGroups.map((g) => normalizeClassCode(g.class)));
    const nextClass = availableClasses.find((c) => !existingCodes.has(normalizeClassCode(c)));
    if (!nextClass) return; // All available classes already added

    const allSecs = getSectionsForClass(nextClass, allStudents);
    const newSections: ClassGroupSectionConfig[] = allSecs.map((sec) => {
      const stats = calculateSectionStudentStats(allStudents, nextClass, sec);
      return {
        section: sec,
        rollFrom: stats.rollFrom,
        rollTo: stats.rollTo,
        enrolledCount: stats.count,
      };
    });

    const newGroup: ClassGroupConfig = {
      id: `grp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      class: nextClass,
      sections: newSections,
    };

    setClassGroups((prev) => sortClassGroups([...prev, newGroup]));
  };

  // Handler: Change the class of a group and auto-populate all its sections (re-sorts in order)
  const handleChangeGroupClass = (groupId: string, newClassCode: string) => {
    const allSecs = getSectionsForClass(newClassCode, allStudents);
    const newSections: ClassGroupSectionConfig[] = allSecs.map((sec) => {
      const stats = calculateSectionStudentStats(allStudents, newClassCode, sec);
      return {
        section: sec,
        rollFrom: stats.rollFrom,
        rollTo: stats.rollTo,
        enrolledCount: stats.count,
      };
    });

    setClassGroups((prev) =>
      sortClassGroups(
        prev.map((g) =>
          g.id === groupId
            ? {
                ...g,
                class: newClassCode,
                sections: newSections,
              }
            : g
        )
      )
    );
  };

  // Handler: Remove an entire class group
  const handleRemoveClassGroup = (groupId: string) => {
    setClassGroups((prev) => prev.filter((g) => g.id !== groupId));
  };

  // Handler: Remove a specific section from a group
  const handleRemoveSection = (groupId: string, sectionToRemove: string) => {
    setClassGroups((prev) =>
      prev.map((g) =>
        g.id === groupId
          ? {
              ...g,
              sections: g.sections.filter((s) => s.section !== sectionToRemove),
            }
          : g
      )
    );
  };

  // Handler: Add a section back to a group with its auto-detected student stats
  const handleAddSectionToGroup = (groupId: string, sectionToAdd: string) => {
    setClassGroups((prev) =>
      prev.map((g) => {
        if (g.id !== groupId) return g;
        if (g.sections.some((s) => s.section === sectionToAdd)) return g;
        const stats = calculateSectionStudentStats(allStudents, g.class, sectionToAdd);
        const newSec: ClassGroupSectionConfig = {
          section: sectionToAdd,
          rollFrom: stats.rollFrom,
          rollTo: stats.rollTo,
          enrolledCount: stats.count,
        };
        const updated = [...g.sections, newSec].sort((a, b) =>
          a.section.localeCompare(b.section)
        );
        return {
          ...g,
          sections: updated,
        };
      })
    );
  };

  // Handler: Update roll range for a section
  const handleUpdateSectionRoll = (
    groupId: string,
    sectionName: string,
    field: "rollFrom" | "rollTo",
    value: number
  ) => {
    setClassGroups((prev) =>
      prev.map((g) => {
        if (g.id !== groupId) return g;
        return {
          ...g,
          sections: g.sections.map((s) =>
            s.section === sectionName ? { ...s, [field]: value } : s
          ),
        };
      })
    );
  };

  // Handler: Reset a single section back to its database roll range
  const handleResetSectionRoll = (groupId: string, sectionName: string) => {
    setClassGroups((prev) =>
      prev.map((g) => {
        if (g.id !== groupId) return g;
        const stats = calculateSectionStudentStats(allStudents, g.class, sectionName);
        return {
          ...g,
          sections: g.sections.map((s) =>
            s.section === sectionName
              ? {
                  ...s,
                  rollFrom: stats.rollFrom,
                  rollTo: stats.rollTo,
                  enrolledCount: stats.count,
                }
              : s
          ),
        };
      })
    );
  };

  // Handler: Reset all sections in a group to their database roll ranges
  const handleResetGroupRolls = (groupId: string) => {
    setClassGroups((prev) =>
      prev.map((g) => {
        if (g.id !== groupId) return g;
        return {
          ...g,
          sections: g.sections.map((s) => {
            const stats = calculateSectionStudentStats(allStudents, g.class, s.section);
            return {
              ...s,
              rollFrom: stats.rollFrom,
              rollTo: stats.rollTo,
              enrolledCount: stats.count,
            };
          }),
        };
      })
    );
  };

  // Handler: Add all unselected sections to a group at once
  const handleAddAllSectionsToGroup = (groupId: string, sectionsToAdd: string[]) => {
    setClassGroups((prev) =>
      prev.map((g) => {
        if (g.id !== groupId) return g;
        const existingNames = new Set(g.sections.map((s) => s.section));
        const newSecs: ClassGroupSectionConfig[] = sectionsToAdd
          .filter((s) => !existingNames.has(s))
          .map((sec) => {
            const stats = calculateSectionStudentStats(allStudents, g.class, sec);
            return {
              section: sec,
              rollFrom: stats.rollFrom,
              rollTo: stats.rollTo,
              enrolledCount: stats.count,
            };
          });
        const updated = [...g.sections, ...newSecs].sort((a, b) =>
          a.section.localeCompare(b.section)
        );
        return {
          ...g,
          sections: updated,
        };
      })
    );
  };

  // Unique participating classes configured in Step 2
  const uniqueParticipatingClasses = Array.from(
    new Set(classGroups.map((g) => normalizeClassCode(g.class)))
  );

  // Retrieve assigned classes for a room (defaults to all participating classes if unset)
  const getAssignedClassesForRoom = (roomId: string): string[] => {
    if (roomClassMap[roomId] !== undefined) {
      return roomClassMap[roomId];
    }
    return uniqueParticipatingClasses;
  };

  // Toggle a class assignment for a room
  const handleToggleClassForRoom = (roomId: string, classCode: string) => {
    const current = getAssignedClassesForRoom(roomId);
    const normCode = normalizeClassCode(classCode);
    const exists = current.map(normalizeClassCode).includes(normCode);
    const updated = exists
      ? current.filter((c) => normalizeClassCode(c) !== normCode)
      : [...current, normCode];
    setRoomClassMap((prev) => ({
      ...prev,
      [roomId]: updated,
    }));
  };

  // Select all or clear all classes for a room
  const handleSelectAllClassesForRoom = (roomId: string, selectAll: boolean) => {
    setRoomClassMap((prev) => ({
      ...prev,
      [roomId]: selectAll ? [...uniqueParticipatingClasses] : [],
    }));
  };

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
      const loadedStudents = allStudents.length > 0 ? allStudents : await fetchContinuingStudents();

      const config: AutoAllocationConfig = {
        academicYear,
        examType,
        classes,
        selectedRoomIds,
        studentsPerBench,
        roomClassMap,
      };

      const { allocation, mismatchReport: report } = generateAutoAllocation(
        selectedRooms,
        config,
        loadedStudents
      );

      setPendingAllocation(allocation);

      if (report.items.length > 0) {
        setMismatchReport(report);
        setMismatchModalOpen(true);
      } else {
        finishAllocation(allocation);
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

  const handleCommitArrangement = (finalAllocation: ExamAllocation) => {
    saveAllocation(finalAllocation);
    setGeneratedAllocation(finalAllocation);
    setSavedAllocations(getSavedAllocations());
    if (finalAllocation.roomAllocations.length > 0) {
      setActiveBlueprintRoomId(finalAllocation.roomAllocations[0].roomId);
    }
    markStepDone(4);
    setStep(5);
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
      {/* STEP 1: Examination Session Details                          */}
      {/* ──────────────────────────────────────────────────────────── */}
      {step === 1 && (
        <div className="space-y-5">
          {/* Session Details Box */}
          <div className="rounded-xl border bg-card p-4 sm:p-5 shadow-xs space-y-4">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Examination Session Details
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
                  className="h-10 text-xs font-mono font-bold rounded-xl bg-muted/50 opacity-100 cursor-not-allowed"
                  disabled
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
        <div className="rounded-2xl border border-border/80 bg-card p-4 sm:p-5 shadow-xs space-y-4">
          {/* Step 2 Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20 shadow-2xs">
                <GraduationCap className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-bold text-foreground tracking-tight flex items-center gap-2">
                  <span>Participating Classes & Roll Ranges</span>
                </h2>
                <p className="text-[11px] text-muted-foreground">
                  Select examination grades and adjust student roll intervals per section.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className="text-xs font-semibold px-2.5 py-1 border-border/80 bg-muted/40 text-foreground font-mono"
              >
                {classGroups.length} Classes • {classes.length} Sections • {totalStudentsExpected} Students
              </Badge>

              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={classGroups.length >= availableClasses.length}
                onClick={handleAddClassGroup}
                className="h-8 text-xs font-semibold gap-1.5 hover:border-primary/40 hover:bg-primary/5 text-foreground cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs"
                title={
                  classGroups.length >= availableClasses.length
                    ? "All available classes are already configured"
                    : "Add another class group"
                }
              >
                <Plus className="h-3.5 w-3.5 text-primary" /> Add Class Group
              </Button>
            </div>
          </div>

          {/* Group-based Class Cards */}
          <div className="space-y-3.5">
            {classGroups.length === 0 ? (
              <div className="p-8 text-center border border-dashed rounded-2xl space-y-3 bg-muted/10">
                <p className="text-xs text-muted-foreground font-medium">
                  No classes configured. Click below to add a class group.
                </p>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleAddClassGroup}
                  className="text-xs font-semibold gap-1.5 cursor-pointer shadow-xs"
                >
                  <Plus className="h-3.5 w-3.5" /> Add Class Group
                </Button>
              </div>
            ) : (
              classGroups.map((g, gIdx) => {
                const availSecs = getSectionsForClass(g.class, allStudents);
                const selectedSecNames = new Set(g.sections.map((s) => s.section));
                const unselectedSecs = availSecs.filter((s) => !selectedSecNames.has(s));
                const groupTotalStudents = g.sections.reduce(
                  (sum, s) => sum + Math.max(0, s.rollTo - s.rollFrom + 1),
                  0
                );

                const classStyle = getClassColorStyle(g.class);

                // Check if any section has modified rolls compared to DB stats
                const hasModifiedRolls = g.sections.some((sec) => {
                  const stats = calculateSectionStudentStats(allStudents, g.class, sec.section);
                  return (
                    stats.count > 0 &&
                    (sec.rollFrom !== stats.rollFrom || sec.rollTo !== stats.rollTo)
                  );
                });

                // Filter out classes already assigned to other groups
                const otherAssignedClasses = new Set(
                  classGroups
                    .filter((other) => other.id !== g.id)
                    .map((other) => normalizeClassCode(other.class))
                );

                const selectableClassOptions = availableClasses
                  .filter((opt) => !otherAssignedClasses.has(normalizeClassCode(opt)))
                  .map((opt) => ({
                    label: `Class ${opt}`,
                    value: opt,
                  }));

                return (
                  <div
                    key={g.id}
                    className={cn(
                      "p-3.5 sm:p-4.5 rounded-2xl border transition-all shadow-2xs space-y-3 bg-card/90 backdrop-blur-xs",
                      classStyle ? classStyle.border : "border-border/80"
                    )}
                  >
                    {/* Class Group Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-border/40 pb-2.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={cn(
                            "h-7 px-2.5 rounded-lg font-bold text-xs flex items-center justify-center font-mono border shadow-2xs",
                            classStyle
                              ? `${classStyle.bg} ${classStyle.textRoll} ${classStyle.border}`
                              : "bg-primary/10 text-primary border-primary/20"
                          )}
                        >
                          #{gIdx + 1}
                        </span>

                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-semibold text-muted-foreground">Class:</span>
                          <div className="w-34 sm:w-40">
                            <CustomSelect
                              value={g.class}
                              onChange={(val) => handleChangeGroupClass(g.id, String(val))}
                              options={selectableClassOptions}
                              searchable={false}
                              className="text-xs font-bold h-8"
                            />
                          </div>
                        </div>

                        <Badge
                          variant="secondary"
                          className="text-[11px] font-semibold bg-muted/50 text-foreground border border-border/50 gap-1.5 py-0.5 px-2.5 h-7"
                        >
                          <Users className="h-3 w-3 text-primary" />
                          <span>
                            {g.sections.length} Section{g.sections.length !== 1 ? "s" : ""} • {groupTotalStudents} Students
                          </span>
                        </Badge>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-auto">
                        {hasModifiedRolls && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-7 text-[11px] text-muted-foreground hover:text-foreground rounded-lg gap-1 px-2 cursor-pointer font-medium border-border/70"
                            onClick={() => handleResetGroupRolls(g.id)}
                            title="Reset all sections in this class to default database roll ranges"
                          >
                            <RotateCcw className="h-3 w-3 text-primary" />
                            <span>Reset Rolls</span>
                          </Button>
                        )}

                        {classGroups.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 text-[11px] text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg gap-1 px-2 cursor-pointer font-medium"
                            onClick={() => handleRemoveClassGroup(g.id)}
                            title={`Remove Class ${g.class}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            <span>Delete Class</span>
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Section Rows */}
                    <div className="space-y-2">
                      {g.sections.length === 0 ? (
                        <div className="p-4 rounded-xl border border-dashed border-border/80 bg-muted/10 text-center space-y-2.5">
                          <p className="text-xs font-medium text-muted-foreground">
                            All sections removed for Class {g.class}.
                          </p>
                          <div className="flex flex-wrap items-center justify-center gap-1.5">
                            {availSecs.map((sec) => (
                              <Button
                                key={sec}
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => handleAddSectionToGroup(g.id, sec)}
                                className="h-7 text-[11px] font-semibold gap-1 border-primary/30 text-primary hover:bg-primary/10"
                              >
                                <Plus className="h-3 w-3" /> Add Section {sec}
                              </Button>
                            ))}
                            {availSecs.length > 1 && (
                              <Button
                                type="button"
                                size="sm"
                                variant="default"
                                onClick={() => handleAddAllSectionsToGroup(g.id, availSecs)}
                                className="h-7 text-[11px] font-semibold gap-1 bg-primary text-primary-foreground hover:bg-primary/90"
                              >
                                <Plus className="h-3 w-3" /> Add All ({availSecs.length})
                              </Button>
                            )}
                          </div>
                        </div>
                      ) : (
                        g.sections.map((sec) => {
                          const secCount = Math.max(0, sec.rollTo - sec.rollFrom + 1);
                          const dbStats = calculateSectionStudentStats(allStudents, g.class, sec.section);
                          const isModified =
                            dbStats.count > 0 &&
                            (sec.rollFrom !== dbStats.rollFrom || sec.rollTo !== dbStats.rollTo);

                          return (
                            <div
                              key={sec.section}
                              className="px-3.5 py-2.5 rounded-xl border border-border/60 bg-muted/20 hover:bg-muted/30 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                            >
                              {/* Left: Section Badge & Database Info */}
                              <div className="flex items-center gap-2.5 min-w-[190px]">
                                <span className="px-2.5 py-0.5 rounded-md bg-primary/12 text-primary border border-primary/20 font-bold text-xs font-mono">
                                  Section {sec.section}
                                </span>
                                <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
                                  {sec.enrolledCount > 0 ? (
                                    <>
                                      <span
                                        className={cn(
                                          "h-1.5 w-1.5 rounded-full shrink-0 shadow-2xs",
                                          isModified ? "bg-amber-500" : "bg-emerald-500"
                                        )}
                                      />
                                      <span className="text-foreground font-semibold">
                                        {sec.enrolledCount} in DB
                                      </span>
                                      <span className="text-[10px] font-mono text-muted-foreground/70">
                                        (Roll {dbStats.rollFrom}–{dbStats.rollTo})
                                      </span>
                                    </>
                                  ) : (
                                    <>
                                      <span className="h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
                                      <span>Custom Range</span>
                                    </>
                                  )}
                                </div>
                              </div>

                              {/* Right: Roll Range Inputs, Student Count Badge & Actions */}
                              <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap justify-between sm:justify-end">
                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                                  <span>Roll:</span>
                                  <div className="flex items-center gap-1 bg-background/90 border border-input rounded-xl p-0.5 shadow-2xs focus-within:ring-1 focus-within:ring-primary focus-within:border-primary">
                                    <Input
                                      type="number"
                                      min={1}
                                      value={sec.rollFrom}
                                      onChange={(e) =>
                                        handleUpdateSectionRoll(
                                          g.id,
                                          sec.section,
                                          "rollFrom",
                                          parseInt(e.target.value) || 1
                                        )
                                      }
                                      className="h-7 w-15 text-center text-xs font-mono font-bold border-0 bg-transparent focus-visible:ring-0 p-0"
                                      placeholder="1"
                                    />
                                    <span className="text-muted-foreground/50 text-xs px-0.5 select-none">—</span>
                                    <Input
                                      type="number"
                                      min={1}
                                      value={sec.rollTo}
                                      onChange={(e) =>
                                        handleUpdateSectionRoll(
                                          g.id,
                                          sec.section,
                                          "rollTo",
                                          parseInt(e.target.value) || 1
                                        )
                                      }
                                      className="h-7 w-15 text-center text-xs font-mono font-bold border-0 bg-transparent focus-visible:ring-0 p-0"
                                      placeholder="35"
                                    />
                                  </div>

                                  {isModified && (
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      className="h-6.5 w-6.5 text-muted-foreground hover:text-foreground rounded-md shrink-0 cursor-pointer"
                                      onClick={() => handleResetSectionRoll(g.id, sec.section)}
                                      title={`Reset Section ${sec.section} to Roll ${dbStats.rollFrom}–${dbStats.rollTo}`}
                                    >
                                      <RotateCcw className="h-3 w-3 text-primary" />
                                    </Button>
                                  )}
                                </div>

                                <Badge
                                  variant="secondary"
                                  className="h-7 px-2 text-[11px] font-mono font-bold border border-border/70 bg-background text-foreground shrink-0 flex items-center"
                                >
                                  {secCount} Students
                                </Badge>

                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-muted-foreground/70 hover:text-destructive hover:bg-destructive/10 rounded-lg shrink-0 cursor-pointer"
                                  onClick={() => handleRemoveSection(g.id, sec.section)}
                                  title={`Remove Section ${sec.section}`}
                                >
                                  <X className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>

                    {/* Unselected Sections Quick-Add Bar */}
                    {unselectedSecs.length > 0 && (
                      <div className="pt-2 border-t border-border/30 flex flex-wrap items-center gap-1.5 text-xs">
                        <span className="text-muted-foreground font-medium text-[11px]">
                          + Add Section:
                        </span>
                        {unselectedSecs.map((secName) => {
                          const secStats = calculateSectionStudentStats(allStudents, g.class, secName);
                          return (
                            <button
                              key={secName}
                              type="button"
                              onClick={() => handleAddSectionToGroup(g.id, secName)}
                              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md border border-dashed border-primary/40 bg-primary/5 hover:bg-primary/10 text-primary font-semibold text-[11px] transition-colors cursor-pointer"
                              title={`Add Section ${secName} (${secStats.count} students in database)`}
                            >
                              <Plus className="h-2.5 w-2.5" />
                              <span>
                                Section {secName}
                                {secStats.count > 0 && (
                                  <span className="text-[10px] opacity-75 ml-0.5 font-mono">
                                    ({secStats.count})
                                  </span>
                                )}
                              </span>
                            </button>
                          );
                        })}
                        {unselectedSecs.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleAddAllSectionsToGroup(g.id, unselectedSecs)}
                            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md border border-primary/30 bg-primary/10 hover:bg-primary/20 text-primary font-bold text-[11px] transition-colors cursor-pointer ml-auto"
                          >
                            <Plus className="h-2.5 w-2.5" />
                            <span>Add All ({unselectedSecs.length})</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          <div className="pt-2 flex items-center justify-between text-xs text-muted-foreground">
            <span>Total Students to Seat:</span>
            <span className="font-bold text-sm sm:text-base text-foreground font-mono">
              {totalStudentsExpected} Students
            </span>
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
        <div className="rounded-2xl border border-border/80 bg-card p-4 sm:p-5 shadow-xs space-y-4">
          {/* Step 3 Header with Students Per Bench Control */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20 shadow-2xs">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-bold text-foreground tracking-tight">
                  Room Selection & Bench Capacity
                </h2>
              </div>
            </div>

            {/* Students Per Bench Segmented Control */}
            <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-xl border border-border/60">
              <span className="text-[11px] font-semibold text-muted-foreground px-2 flex items-center gap-1 select-none">
                <Armchair className="h-3.5 w-3.5 text-primary" /> Per Bench:
              </span>
              {[1, 2, 3].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setStudentsPerBench(num)}
                  className={cn(
                    "px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer",
                    studentsPerBench === num
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                  )}
                >
                  {num} {num === 1 ? "Seater" : num === 3 ? "Seater (Std)" : "Seater"}
                </button>
              ))}
            </div>
          </div>

          {/* Ultra-Clean Compact Capacity Status Bar */}
          {(() => {
            const accommodatedStudents = Math.min(totalStudentsExpected, totalDynamicCapacity);
            const availableSeats = Math.max(0, totalDynamicCapacity - totalStudentsExpected);
            const deficitStudents = Math.max(0, totalStudentsExpected - totalDynamicCapacity);
            const capacityPercent =
              totalDynamicCapacity > 0
                ? Math.min(100, Math.round((accommodatedStudents / totalDynamicCapacity) * 100))
                : 0;

            return (
              <div className="p-3 sm:p-3.5 rounded-xl border border-border/70 bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                  <div className="flex items-center gap-1.5">
                    <Users className="h-4 w-4 text-primary" />
                    <span className="text-muted-foreground">Candidates:</span>
                    <span className="font-bold font-mono text-foreground text-sm">
                      {totalStudentsExpected}
                    </span>
                  </div>

                  <span className="text-muted-foreground/30 hidden sm:inline">•</span>

                  <div className="flex items-center gap-1.5">
                    <Armchair className="h-4 w-4 text-primary" />
                    <span className="text-muted-foreground">Selected Seats:</span>
                    <span className="font-bold font-mono text-foreground text-sm">
                      {totalDynamicCapacity}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      ({selectedRooms.length} of {rooms.length} Rooms)
                    </span>
                  </div>

                  {deficitStudents > 0 ? (
                    <Badge variant="destructive" className="text-[11px] font-semibold gap-1 py-0.5">
                      <AlertCircle className="h-3 w-3" /> Short by {deficitStudents} seats
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className="text-[11px] font-semibold gap-1 py-0.5 border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    >
                      <CheckCircle2 className="h-3 w-3" /> All Accommodated (+{availableSeats} extra)
                    </Badge>
                  )}
                </div>

                {/* Compact Progress Indicator */}
                {totalDynamicCapacity > 0 && (
                  <div className="w-full sm:w-44 space-y-1 shrink-0">
                    <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
                      <span>Occupancy: {capacityPercent}%</span>
                      <span>
                        {accommodatedStudents}/{totalDynamicCapacity}
                      </span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden border border-border/50">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all duration-500",
                          deficitStudents > 0 ? "bg-rose-500" : "bg-primary"
                        )}
                        style={{ width: `${capacityPercent}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {/* Rooms Selection Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-foreground uppercase tracking-wider">
                Available Examination Rooms
              </span>
              <Badge variant="secondary" className="text-[11px] font-mono font-bold">
                {selectedRoomIds.length} of {rooms.length} Selected
              </Badge>
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
                  ? "Deselect All"
                  : `Select All (${rooms.length})`}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setRoomsManagerOpen(true)}
                className="h-7 text-xs font-semibold gap-1 hover:border-primary/40 cursor-pointer"
              >
                <DoorOpen className="h-3.5 w-3.5 text-primary" /> Manage Rooms
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

          {/* Room Cards Grid - 100% Clickable, Clean & Minimal */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {rooms.map((room, roomIdx) => {
              const isSelected = selectedRoomIds.includes(room.id);
              const roomBenchCount = room.columns.reduce((sum, c) => sum + c.benchCount, 0);
              const roomDynamicSeats = roomBenchCount * studentsPerBench;

              return (
                <div
                  key={room.id}
                  onClick={() => toggleRoom(room.id)}
                  className={cn(
                    "p-3.5 rounded-2xl border transition-all flex flex-col justify-between gap-3 shadow-2xs cursor-pointer select-none relative group",
                    isSelected
                      ? "border-primary bg-primary/[0.04] ring-1 ring-primary/40"
                      : "border-border/70 bg-card hover:border-primary/30 hover:bg-muted/20"
                  )}
                >
                  {/* Top Row: Sequence Badge, Room Name, Edit Icon, Checkbox */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className={cn(
                          "h-6 px-2 rounded-md text-[11px] font-bold font-mono tracking-wider flex items-center justify-center shrink-0 border",
                          isSelected
                            ? "bg-primary text-primary-foreground border-primary shadow-2xs"
                            : "bg-muted text-muted-foreground border-border"
                        )}
                      >
                        #{roomIdx + 1}
                      </span>
                      <div className="min-w-0">
                        <h4 className="font-bold text-xs text-foreground truncate">
                          {room.roomNumber}
                        </h4>
                        {room.floor && (
                          <p className="text-[10px] text-muted-foreground truncate">
                            {room.floor}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {/* Minimal Edit Icon Button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenEditRoom(room);
                        }}
                        className="h-7 w-7 rounded-lg text-muted-foreground/70 hover:text-foreground hover:bg-background border border-transparent hover:border-border/60 flex items-center justify-center transition-all cursor-pointer"
                        title="Edit Room Layout"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>

                      {/* Crisp Checkbox */}
                      <div
                        className={cn(
                          "h-5 w-5 rounded-md border flex items-center justify-center transition-all",
                          isSelected
                            ? "bg-primary border-primary text-primary-foreground shadow-2xs"
                            : "border-muted-foreground/30 bg-background group-hover:border-primary/50"
                        )}
                      >
                        {isSelected && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                      </div>
                    </div>
                  </div>

                  {/* Bottom Row: Columns/Benches & Total Seats */}
                  <div className="pt-2 border-t border-border/40 flex items-center justify-between text-[11px]">
                    <span className="text-muted-foreground font-medium">
                      {room.columns.length} Columns • {roomBenchCount} Benches
                    </span>
                    <span className="font-bold font-mono text-xs text-primary">
                      {roomDynamicSeats} Seats{" "}
                      <span className="text-[10px] text-muted-foreground font-normal">
                        ({studentsPerBench}/bench)
                      </span>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

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
              disabled={loading || selectedRooms.length === 0}
              className="text-xs font-semibold gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground cursor-pointer shadow-sm disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Preparing Arrangement...
                </>
              ) : (
                <>
                  <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                  Proceed to Seat Arrangement <ArrowRight className="h-3.5 w-3.5" />
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────── */}
      {/* STEP 4: Seat Arrangement Editor (NEW)                        */}
      {/* ──────────────────────────────────────────────────────────── */}
      {step === 4 && (
        <SeatArrangementEditor
          rooms={selectedRooms}
          classes={classes}
          allStudents={allStudents}
          studentsPerBench={studentsPerBench}
          academicYear={academicYear}
          examType={examType}
          initialRoomClassMap={roomClassMap}
          initialAllocation={generatedAllocation}
          onCommitArrangement={handleCommitArrangement}
          onBackToStep3={() => setStep(3)}
        />
      )}

      {/* ──────────────────────────────────────────────────────────── */}
      {/* STEP 5: Visual 2D Seating Blueprint (Read-Only Preview)      */}
      {/* ──────────────────────────────────────────────────────────── */}
      {step === 5 && (
        <div className="space-y-4">
          {/* Next-Level Minimal Header Bar with Room Switcher Pills & Master Print Suite Button */}
          {generatedAllocation && (
            <div className="p-4 sm:p-5 rounded-2xl border border-border/80 bg-card/95 backdrop-blur-md shadow-xs space-y-3.5">
              {/* Top Row: Title & Info */}
              <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-border/40 pb-2.5">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-sm sm:text-base font-bold text-foreground tracking-tight">
                    {generatedAllocation.title}
                  </h3>
                  <Badge
                    variant="secondary"
                    className="text-xs font-mono font-semibold px-2.5 py-0.5 bg-muted/60"
                  >
                    {generatedAllocation.summary.totalStudents} Students • {studentsPerBench}/bench
                  </Badge>
                </div>
              </div>

              {/* Bottom Row: Room Tabs (Left) + Master Print Button (Far Right) */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                {/* Room Switcher Tabs */}
                <div className="flex items-center gap-1.5 overflow-x-auto bg-muted/40 p-1 rounded-xl border border-border/60 shadow-2xs">
                  {generatedAllocation.roomAllocations.map((room, rIdx) => {
                    const isSelected = room.roomId === activeBlueprintRoomId;
                    return (
                      <button
                        key={room.roomId}
                        onClick={() => setActiveBlueprintRoomId(room.roomId)}
                        className={cn(
                          "px-3.5 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer select-none",
                          isSelected
                            ? "bg-background text-foreground shadow-xs font-bold border border-primary/30 ring-1 ring-primary/20"
                            : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                        )}
                      >
                        <span
                          className={cn(
                            "px-1.5 py-0.5 rounded-md text-[10px] font-black font-mono tracking-wider",
                            isSelected
                              ? "bg-primary text-primary-foreground shadow-2xs"
                              : "bg-muted text-muted-foreground border border-border/50"
                          )}
                        >
                          #{rIdx + 1}
                        </span>
                        <DoorOpen className={cn("h-3.5 w-3.5", isSelected ? "text-primary" : "text-muted-foreground")} />
                        <span>{room.roomNumber}</span>
                        <span className="text-[10px] opacity-75 font-mono">
                          ({room.occupiedSeats}/{room.totalSeats})
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Master Print Button: Prominent, Wider, Far Right */}
                <Button
                  size="lg"
                  onClick={() => setPrintDialogOpen(true)}
                  className="sm:ml-auto h-11 px-6 sm:px-8 text-sm font-black tracking-wide rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:scale-[1.02] active:scale-98 transition-all cursor-pointer border border-indigo-300/30 gap-2.5 shrink-0"
                >
                  <Printer className="h-4 w-4" />
                  <span>Print Exam Suite</span>
                  <Sparkles className="h-3.5 w-3.5 text-amber-300 animate-pulse" />
                </Button>
              </div>
            </div>
          )}

          {/* 2D Visual Blueprint in Read-Only Mode */}
          {activeBlueprintRoom ? (
            <VisualRoomBlueprint
              room={activeBlueprintRoom}
              examTitle={generatedAllocation?.title}
              examType={generatedAllocation?.examType}
              readOnly={true}
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
                setStep(5);
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
