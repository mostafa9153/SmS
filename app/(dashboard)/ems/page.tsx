"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
  getActiveAllocation,
  saveActiveAllocation,
  updateSeatSwap,
  calculateRoomCapacity,
  fetchAllocationsFromDb,
  fetchRoomsFromDb,
  deleteAllocation,
} from "@/lib/ems/room-storage";
import {
  fetchContinuingStudents,
  generateAutoAllocation,
  generateManualRoomAllocation,
  formatMissingRolls,
  detectAllMissingRolls,
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
  AlertTriangle,
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
import { EmsPrintStudio } from "@/components/ems/print/ems-print-studio";
import { SeatArrangementEditor } from "@/components/ems/seat-arrangement/seat-arrangement-editor";
import { getClassColorStyle } from "@/components/ems/seat-card";
import {
  getDynamicClassCodes,
  getDynamicSectionsForClass,
  getClassNumericRank,
  syncAllEmsConfigsFromDb,
} from "@/lib/ems/ems-config-loader";

import {
  normalizeClassCode,
  normalizeSectionCode,
  isHigherSecondaryClass,
  toShortStream,
  checkMissingHsRegistrationNos,
  MissingHsStudentInfo,
} from "@/lib/ems/seat-arrangement-algorithm";
import {
  calculateHsStudentStats,
  MissingHsRegistrationDialog,
} from "@/components/ems/auto-allocation-wizard";

// Sort class groups strictly in consecutive order: 5, 6, 7, 8, 9, 10, 11, 12 (V..XII)
const sortClassGroups = (groups: ClassGroupConfig[]): ClassGroupConfig[] => {
  return [...groups].sort((a, b) => getClassNumericRank(a.class) - getClassNumericRank(b.class));
};

export interface SectionStudentStats {
  count: number;
  totalEnrolled: number;
  minRoll: number;
  maxRoll: number;
  rollFrom: number;
  rollTo: number;
  missingRolls?: number[];
  missingFormatted?: string;
}

// Calculate enrolled student stats & roll range for a given class and section from actual DB records
const calculateSectionStudentStats = (
  students: Student[],
  className: string,
  sectionName: string,
  customRollFrom?: number,
  customRollTo?: number
): SectionStudentStats => {
  const targetClass = normalizeClassCode(className);
  const targetSec = normalizeSectionCode(sectionName);

  const matched = students.filter((s) => {
    if (s.currentStatus && s.currentStatus !== "Continuing") return false;
    const sClass = normalizeClassCode(s.presentClass);
    const sSec = normalizeSectionCode(s.presentSection);
    return sClass === targetClass && sSec === targetSec;
  });

  if (matched.length === 0) {
    return {
      count: 0,
      totalEnrolled: 0,
      minRoll: 1,
      maxRoll: 35,
      rollFrom: customRollFrom ?? 1,
      rollTo: customRollTo ?? 35,
    };
  }

  // Extract all valid numeric rolls present in DB
  const validRolls = matched
    .map((s) => Number(s.presentRoll))
    .filter((r) => !isNaN(r) && r > 0)
    .sort((a, b) => a - b);

  const minRoll = validRolls.length > 0 ? validRolls[0] : 1;
  const maxRoll = validRolls.length > 0 ? validRolls[validRolls.length - 1] : matched.length;

  const effectiveRollFrom = customRollFrom !== undefined ? customRollFrom : minRoll;
  const effectiveRollTo = customRollTo !== undefined ? customRollTo : maxRoll;

  // Filter actual active students falling inside [effectiveRollFrom, effectiveRollTo]
  const inRange = matched.filter((s) => {
    const r = Number(s.presentRoll);
    if (!isNaN(r) && r > 0) {
      return r >= effectiveRollFrom && r <= effectiveRollTo;
    }
    return true;
  });

  // Calculate missing roll numbers in range [effectiveRollFrom, effectiveRollTo]
  const presentRollSet = new Set(validRolls);
  const missingRolls: number[] = [];
  for (let r = effectiveRollFrom; r <= effectiveRollTo; r++) {
    if (!presentRollSet.has(r)) {
      missingRolls.push(r);
    }
  }

  return {
    count: inRange.length,
    totalEnrolled: matched.length,
    minRoll,
    maxRoll,
    rollFrom: effectiveRollFrom,
    rollTo: effectiveRollTo,
    missingRolls,
    missingFormatted: formatMissingRolls(missingRolls),
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
  enrolledCount: number; // Actual active continuing students in DB matching [rollFrom, rollTo]
  totalEnrolled?: number;
  minRoll?: number;
  maxRoll?: number;
  missingRolls?: number[];
  missingFormatted?: string;
}

export interface ClassGroupConfig {
  id: string;
  class: string;
  sections: ClassGroupSectionConfig[];
  stream?: string;
  gender?: string;
  regNoFrom?: string;
  regNoTo?: string;
}

interface MissingRollsWarningButtonProps {
  classNameCode: string;
  section: string;
  rollFrom: number;
  rollTo: number;
  enrolledCount: number;
  totalEnrolledInDb: number;
  missingRolls?: number[];
  missingFormatted?: string;
}

function MissingRollsWarningButton({
  classNameCode,
  section,
  rollFrom,
  rollTo,
  enrolledCount,
  totalEnrolledInDb,
  missingRolls,
  missingFormatted,
}: MissingRollsWarningButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  if (!missingRolls || missingRolls.length === 0) return null;

  const expectedCount = Math.max(0, rollTo - rollFrom + 1);

  return (
    <div
      ref={containerRef}
      className="relative inline-flex items-center"
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      {/* Yellow Warning Triangle Icon Button */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen((prev) => !prev);
        }}
        className={cn(
          "h-6 w-6 rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 hover:bg-amber-500/25 flex items-center justify-center cursor-pointer transition-all shadow-2xs active:scale-95 shrink-0",
          isOpen && "ring-2 ring-amber-500/40 bg-amber-500/25 text-amber-700 dark:text-amber-300"
        )}
        title={`Click or hover to view ${missingRolls.length} missing roll numbers`}
        aria-label="View missing roll numbers"
      >
        <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
      </button>

      {/* Floating Popover on Hover or Click */}
      {isOpen && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute left-0 bottom-full mb-2 w-72 sm:w-80 p-3 rounded-xl border border-amber-500/30 bg-popover/95 backdrop-blur-md shadow-2xl z-[99999] animate-in fade-in-0 zoom-in-95 duration-150 space-y-2 text-foreground pointer-events-auto text-left"
        >
          {/* Popover Header */}
          <div className="flex items-center justify-between gap-2 border-b border-border/50 pb-2">
            <div className="flex items-center gap-1.5">
              <div className="p-1 rounded-md bg-amber-500/20 text-amber-600 dark:text-amber-400 shrink-0">
                <AlertTriangle className="h-3.5 w-3.5" />
              </div>
              <div>
                <h5 className="text-xs font-bold text-foreground">
                  Class {classNameCode}-{section} Missing Rolls
                </h5>
                <p className="text-[10px] text-muted-foreground font-mono">
                  Range: Roll {rollFrom}–{rollTo} • {enrolledCount}/{expectedCount} Active
                </p>
              </div>
            </div>
            <Badge
              variant="outline"
              className="text-[10px] font-mono font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 shrink-0"
            >
              {missingRolls.length} Missing
            </Badge>
          </div>

          {/* Formatted Short Summary */}
          <div className="text-[11px] leading-relaxed">
            <span className="text-muted-foreground font-medium">Missing Rolls: </span>
            <span className="font-semibold text-amber-600 dark:text-amber-400 font-mono">
              {missingFormatted}
            </span>
          </div>

          {/* Scrollable list of badges if there are many */}
          {missingRolls.length > 0 && (
            <div className="space-y-1">
              <p className="text-[10px] text-muted-foreground font-medium">
                Detailed list ({missingRolls.length} students not in DB):
              </p>
              <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto p-1.5 bg-muted/40 rounded-lg border border-border/50">
                {missingRolls.map((r) => (
                  <span
                    key={r}
                    className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-background border border-border/60 text-muted-foreground font-medium"
                  >
                    #{r}
                  </span>
                ))}
              </div>
            </div>
          )}

          <p className="text-[10px] text-muted-foreground/80 leading-tight italic pt-0.5 border-t border-border/40">
            * These missing rolls are excluded so seated students are placed without gaps.
          </p>
        </div>
      )}
    </div>
  );
}

