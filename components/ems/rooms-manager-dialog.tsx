"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DoorOpen,
  Plus,
  Edit2,
  Trash2,
  Armchair,
  Layers,
  Building,
  CheckCircle2,
} from "lucide-react";
import { EmsRoom } from "@/lib/ems/types";
import { calculateRoomCapacity } from "@/lib/ems/room-storage";

interface RoomsManagerDialogProps {
  isOpen: boolean;
  onClose: () => void;
  rooms: EmsRoom[];
  onAddNewRoom: () => void;
  onEditRoom: (room: EmsRoom) => void;
  onDeleteRoom: (roomId: string) => void;
}

export function RoomsManagerDialog({
  isOpen,
  onClose,
  rooms,
  onAddNewRoom,
  onEditRoom,
  onDeleteRoom,
}: RoomsManagerDialogProps) {
  if (!isOpen) return null;

  const [deletingRoomId, setDeletingRoomId] = useState<string | null>(null);

  const handleDelete = (roomId: string) => {
    if (rooms.length <= 1) {
      alert("At least one classroom must remain in the system.");
      return;
    }
    if (confirm("Are you sure you want to delete this room layout?")) {
      onDeleteRoom(roomId);
    }
  };

  const totalSchoolCapacity = rooms.reduce(
    (acc, r) => acc + calculateRoomCapacity(r.columns),
    0
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl md:max-w-3xl w-[95vw] sm:w-full max-h-[85vh] overflow-y-auto overflow-x-hidden p-5 sm:p-6 border border-border/80 shadow-2xl backdrop-blur-xl bg-card rounded-2xl">
        <DialogHeader className="space-y-1.5 pb-2 border-b border-border/60">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-xl bg-primary/10 text-primary border border-primary/20 shrink-0">
                <DoorOpen className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-base sm:text-lg font-bold flex items-center gap-2">
                  <span>Classrooms & Examination Halls</span>
                  <Badge variant="secondary" className="text-xs font-mono">
                    {rooms.length} Rooms
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  View all examination rooms, add new halls, or customize column and bench layouts
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
              <Plus className="h-4 w-4" /> Add New Room
            </Button>
          </div>
        </DialogHeader>

        {/* Rooms Grid / List */}
        <div className="py-3 space-y-3">
          {rooms.length === 0 ? (
            <div className="p-8 text-center border border-dashed rounded-xl space-y-3">
              <DoorOpen className="h-10 w-10 text-muted-foreground mx-auto" />
              <div>
                <h4 className="font-bold text-sm">No Classrooms Configured</h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Click 'Add New Room' to configure your first examination room.
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
                <Plus className="h-3.5 w-3.5" /> Add Classroom
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {rooms.map((room, rIdx) => {
                const totalBenches = room.columns.reduce((sum, c) => sum + c.benchCount, 0);
                const capacity = calculateRoomCapacity(room.columns);

                return (
                  <div
                    key={room.id}
                    className="p-3.5 rounded-2xl border border-border/70 bg-card hover:border-primary/40 hover:bg-muted/15 transition-all flex flex-col justify-between gap-2.5 shadow-2xs group"
                  >
                    {/* Top Row: Sequence Badge, Room Name, Location & Action Buttons */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="h-6 px-2 rounded-md bg-primary/10 text-primary font-mono font-bold text-xs flex items-center justify-center border border-primary/20 shrink-0">
                            #{rIdx + 1}
                          </span>
                          <h4 className="font-bold text-xs sm:text-sm text-foreground truncate">
                            {room.roomNumber}
                          </h4>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 mt-1 text-[11px] text-muted-foreground">
                          {room.floor && (
                            <span className="flex items-center gap-1">
                              <Layers className="h-3 w-3 text-muted-foreground/70" /> {room.floor}
                            </span>
                          )}
                          {room.building && (
                            <span className="flex items-center gap-1">
                              <Building className="h-3 w-3 text-muted-foreground/70" /> {room.building}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Right: Minimalist Edit & Delete Actions */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            onClose();
                            onEditRoom(room);
                          }}
                          className="h-7 w-7 rounded-lg text-muted-foreground/70 hover:text-foreground hover:bg-background border border-transparent hover:border-border/60 flex items-center justify-center transition-all cursor-pointer"
                          title="Edit Room Layout"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>

                        {rooms.length > 1 && (
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

                    {/* Bottom Row: Columns/Benches Summary & Capacity Badge */}
                    <div className="pt-2 border-t border-border/40 flex items-center justify-between text-[11px]">
                      <span className="text-muted-foreground font-medium">
                        {room.columns.length} Columns • {totalBenches} Benches
                      </span>
                      <Badge
                        variant="outline"
                        className="text-[11px] font-mono font-bold border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 py-0.5 px-2"
                      >
                        {capacity} Seats
                      </Badge>
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
              Total School Capacity across {rooms.length} rooms:{" "}
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
