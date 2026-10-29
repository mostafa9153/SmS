"use client";

import { toast } from "sonner";
import React, { useState, useEffect, useRef, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getSavedRooms, saveRooms, deleteRoom, saveAllocation, getSavedAllocations, getActiveAllocation, saveActiveAllocation, updateSeatSwap, fetchAllocationsFromDb } from "@/lib/ems/room-storage";
import { pullExamSetup, pushExamSetup } from "@/lib/ems/exam-setup-sync";
import { fetchContinuingStudents, generateAutoAllocation } from "@/lib/ems/allocation-engine";
import { Student } from "@/lib/types";
import { EmsRoom, ExamType, AutoAllocationClassInput, AutoAllocationConfig, ExamAllocation, SeatAssignment, MismatchReport, ExamRoutineItem } from "@/lib/ems/types";
import { getDynamicClassCodes, syncAllEmsConfigsFromDb, getDatabaseSubjectsForClass } from "@/lib/ems/ems-config-loader";
import { getSchoolConfiguredStreams } from "@/lib/utils/school-profile";
import { useSchoolProfile } from "@/lib/hooks/use-school-profile";
import { normalizeClassCode, normalizeSectionCode, isHigherSecondaryClass, toShortStream, checkMissingHsRegistrationNos, MissingHsStudentInfo } from "@/lib/ems/seat-arrangement-algorithm";
import { calculateHsStudentStats } from "@/components/ems/auto-allocation-wizard";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { ClassGroupConfig, ClassGroupSectionConfig, buildClassGroupConfig, calculateSectionStudentStats, getSectionsForClass, sortClassGroups } from "@/components/ems/master/class-groups";