const STEPS: StepItem[] = [
  { id: 1, title: "Session & Exam" },
  { id: 2, title: "Class & Students" },
  { id: 3, title: "Room & Benches" },
  { id: 4, title: "Seat Arrangement" },
  { id: 5, title: "Print Suite" },
];

function EmsMasterPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Initialize step strictly from URL searchParams (guarantees identical SSR and Client initial state)
  const getInitialStep = (): number => {
    const stepParam = searchParams?.get("step");
    if (stepParam) {
      const parsed = parseInt(stepParam, 10);
      if (parsed >= 1 && parsed <= 5) return parsed;
    }
    return 1;
  };

  const initialStep = getInitialStep();

  // Wizard Step State
  const [step, setStepState] = useState<number>(initialStep);
  const [completedSteps, setCompletedSteps] = useState<number[]>(() => {
    const done: number[] = [];
    for (let i = 1; i <= initialStep; i++) done.push(i);
    return done;
  });

  const [mounted, setMounted] = useState(false);

  // Step 4 & 5: Visual Seating Blueprint, Print Suite & History
  const [savedAllocations, setSavedAllocations] = useState<ExamAllocation[]>([]);
  const [generatedAllocation, setGeneratedAllocation] = useState<ExamAllocation | null>(null);

  // Synchronized step setter
  const setStep = (newStep: number | ((prev: number) => number)) => {
    setStepState((prev) => (typeof newStep === "function" ? newStep(prev) : newStep));
  };

  // Sync step changes to URL query param, sessionStorage, and window scroll safely in useEffect
  useEffect(() => {
    if (typeof window === "undefined" || !mounted) return;
    const currentParam = new URLSearchParams(window.location.search).get("step");
    if (currentParam !== String(step)) {
      window.history.replaceState(null, "", "?step=" + step);
    }
    try {
      sessionStorage.setItem("sms_ems_current_step", String(step));
    } catch {}
    if (generatedAllocation) {
      saveActiveAllocation(generatedAllocation);
    }
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [step, generatedAllocation, mounted]);

  // Step 1: Session & Exam
  const [academicYear, setAcademicYear] = useState<number>(() => new Date().getFullYear());
  const [examType, setExamType] = useState<ExamType>("1st Summative Evaluation");

  // Step 2: Class & Students (Group-wise with multi-section auto-select & DB roll ranges)
  const [classGroups, setClassGroups] = useState<ClassGroupConfig[]>([]);
  const [classes, setClasses] = useState<AutoAllocationClassInput[]>([]);
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [studentsLoading, setStudentsLoading] = useState<boolean>(true);
  const [missingHsModalOpen, setMissingHsModalOpen] = useState<boolean>(false);
  const [missingHsList, setMissingHsList] = useState<MissingHsStudentInfo[]>([]);
  const [pendingHsProceedAction, setPendingHsProceedAction] = useState<(() => void) | null>(null);

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
  const dragJustFinishedRef = React.useRef<boolean>(false);

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

  const [activeBlueprintRoomId, setActiveBlueprintRoomId] = useState<string>("");
  const [printDialogOpen, setPrintDialogOpen] = useState(false);

  // Loading & Mismatch Modal
  const [loading, setLoading] = useState(false);
  const [mismatchReport, setMismatchReport] = useState<MismatchReport | null>(null);
  const [mismatchModalOpen, setMismatchModalOpen] = useState(false);
  const [pendingAllocation, setPendingAllocation] = useState<ExamAllocation | null>(null);

  // Dynamic classes from DB
  const [availableClasses, setAvailableClasses] = useState<string[]>(() => getDynamicClassCodes());

  // Listen to browser back/forward popstate
  useEffect(() => {
    const handlePopState = () => {
      const param = new URLSearchParams(window.location.search).get("step");
      if (param) {
        const s = parseInt(param, 10);
        if (s >= 1 && s <= 5) {
          setStepState(s);
        }
      } else {
        setStepState(1);
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  // Sync step changes if searchParams changes externally
  useEffect(() => {
    const stepQuery = searchParams.get("step");
    if (stepQuery) {
      const parsed = parseInt(stepQuery, 10);
      if (parsed >= 1 && parsed <= 5 && parsed !== step) {
        setStepState(parsed);
        const doneSteps: number[] = [];
        for (let i = 1; i < parsed; i++) {
          doneSteps.push(i);
        }
        setCompletedSteps((prev) => Array.from(new Set([...prev, ...doneSteps])));
        if (typeof window !== "undefined") {
          window.scrollTo({ top: 0, left: 0, behavior: "instant" });
        }
      }
    }
  }, [searchParams]);

  useEffect(() => {
    setMounted(true);
    const saved = getSavedRooms();
    if (saved.length > 0) {
      setRooms(saved);
    }
    const savedAllocs = getSavedAllocations();
    setSavedAllocations(savedAllocs);

    // Fetch latest saved allocations from Database
    fetchAllocationsFromDb().then((dbAllocs) => {
      if (dbAllocs && dbAllocs.length > 0) {
        setSavedAllocations(dbAllocs);
      }
    });

    // Sync fresh configs (classes, school profile, rooms) from database
    syncAllEmsConfigsFromDb().then(() => {
      const freshClasses = getDynamicClassCodes();
      setAvailableClasses(freshClasses);
      const freshRooms = getSavedRooms();
      if (freshRooms && freshRooms.length > 0) {
        setRooms(freshRooms);
        setSelectedRoomIds((prev) => (prev.length === 0 ? [freshRooms[0].id] : prev));
      }
    });

    // Restore active or most recent allocation on reload
    const activeAlloc = getActiveAllocation() || (savedAllocs.length > 0 ? savedAllocs[0] : null);
    if (activeAlloc) {
      setGeneratedAllocation((prev) => prev || activeAlloc);
      if (activeAlloc.academicYear) setAcademicYear(activeAlloc.academicYear);
      if (activeAlloc.examType) setExamType(activeAlloc.examType);
      if (activeAlloc.roomAllocations && activeAlloc.roomAllocations.length > 0) {
        setActiveBlueprintRoomId((prev) => prev || activeAlloc.roomAllocations[0].roomId);
        setSelectedRoomIds((prev) =>
          prev.length === 0 ? activeAlloc.roomAllocations.map((r) => r.roomId) : prev
        );
      }
    }

    // Restore step if URL or sessionStorage has step
    const stepQuery = searchParams.get("step");
    let targetStep = 1;
    if (stepQuery) {
      const parsed = parseInt(stepQuery, 10);
      if (parsed >= 1 && parsed <= 5) targetStep = parsed;
    } else {
      try {
        const sess = sessionStorage.getItem("sms_ems_current_step");
        if (sess) {
          const parsed = parseInt(sess, 10);
          if (parsed >= 1 && parsed <= 5) targetStep = parsed;
        }
      } catch {}
    }

    if (targetStep > 1) {
      setStepState(targetStep);
      const doneSteps: number[] = [];
      for (let i = 1; i < targetStep; i++) {
        doneSteps.push(i);
      }
      setCompletedSteps((prev) => Array.from(new Set([...prev, ...doneSteps])));
    }

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
              totalEnrolled: stats.totalEnrolled,
              minRoll: stats.minRoll,
              maxRoll: stats.maxRoll,
            };
          }),
        };
      });

      setClassGroups((prev) => {
        if (prev.length === 0) return sortClassGroups(initialGroups);
        // If already present, refresh ranges and enrolled counts with loaded students
        const updated = prev.map((g) => {
          const isHs = isHigherSecondaryClass(g.class);
          if (isHs) {
            const stats = calculateHsStudentStats(
              loadedStudents,
              g.class,
              g.stream || "ALL",
              g.gender || "ALL",
              g.regNoFrom,
              g.regNoTo
            );
            return {
              ...g,
              regNoFrom: g.regNoFrom || stats.minRegNo,
              regNoTo: g.regNoTo || stats.maxRegNo,
              sections: [
                {
                  section: "ALL",
                  rollFrom: 1,
                  rollTo: 9999,
                  enrolledCount: stats.count,
                  totalEnrolled: stats.totalEnrolled,
                },
              ],
            };
          }

          const availSecs = getSectionsForClass(g.class, loadedStudents);
          return {
            ...g,
            sections: (g.sections.length > 0 ? g.sections : availSecs.map((s) => ({
              section: s,
              rollFrom: 1,
              rollTo: 35,
              enrolledCount: 0,
            }))).map((sec) => {
              const stats = calculateSectionStudentStats(
                loadedStudents,
                g.class,
                sec.section,
                sec.rollFrom,
                sec.rollTo
              );
              return {
                ...sec,
                rollFrom: stats.rollFrom,
                rollTo: stats.rollTo,
                enrolledCount: stats.count,
                totalEnrolled: stats.totalEnrolled,
                minRoll: stats.minRoll,
                maxRoll: stats.maxRoll,
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
    const flattened: AutoAllocationClassInput[] = classGroups.flatMap((g): AutoAllocationClassInput[] => {
      const isHs = isHigherSecondaryClass(g.class);
      if (isHs) {
        return [
          {
            class: g.class,
            section: "ALL",
            rollFrom: 1,
            rollTo: 9999,
            stream: g.stream || "ALL",
            gender: g.gender || "ALL",
            regNoFrom: g.regNoFrom,
            regNoTo: g.regNoTo,
            isHsClass: true,
          },
        ];
      }
      return g.sections.map((s): AutoAllocationClassInput => ({
        class: g.class,
        section: s.section,
        rollFrom: s.rollFrom,
        rollTo: s.rollTo,
        isHsClass: false,
      }));
    });
    setClasses(flattened);
  }, [classGroups]);

  // Handler: Add a new class group with ALL its sections pre-selected (only picks unassigned classes)
  const handleAddClassGroup = () => {
    const existingCodes = new Set(classGroups.map((g) => normalizeClassCode(g.class)));
    const nextClass = availableClasses.find((c) => !existingCodes.has(normalizeClassCode(c)));
    if (!nextClass) return; // All available classes already added

    const isHs = isHigherSecondaryClass(nextClass);
    let newSections: ClassGroupSectionConfig[] = [];
    let initialStream = "ALL";
    let initialGender = "ALL";
    let initialRegFrom = "";
    let initialRegTo = "";

    if (isHs) {
      const stats = calculateHsStudentStats(allStudents, nextClass, "ALL", "ALL");
      initialRegFrom = stats.minRegNo;
      initialRegTo = stats.maxRegNo;
      newSections = [
        {
          section: "ALL",
          rollFrom: 1,
          rollTo: 9999,
          enrolledCount: stats.count,
          totalEnrolled: stats.totalEnrolled,
        },
      ];
    } else {
      const allSecs = getSectionsForClass(nextClass, allStudents);
      newSections = allSecs.map((sec) => {
        const stats = calculateSectionStudentStats(allStudents, nextClass, sec);
        return {
          section: sec,
          rollFrom: stats.rollFrom,
          rollTo: stats.rollTo,
          enrolledCount: stats.count,
          totalEnrolled: stats.totalEnrolled,
          minRoll: stats.minRoll,
          maxRoll: stats.maxRoll,
        };
      });
    }

    const newGroup: ClassGroupConfig = {
      id: `grp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      class: nextClass,
      sections: newSections,
      stream: isHs ? initialStream : undefined,
      gender: isHs ? initialGender : undefined,
      regNoFrom: isHs ? initialRegFrom : undefined,
      regNoTo: isHs ? initialRegTo : undefined,
    };

    setClassGroups((prev) => sortClassGroups([...prev, newGroup]));
  };

  // Handler: Change the class of a group and auto-populate all its sections (swapping if already assigned)
  const handleChangeGroupClass = (groupId: string, newClassCode: string) => {
    const targetGroup = classGroups.find((g) => g.id === groupId);
    if (!targetGroup || targetGroup.class === newClassCode) return;

    const oldClassCode = targetGroup.class;
    const conflictingGroup = classGroups.find(
      (g) => g.id !== groupId && normalizeClassCode(g.class) === normalizeClassCode(newClassCode)
    );

    const buildGroupForClass = (cls: string): Partial<ClassGroupConfig> => {
      const isHs = isHigherSecondaryClass(cls);
      if (isHs) {
        const stats = calculateHsStudentStats(allStudents, cls, "ALL", "ALL");
        return {
          class: cls,
          stream: "ALL",
          gender: "ALL",
          regNoFrom: stats.minRegNo,
          regNoTo: stats.maxRegNo,
          sections: [
            {
              section: "ALL",
              rollFrom: 1,
              rollTo: 9999,
              enrolledCount: stats.count,
              totalEnrolled: stats.totalEnrolled,
            },
          ],
        };
      }

      const allSecs = getSectionsForClass(cls, allStudents);
      const sections = allSecs.map((sec) => {
        const stats = calculateSectionStudentStats(allStudents, cls, sec);
        return {
          section: sec,
          rollFrom: stats.rollFrom,
          rollTo: stats.rollTo,
          enrolledCount: stats.count,
          totalEnrolled: stats.totalEnrolled,
          minRoll: stats.minRoll,
          maxRoll: stats.maxRoll,
        };
      });
      return {
        class: cls,
        stream: undefined,
        gender: undefined,
        regNoFrom: undefined,
        regNoTo: undefined,
        sections,
      };
    };

    setClassGroups((prev) =>
      sortClassGroups(
        prev.map((g) => {
          if (g.id === groupId) {
            return {
              ...g,
              ...buildGroupForClass(newClassCode),
            };
          }
          if (conflictingGroup && g.id === conflictingGroup.id) {
            return {
              ...g,
              ...buildGroupForClass(oldClassCode),
            };
          }
          return g;
        })
      )
    );
  };

  // Handler: Update HS fields (stream, gender, reg ranges)
  const handleUpdateHsGroup = (
    groupId: string,
    updates: Partial<{ stream: string; gender: string; regNoFrom: string; regNoTo: string }>
  ) => {
    setClassGroups((prev) =>
      prev.map((g) => {
        if (g.id !== groupId) return g;

        const streamChanged = updates.stream !== undefined && updates.stream !== g.stream;
        const genderChanged = updates.gender !== undefined && updates.gender !== g.gender;

        let nextRegFrom = updates.regNoFrom !== undefined ? updates.regNoFrom : g.regNoFrom;
        let nextRegTo = updates.regNoTo !== undefined ? updates.regNoTo : g.regNoTo;

        // When gender or stream changes without explicit reg range input, auto-fill matching DB range directly into the inputs
        if ((streamChanged || genderChanged) && updates.regNoFrom === undefined && updates.regNoTo === undefined) {
          const freshStats = calculateHsStudentStats(
            allStudents,
            g.class,
            updates.stream ?? g.stream ?? "ALL",
            updates.gender ?? g.gender ?? "ALL"
          );
          nextRegFrom = freshStats.minRegNo;
          nextRegTo = freshStats.maxRegNo;
        }

        const updated = {
          ...g,
          ...updates,
          regNoFrom: nextRegFrom,
          regNoTo: nextRegTo,
        };

        const stats = calculateHsStudentStats(
          allStudents,
          updated.class,
          updated.stream || "ALL",
          updated.gender || "ALL",
          updated.regNoFrom,
          updated.regNoTo
        );
        return {
          ...updated,
          sections: [
            {
              section: "ALL",
              rollFrom: 1,
              rollTo: 9999,
              enrolledCount: stats.count,
              totalEnrolled: stats.totalEnrolled,
            },
          ],
        };
      })
    );
  };

  // Handler: Reset HS registration number ranges to DB min/max
  const handleResetHsRegNos = (groupId: string) => {
    setClassGroups((prev) =>
      prev.map((g) => {
        if (g.id !== groupId) return g;
        const stats = calculateHsStudentStats(
          allStudents,
          g.class,
          g.stream || "ALL",
          g.gender || "ALL"
        );
        return {
          ...g,
          regNoFrom: stats.minRegNo,
          regNoTo: stats.maxRegNo,
          sections: [
            {
              section: "ALL",
              rollFrom: 1,
              rollTo: 9999,
              enrolledCount: stats.count,
              totalEnrolled: stats.totalEnrolled,
            },
          ],
        };
      })
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
          totalEnrolled: stats.totalEnrolled,
          minRoll: stats.minRoll,
          maxRoll: stats.maxRoll,
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
          sections: g.sections.map((s) => {
            if (s.section !== sectionName) return s;
            const updatedRollFrom = field === "rollFrom" ? value : s.rollFrom;
            const updatedRollTo = field === "rollTo" ? value : s.rollTo;
            const stats = calculateSectionStudentStats(
              allStudents,
              g.class,
              sectionName,
              updatedRollFrom,
              updatedRollTo
            );
            return {
              ...s,
              [field]: value,
              enrolledCount: stats.count,
              totalEnrolled: stats.totalEnrolled,
              minRoll: stats.minRoll,
              maxRoll: stats.maxRoll,
            };
          }),
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
                  totalEnrolled: stats.totalEnrolled,
                  minRoll: stats.minRoll,
                  maxRoll: stats.maxRoll,
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
              totalEnrolled: stats.totalEnrolled,
              minRoll: stats.minRoll,
              maxRoll: stats.maxRoll,
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
              totalEnrolled: stats.totalEnrolled,
              minRoll: stats.minRoll,
              maxRoll: stats.maxRoll,
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

  // Sum of ACTUAL matching active continuing students from database across all configured sections/HS groups
  const totalStudentsExpected = classGroups.reduce((sum, g) => {
    if (isHigherSecondaryClass(g.class)) {
      const stats = calculateHsStudentStats(
        allStudents,
        g.class,
        g.stream || "ALL",
        g.gender || "ALL",
        g.regNoFrom,
        g.regNoTo
      );
      return sum + stats.count;
    }
    return sum + g.sections.reduce((sSum, s) => sSum + s.enrolledCount, 0);
  }, 0);

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

    const proceed = () => {
      // If selected room capacity is short, but all rooms combined can seat all candidates,
      // auto-select all rooms so the user starts with 100% sufficient seats!
      if (totalDynamicCapacity < totalStudentsExpected && allRoomsTotalCapacity >= totalStudentsExpected) {
        setSelectedRoomIds(rooms.map((r) => r.id));
      }
      markStepDone(2);
      setStep(3);
    };

    const missing = checkMissingHsRegistrationNos(allStudents, classes);
    if (missing.length > 0) {
      setMissingHsList(missing);
      setPendingHsProceedAction(() => proceed);
      setMissingHsModalOpen(true);
      return;
    }

    proceed();
  };

  // Execute Allocation (Step 3 -> Step 4)
  const handleExecuteAllocation = async () => {
    setLoading(true);

    try {
      const loadedStudents = allStudents.length > 0 ? allStudents : await fetchContinuingStudents();

      const proceedWithAllocation = (studentsToUse: Student[]) => {
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
          studentsToUse
        );

        setPendingAllocation(allocation);

        if (report.items.length > 0) {
          setMismatchReport(report);
          setMismatchModalOpen(true);
        } else {
          finishAllocation(allocation);
        }
      };

      const missing = checkMissingHsRegistrationNos(loadedStudents, classes);
      if (missing.length > 0) {
        setMissingHsList(missing);
        setPendingHsProceedAction(() => () => proceedWithAllocation(loadedStudents));
        setMissingHsModalOpen(true);
        return;
      }

      proceedWithAllocation(loadedStudents);
    } catch (err) {
      console.error("Allocation error:", err);
      alert("Failed to complete allocation.");
    } finally {
      setLoading(false);
    }
  };

  const finishAllocation = (allocation: ExamAllocation) => {
    saveAllocation(allocation);
    saveActiveAllocation(allocation);
    setGeneratedAllocation(allocation);
    setSavedAllocations(getSavedAllocations());
    if (allocation.roomAllocations.length > 0) {
      setActiveBlueprintRoomId(allocation.roomAllocations[0].roomId);
      setSelectedRoomIds(allocation.roomAllocations.map((r) => r.roomId));
    }
    markStepDone(3);
    setStep(4);
  };

  const handleCommitArrangement = (finalAllocation: ExamAllocation) => {
    saveAllocation(finalAllocation);
    saveActiveAllocation(finalAllocation);
    setGeneratedAllocation(finalAllocation);
    setSavedAllocations(getSavedAllocations());
    if (finalAllocation.roomAllocations.length > 0) {
      setActiveBlueprintRoomId(finalAllocation.roomAllocations[0].roomId);
      setSelectedRoomIds(finalAllocation.roomAllocations.map((r) => r.roomId));
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

  if (!mounted) {
    return (
      <div className="p-3.5 sm:p-6 max-w-7xl mx-auto w-full space-y-4 sm:space-y-6 animate-pulse">
        <div className="flex items-center justify-between gap-3">
          <div className="h-8 w-64 bg-muted/60 rounded-xl" />
          <div className="h-8 w-36 bg-muted/60 rounded-xl" />
        </div>
        <div className="h-16 rounded-2xl bg-muted/40 border border-border/70" />
        <div className="h-96 rounded-2xl bg-card/60 border border-border/70 flex flex-col items-center justify-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-primary/70" />
          <p className="text-xs font-medium text-muted-foreground">Loading Examination Suite...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-3.5 sm:p-6 max-w-7xl mx-auto w-full space-y-4 sm:space-y-6">
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
          <span suppressHydrationWarning>Classrooms & Halls ({mounted ? rooms.length : 0})</span>
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
                  onChange={(e) => setAcademicYear(parseInt(e.target.value) || new Date().getFullYear())}
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

          {/* Recent Exam Seating Plans History (Last 10 Saved Arrangements) */}
          {savedAllocations.length > 0 && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                  <History className="h-4 w-4 text-primary" />
                  <span>Recent Exam Seating Plans History</span>
                </div>
                <Badge variant="outline" className="text-[10px] font-mono border-primary/30 text-primary bg-primary/5">
                  Last {Math.min(10, savedAllocations.length)} Saved in Database
                </Badge>
              </div>

              <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
                {savedAllocations.slice(0, 10).map((plan, pIdx) => {
                  return (
                    <div
                      key={plan.id || `plan-${pIdx}`}
                      className="rounded-xl border border-border/80 bg-card hover:bg-muted/30 transition-colors p-3 sm:p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs shadow-2xs group"
                    >
                      <div className="flex items-start sm:items-center gap-3 min-w-0">
                        <div className="p-2 rounded-xl bg-primary/10 text-primary shrink-0 border border-primary/20 mt-0.5 sm:mt-0 font-mono font-bold text-[11px] w-8 h-8 flex items-center justify-center">
                          #{pIdx + 1}
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-foreground flex flex-wrap items-center gap-2">
                            <span className="truncate">{plan.title || `${plan.examType} (${plan.academicYear})`}</span>
                            <Badge variant="secondary" className="text-[10px] font-mono font-bold shrink-0">
                              {plan.summary?.totalStudents || 0} Students
                            </Badge>
                            <span className="text-[10px] text-muted-foreground font-mono">
                              • {plan.summary?.totalRooms || plan.roomAllocations?.length || 0} Room(s)
                            </span>
                          </div>
                          <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1.5 flex-wrap">
                            <span>Saved on {new Date(plan.createdAt).toLocaleDateString()}</span>
                            <span>•</span>
                            <span>{new Date(plan.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                            {plan.summary?.classesAllocated && plan.summary.classesAllocated.length > 0 && (
                              <>
                                <span>•</span>
                                <span className="text-[10px] font-semibold text-neutral-600 dark:text-neutral-400">
                                  Classes: {plan.summary.classesAllocated.join(", ")}
                                </span>
                              </>
                            )}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 self-end md:self-auto">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            saveActiveAllocation(plan);
                            setGeneratedAllocation(plan);
                            if (plan.academicYear) setAcademicYear(plan.academicYear);
                            if (plan.examType) setExamType(plan.examType);
                            setActiveBlueprintRoomId(plan.roomAllocations[0]?.roomId || "");
                            setSelectedRoomIds(plan.roomAllocations.map((r) => r.roomId));
                            markStepDone(1);
                            markStepDone(2);
                            markStepDone(3);
                            markStepDone(4);
                            setStep(4);
                          }}
                          className="h-8 text-xs font-semibold gap-1.5 hover:border-primary/40 cursor-pointer shadow-2xs"
                        >
                          <RotateCcw className="h-3.5 w-3.5 text-primary" /> View Blueprint
                        </Button>

                        <Button
                          size="sm"
                          onClick={() => {
                            saveActiveAllocation(plan);
                            setGeneratedAllocation(plan);
                            if (plan.academicYear) setAcademicYear(plan.academicYear);
                            if (plan.examType) setExamType(plan.examType);
                            setActiveBlueprintRoomId(plan.roomAllocations[0]?.roomId || "");
                            setSelectedRoomIds(plan.roomAllocations.map((r) => r.roomId));
                            markStepDone(1);
                            markStepDone(2);
                            markStepDone(3);
                            markStepDone(4);
                            setStep(5);
                          }}
                          className="h-8 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold gap-1.5 cursor-pointer shadow-xs hover:scale-[1.01] active:scale-[0.98] transition-all"
                        >
                          <Printer className="h-3.5 w-3.5" /> Print Suite
                        </Button>

                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={async (e) => {
                            e.stopPropagation();
                            if (confirm("Are you sure you want to delete this saved seating plan?")) {
                              await deleteAllocation(plan.id);
                              const remaining = getSavedAllocations();
                              setSavedAllocations(remaining);
                            }
                          }}
                          className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg cursor-pointer"
                          title="Delete saved plan"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
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
                const isHs = isHigherSecondaryClass(g.class);
                const availSecs = !isHs ? getSectionsForClass(g.class, allStudents) : [];
                const selectedSecNames = new Set(g.sections.map((s) => s.section));
                const unselectedSecs = !isHs ? availSecs.filter((s) => !selectedSecNames.has(s)) : [];

                const hsStats = isHs
                  ? calculateHsStudentStats(
                      allStudents,
                      g.class,
                      g.stream || "ALL",
                      g.gender || "ALL",
                      g.regNoFrom,
                      g.regNoTo
                    )
                  : null;

                const groupTotalStudents = isHs
                  ? hsStats?.count || 0
                  : g.sections.reduce((sum, s) => sum + s.enrolledCount, 0);

                const classStyle = getClassColorStyle(g.class);

                // Check if any section or HS range has modified values compared to DB stats
                const hasModifiedRolls = isHs
                  ? Boolean(
                      (g.regNoFrom && hsStats && g.regNoFrom !== hsStats.minRegNo) ||
                      (g.regNoTo && hsStats && g.regNoTo !== hsStats.maxRegNo)
                    )
                  : g.sections.some((sec) => {
                      const stats = calculateSectionStudentStats(allStudents, g.class, sec.section);
                      return (
                        stats.totalEnrolled > 0 &&
                        (sec.rollFrom !== stats.rollFrom || sec.rollTo !== stats.rollTo)
                      );
                    });

                const selectableClassOptions = availableClasses.map((opt) => ({
                  label: `Class ${opt}`,
                  value: opt,
                }));

                return (
                  <div
                    key={g.id}
                    style={{ zIndex: 40 - gIdx }}
                    className={cn(
                      "relative p-3.5 sm:p-4.5 rounded-2xl border transition-all shadow-2xs space-y-3 bg-card/90 backdrop-blur-xs focus-within:z-50",
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
                            {isHs
                              ? `HS Board Exam • ${groupTotalStudents} Students`
                              : `${g.sections.length} Section${g.sections.length !== 1 ? "s" : ""} • ${groupTotalStudents} Students`}
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
                            onClick={() => (isHs ? handleResetHsRegNos(g.id) : handleResetGroupRolls(g.id))}
                            title={
                              isHs
                                ? "Reset registration number range to default database values"
                                : "Reset all sections in this class to default database roll ranges"
                            }
                          >
                            <RotateCcw className="h-3 w-3 text-primary" />
                            <span>{isHs ? "Reset Reg Nos" : "Reset Rolls"}</span>
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

                    {/* Class Controls / Rows */}
                    {isHs && hsStats ? (
                      /* Higher Secondary (Class 11 & 12) Stream & Registration Number Controls */
                      <div className="px-3.5 py-3 rounded-xl border border-border/60 bg-muted/20 hover:bg-muted/30 transition-all space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
                          {/* Stream Selector */}
                          <div className="space-y-1">
                            <label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                              <GraduationCap className="h-3 w-3 text-primary" /> Stream
                            </label>
                            <CustomSelect
                              value={g.stream || "ALL"}
                              onChange={(val) => handleUpdateHsGroup(g.id, { stream: String(val) })}
                              options={[
                                { label: "All Streams", value: "ALL" },
                                { label: "Science", value: "Science" },
                                { label: "Arts", value: "Arts" },
                                { label: "Commerce", value: "Commerce" },
                              ]}
                              searchable={false}
                              className="text-xs font-medium h-8"
                            />
                          </div>

                          {/* Gender Selector */}
                          <div className="space-y-1">
                            <label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                              <Users className="h-3 w-3 text-primary" /> Gender
                            </label>
                            <CustomSelect
                              value={g.gender || "ALL"}
                              onChange={(val) => handleUpdateHsGroup(g.id, { gender: String(val) })}
                              options={[
                                { label: "All Genders", value: "ALL" },
                                { label: "Boys Only", value: "Boys" },
                                { label: "Girls Only", value: "Girls" },
                              ]}
                              searchable={false}
                              className="text-xs font-medium h-8"
                            />
                          </div>

                          {/* Board Reg No Range */}
                          <div className="space-y-1 sm:col-span-2">
                            <label className="text-[11px] font-semibold text-muted-foreground block">
                              Board Reg No Range
                            </label>
                            <div className="flex items-center gap-1.5">
                              <div className="flex items-center gap-1 flex-1 bg-background/90 border border-input rounded-xl p-0.5 shadow-2xs focus-within:ring-1 focus-within:ring-primary focus-within:border-primary">
                                <Input
                                  type="text"
                                  value={g.regNoFrom ?? hsStats.minRegNo}
                                  onChange={(e) => handleUpdateHsGroup(g.id, { regNoFrom: e.target.value })}
                                  className="h-7 text-xs font-mono font-bold border-0 bg-transparent focus-visible:ring-0 px-2 flex-1"
                                  placeholder={hsStats.minRegNo || "From Reg No"}
                                />
                                <span className="text-muted-foreground/50 text-xs px-0.5 select-none">—</span>
                                <Input
                                  type="text"
                                  value={g.regNoTo ?? hsStats.maxRegNo}
                                  onChange={(e) => handleUpdateHsGroup(g.id, { regNoTo: e.target.value })}
                                  className="h-7 text-xs font-mono font-bold border-0 bg-transparent focus-visible:ring-0 px-2 flex-1"
                                  placeholder={hsStats.maxRegNo || "To Reg No"}
                                />
                              </div>

                              {hasModifiedRolls && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-muted-foreground hover:text-foreground rounded-md shrink-0 cursor-pointer"
                                  onClick={() => handleResetHsRegNos(g.id)}
                                  title="Reset Registration Number Range to Database Defaults"
                                >
                                  <RotateCcw className="h-3 w-3 text-primary" />
                                </Button>
                              )}

                              <Badge
                                variant="secondary"
                                className={cn(
                                  "h-8 px-2.5 text-[11px] font-mono font-bold border shrink-0 flex items-center gap-1.5 transition-colors",
                                  hsStats.count > 0
                                    ? "border-border/70 bg-background text-foreground"
                                    : "border-rose-500/40 bg-rose-500/10 text-rose-600 dark:text-rose-400"
                                )}
                              >
                                <Users className="h-3 w-3 text-primary" />
                                <span>{hsStats.count} Candidates</span>
                              </Badge>
                            </div>
                          </div>
                        </div>

                        {hsStats.missingRegCount > 0 && (
                          <div className="text-[11px] font-mono font-semibold text-amber-700 dark:text-amber-300 bg-amber-500/15 border border-amber-500/30 px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 shadow-2xs">
                            <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
                            <span>
                              {hsStats.missingRegCount} student(s) in this class do not have a Board Registration Number in the database (temporary fallback to Roll No).
                            </span>
                          </div>
                        )}
                      </div>
                    ) : (
                      /* Junior Classes (5-10): Standard Section Rows */
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
                            const dbStats = calculateSectionStudentStats(allStudents, g.class, sec.section);
                            const isModified =
                              dbStats.totalEnrolled > 0 &&
                              (sec.rollFrom !== dbStats.rollFrom || sec.rollTo !== dbStats.rollTo);

                            return (
                              <div
                                key={sec.section}
                                className="px-3.5 py-2.5 rounded-xl border border-border/60 bg-muted/20 hover:bg-muted/30 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                              >
                                {/* Left: Section Badge & Database Info */}
                                <div className="flex items-center gap-2.5 min-w-[200px] flex-wrap">
                                  <span className="px-2.5 py-0.5 rounded-md bg-primary/12 text-primary border border-primary/20 font-bold text-xs font-mono">
                                    Section {sec.section}
                                  </span>
                                  <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
                                    {dbStats.totalEnrolled > 0 ? (
                                      <>
                                        <span
                                          className={cn(
                                            "h-1.5 w-1.5 rounded-full shrink-0 shadow-2xs",
                                            isModified ? "bg-amber-500" : "bg-emerald-500"
                                          )}
                                        />
                                        <span className="text-foreground font-semibold">
                                          {dbStats.totalEnrolled} in DB
                                        </span>
                                        <span className="text-[10px] font-mono text-muted-foreground/70">
                                          (Roll {dbStats.minRoll}–{dbStats.maxRoll})
                                        </span>
                                      </>
                                    ) : (
                                      <>
                                        <span className="h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
                                        <span>0 Active in DB</span>
                                      </>
                                    )}
                                  </div>

                                  <MissingRollsWarningButton
                                    classNameCode={g.class}
                                    section={sec.section}
                                    rollFrom={sec.rollFrom}
                                    rollTo={sec.rollTo}
                                    enrolledCount={sec.enrolledCount}
                                    totalEnrolledInDb={dbStats.totalEnrolled}
                                    missingRolls={dbStats.missingRolls}
                                    missingFormatted={dbStats.missingFormatted}
                                  />
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
                                        className="h-7 w-16 text-center text-xs font-mono font-bold border-0 bg-transparent focus-visible:ring-0 p-0"
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
                                        className="h-7 w-16 text-center text-xs font-mono font-bold border-0 bg-transparent focus-visible:ring-0 p-0"
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
                                        title={`Reset Section ${sec.section} to Roll ${dbStats.minRoll}–${dbStats.maxRoll}`}
                                      >
                                        <RotateCcw className="h-3 w-3 text-primary" />
                                      </Button>
                                    )}
                                  </div>

                                  <Badge
                                    variant="secondary"
                                    className={cn(
                                      "h-7 px-2.5 text-[11px] font-mono font-bold border shrink-0 flex items-center gap-1.5 transition-colors",
                                      sec.enrolledCount > 0
                                        ? "border-border/70 bg-background text-foreground"
                                        : "border-rose-500/40 bg-rose-500/10 text-rose-600 dark:text-rose-400"
                                    )}
                                  >
                                    <Users className="h-3 w-3 text-primary" />
                                    <span>{sec.enrolledCount} Candidates</span>
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
                    )}

                    {/* Unselected Sections Quick-Add Bar (Junior Classes only) */}
                    {!isHs && unselectedSecs.length > 0 && (
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

          {/* Room Cards Grid - 100% Clickable, Draggable with Grip & Drop Indicator */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {rooms.map((room, roomIdx) => {
              const isSelected = selectedRoomIds.includes(room.id);
              const roomBenchCount = room.columns.reduce((sum, c) => sum + c.benchCount, 0);
              const roomDynamicSeats = roomBenchCount * studentsPerBench;
              const isDraggingThis = draggedRoomIndex === roomIdx;
              const isDragOverThis = dragOverRoomIndex === roomIdx;

              return (
                <div
                  key={room.id}
                  draggable
                  onDragStart={(e) => {
                    dragJustFinishedRef.current = true;
                    e.dataTransfer.setData("text/plain", String(roomIdx));
                    e.dataTransfer.effectAllowed = "move";
                    setDraggedRoomIndex(roomIdx);
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = "move";
                    if (dragOverRoomIndex !== roomIdx) {
                      setDragOverRoomIndex(roomIdx);
                    }
                  }}
                  onDragLeave={() => {
                    if (dragOverRoomIndex === roomIdx) {
                      setDragOverRoomIndex(null);
                    }
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const fromIdxStr = e.dataTransfer.getData("text/plain");
                    const parsedFrom =
                      fromIdxStr !== "" && !isNaN(parseInt(fromIdxStr, 10))
                        ? parseInt(fromIdxStr, 10)
                        : draggedRoomIndex;
                    if (parsedFrom !== null && parsedFrom >= 0 && parsedFrom !== roomIdx) {
                      reorderRooms(parsedFrom, roomIdx);
                    }
                    setDraggedRoomIndex(null);
                    setDragOverRoomIndex(null);
                    setTimeout(() => {
                      dragJustFinishedRef.current = false;
                    }, 80);
                  }}
                  onDragEnd={() => {
                    setDraggedRoomIndex(null);
                    setDragOverRoomIndex(null);
                    setTimeout(() => {
                      dragJustFinishedRef.current = false;
                    }, 80);
                  }}
                  onClick={() => {
                    if (dragJustFinishedRef.current) return;
                    toggleRoom(room.id);
                  }}
                  className={cn(
                    "p-3.5 rounded-2xl border transition-all flex flex-col justify-between gap-3 shadow-2xs cursor-grab active:cursor-grabbing select-none relative group",
                    isSelected
                      ? "border-primary bg-primary/[0.04] ring-1 ring-primary/40"
                      : "border-border/70 bg-card hover:border-primary/30 hover:bg-muted/20",
                    isDraggingThis && "opacity-40 scale-[0.98] border-dashed border-primary shadow-inner",
                    isDragOverThis && "ring-2 ring-primary ring-offset-2 bg-primary/10 border-primary scale-[1.02] shadow-md"
                  )}
                >
                  {/* Top Row: Sequence Badge with Drag Grip, Room Name, Quick Move Up/Down, Edit Icon, Checkbox */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      {/* Drag Grip Handle */}
                      <div
                        title="Drag to reorder room priority"
                        className="p-1 -ml-1 text-muted-foreground/40 hover:text-foreground cursor-grab active:cursor-grabbing shrink-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <GripVertical className="h-4 w-4" />
                      </div>

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

                    <div className="flex items-center gap-1 shrink-0">
                      {/* Move Up/Down Quick Buttons */}
                      <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          disabled={roomIdx === 0}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMoveRoom(roomIdx, "up");
                          }}
                          className="h-6 w-6 rounded text-muted-foreground/60 hover:text-foreground hover:bg-background flex items-center justify-center transition-all disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed"
                          title="Move room up"
                        >
                          <ChevronLeft className="h-3.5 w-3.5 rotate-90" />
                        </button>
                        <button
                          type="button"
                          disabled={roomIdx === rooms.length - 1}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMoveRoom(roomIdx, "down");
                          }}
                          className="h-6 w-6 rounded text-muted-foreground/60 hover:text-foreground hover:bg-background flex items-center justify-center transition-all disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed"
                          title="Move room down"
                        >
                          <ChevronRight className="h-3.5 w-3.5 rotate-90" />
                        </button>
                      </div>

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
          rooms={
            selectedRooms.length > 0
              ? selectedRooms
              : rooms.length > 0
              ? rooms
              : generatedAllocation?.roomAllocations.map((ar) => ({
                  id: ar.roomId,
                  roomNumber: ar.roomNumber,
                  floor: ar.floor,
                  building: ar.building,
                  defaultSeatsPerBench: studentsPerBench,
                  columns: ar.columns,
                  totalCapacity: ar.totalSeats,
                  createdAt: "",
                  updatedAt: "",
                })) || []
          }
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
      {/* STEP 5: Dedicated Examination Print Suite Studio             */}
      {/* ──────────────────────────────────────────────────────────── */}
      {step === 5 && (
        generatedAllocation ? (
          <EmsPrintStudio
            allocation={generatedAllocation}
            onBackToStep4={() => setStep(4)}
          />
        ) : (
          <div className="p-10 text-center border border-dashed rounded-2xl bg-muted/10 space-y-3">
            <Printer className="h-8 w-8 text-muted-foreground mx-auto mb-1" />
            <p className="text-sm font-semibold text-foreground">No Active Seating Allocation</p>
            <p className="text-xs text-muted-foreground">
              Please complete Step 3 and Step 4 to generate exam seat allocation.
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setStep(3)}
              className="text-xs font-semibold gap-1.5 cursor-pointer"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Return to Room Setup
            </Button>
          </div>
        )
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

      {/* Missing HS Board Registration Numbers Warning Dialog */}
      <MissingHsRegistrationDialog
        open={missingHsModalOpen}
        onOpenChange={setMissingHsModalOpen}
        missingStudents={missingHsList}
        onProceed={() => {
          setMissingHsModalOpen(false);
          if (pendingHsProceedAction) {
            const action = pendingHsProceedAction;
            setPendingHsProceedAction(null);
            action();
          }
        }}
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

export default function EmsMasterPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          <span>Loading Examination Management System...</span>
        </div>
      }
    >
      <EmsMasterPageContent />
    </Suspense>
  );
}
