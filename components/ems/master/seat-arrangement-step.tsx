"use client";

import { SeatArrangementEditor } from "@/components/ems/seat-arrangement/seat-arrangement-editor";

import type { EmsMasterState } from "./use-ems-master";

export function SeatArrangementStep({ ems }: { ems: EmsMasterState }) {
  const { academicYear, allStudents, classes, examStartTime, examType, generatedAllocation, handleCommitArrangement, roomClassMap, rooms, routinesByClass, selectedRooms, setStep, studentsPerBench } = ems;
  return (
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
      routinesByClass={routinesByClass || generatedAllocation?.routinesByClass}
      examStartTime={examStartTime || generatedAllocation?.examStartTime}
    />
  );
}
