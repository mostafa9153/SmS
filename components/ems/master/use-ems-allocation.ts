"use client";

import { toast } from "sonner";
import { saveAllocation, getSavedAllocations, saveActiveAllocation, updateSeatSwap } from "@/lib/ems/room-storage";
import { fetchContinuingStudents, generateAutoAllocation } from "@/lib/ems/allocation-engine";
import { Student } from "@/lib/types";
import { AutoAllocationConfig, ExamAllocation, SeatAssignment } from "@/lib/ems/types";
import { normalizeClassCode, checkMissingHsRegistrationNos } from "@/lib/ems/seat-arrangement-algorithm";
import { buildClassGroupConfig, sortClassGroups } from "@/components/ems/master/class-groups";
import type { EmsCore } from "./use-ems-core";
import type { EmsRoomSetup } from "./use-ems-room-setup";

export function useEmsAllocation(ctx: EmsCore & EmsRoomSetup) {
  const { academicYear, activeBlueprintRoomId, allRoomsTotalCapacity, allStudents, classes, examStartTime, examType, generatedAllocation, markStepDone, mismatchReport, pendingAllocation, roomClassMap, rooms, routinesByClass, selectedClasses, selectedRoomIds, selectedRooms, setActiveBlueprintRoomId, setClassGroups, setGeneratedAllocation, setLoading, setMismatchModalOpen, setMismatchReport, setMissingHsList, setMissingHsModalOpen, setPendingAllocation, setPendingHsProceedAction, setSavedAllocations, setSelectedRoomIds, setStep, studentsPerBench, totalDynamicCapacity, totalStudentsExpected } = ctx;
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
    activeBlueprintRoom,
    finishAllocation,
    handleCommitArrangement,
    handleExecuteAllocation,
    handleProceedFromStep1,
    handleProceedFromStep2,
    handleProceedWithMismatch,
    handleSwapSeats,
  };
}