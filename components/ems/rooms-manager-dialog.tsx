"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DoorOpen,
  Plus,
  Edit2,
  Trash2,
  ChevronUp,
  ChevronDown,
  Zap,
  CheckCircle2,
} from "lucide-react";
import { EmsRoom } from "@/lib/ems/types";
import { calculateRoomCapacity } from "@/lib/ems/room-storage";
import { cn } from "@/lib/utils";

interface RoomsManagerDialogProps {
  isOpen: boolean;
  onClose: () => void;
  rooms: EmsRoom[];
  onAddNewRoom: () => void;
  onEditRoom: (room: EmsRoom) => void;
  onDeleteRoom: (roomId: string) => void;
  onReorderRooms?: (rooms: EmsRoom[]) => void;
}

export function RoomsManagerDialog({
  isOpen,
  onClose,
  rooms,
  onAddNewRoom,
  onEditRoom,
  onDeleteRoom,
  onReorderRooms,
}: RoomsManagerDialogProps) {
  if (!isOpen) return null;

  const safeRooms = Array.isArray(rooms) ? rooms : [];

  const handleDelete = (roomId: string) => {
    if (safeRooms.length <= 1) {
      alert("At least one classroom must remain in the system.");
      return;
    }
    if (confirm("Are you sure you want to delete this room layout?")) {
      onDeleteRoom(roomId);
    }
  };

  const handleMove = (index: number, direction: "up" | "down") => {
    if (!onReorderRooms) return;
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= safeRooms.length) return;
    const updated = [...safeRooms];
    const [moved] = updated.splice(index, 1);
    updated.splice(targetIndex, 0, moved);
    onReorderRooms(updated);
  };

  const handleBoost = (index: number) => {
    if (!onReorderRooms || index === 0) return;
    const updated = [...safeRooms];
    const [moved] = updated.splice(index, 1);
    updated.unshift(moved);
    onReorderRooms(updated);
  };

  const totalSchoolCapacity = safeRooms.reduce(
    (acc, r) => acc + calculateRoomCapacity(r.columns || []),
    0
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl md:max-w-3xl w-[95vw] sm:w-full max-h-[85vh] overflow-y-auto overflow-x-hidden p-5 sm:p-6 border border-border/80 shadow-2xl backdrop-blur-xl bg-card rounded-2xl">
        <DialogHeader className="space-y-1.5 pb-3 border-b border-border/60">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-xl bg-primary/10 text-primary border border-primary/20 shrink-0">
                <DoorOpen className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-base sm:text-lg font-bold flex items-center gap-2">
                  <span>Examination Rooms</span>
                  <Badge variant="secondary" className="text-xs font-mono font-semibold">
                    {safeRooms.length}
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Manage exam rooms, adjust seating layouts, and prioritize room order
                </DialogDescription>
              </div>
            </div>

            <Button
              type="button"
              size="sm"
              onClick={() => {
                onClose();
                onAddNewRoom();
              }}
              className="text-xs font-semibold gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground shrink-0 shadow-xs cursor-pointer"
            >
              <Plus className="h-4 w-4" /> Add Room
            </Button>
          </div>
        </DialogHeader>

        {/* Rooms Grid / List */}
        <div className="py-3 space-y-2.5">
          {safeRooms.length === 0 ? (
            <div className="p-8 text-center border border-dashed rounded-xl space-y-3">
              <DoorOpen className="h-10 w-10 text-muted-foreground mx-auto" />
              <div>
                <h4 className="font-bold text-sm">No Classrooms Configured</h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Click 'Add Room' to configure your first examination room.
                </p>
              </div>
              <Button
                size="sm"
                onClick={() => {
                  onClose();
                  onAddNewRoom();
                }}
                className="text-xs font-semibold gap-1"
              >
                <Plus className="h-3.5 w-3.5" /> Add Room
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {safeRooms.map((room, rIdx) => {
                const totalBenches = (Array.isArray(room.columns) ? room.columns : []).reduce(
                  (sum, c) => sum + (c?.benchCount || 0),
                  0
                );
                const capacity = calculateRoomCapacity(room.columns);

                return (
                  <div
                    key={room.id}
                    className="p-3 sm:p-3.5 rounded-xl border border-border/70 bg-card hover:border-primary/40 hover:bg-muted/15 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs group"
                  >
                    {/* Left: Sequence, Name & Subtitle */}
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="h-6.5 min-w-[28px] px-1.5 rounded-md bg-muted text-muted-foreground font-mono font-bold text-xs flex items-center justify-center border border-border/60 shrink-0">
                        #{rIdx + 1}
                      </span>
                      <div className="min-w-0">
                        <h4 className="font-bold text-xs sm:text-sm text-foreground truncate">
                          {room.roomNumber}
                        </h4>
                        <p className="text-[11px] text-muted-foreground truncate">
                          {(room.columns || []).length} Columns • {totalBenches} Benches
                          {room.floor ? ` • ${room.floor}` : ""}
                          {room.building ? ` • ${room.building}` : ""}
                        </p>
                      </div>
                    </div>

                    {/* Right: Capacity & Actions */}
                    <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                      <span className="text-xs font-mono font-bold text-foreground px-2 py-0.5 rounded-md bg-muted/50 border border-border/50">
                        {capacity} Seats
                      </span>

                      {/* Reorder Buttons */}
                      {onReorderRooms && safeRooms.length > 1 && (
                        <div className="flex items-center gap-0.5 border border-border/60 rounded-lg p-0.5 bg-background">
                          {rIdx > 0 && (
                            <button
                              type="button"
                              onClick={() => handleBoost(rIdx)}
                              className="h-6 px-1.5 rounded text-[10px] font-semibold text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 flex items-center gap-0.5 transition-all cursor-pointer"
                              title="Boost to Priority #1"
                            >
                              <Zap className="h-3 w-3 fill-amber-500" />
                              <span className="hidden sm:inline">Boost</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleMove(rIdx, "up")}
                            disabled={rIdx === 0}
                            className="h-6 w-6 rounded text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center transition-all cursor-pointer"
                            title="Move Up"
                          >
                            <ChevronUp className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMove(rIdx, "down")}
                            disabled={rIdx === safeRooms.length - 1}
                            className="h-6 w-6 rounded text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center transition-all cursor-pointer"
                            title="Move Down"
                          >
                            <ChevronDown className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}

                      {/* Edit Button */}
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onEditRoom(room);
                        }}
                        className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted border border-border/50 flex items-center justify-center transition-all cursor-pointer"
                        title="Edit Layout"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>

                      {/* Delete Button */}
                      {safeRooms.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleDelete(room.id)}
                          className="h-7 w-7 rounded-lg text-muted-foreground/70 hover:text-destructive hover:bg-destructive/10 flex items-center justify-center transition-all cursor-pointer"
                          title="Delete Room"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Summary Footer */}
        <div className="pt-3 border-t border-border/60 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>
              Total School Capacity:{" "}
              <strong className="text-foreground font-mono">{totalSchoolCapacity} Seats</strong>
            </span>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            className="text-xs font-semibold cursor-pointer"
          >
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
