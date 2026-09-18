"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  EmsRoom,
  AutoAllocationClassInput,
  ExamAllocation,
  AllocatedRoom,
  SeatAssignment,
  ExamType,
} from "@/lib/ems/types";
import { Student } from "@/lib/types";
import {
  ArrangementPattern,
  FillDirection,
  ColumnClassAllocationConfig,
  RoomArrangementConfig,
  ArrangementPromptState,
  ArrangementHistoryEntry,
} from "@/lib/ems/seat-arrangement-types";
import {
  buildClassStudentPool,
  arrangeRoom,
  arrangeRoomInterleaved,
  arrangeRoomUnified,
  normalizeClassCode,
  normalizeSectionCode,
} from "@/lib/ems/seat-arrangement-algorithm";
import { detectAllMissingRolls } from "@/lib/ems/allocation-engine";
import { PatternSelector } from "./pattern-selector";
import { ColumnClassAssigner, AvailableClassOption } from "./column-class-assigner";
import { MidFillClassPrompt } from "./mid-fill-class-prompt";
import { VisualRoomBlueprint } from "@/components/ems/visual-room-blueprint";
import { getClassColorStyle } from "@/components/ems/seat-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DoorOpen,
  Sparkles,
  Undo2,
  Redo2,
  RotateCcw,
  ArrowRight,
  ArrowLeft,
  Wand2,
  Layers,
  Armchair,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Sliders,
  Printer,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SeatArrangementEditorProps {
  rooms: EmsRoom[];
  classes: AutoAllocationClassInput[];
  allStudents: Student[];
  studentsPerBench: number;
  academicYear: number;
  examType: ExamType;
  initialRoomClassMap?: Record<string, string[]>;
  initialAllocation?: ExamAllocation | null;
  onCommitArrangement: (allocation: ExamAllocation) => void;
  onBackToStep3: () => void;
}

