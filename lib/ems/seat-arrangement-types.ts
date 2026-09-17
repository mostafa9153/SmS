// EMS Seat Arrangement Types — UE (Even) and UU (Uneven) Models
import { AllocatedRoom, SeatAssignment, EmsRoom, AutoAllocationClassInput } from "./types";
import { Student } from "@/lib/types";

export type ArrangementPattern = "INTERLEAVED" | "FIXED_U" | "UE" | "UU";

export type FillDirection = "top-to-bottom" | "bottom-to-top";

export interface SeatArrangementMetadata {
  pattern: ArrangementPattern;
  fillDirection: FillDirection;
  sequenceIndex: number; // 1-based index within the current class fill thread
  classCode: string;
  sectionCode?: string;
  threadId: string; // Identifier for the continuous fill thread
}

export interface ColumnClassAllocationConfig {
  columnIndex: number;
  // Per-seat class assignment (granular control)
  s1ClassCode: string;        // Left Outer seat class (S1)
  s2ClassCode: string;        // Center seat class (S2)
  s3MirrorS1: boolean;        // If true, S3 uses the same class as S1 (default: true)
  s3ClassCode?: string;       // Right Outer seat class — only used when s3MirrorS1 = false
  overflowClassCode?: string; // When outer class runs out, continue with this class (per-column)
  // Backward-compat aliases (derived from s1/s2 for legacy algorithm paths)
  assignedClassCode: string;  // = s1ClassCode
  assignedSection?: string;
  secondaryClassCode?: string; // = s2ClassCode
}

export interface RoomArrangementConfig {
  roomId: string;
  pattern: ArrangementPattern; // "UE" | "UU"
  columnAssignments: ColumnClassAllocationConfig[];
  startDirection: FillDirection; // Default "top-to-bottom"
}

export interface ArrangementPromptState {
  isOpen: boolean;
  type: "CLASS_EXHAUSTED" | "ROOM_OVERFLOW";
  roomId: string;
  roomNumber: string;
  currentClass: string;
  exhaustedRoll?: number;
  columnIndex: number;
  benchIndex: number;
  seatPosition: number;
  availableClasses: {
    classCode: string;
    section?: string;
    remainingCount: number;
    displayName: string;
  }[];
  onSelectNextClass?: (selectedClassCode: string) => void;
}

export interface ArrangementHistoryEntry {
  rooms: AllocatedRoom[];
  configs: Record<string, RoomArrangementConfig>;
  activeRoomId: string;
  timestamp: number;
}
