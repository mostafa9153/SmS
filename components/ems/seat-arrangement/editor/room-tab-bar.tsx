"use client";

import { Badge } from "@/components/ui/badge";
import { DoorOpen } from "lucide-react";
import { cn } from "@/lib/utils";

import type { SeatEditorState } from "./use-seat-arrangement-editor";

export function RoomTabBar({ seat }: { seat: SeatEditorState }) {
  const { activeRoomId, effectiveRooms, roomAllocations, setActiveRoomId, setApplyScope } = seat;
  return (
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
            onClick={() => {
              setActiveRoomId(room.id);
              setApplyScope("SINGLE_ROOM");
            }}
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
  );
}