export function SeatArrangementEditor({
  rooms,
  classes,
  allStudents,
  studentsPerBench,
  academicYear,
  examType,
  initialRoomClassMap = {},
  initialAllocation,
  onCommitArrangement,
  onBackToStep3,
}: SeatArrangementEditorProps) {
  // Dynamically ensure rooms reflect chosen studentsPerBench capacity
  const effectiveRooms = useMemo(() => {
    if (!studentsPerBench) return rooms;
    return rooms.map((r) => ({
      ...r,
      defaultSeatsPerBench: studentsPerBench,
      columns: r.columns.map((c) => ({
        ...c,
        seatsPerBench: studentsPerBench,
      })),
      totalCapacity: r.columns.reduce((acc, c) => acc + c.benchCount * studentsPerBench, 0),
    }));
  }, [rooms, studentsPerBench]);
  // Active Room Selection
  const [activeRoomId, setActiveRoomId] = useState<string>(() => {
    if (initialAllocation?.roomAllocations && initialAllocation.roomAllocations.length > 0) {
      return initialAllocation.roomAllocations[0].roomId;
    }
    return effectiveRooms.length > 0 ? effectiveRooms[0].id : "";
  });
  // State to toggle collapsible Step 4 Column Edit section (defaults to false / auto hide)
  const [isConfigExpanded, setIsConfigExpanded] = useState<boolean>(false);

  // Available classes derived from Step 2 with real DB continuing student count
  const availableClasses: AvailableClassOption[] = useMemo(() => {
    const unique = new Map<string, { code: string; name: string; count: number }>();

    classes.forEach((c) => {
      const norm = normalizeClassCode(c.class);
      const normSec = normalizeSectionCode(c.section);
      const actualMatching = allStudents.filter((s) => {
        if (s.currentStatus && s.currentStatus !== "Continuing") return false;
        if (normalizeClassCode(s.presentClass) !== norm) return false;
        if (normSec && normalizeSectionCode(s.presentSection) !== normSec) return false;
        const roll = Number(s.presentRoll) || 0;
        if (c.rollFrom && roll < c.rollFrom) return false;
        if (c.rollTo && roll > c.rollTo) return false;
        return true;
      }).length;

      if (!unique.has(norm)) {
        unique.set(norm, { code: norm, name: `Class ${norm}`, count: actualMatching });
      } else {
        unique.get(norm)!.count += actualMatching;
      }
    });

    return Array.from(unique.values());
  }, [classes, allStudents]);

  // Global student pool
  const studentPool = useMemo(() => {
    const allowedCodes = availableClasses.map((c) => c.code);
    return buildClassStudentPool(allStudents, allowedCodes, classes);
  }, [allStudents, availableClasses, classes]);

  // Memoized default room configs
  const defaultRoomConfigs = useMemo(() => {
    const configs: Record<string, RoomArrangementConfig> = {};

    effectiveRooms.forEach((r) => {
      const mapped = initialRoomClassMap[r.id] || [];
      const primaryClass = mapped[0] || availableClasses[0]?.code || "";
      const secondaryClass = mapped[1] || availableClasses[1]?.code || primaryClass;

      const columnAssignments: ColumnClassAllocationConfig[] = r.columns.map((col, idx) => {
        const s1 = idx % 2 === 0 ? primaryClass : secondaryClass;
        const s2 = idx % 2 === 0 ? secondaryClass : primaryClass;
        return {
          columnIndex: col.columnIndex,
          s1ClassCode: s1,
          s2ClassCode: s2,
          s3MirrorS1: true,
          s3ClassCode: s1,
          assignedClassCode: s1,
          secondaryClassCode: s2,
        };
      });

      configs[r.id] = {
        roomId: r.id,
        pattern: "INTERLEAVED", // Default Interleaved Alternating Snake Loop
        columnAssignments,
        startDirection: "top-to-bottom",
      };
    });

    return configs;
  }, [effectiveRooms, initialRoomClassMap, availableClasses]);

  // Per-room arrangement configurations
  const [roomConfigs, setRoomConfigs] = useState<Record<string, RoomArrangementConfig>>(defaultRoomConfigs);

  // Target scope: Single Room vs All Rooms (Default: All Rooms)
  const [applyScope, setApplyScope] = useState<"ALL_ROOMS" | "SINGLE_ROOM">("ALL_ROOMS");

  // Cascade auto-arrangement sequentially across all rooms
  const runCascadeAllocationAcrossRooms = useCallback(
    (configsToUse: Record<string, RoomArrangementConfig>): AllocatedRoom[] => {
      let currentCursors = new Map<string, number>();
      const updatedRooms: AllocatedRoom[] = [];

      effectiveRooms.forEach((r) => {
        const rConfig = configsToUse[r.id] || {
          roomId: r.id,
          pattern: "INTERLEAVED",
          columnAssignments: [],
          startDirection: "top-to-bottom",
        };

        const patternToUse = rConfig.pattern || "INTERLEAVED";
        const { allocatedRoom, updatedCursors } = arrangeRoomUnified(
          patternToUse,
          r,
          rConfig.columnAssignments,
          studentPool,
          currentCursors
        );
        currentCursors = updatedCursors; // Chain cursors from room to room
        updatedRooms.push(allocatedRoom);
      });

      return updatedRooms;
    },
    [effectiveRooms, studentPool]
  );

  // Current allocated rooms state — auto-generated with selected pattern & seamless multi-room overflow
  const [roomAllocations, setRoomAllocations] = useState<AllocatedRoom[]>(() => {
    // If an allocation was already prepared or modified, preserve it!
    if (
      initialAllocation?.roomAllocations &&
      initialAllocation.roomAllocations.length > 0
    ) {
      return initialAllocation.roomAllocations;
    }

    let currentCursors = new Map<string, number>();
    const initialPool = buildClassStudentPool(
      allStudents,
      availableClasses.map((c) => c.code),
      classes
    );

    return effectiveRooms.map((r) => {
      const cfg = defaultRoomConfigs[r.id];
      const patternToUse = cfg?.pattern || "INTERLEAVED";
      const { allocatedRoom, updatedCursors } = arrangeRoomUnified(
        patternToUse,
        r,
        cfg?.columnAssignments || [],
        initialPool,
        currentCursors
      );
      currentCursors = updatedCursors; // Chain cursors seamlessly across rooms
      return allocatedRoom;
    });
  });

  // Sync initialAllocation when prop changes or mounts on page restore
  useEffect(() => {
    if (initialAllocation?.roomAllocations && initialAllocation.roomAllocations.length > 0) {
      setRoomAllocations(initialAllocation.roomAllocations);
      setActiveRoomId((prev) => {
        if (prev && initialAllocation.roomAllocations.some((r) => r.roomId === prev)) {
          return prev;
        }
        return initialAllocation.roomAllocations[0].roomId;
      });
    }
  }, [initialAllocation]);

  // Undo / Redo Stacks
  const [undoStack, setUndoStack] = useState<ArrangementHistoryEntry[]>([]);
  const [redoStack, setRedoStack] = useState<ArrangementHistoryEntry[]>([]);

  // UU Mid-Fill Class Prompt State
  const [promptState, setPromptState] = useState<ArrangementPromptState | null>(null);

  // Push current state to undo history
  const pushHistorySnapshot = useCallback(() => {
    const entry: ArrangementHistoryEntry = {
      rooms: JSON.parse(JSON.stringify(roomAllocations)),
      configs: JSON.parse(JSON.stringify(roomConfigs)),
      activeRoomId,
      timestamp: Date.now(),
    };
    setUndoStack((prev) => [...prev.slice(-25), entry]);
    setRedoStack([]); // Clear redo on new action
  }, [roomAllocations, roomConfigs, activeRoomId]);

  // Undo Action
  const handleUndo = () => {
    if (undoStack.length === 0) return;
    const last = undoStack[undoStack.length - 1];

    const currentSnapshot: ArrangementHistoryEntry = {
      rooms: JSON.parse(JSON.stringify(roomAllocations)),
      configs: JSON.parse(JSON.stringify(roomConfigs)),
      activeRoomId,
      timestamp: Date.now(),
    };

    setRedoStack((prev) => [...prev, currentSnapshot]);
    setUndoStack((prev) => prev.slice(0, -1));

    setRoomAllocations(last.rooms);
    setRoomConfigs(last.configs);
    setActiveRoomId(last.activeRoomId);
  };

  // Redo Action
  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];

    const currentSnapshot: ArrangementHistoryEntry = {
      rooms: JSON.parse(JSON.stringify(roomAllocations)),
      configs: JSON.parse(JSON.stringify(roomConfigs)),
      activeRoomId,
      timestamp: Date.now(),
    };

    setUndoStack((prev) => [...prev, currentSnapshot]);
    setRedoStack((prev) => prev.slice(0, -1));

    setRoomAllocations(next.rooms);
    setRoomConfigs(next.configs);
    setActiveRoomId(next.activeRoomId);
  };

  // Active room data
  const activeRoom = effectiveRooms.find((r) => r.id === activeRoomId) || effectiveRooms[0];
  const activeAllocation = roomAllocations.find((r) => r.roomId === activeRoomId);
  const activeConfig =
    roomConfigs[activeRoomId] || {
      roomId: activeRoomId,
      pattern: "INTERLEAVED",
      columnAssignments: [],
      startDirection: "top-to-bottom",
    };

  // Update pattern for room(s) based on applyScope
  const handlePatternChange = (newPattern: ArrangementPattern) => {
    pushHistorySnapshot();

    const primaryClass = availableClasses[0]?.code || "";
    const secondaryClass = availableClasses[1]?.code || primaryClass;

    const generateColsForRoom = (r: EmsRoom, currentCols: ColumnClassAllocationConfig[]): ColumnClassAllocationConfig[] => {
      if (newPattern === "FIXED_U") {
        return (r.columns || []).map((col) => {
          const existing = currentCols.find((c) => c.columnIndex === col.columnIndex);
          return {
            columnIndex: col.columnIndex,
            s1ClassCode: primaryClass,
            s2ClassCode: secondaryClass,
            s3MirrorS1: true,
            s3ClassCode: primaryClass,
            overflowClassCode: existing?.overflowClassCode,
            direction: existing?.direction,
            s1Direction: existing?.s1Direction,
            s2Direction: existing?.s2Direction,
            s3Direction: existing?.s3Direction,
            assignedClassCode: primaryClass,
            secondaryClassCode: secondaryClass,
          };
        });
      } else {
        return (r.columns || []).map((col, idx) => {
          const s1 = idx % 2 === 0 ? primaryClass : secondaryClass;
          const s2 = idx % 2 === 0 ? secondaryClass : primaryClass;
          const existing = currentCols.find((c) => c.columnIndex === col.columnIndex);
          return {
            columnIndex: col.columnIndex,
            s1ClassCode: s1,
            s2ClassCode: s2,
            s3MirrorS1: true,
            s3ClassCode: s1,
            overflowClassCode: existing?.overflowClassCode,
            direction: existing?.direction,
            s1Direction: existing?.s1Direction,
            s2Direction: existing?.s2Direction,
            s3Direction: existing?.s3Direction,
            assignedClassCode: s1,
            secondaryClassCode: s2,
          };
        });
      }
    };

    let updatedConfigs: Record<string, RoomArrangementConfig> = { ...roomConfigs };

    if (applyScope === "ALL_ROOMS") {
      effectiveRooms.forEach((r) => {
        const current = roomConfigs[r.id] || {
          roomId: r.id,
          pattern: newPattern,
          columnAssignments: [],
          startDirection: "top-to-bottom",
        };
        updatedConfigs[r.id] = {
          ...current,
          pattern: newPattern,
          columnAssignments: generateColsForRoom(r, current.columnAssignments),
        };
      });
    } else {
      const current = roomConfigs[activeRoomId] || {
        roomId: activeRoomId,
        pattern: newPattern,
        columnAssignments: [],
        startDirection: "top-to-bottom",
      };
      updatedConfigs[activeRoomId] = {
        ...current,
        pattern: newPattern,
        columnAssignments: generateColsForRoom(activeRoom || effectiveRooms[0], current.columnAssignments),
      };
    }

    setRoomConfigs(updatedConfigs);

    // Recalculate seating across all rooms with updated pattern immediately
    const updatedRooms = runCascadeAllocationAcrossRooms(updatedConfigs);
    setRoomAllocations(updatedRooms);
  };

  // Update column assignment for active room or all rooms based on applyScope
  const handleColumnAssignmentChange = (
    columnIndex: number,
    primaryOrUpdates: string | Partial<ColumnClassAllocationConfig>,
    secondaryClass?: string
  ) => {
    pushHistorySnapshot();
    let updatedObj: Partial<ColumnClassAllocationConfig> = {};

    if (typeof primaryOrUpdates === "string") {
      updatedObj = {
        assignedClassCode: primaryOrUpdates,
        s1ClassCode: primaryOrUpdates,
        secondaryClassCode: secondaryClass,
        s2ClassCode: secondaryClass,
      };
    } else {
      updatedObj = { ...primaryOrUpdates };
      if (updatedObj.s1ClassCode && !updatedObj.assignedClassCode) {
        updatedObj.assignedClassCode = updatedObj.s1ClassCode;
      }
      if (updatedObj.s2ClassCode && !updatedObj.secondaryClassCode) {
        updatedObj.secondaryClassCode = updatedObj.s2ClassCode;
      }
    }

    const applyColsUpdate = (currentCols: ColumnClassAllocationConfig[]): ColumnClassAllocationConfig[] => {
      const existingIndex = currentCols.findIndex((c) => c.columnIndex === columnIndex);
      if (existingIndex >= 0) {
        return currentCols.map((c, idx) =>
          idx === existingIndex ? { ...c, ...updatedObj } : c
        );
      }
      return [
        ...currentCols,
        {
          columnIndex,
          s1ClassCode: availableClasses[0]?.code || "",
          s2ClassCode: availableClasses[1]?.code || availableClasses[0]?.code || "",
          s3MirrorS1: true,
          s3ClassCode: availableClasses[0]?.code || "",
          assignedClassCode: availableClasses[0]?.code || "",
          secondaryClassCode: availableClasses[1]?.code || availableClasses[0]?.code || "",
          ...updatedObj,
        },
      ];
    };

    let newConfigs: Record<string, RoomArrangementConfig> = { ...roomConfigs };

    if (applyScope === "ALL_ROOMS") {
      effectiveRooms.forEach((r) => {
        const rConfig = roomConfigs[r.id] || {
          roomId: r.id,
          pattern: activeConfig.pattern || "INTERLEAVED",
          columnAssignments: [],
          startDirection: "top-to-bottom",
        };
        newConfigs[r.id] = {
          ...rConfig,
          columnAssignments: applyColsUpdate(rConfig.columnAssignments),
        };
      });
    } else {
      const currentCols = roomConfigs[activeRoomId]?.columnAssignments || [];
      newConfigs[activeRoomId] = {
        ...(roomConfigs[activeRoomId] || {
          roomId: activeRoomId,
          pattern: "INTERLEAVED",
          columnAssignments: [],
          startDirection: "top-to-bottom",
        }),
        columnAssignments: applyColsUpdate(currentCols),
      };
    }

    setRoomConfigs(newConfigs);

    // Recalculate seating across all rooms immediately
    const updatedRooms = runCascadeAllocationAcrossRooms(newConfigs);
    setRoomAllocations(updatedRooms);
  };

  // Bulk update column assignments (atomic single-batch update for Single or All Rooms)
  const handleBulkColumnAssignmentChange = (newCols: ColumnClassAllocationConfig[]) => {
    pushHistorySnapshot();
    let newConfigs: Record<string, RoomArrangementConfig> = { ...roomConfigs };

    if (applyScope === "ALL_ROOMS") {
      effectiveRooms.forEach((r) => {
        const matchedCols: ColumnClassAllocationConfig[] = r.columns.map((col, idx) => {
          const srcCol = newCols.find((c) => c.columnIndex === col.columnIndex) || newCols[idx % newCols.length];
          const s1 = srcCol?.s1ClassCode || srcCol?.assignedClassCode || availableClasses[0]?.code || "";
          const s2 = srcCol?.s2ClassCode || srcCol?.secondaryClassCode || availableClasses[1]?.code || "";
          return {
            columnIndex: col.columnIndex,
            s1ClassCode: s1,
            s2ClassCode: s2,
            s3MirrorS1: srcCol?.s3MirrorS1 !== false,
            s3ClassCode: srcCol?.s3ClassCode || s1,
            overflowClassCode: srcCol?.overflowClassCode,
            direction: srcCol?.direction,
            s1Direction: srcCol?.s1Direction,
            s2Direction: srcCol?.s2Direction,
            s3Direction: srcCol?.s3Direction,
            assignedClassCode: s1,
            secondaryClassCode: s2,
          };
        });

        newConfigs[r.id] = {
          ...(roomConfigs[r.id] || {
            roomId: r.id,
            pattern: activeConfig.pattern || "INTERLEAVED",
            columnAssignments: [],
            startDirection: "top-to-bottom",
          }),
          columnAssignments: matchedCols,
        };
      });
    } else {
      newConfigs[activeRoomId] = {
        ...(roomConfigs[activeRoomId] || {
          roomId: activeRoomId,
          pattern: "INTERLEAVED",
          columnAssignments: [],
          startDirection: "top-to-bottom",
        }),
        columnAssignments: newCols,
      };
    }

    setRoomConfigs(newConfigs);

    // Recalculate seating across all rooms immediately
    const updatedRooms = runCascadeAllocationAcrossRooms(newConfigs);
    setRoomAllocations(updatedRooms);
  };

  // Apply active room's pattern and column class assignment template across all rooms
  const handleApplyTemplateToAllRooms = () => {
    if (!activeRoom) return;
    pushHistorySnapshot();

    const activeColAssignments = activeConfig.columnAssignments;
    const activePattern = activeConfig.pattern;

    const updatedConfigs: Record<string, RoomArrangementConfig> = {};

    effectiveRooms.forEach((r) => {
      // Map active room's column assignments to target room r's columns
      const matchedCols: ColumnClassAllocationConfig[] = r.columns.map((col, idx) => {
        const existing =
          activeColAssignments.find((c) => c.columnIndex === col.columnIndex) ||
          activeColAssignments[idx % activeColAssignments.length];

        const s1 = existing?.s1ClassCode || existing?.assignedClassCode || availableClasses[0]?.code || "";
        const s2 = existing?.s2ClassCode || existing?.secondaryClassCode || availableClasses[1]?.code || "";

        return {
          columnIndex: col.columnIndex,
          s1ClassCode: s1,
          s2ClassCode: s2,
          s3MirrorS1: existing?.s3MirrorS1 !== false,
          s3ClassCode: existing?.s3ClassCode || s1,
          overflowClassCode: existing?.overflowClassCode,
          direction: existing?.direction,
          s1Direction: existing?.s1Direction,
          s2Direction: existing?.s2Direction,
          s3Direction: existing?.s3Direction,
          assignedClassCode: s1,
          secondaryClassCode: s2,
        };
      });

      updatedConfigs[r.id] = {
        roomId: r.id,
        pattern: activePattern,
        columnAssignments: matchedCols,
        startDirection: activeConfig.startDirection || "top-to-bottom",
      };
    });

    setRoomConfigs(updatedConfigs);

    // Recalculate seating across all rooms sequentially
    const updatedRooms = runCascadeAllocationAcrossRooms(updatedConfigs);
    setRoomAllocations(updatedRooms);
  };

  // Scope toggle handler (Single Room vs All Rooms)
  const handleScopeChange = (newScope: "ALL_ROOMS" | "SINGLE_ROOM") => {
    setApplyScope(newScope);
    if (newScope === "ALL_ROOMS") {
      handleApplyTemplateToAllRooms();
    }
  };

  // Run auto-arrangement for active room (also cascades downstream rooms)
  const handleAutoArrangeActiveRoom = () => {
    if (!activeRoom) return;
    pushHistorySnapshot();
    const updated = runCascadeAllocationAcrossRooms(roomConfigs);
    setRoomAllocations(updated);
  };

  // Handle mid-fill prompt decision
  const handlePromptSelectNextClass = (nextClassCode: string) => {
    if (!promptState || !activeRoom) return;

    const updatedAssignments = activeConfig.columnAssignments.map((col) => ({
      ...col,
      secondaryClassCode: nextClassCode,
    }));

    const updatedConfigs = {
      ...roomConfigs,
      [activeRoom.id]: {
        ...activeConfig,
        columnAssignments: updatedAssignments,
      },
    };
    setRoomConfigs(updatedConfigs);

    const updatedRooms = runCascadeAllocationAcrossRooms(updatedConfigs);
    setRoomAllocations(updatedRooms);

    setPromptState(null);
  };

  // Run auto-arrangement for all rooms sequentially (seamless cascade into next room)
  const handleAutoArrangeAllRooms = () => {
    pushHistorySnapshot();
    const updated = runCascadeAllocationAcrossRooms(roomConfigs);
    setRoomAllocations(updated);
  };

  // Seat Swap (manual override) in active room
  const handleSeatSwap = (seat1: SeatAssignment, seat2: SeatAssignment) => {
    if (!activeRoom) return;
    pushHistorySnapshot();

    setRoomAllocations((prev) =>
      prev.map((r) => {
        if (r.roomId !== activeRoom.id) return r;

        const s1 = r.seats.find((s) => s.seatId === seat1.seatId);
        const s2 = r.seats.find((s) => s.seatId === seat2.seatId);
        if (!s1 || !s2) return r;

        // Swap student properties
        const temp = {
          studentId: s1.studentId,
          studentName: s1.studentName,
          studentRoll: s1.studentRoll,
          studentClass: s1.studentClass,
          studentSection: s1.studentSection,
          schoolId: s1.schoolId,
          fatherName: s1.fatherName,
          contact: s1.contact,
          isVacant: s1.isVacant,
        };

        s1.studentId = s2.studentId;
        s1.studentName = s2.studentName;
        s1.studentRoll = s2.studentRoll;
        s1.studentClass = s2.studentClass;
        s1.studentSection = s2.studentSection;
        s1.schoolId = s2.schoolId;
        s1.fatherName = s2.fatherName;
        s1.contact = s2.contact;
        s1.isVacant = s2.isVacant;

        s2.studentId = temp.studentId;
        s2.studentName = temp.studentName;
        s2.studentRoll = temp.studentRoll;
        s2.studentClass = temp.studentClass;
        s2.studentSection = temp.studentSection;
        s2.schoolId = temp.schoolId;
        s2.fatherName = temp.fatherName;
        s2.contact = temp.contact;
        s2.isVacant = temp.isVacant;

        const occupied = r.seats.filter((s) => !s.isVacant).length;
        r.occupiedSeats = occupied;
        r.vacantSeats = r.totalSeats - occupied;
        r.classesPresent = Array.from(
          new Set(
            r.seats
              .filter((s) => !s.isVacant && s.studentClass)
              .map((s) => `${s.studentClass}${s.studentSection ? `-${s.studentSection}` : ""}`)
          )
        );

        return { ...r };
      })
    );
  };

  // Reset current room to vacant
  const handleResetActiveRoom = () => {
    if (!activeRoom) return;
    pushHistorySnapshot();

    setRoomAllocations((prev) =>
      prev.map((r) => {
        if (r.roomId !== activeRoom.id) return r;
        const resetSeats = r.seats.map((s) => ({
          ...s,
          studentId: undefined,
          studentName: undefined,
          studentRoll: undefined,
          studentClass: undefined,
          studentSection: undefined,
          schoolId: undefined,
          fatherName: undefined,
          contact: undefined,
          isVacant: true,
        }));
        return {
          ...r,
          seats: resetSeats,
          occupiedSeats: 0,
          vacantSeats: r.totalSeats,
          classesPresent: [],
        };
      })
    );
  };

  // Finalize and commit allocation to Step 5
  const handleCommitToStep5 = () => {
    const totalOccupied = roomAllocations.reduce((sum, r) => sum + r.occupiedSeats, 0);
    const allClasses = Array.from(
      new Set(roomAllocations.flatMap((r) => r.classesPresent))
    );

    const finalAllocation: ExamAllocation = {
      id: initialAllocation?.id || `alloc-${Date.now()}`,
      title: `${examType} (${academicYear}) - ${allClasses.join(", ") || "Seating Plan"}`,
      academicYear,
      examType,
      mode: "auto",
      createdAt: initialAllocation?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      roomAllocations,
      summary: {
        totalStudents: totalOccupied,
        totalRooms: roomAllocations.length,
        classesAllocated: allClasses,
      },
    };

    onCommitArrangement(finalAllocation);
  };

  // Keyboard shortcut for Undo (Ctrl+Z) and Redo (Ctrl+Y / Ctrl+Shift+Z)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      } else if (
        ((e.ctrlKey || e.metaKey) && e.key === "y") ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "z")
      ) {
        e.preventDefault();
        handleRedo();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [undoStack, redoStack]);

  const missingRollsReport = useMemo(() => {
    return detectAllMissingRolls(classes, allStudents);
  }, [classes, allStudents]);

  const totalMissingRollsCount = useMemo(() => {
    return missingRollsReport.reduce((acc, m) => acc + m.missingRolls.length, 0);
  }, [missingRollsReport]);

  return (
    <div className="space-y-4">
      {/* Missing Roll Notice Banner (if any database rolls are missing in range) */}
      {missingRollsReport.length > 0 && (
        <div className="p-3.5 sm:p-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 backdrop-blur-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 shrink-0 mt-0.5">
              <AlertTriangle className="h-4 w-4" />
            </div>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h4 className="text-xs sm:text-sm font-bold text-amber-900 dark:text-amber-200">
                  Missing Roll Numbers Detected
                </h4>
                <Badge className="bg-amber-500/20 text-amber-800 dark:text-amber-300 border-amber-500/40 text-[10px] font-mono">
                  {totalMissingRollsCount} Missing in DB
                </Badge>
              </div>
              <p className="text-xs text-amber-800/90 dark:text-amber-300/90 leading-relaxed">
                Active students have been seated continuously without leaving empty gaps for skipped rolls.
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                {missingRollsReport.map((m, idx) => (
                  <div
                    key={idx}
                    className="text-[11px] font-mono bg-background/90 border border-amber-500/30 rounded-lg px-2.5 py-1 text-foreground flex items-center gap-1.5 shadow-2xs"
                  >
                    <span className="font-bold text-primary">Class {m.class}-{m.section}:</span>
                    <span className="text-muted-foreground">Missing:</span>
                    <span className="font-bold text-amber-700 dark:text-amber-400">{m.missingFormatted}</span>
                    <span className="text-[10px] text-muted-foreground/80">({m.foundCount}/{m.expectedCount} active)</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────── */}
      {/* ROOM CONFIGURATION PANEL: Algorithm & Column Assignments     */}
      {/* ──────────────────────────────────────────────────────────── */}
      {activeRoom && (
        <div className="relative z-30 p-4 sm:p-5 rounded-2xl border border-border/80 bg-card/80 backdrop-blur-xs space-y-4 shadow-xs">
          {/* Clean Step 4 Header with Short Exam Name, Selected Classes, and Highlighted Column Edit Toggle */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/40 pb-3">
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="h-8.5 w-8.5 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20 shadow-2xs">
                <Armchair className="h-4 w-4 text-primary" />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold text-foreground tracking-tight">
                  Seat Arrangement
                </h3>
                {examType && (
                  <Badge className="bg-primary/15 text-primary border-primary/25 text-xs font-bold px-2.5 py-0.5 shadow-2xs">
                    {examType.replace(" Evaluation", "")}
                  </Badge>
                )}
                {availableClasses.map((c) => {
                  const colorStyle = getClassColorStyle(c.code);
                  return (
                    <span
                      key={c.code}
                      className={cn(
                        "text-xs font-bold px-2 py-0.5 rounded-md shadow-2xs",
                        colorStyle?.badgeBg || "bg-muted text-foreground border border-border"
                      )}
                    >
                      Class {c.code}
                    </span>
                  );
                })}
              </div>
            </div>

            {/* Highlighted Column Edit Button */}
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsConfigExpanded((prev) => !prev)}
                className={cn(
                  "h-8 text-xs font-bold gap-1.5 px-3.5 rounded-xl border transition-all duration-200 cursor-pointer shadow-xs active:scale-95",
                  isConfigExpanded
                    ? "bg-primary text-primary-foreground border-primary shadow-sm hover:bg-primary/90"
                    : "bg-primary/10 text-primary border-primary/40 hover:bg-primary/20 hover:border-primary"
                )}
              >
                <Sliders className={cn("h-3.5 w-3.5 transition-transform duration-200", isConfigExpanded ? "text-primary-foreground" : "text-primary")} />
                <span>Column Edit</span>
                <ChevronDown
                  className={cn(
                    "h-3.5 w-3.5 transition-transform duration-300 ease-out",
                    isConfigExpanded ? "rotate-180" : "rotate-0"
                  )}
                />
              </Button>
            </div>
          </div>

          {/* Grand Strategy Pattern Switcher (Full Width) */}
          <PatternSelector
            value={activeConfig.pattern}
            onChange={handlePatternChange}
          />

          {/* Collapsible Column Configuration & Actions with Ultra Smooth CSS Transition */}
          <div className={cn("ems-accordion-drawer", isConfigExpanded && "is-open")}>
            <div className="ems-accordion-content space-y-4">
              {/* Column Class Assigner */}
              <ColumnClassAssigner
                columns={activeRoom.columns}
                availableClasses={availableClasses}
                columnAssignments={activeConfig.columnAssignments}
                onAssignmentChange={handleColumnAssignmentChange}
                onBulkAssignmentChange={handleBulkColumnAssignmentChange}
                onApplyToAllRooms={handleApplyTemplateToAllRooms}
                pattern={activeConfig.pattern}
              />

              {/* Action Row: Auto-Arrange & Reset Room */}
              <div className="pt-3 border-t border-border/60 flex flex-wrap items-center justify-between gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleResetActiveRoom}
                  className="h-8 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 gap-1.5 cursor-pointer border-rose-200 dark:border-rose-900"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>Reset {activeRoom.roomNumber} Seats</span>
                </Button>

                <Button
                  type="button"
                  size="sm"
                  onClick={handleAutoArrangeActiveRoom}
                  className="h-8 text-xs font-bold gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs cursor-pointer px-3.5"
                >
                  <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                  <span>Re-apply Arrangement to {activeRoom.roomNumber}</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────── */}
      {/* ROOM SELECTOR SEGMENTED TAB BAR (Positioned Before Room)     */}
      {/* ──────────────────────────────────────────────────────────── */}
      <div className="p-1.5 rounded-2xl bg-muted/40 border border-border/70 flex items-center gap-1.5 overflow-x-auto shadow-2xs">
        {effectiveRooms.map((room, roomIdx) => {
          const isSelected = room.id === activeRoomId;
          const alloc = roomAllocations.find((r) => r.roomId === room.id);
          const occupied = alloc?.occupiedSeats || 0;
          const total = alloc?.totalSeats || room.totalCapacity;
          const isFull = occupied === total && total > 0;

          return (
            <button
              key={room.id}
              onClick={() => setActiveRoomId(room.id)}
              className={cn(
                "px-3.5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2.5 cursor-pointer shrink-0 border",
                isSelected
                  ? "bg-background text-foreground border-primary/40 shadow-xs font-bold ring-1 ring-primary/20"
                  : "bg-transparent text-muted-foreground hover:text-foreground border-transparent hover:bg-background/50"
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
                #{roomIdx + 1}
              </span>
              <DoorOpen className={cn("h-3.5 w-3.5", isSelected ? "text-primary" : "text-muted-foreground")} />
              <span className="font-semibold">{room.roomNumber}</span>
              <Badge
                variant="secondary"
                className={cn(
                  "text-[10px] px-1.5 py-0 h-4 font-mono font-semibold transition-colors",
                  isFull
                    ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/25"
                    : isSelected
                    ? "bg-primary/10 text-primary border border-primary/20"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {isFull ? `✓ ${occupied}/${total}` : `${occupied}/${total} Seated`}
              </Badge>
            </button>
          );
        })}
      </div>

      {/* ──────────────────────────────────────────────────────────── */}
      {/* LIVE 2D BLUEPRINT WITH CLICK-TO-SWAP                         */}
      {/* ──────────────────────────────────────────────────────────── */}
      {activeAllocation ? (
        <VisualRoomBlueprint
          room={activeAllocation}
          onSwapSeats={handleSeatSwap}
          examTitle={`${examType} - ${academicYear}`}
          examType={examType}
          readOnly={false}
        />
      ) : (
        <div className="p-10 text-center border border-dashed rounded-xl">
          <Armchair className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm font-semibold">No room selected</p>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────── */}
      {/* BOTTOM STEP NAVIGATION                                       */}
      {/* ──────────────────────────────────────────────────────────── */}
      <div className="pt-3 border-t border-border/60 flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          onClick={onBackToStep3}
          className="text-xs font-semibold gap-1.5 cursor-pointer shadow-2xs hover:border-primary/40"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Room Setup
        </Button>

        <Button
          size="sm"
          onClick={handleCommitToStep5}
          className="text-xs font-bold gap-1.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white cursor-pointer shadow-md hover:scale-[1.01] active:scale-[0.98] transition-all px-4"
        >
          <Printer className="h-3.5 w-3.5" />
          <span>Proceed to Print Suite</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Mid-fill Prompt Dialog */}
      <MidFillClassPrompt
        promptState={promptState}
        onConfirm={handlePromptSelectNextClass}
        onCancelLeaveVacant={() => setPromptState(null)}
      />
    </div>
  );
}
