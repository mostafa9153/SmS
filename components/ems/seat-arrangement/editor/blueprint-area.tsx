"use client";

import { VisualRoomBlueprint } from "@/components/ems/visual-room-blueprint";
import { Armchair } from "lucide-react";

import type { SeatEditorState } from "./use-seat-arrangement-editor";

export function BlueprintArea({ seat }: { seat: SeatEditorState }) {
  const { academicYear, activeAllocation, examType, handleSeatSwap } = seat;
  return (
    <>
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
    </>
  );
}
