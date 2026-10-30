"use client";

import { getSavedRooms, deleteRoom } from "@/lib/ems/room-storage";
import { EmsRoom } from "@/lib/ems/types";
import { normalizeClassCode, isHigherSecondaryClass } from "@/lib/ems/seat-arrangement-algorithm";
import { calculateHsStudentStats } from "@/components/ems/auto-allocation-wizard";
import type { EmsCore } from "./use-ems-core";

export function useEmsRoomSetup(ctx: EmsCore) {
  const { allStudents, classGroups, completedSteps, roomClassMap, rooms, selectedRoomIds, setCompletedSteps, setEditingRoom, setEditorOpen, setRoomClassMap, setRooms, setSelectedRoomIds, studentsPerBench } = ctx;
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

  return {
    allRoomsTotalBenches,
    allRoomsTotalCapacity,
    getAssignedClassesForRoom,
    handleDeleteRoom,
    handleOpenEditRoom,
    handleOpenNewRoom,
    handleSelectAllClassesForRoom,
    handleToggleClassForRoom,
    handleToggleSelectAllRooms,
    markStepDone,
    selectedRooms,
    toggleRoom,
    totalBenches,
    totalDynamicCapacity,
    totalStudentsExpected,
    uniqueParticipatingClasses,
  };
}

export type EmsRoomSetup = ReturnType<typeof useEmsRoomSetup>;