export function useEmsMaster() {
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

  // Handler: Add a new class group with ALL its sections pre-selected (only picks unassigned classes)
  const handleAddClassGroup = () => {
    const existingCodes = new Set(classGroups.map((g) => normalizeClassCode(g.class)));
    const nextClass = availableClasses.find((c) => !existingCodes.has(normalizeClassCode(c)));
    if (!nextClass) return; // All available classes already added

    const isHs = isHigherSecondaryClass(nextClass);
    let newSections: ClassGroupSectionConfig[] = [];
    const initialStream = "ALL";
    const initialGender = "ALL";
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
      const savedOrders = getCustomSectionOrders();
      const savedOrderForClass = savedOrders[normalizeClassCode(nextClass)];
      let orderedSecs = allSecs;
      if (savedOrderForClass && savedOrderForClass.length > 0) {
        orderedSecs = [...allSecs].sort((a, b) => {
          const idxA = savedOrderForClass.indexOf(a);
          const idxB = savedOrderForClass.indexOf(b);
          if (idxA !== -1 && idxB !== -1) return idxA - idxB;
          if (idxA !== -1) return -1;
          if (idxB !== -1) return 1;
          return a.localeCompare(b);
        });
      }
      newSections = orderedSecs.map((sec) => {
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
          updated.regNoTo,
          g.excludedStudentIds || []
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
              excludedStudentIds: g.excludedStudentIds || [],
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
          g.gender || "ALL",
          undefined,
          undefined,
          g.excludedStudentIds || []
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
              excludedStudentIds: g.excludedStudentIds || [],
            },
          ],
        };
      })
    );
  };

  // Handlers for Student Roster Modal (Manual inclusion/exclusion)
  const handleOpenRosterForSection = (group: ClassGroupConfig, sec: ClassGroupSectionConfig) => {
    const targetClass = normalizeClassCode(group.class);
    const targetSec = normalizeSectionCode(sec.section);
    const sectionStudents = allStudents.filter((s) => {
      if (s.currentStatus && s.currentStatus !== "Continuing") return false;
      return (
        normalizeClassCode(s.presentClass) === targetClass &&
        normalizeSectionCode(s.presentSection) === targetSec
      );
    });

    setRosterModalState({
      open: true,
      groupId: group.id,
      sectionName: sec.section,
      classCode: group.class,
      title: `Class ${group.class} - Section ${sec.section}`,
      students: sectionStudents,
      rollFrom: sec.rollFrom,
      rollTo: sec.rollTo,
      isHs: false,
      excludedIds: sec.excludedStudentIds || [],
    });
  };

  const handleOpenRosterForHs = (group: ClassGroupConfig) => {
    const targetClass = normalizeClassCode(group.class);
    const streamShort = group.stream && group.stream !== "ALL" ? toShortStream(group.stream) : null;
    const isBoyFilter =
      group.gender && group.gender !== "ALL"
        ? group.gender.toLowerCase().startsWith("boy") || group.gender.toLowerCase() === "male"
        : null;

    const hsStudents = allStudents.filter((s) => {
      if (s.currentStatus && s.currentStatus !== "Continuing") return false;
      if (normalizeClassCode(s.presentClass) !== targetClass) return false;
      if (streamShort && toShortStream(s.academicStream) !== streamShort) return false;
      if (isBoyFilter !== null) {
        if (isBoyFilter && s.gender !== "Male") return false;
        if (!isBoyFilter && s.gender !== "Female") return false;
      }
      return true;
    });

    setRosterModalState({
      open: true,
      groupId: group.id,
      classCode: group.class,
      title: `Class ${group.class} (${group.stream || "ALL"} Stream)`,
      students: hsStudents,
      regNoFrom: group.regNoFrom,
      regNoTo: group.regNoTo,
      isHs: true,
      excludedIds: group.excludedStudentIds || [],
    });
  };

  const handleSaveRosterExclusions = (excludedIds: string[]) => {
    if (rosterModalState.isHs) {
      setClassGroups((prev) =>
        prev.map((g) => {
          if (g.id !== rosterModalState.groupId) return g;
          const stats = calculateHsStudentStats(
            allStudents,
            g.class,
            g.stream || "ALL",
            g.gender || "ALL",
            g.regNoFrom,
            g.regNoTo,
            excludedIds
          );
          return {
            ...g,
            excludedStudentIds: excludedIds,
            sections: [
              {
                section: "ALL",
                rollFrom: 1,
                rollTo: 9999,
                enrolledCount: stats.count,
                totalEnrolled: stats.totalEnrolled,
                excludedStudentIds: excludedIds,
              },
            ],
          };
        })
      );
    } else {
      setClassGroups((prev) =>
        prev.map((g) => {
          if (g.id !== rosterModalState.groupId) return g;
          return {
            ...g,
            sections: g.sections.map((s) => {
              if (s.section !== rosterModalState.sectionName) return s;
              const stats = calculateSectionStudentStats(
                allStudents,
                g.class,
                s.section,
                s.rollFrom,
                s.rollTo,
                excludedIds
              );
              return {
                ...s,
                excludedStudentIds: excludedIds,
                enrolledCount: stats.count,
                totalEnrolled: stats.totalEnrolled,
              };
            }),
          };
        })
      );
    }
  };

  // Handler: Remove an entire class group (keeps Step 1 selectedClasses in sync)
  const handleRemoveClassGroup = (groupId: string) => {
    const target = classGroups.find((g) => g.id === groupId);
    if (target) {
      const norm = normalizeClassCode(target.class);
      setSelectedClasses((prev) =>
        prev.filter((c) => normalizeClassCode(c) !== norm)
      );
    }
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
              updatedRollTo,
              s.excludedStudentIds || []
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
        return {
          ...g,
          sections: g.sections.map((s) => {
            if (s.section !== sectionName) return s;
            const stats = calculateSectionStudentStats(
              allStudents,
              g.class,
              sectionName,
              undefined,
              undefined,
              s.excludedStudentIds || []
            );
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

  // Handler: Reset all sections in a group to their database roll ranges
  const handleResetGroupRolls = (groupId: string) => {
    setClassGroups((prev) =>
      prev.map((g) => {
        if (g.id !== groupId) return g;
        return {
          ...g,
          sections: g.sections.map((s) => {
            const stats = calculateSectionStudentStats(
              allStudents,
              g.class,
              s.section,
              undefined,
              undefined,
              s.excludedStudentIds || []
            );
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
        g.regNoTo,
        g.excludedStudentIds || []
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

  // Step 1: Routine Management Helpers
  const [draggedRowIndex, setDraggedRowIndex] = useState<number | null>(null);

  const activeClassSubjects = useMemo(() => {
    if (!activeRoutineClass) return [];
    return getDatabaseSubjectsForClass(activeRoutineClass, allStudents);
  }, [activeRoutineClass, allStudents]);

  const currentClassRoutine = useMemo(() => {
    if (!activeRoutineClass) return [];
    return routinesByClass[activeRoutineClass] || [];
  }, [activeRoutineClass, routinesByClass]);

  const handleRoutineDateChange = (idx: number, newDate: string) => {
    const normClass = activeRoutineClass;
    if (!normClass) return;
    let dayName = "";
    if (newDate) {
      const d = new Date(newDate + "T00:00:00");
      if (!isNaN(d.getTime())) {
        dayName = d.toLocaleDateString("en-US", { weekday: "long" });
      }
    }
    setRoutinesByClass((prev) => {
      const list = [...(prev[normClass] || [])];
      list[idx] = {
        ...list[idx],
        date: newDate,
        day: dayName,
      };
      return { ...prev, [normClass]: list };
    });
  };

  const handleRoutineSubjectText = (idx: number, subject: string) => {
    const normClass = activeRoutineClass;
    if (!normClass) return;
    setRoutinesByClass((prev) => {
      const list = [...(prev[normClass] || [])];
      list[idx] = { ...list[idx], subject };
      return { ...prev, [normClass]: list };
    });
  };

  const handleMoveRow = (fromIndex: number, toIndex: number) => {
    const normClass = activeRoutineClass;
    if (!normClass || fromIndex === toIndex) return;

    setRoutinesByClass((prev) => {
      const list = [...(prev[normClass] || [])];
      if (fromIndex < 0 || fromIndex >= list.length || toIndex < 0 || toIndex >= list.length) {
        return prev;
      }
      const [movedItem] = list.splice(fromIndex, 1);
      list.splice(toIndex, 0, movedItem);
      return { ...prev, [normClass]: list };
    });
  };

  const formatLocalDate = (d: Date): string => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  const handleAutoFillConsecutiveDates = () => {
    const normClass = activeRoutineClass;
    if (!normClass) return;
    const list = routinesByClass[normClass] || [];
    if (list.length === 0) return;

    let baseD: Date;
    if (list[0].date) {
      baseD = new Date(list[0].date + "T00:00:00");
    } else {
      baseD = new Date();
      if (baseD.getDay() === 0) baseD.setDate(baseD.getDate() + 1);
    }

    if (isNaN(baseD.getTime())) {
      baseD = new Date();
      if (baseD.getDay() === 0) baseD.setDate(baseD.getDate() + 1);
    }

    const currD = new Date(baseD.getTime());
    const updated = list.map((item, i) => {
      if (i === 0) {
        const dStr = formatLocalDate(currD);
        const dayStr = currD.toLocaleDateString("en-US", { weekday: "long" });
        return { ...item, date: dStr, day: dayStr };
      }
      currD.setDate(currD.getDate() + 1);
      if (currD.getDay() === 0) currD.setDate(currD.getDate() + 1);
      const dStr = formatLocalDate(currD);
      const dayStr = currD.toLocaleDateString("en-US", { weekday: "long" });
      return { ...item, date: dStr, day: dayStr };
    });

    setRoutinesByClass((prev) => ({
      ...prev,
      [normClass]: updated,
    }));
  };

  const handleResetToPresetSubjects = () => {
    const normClass = activeRoutineClass;
    if (!normClass) return;
    const presetSubs = getDatabaseSubjectsForClass(normClass, allStudents);
    if (!presetSubs || presetSubs.length === 0) return;
    setRoutinesByClass((prev) => ({
      ...prev,
      [normClass]: presetSubs.map((sub) => ({
        date: "",
        day: "",
        subject: sub,
      })),
    }));
  };

  const handleAddRoutineRow = () => {
    const normClass = activeRoutineClass;
    if (!normClass) return;
    setRoutinesByClass((prev) => {
      const list = [...(prev[normClass] || [])];
      let nextDate = "";
      let nextDay = "";
      if (list.length > 0 && list[list.length - 1].date) {
        const prevD = new Date(list[list.length - 1].date + "T00:00:00");
        if (!isNaN(prevD.getTime())) {
          prevD.setDate(prevD.getDate() + 1);
          if (prevD.getDay() === 0) prevD.setDate(prevD.getDate() + 1);
          nextDate = formatLocalDate(prevD);
          nextDay = prevD.toLocaleDateString("en-US", { weekday: "long" });
        }
      }
      return {
        ...prev,
        [normClass]: [...list, { date: nextDate, day: nextDay, subject: "" }],
      };
    });
  };

  const handleRemoveRoutineRow = (idx: number) => {
    const normClass = activeRoutineClass;
    if (!normClass) return;
    setRoutinesByClass((prev) => {
      const list = (prev[normClass] || []).filter((_, i) => i !== idx);
      return { ...prev, [normClass]: list };
    });
  };

  const handleCopyRoutineToAllClasses = () => {
    const normClass = activeRoutineClass;
    if (!normClass) return;
    const currentList = routinesByClass[normClass] || [];
    if (currentList.length === 0) return;
    setRoutinesByClass((prev) => {
      const updated = { ...prev };
      selectedClasses.forEach((c) => {
        const targetNorm = normalizeClassCode(c);
        if (targetNorm && targetNorm !== normClass) {
          const targetList = updated[targetNorm] || [];
          if (targetList.length > 0) {
            updated[targetNorm] = targetList.map((targetItem, i) => {
              const sourceItem = currentList[i];
              return {
                ...targetItem,
                date: sourceItem ? sourceItem.date : targetItem.date,
                day: sourceItem ? sourceItem.day : targetItem.day,
              };
            });
          } else {
            updated[targetNorm] = currentList.map((item) => ({ ...item }));
          }
        }
      });
      return updated;
    });
  };

  // Step transitions
  const handleProceedFromStep1 = () => {
    if (selectedClasses.length === 0) {
      toast.error("Please select at least one class.");
      return;
    }
    const cleanClasses = Array.from(
      new Set(
        selectedClasses
          .map((c) => normalizeClassCode(c))
          .filter(Boolean)
      )
    );
    setClassGroups((prev) => {
      const existingMap = new Map(
        prev.map((g) => [normalizeClassCode(g.class), g])
      );
      const merged = cleanClasses.map((cls) => {
        const existing = existingMap.get(cls);
        if (existing) return existing;
        return buildClassGroupConfig(cls, allStudents);
      });
      return sortClassGroups(merged);
    });
    markStepDone(1);
    setStep(2);
  };

  const handleProceedFromStep2 = () => {
    if (classes.length === 0 || totalStudentsExpected <= 0) {
      toast.error("Please configure at least one class group with valid rolls.");
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
          routinesByClass,
          examStartTime,
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
      toast.error("Failed to complete allocation.");
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
    const enrichedAllocation: ExamAllocation = {
      ...finalAllocation,
      routinesByClass: finalAllocation.routinesByClass || routinesByClass || generatedAllocation?.routinesByClass,
      examStartTime: finalAllocation.examStartTime || examStartTime || generatedAllocation?.examStartTime,
    };
    saveAllocation(enrichedAllocation);
    saveActiveAllocation(enrichedAllocation);
    setGeneratedAllocation(enrichedAllocation);
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

  return {
    academicYear,
    activeBlueprintRoomId,
    activeRoutineClass,
    allStudents,
    classGroups,
    classes,
    completedSteps,
    confirm,
    currentClassRoutine,
    dragJustFinishedRef,
    dragOverRoomIndex,
    dragOverSectionKey,
    draggedRoomIndex,
    draggedRowIndex,
    draggedSectionKey,
    editingRoom,
    editorOpen,
    examStartTime,
    examType,
    generatedAllocation,
    handleAddAllSectionsToGroup,
    handleAddRoutineRow,
    handleAddSectionToGroup,
    handleAutoFillConsecutiveDates,
    handleCommitArrangement,
    handleCopyRoutineToAllClasses,
    handleDeleteRoom,
    handleExecuteAllocation,
    handleMoveRoom,
    handleMoveRow,
    handleMoveSection,
    handleOpenEditRoom,
    handleOpenNewRoom,
    handleOpenRosterForHs,
    handleOpenRosterForSection,
    handleProceedFromStep1,
    handleProceedFromStep2,
    handleProceedWithMismatch,
    handleRemoveClassGroup,
    handleRemoveRoutineRow,
    handleRemoveSection,
    handleReorderSections,
    handleResetGroupRolls,
    handleResetHsRegNos,
    handleResetSectionRoll,
    handleResetToPresetSubjects,
    handleRoutineDateChange,
    handleRoutineSubjectText,
    handleSaveRosterExclusions,
    handleToggleSelectAllRooms,
    handleUpdateHsGroup,
    handleUpdateSectionRoll,
    hsConfiguredStreams,
    loading,
    markStepDone,
    mismatchModalOpen,
    mismatchReport,
    missingHsList,
    missingHsModalOpen,
    mounted,
    pendingHsProceedAction,
    printDialogOpen,
    reorderRooms,
    roomClassMap,
    rooms,
    roomsManagerOpen,
    rosterModalState,
    router,
    routinesByClass,
    savedAllocations,
    selectedClasses,
    selectedRoomIds,
    selectedRooms,
    setAcademicYear,
    setActiveBlueprintRoomId,
    setActiveRoutineClass,
    setDragOverRoomIndex,
    setDragOverSectionKey,
    setDraggedRoomIndex,
    setDraggedRowIndex,
    setDraggedSectionKey,
    setEditorOpen,
    setExamStartTime,
    setExamType,
    setGeneratedAllocation,
    setMismatchModalOpen,
    setMissingHsModalOpen,
    setPendingHsProceedAction,
    setPrintDialogOpen,
    setRooms,
    setRoomsManagerOpen,
    setRosterModalState,
    setRoutinesByClass,
    setSavedAllocations,
    setSelectedClasses,
    setSelectedRoomIds,
    setStep,
    setStudentsPerBench,
    step,
    studentsPerBench,
    toggleRoom,
    totalBenches,
    totalDynamicCapacity,
    totalStudentsExpected,
  };
}

export type EmsMasterState = ReturnType<typeof useEmsMaster>;
