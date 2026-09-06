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
              {rooms.map((room) => {
                const totalBenches = room.columns.reduce((sum, c) => sum + c.benchCount, 0);
                const capacity = calculateRoomCapacity(room.columns);

                return (
                  <div
                    key={room.id}
                    className="p-4 rounded-xl border border-border/80 bg-background hover:border-primary/40 transition-all flex flex-col justify-between gap-3 shadow-2xs"
                  >
                    <div>
                      {/* Room Header */}
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="font-bold text-sm text-foreground flex items-center gap-1.5">
                            <DoorOpen className="h-4 w-4 text-primary shrink-0" />
                            <span>{room.roomNumber}</span>
                          </h4>
                          <div className="flex items-center gap-2 mt-1 text-[11px] text-muted-foreground">
                            {room.floor && (
                              <span className="flex items-center gap-1">
                                <Layers className="h-3 w-3" /> {room.floor}
                              </span>
                            )}
                            {room.building && (
                              <span className="flex items-center gap-1">
                                <Building className="h-3 w-3" /> {room.building}
                              </span>
                            )}
                          </div>
                        </div>

                        <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-[10px] font-mono shrink-0">
                          {capacity} Seats
                        </Badge>
                      </div>

                      {/* Column Breakdown Pills */}
                      <div className="mt-3 pt-2.5 border-t border-border/50">
                        <div className="text-[11px] font-semibold text-muted-foreground mb-1.5 flex items-center justify-between">
                          <span>{room.columns.length} Columns • {totalBenches} Benches</span>
                          <span className="text-primary font-mono text-[10px]">(Standard 2/bench)</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {room.columns.map((c) => (
                            <span
                              key={c.columnIndex}
                              className="px-2 py-0.5 rounded-md bg-muted/60 text-muted-foreground border border-border/50 text-[10px] font-mono font-medium"
                            >
                              C{c.columnIndex}: {c.benchCount}B ({c.benchCount * (c.seatsPerBench || 2)}S)
                            </span>
                          ))}
                        </div>
                      </div>

                      {room.notes && (
                        <p className="text-[11px] text-muted-foreground italic mt-2 line-clamp-1">
                          Note: {room.notes}
                        </p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="pt-2 border-t border-border/50 flex items-center justify-between gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          onClose();
                          onEditRoom(room);
                        }}
                        className="h-7 text-xs font-semibold gap-1 hover:border-primary/40 cursor-pointer flex-1"
                      >
                        <Edit2 className="h-3 w-3 text-primary" /> Edit Layout
                      </Button>

                      {rooms.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(room.id)}
                          className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg cursor-pointer"
                          title="Delete Classroom"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
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
            <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <span>
              Total School Seating Capacity across {rooms.length} rooms:{" "}
              <strong className="text-foreground">{totalSchoolCapacity} Seats</strong>
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
