"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getSavedRooms, saveRooms, getSavedAllocations, getActiveAllocation, saveActiveAllocation, fetchAllocationsFromDb } from "@/lib/ems/room-storage";
import { pullExamSetup, pushExamSetup } from "@/lib/ems/exam-setup-sync";
import { fetchContinuingStudents } from "@/lib/ems/allocation-engine";
import { Student } from "@/lib/types";
import { EmsRoom, ExamType, AutoAllocationClassInput, ExamAllocation, MismatchReport, ExamRoutineItem } from "@/lib/ems/types";
import { getDynamicClassCodes, syncAllEmsConfigsFromDb, getDatabaseSubjectsForClass } from "@/lib/ems/ems-config-loader";
import { getSchoolConfiguredStreams } from "@/lib/utils/school-profile";
import { useSchoolProfile } from "@/lib/hooks/use-school-profile";
import { normalizeClassCode, isHigherSecondaryClass, MissingHsStudentInfo } from "@/lib/ems/seat-arrangement-algorithm";
import { calculateHsStudentStats } from "@/components/ems/auto-allocation-wizard";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { ClassGroupConfig, buildClassGroupConfig, calculateSectionStudentStats, getSectionsForClass, sortClassGroups } from "@/components/ems/master/class-groups";


export function useEmsCore() {
  const confirm = useConfirm();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { profile } = useSchoolProfile();
  const hsConfiguredStreams = getSchoolConfiguredStreams(profile);

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
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [examType, setExamType] = useState<ExamType>("1st Summative Evaluation");
  const [examStartTime, setExamStartTime] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("sms_ems_exam_start_time") || "11:00 AM";
    }
    return "11:00 AM";
  });
  const [routinesByClass, setRoutinesByClass] = useState<Record<string, ExamRoutineItem[]>>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("sms_ems_exam_routines");
        if (saved) return JSON.parse(saved);
      } catch {}
    }
    return {};
  });
  const [activeRoutineClass, setActiveRoutineClass] = useState<string>("");
  // Pushes wait until the shared exam setup is loaded, so a stale cache never overwrites it.
  const examSetupSynced = useRef(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("sms_ems_exam_start_time", examStartTime);
        if (examSetupSynced.current) pushExamSetup("startTime");
      } catch {}
    }
  }, [examStartTime]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("sms_ems_exam_routines", JSON.stringify(routinesByClass));
        if (examSetupSynced.current) pushExamSetup("routines");
      } catch {}
    }
  }, [routinesByClass]);

  useEffect(() => {
    if (selectedClasses.length > 0) {
      const cleanNorms = selectedClasses.map((c) => normalizeClassCode(c));
      if (!activeRoutineClass || !cleanNorms.includes(activeRoutineClass)) {
        setActiveRoutineClass(cleanNorms[0]);
      }
    } else {
      setActiveRoutineClass("");
    }
  }, [selectedClasses, activeRoutineClass]);

  // Step 2: Class & Students (Group-wise with multi-section auto-select & DB roll ranges)
  const [classGroups, setClassGroups] = useState<ClassGroupConfig[]>([]);
  const [classes, setClasses] = useState<AutoAllocationClassInput[]>([]);
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [studentsLoading, setStudentsLoading] = useState<boolean>(true);
  const [missingHsModalOpen, setMissingHsModalOpen] = useState<boolean>(false);
  const [missingHsList, setMissingHsList] = useState<MissingHsStudentInfo[]>([]);
  const [pendingHsProceedAction, setPendingHsProceedAction] = useState<(() => void) | null>(null);

  // Auto-populate preset subjects for newly selected classes if routine is empty
  useEffect(() => {
    if (selectedClasses.length === 0) return;

    setRoutinesByClass((prev) => {
      let changed = false;
      const nextRoutines = { ...prev };

      selectedClasses.forEach((cls) => {
        const norm = normalizeClassCode(cls);
        if (norm && (!nextRoutines[norm] || nextRoutines[norm].length === 0)) {
          const presetSubs = getDatabaseSubjectsForClass(norm, allStudents);
          if (presetSubs && presetSubs.length > 0) {
            nextRoutines[norm] = presetSubs.map((sub) => ({
              date: "",
              day: "",
              subject: sub,
            }));
            changed = true;
          }
        }
      });

      return changed ? nextRoutines : prev;
    });
  }, [selectedClasses, allStudents]);

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

  // Section Drag-and-drop & Reorder state
  const [draggedSectionKey, setDraggedSectionKey] = useState<string | null>(null);
  const [dragOverSectionKey, setDragOverSectionKey] = useState<string | null>(null);

  // Persistence helpers for custom section sequence
  const saveCustomSectionOrders = (groups: ClassGroupConfig[]) => {
    if (typeof window === "undefined") return;
    try {
      const orders: Record<string, string[]> = {};
      groups.forEach((g) => {
        if (g.sections && g.sections.length > 0) {
          orders[normalizeClassCode(g.class)] = g.sections.map((s) => s.section);
        }
      });
      localStorage.setItem("sms_ems_section_orders", JSON.stringify(orders));
      pushExamSetup("sectionOrders");
    } catch {}
  };

  const getCustomSectionOrders = (): Record<string, string[]> => {
    if (typeof window === "undefined") return {};
    try {
      const raw = localStorage.getItem("sms_ems_section_orders");
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  };

  // Reorder sections helper within a class group
  const handleReorderSections = (groupId: string, fromIndex: number, toIndex: number) => {
    setClassGroups((prev) => {
      const updated = prev.map((g) => {
        if (g.id !== groupId) return g;
        if (
          fromIndex === toIndex ||
          fromIndex < 0 ||
          toIndex < 0 ||
          fromIndex >= g.sections.length ||
          toIndex >= g.sections.length
        ) {
          return g;
        }
        const newSecs = [...g.sections];
        const [moved] = newSecs.splice(fromIndex, 1);
        newSecs.splice(toIndex, 0, moved);
        return { ...g, sections: newSecs };
      });
      saveCustomSectionOrders(updated);
      return updated;
    });
  };

  const handleMoveSection = (groupId: string, index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    handleReorderSections(groupId, index, targetIndex);
  };

  const [activeBlueprintRoomId, setActiveBlueprintRoomId] = useState<string>("");
  const [printDialogOpen, setPrintDialogOpen] = useState(false);

  // Loading & Mismatch Modal
  const [loading, setLoading] = useState(false);
  const [mismatchReport, setMismatchReport] = useState<MismatchReport | null>(null);
  const [mismatchModalOpen, setMismatchModalOpen] = useState(false);
  const [pendingAllocation, setPendingAllocation] = useState<ExamAllocation | null>(null);

  // Student Roster Dialog State (for manual inclusion / exclusion)
  const [rosterModalState, setRosterModalState] = useState<{
    open: boolean;
    groupId: string;
    sectionName?: string;
    classCode: string;
    title: string;
    students: Student[];
    rollFrom?: number;
    rollTo?: number;
    regNoFrom?: string;
    regNoTo?: string;
    isHs: boolean;
    excludedIds: string[];
  }>({
    open: false,
    groupId: "",
    classCode: "",
    title: "",
    students: [],
    isHs: false,
    excludedIds: [],
  });

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

    // Shared exam setup (routine, start time, section order) from the database
    pullExamSetup().then((setup) => {
      if (setup.routines) setRoutinesByClass(setup.routines);
      if (setup.startTime) setExamStartTime(setup.startTime);
      examSetupSynced.current = true;
    });

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

      // Restore active allocation on reload ONLY when user is already in step > 1
      const activeAlloc = getActiveAllocation();
      if (activeAlloc) {
        setGeneratedAllocation(activeAlloc);
        if (activeAlloc.academicYear) setAcademicYear(activeAlloc.academicYear);
        if (activeAlloc.examType) setExamType(activeAlloc.examType);
        if (activeAlloc.examStartTime) setExamStartTime(activeAlloc.examStartTime);
        if (activeAlloc.routinesByClass) setRoutinesByClass(activeAlloc.routinesByClass);
        const allocClasses = activeAlloc.summary?.classesAllocated || (activeAlloc as any)?.classesConfig?.map((c: any) => c.class);
        if (allocClasses && allocClasses.length > 0) {
          const cleaned = allocClasses
            .map((c: string) => normalizeClassCode(c.split("-")[0].trim()))
            .filter(Boolean);
          setSelectedClasses(Array.from(new Set(cleaned)));
        }
        if (activeAlloc.roomAllocations && activeAlloc.roomAllocations.length > 0) {
          setActiveBlueprintRoomId(activeAlloc.roomAllocations[0].roomId);
          setSelectedRoomIds(activeAlloc.roomAllocations.map((r) => r.roomId));
        }
      }
    }

    // Fetch continuing students & initialize class groups
    fetchContinuingStudents().then((loadedStudents) => {
      setAllStudents(loadedStudents);
      setStudentsLoading(false);

      setClassGroups((prev) => {
        if (prev.length === 0) {
          if (selectedClasses.length > 0) {
            return sortClassGroups(
              selectedClasses.map((code) => buildClassGroupConfig(code, loadedStudents))
            );
          }
          return [];
        }

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
          const savedOrders = getCustomSectionOrders();
          const savedOrderForClass = savedOrders[normalizeClassCode(g.class)];

          let rawSections = g.sections.length > 0 ? g.sections : availSecs.map((s) => ({
            section: s,
            rollFrom: 1,
            rollTo: 35,
            enrolledCount: 0,
          }));

          if (savedOrderForClass && savedOrderForClass.length > 0) {
            rawSections = [...rawSections].sort((a, b) => {
              const idxA = savedOrderForClass.indexOf(a.section);
              const idxB = savedOrderForClass.indexOf(b.section);
              if (idxA !== -1 && idxB !== -1) return idxA - idxB;
              if (idxA !== -1) return -1;
              if (idxB !== -1) return 1;
              return a.section.localeCompare(b.section);
            });
          }

          return {
            ...g,
            sections: rawSections.map((sec) => {
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
            excludedStudentIds: g.excludedStudentIds || [],
          },
        ];
      }
      return g.sections.map((s): AutoAllocationClassInput => ({
        class: g.class,
        section: s.section,
        rollFrom: s.rollFrom,
        rollTo: s.rollTo,
        isHsClass: false,
        excludedStudentIds: s.excludedStudentIds || [],
      }));
    });
    setClasses(flattened);
  }, [classGroups]);

  return {
    academicYear,
    activeBlueprintRoomId,
    activeRoutineClass,
    allStudents,
    availableClasses,
    classGroups,
    classes,
    completedSteps,
    confirm,
    dragJustFinishedRef,
    dragOverRoomIndex,
    dragOverSectionKey,
    draggedRoomIndex,
    draggedSectionKey,
    editingRoom,
    editorOpen,
    examSetupSynced,
    examStartTime,
    examType,
    generatedAllocation,
    getCustomSectionOrders,
    getInitialStep,
    handleMoveRoom,
    handleMoveSection,
    handleReorderSections,
    hsConfiguredStreams,
    initialStep,
    loading,
    mismatchModalOpen,
    mismatchReport,
    missingHsList,
    missingHsModalOpen,
    mounted,
    pendingAllocation,
    pendingHsProceedAction,
    printDialogOpen,
    profile,
    reorderRooms,
    roomClassMap,
    rooms,
    roomsManagerOpen,
    rosterModalState,
    router,
    routinesByClass,
    saveCustomSectionOrders,
    savedAllocations,
    searchParams,
    selectedClasses,
    selectedRoomIds,
    setAcademicYear,
    setActiveBlueprintRoomId,
    setActiveRoutineClass,
    setAllStudents,
    setAvailableClasses,
    setClassGroups,
    setClasses,
    setCompletedSteps,
    setDragOverRoomIndex,
    setDragOverSectionKey,
    setDraggedRoomIndex,
    setDraggedSectionKey,
    setEditingRoom,
    setEditorOpen,
    setExamStartTime,
    setExamType,
    setGeneratedAllocation,
    setLoading,
    setMismatchModalOpen,
    setMismatchReport,
    setMissingHsList,
    setMissingHsModalOpen,
    setMounted,
    setPendingAllocation,
    setPendingHsProceedAction,
    setPrintDialogOpen,
    setRoomClassMap,
    setRooms,
    setRoomsManagerOpen,
    setRosterModalState,
    setRoutinesByClass,
    setSavedAllocations,
    setSelectedClasses,
    setSelectedRoomIds,
    setStep,
    setStepState,
    setStudentsLoading,
    setStudentsPerBench,
    step,
    studentsLoading,
    studentsPerBench,
  };
}

export type EmsCore = ReturnType<typeof useEmsCore>;
