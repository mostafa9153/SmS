"use client";

import type { SeatArrangementEditorProps } from "@/components/ems/seat-arrangement/editor/props";
import { MidFillClassPrompt } from "./mid-fill-class-prompt";

import { RoomConfigPanel } from "@/components/ems/seat-arrangement/editor/room-config-panel";
import { RoomTabBar } from "@/components/ems/seat-arrangement/editor/room-tab-bar";
import { BlueprintArea } from "@/components/ems/seat-arrangement/editor/blueprint-area";
import { StepNavigation } from "@/components/ems/seat-arrangement/editor/step-navigation";
import { useSeatArrangementEditor } from "@/components/ems/seat-arrangement/editor/use-seat-arrangement-editor";

export function SeatArrangementEditor(props: SeatArrangementEditorProps) {
  const seat = useSeatArrangementEditor(props);
  const { handlePromptSelectNextClass, promptState, setPromptState } = seat;

  return (
    <div className="space-y-4">
      {/* ──────────────────────────────────────────────────────────── */}
      {/* ROOM CONFIGURATION PANEL: Algorithm & Column Assignments     */}
      {/* ──────────────────────────────────────────────────────────── */}
      <RoomConfigPanel seat={seat} />

      {/* ──────────────────────────────────────────────────────────── */}
      {/* ROOM SELECTOR SEGMENTED TAB BAR (Positioned Before Room)     */}
      {/* ──────────────────────────────────────────────────────────── */}
      <RoomTabBar seat={seat} />

      {/* ──────────────────────────────────────────────────────────── */}
      {/* LIVE 2D BLUEPRINT WITH CLICK-TO-SWAP                         */}
      {/* ──────────────────────────────────────────────────────────── */}
      <BlueprintArea seat={seat} />

      {/* ──────────────────────────────────────────────────────────── */}
      {/* BOTTOM STEP NAVIGATION                                       */}
      {/* ──────────────────────────────────────────────────────────── */}
      <StepNavigation seat={seat} />

      {/* Mid-fill Prompt Dialog */}
      <MidFillClassPrompt
        promptState={promptState}
        onConfirm={handlePromptSelectNextClass}
        onCancelLeaveVacant={() => setPromptState(null)}
      />
    </div>
  );
}
