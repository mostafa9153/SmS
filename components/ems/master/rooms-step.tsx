"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ArrowRight, Plus, DoorOpen, Sparkles, Armchair, Edit2, AlertCircle, CheckCircle2, Users, Check, CheckCheck, Building2, Layers, GripVertical, ChevronLeft, ChevronRight } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";

import type { EmsMasterState } from "./use-ems-master";

export function RoomsStep({ ems }: { ems: EmsMasterState }) {
  const { dragJustFinishedRef, dragOverRoomIndex, draggedRoomIndex, handleExecuteAllocation, handleMoveRoom, handleOpenEditRoom, handleOpenNewRoom, handleToggleSelectAllRooms, loading, reorderRooms, rooms, selectedRoomIds, selectedRooms, setDragOverRoomIndex, setDraggedRoomIndex, setRoomsManagerOpen, setStep, setStudentsPerBench, studentsPerBench, toggleRoom, totalBenches, totalDynamicCapacity, totalStudentsExpected } = ems;
  return (
    <div className="rounded-2xl border border-border/80 bg-card p-4 sm:p-5 shadow-xs space-y-4">
      {/* Step 3 Header with Students Per Bench Control */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20 shadow-2xs">
            <Building2 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-bold text-foreground tracking-tight">
              Room Selection & Bench Capacity
            </h2>
          </div>
        </div>

        {/* Students Per Bench Segmented Control */}
        <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-xl border border-border/60">
          <span className="text-[11px] font-semibold text-muted-foreground px-2 flex items-center gap-1 select-none">
            <Armchair className="h-3.5 w-3.5 text-primary" /> Per Bench:
          </span>
          {[1, 2, 3].map((num) => (
            <button
              key={num}
              type="button"
              onClick={() => setStudentsPerBench(num)}
              className={cn(
                "px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer",
                studentsPerBench === num
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-background/50"
              )}
            >
              {num} {num === 1 ? "Seater" : num === 3 ? "Seater (Std)" : "Seater"}
            </button>
          ))}
        </div>
      </div>

      {/* Ultra-Clean Compact Capacity Status Bar */}
      {(() => {
        const accommodatedStudents = Math.min(totalStudentsExpected, totalDynamicCapacity);
        const availableSeats = Math.max(0, totalDynamicCapacity - totalStudentsExpected);
        const deficitStudents = Math.max(0, totalStudentsExpected - totalDynamicCapacity);
        const capacityPercent =
          totalDynamicCapacity > 0
            ? Math.min(100, Math.round((accommodatedStudents / totalDynamicCapacity) * 100))
            : 0;

        return (
          <div className="p-3 sm:p-3.5 rounded-xl border border-border/70 bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-3 sm:gap-4">
              <div className="flex items-center gap-1.5">
                <Users className="h-4 w-4 text-primary" />
                <span className="text-muted-foreground">Candidates:</span>
                <span className="font-bold font-mono text-foreground text-sm">
                  {totalStudentsExpected}
                </span>
              </div>

              <span className="text-muted-foreground/30 hidden sm:inline">•</span>

              <div className="flex items-center gap-1.5">
                <Armchair className="h-4 w-4 text-primary" />
                <span className="text-muted-foreground">Selected Seats:</span>
                <span className="font-bold font-mono text-foreground text-sm">
                  {totalDynamicCapacity}
                </span>
                <span className="text-[11px] text-muted-foreground">
                  ({selectedRooms.length} of {rooms.length} Rooms)
                </span>
              </div>

              <span className="text-muted-foreground/30 hidden sm:inline">•</span>

              <div className="flex items-center gap-1.5">
                <Layers className="h-4 w-4 text-primary" />
                <span className="text-muted-foreground">Benches:</span>
                <span className="font-bold font-mono text-foreground text-sm">
                  {totalBenches}
                </span>
              </div>

              {deficitStudents > 0 ? (
                <Badge variant="destructive" className="text-[11px] font-semibold gap-1 py-0.5">
                  <AlertCircle className="h-3 w-3" /> Short by {deficitStudents} seats
                </Badge>
              ) : (
                <Badge
                  variant="outline"
                  className="text-[11px] font-semibold gap-1 py-0.5 border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                >
                  <CheckCircle2 className="h-3 w-3" /> All Accommodated (+{availableSeats} extra)
                </Badge>
              )}
            </div>

            {/* Compact Progress Indicator */}
            {totalDynamicCapacity > 0 && (
              <div className="w-full sm:w-44 space-y-1 shrink-0">
                <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
                  <span>Occupancy: {capacityPercent}%</span>
                  <span>
                    {accommodatedStudents}/{totalDynamicCapacity}
                  </span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden border border-border/50">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-500",
                      deficitStudents > 0 ? "bg-rose-500" : "bg-primary"
                    )}
                    style={{ width: `${capacityPercent}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* Rooms Selection Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-foreground uppercase tracking-wider">
            Available Examination Rooms
          </span>
          <Badge variant="secondary" className="text-[11px] font-mono font-bold">
            {selectedRoomIds.length} of {rooms.length} Selected
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            type="button"
            variant={selectedRoomIds.length === rooms.length ? "secondary" : "outline"}
            onClick={handleToggleSelectAllRooms}
            className="h-7 text-xs font-semibold gap-1.5 hover:border-primary/40 cursor-pointer"
          >
            <CheckCheck className="h-3.5 w-3.5 text-primary" />
            {selectedRoomIds.length === rooms.length
              ? "Deselect All"
              : `Select All (${rooms.length})`}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setRoomsManagerOpen(true)}
            className="h-7 text-xs font-semibold gap-1 hover:border-primary/40 cursor-pointer"
          >
            <DoorOpen className="h-3.5 w-3.5 text-primary" /> Manage Rooms
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleOpenNewRoom}
            className="h-7 text-xs font-semibold gap-1 text-primary hover:bg-primary/10 cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" /> New Room
          </Button>
        </div>
      </div>

      {/* Room Cards Grid - 100% Clickable, Draggable with Grip & Drop Indicator */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        {rooms.map((room, roomIdx) => {
          const isSelected = selectedRoomIds.includes(room.id);
          const roomBenchCount = room.columns.reduce((sum, c) => sum + c.benchCount, 0);
          const roomDynamicSeats = roomBenchCount * studentsPerBench;
          const isDraggingThis = draggedRoomIndex === roomIdx;
          const isDragOverThis = dragOverRoomIndex === roomIdx;

          return (
            <div
              key={room.id}
              draggable
              onDragStart={(e) => {
                dragJustFinishedRef.current = true;
                e.dataTransfer.setData("text/plain", String(roomIdx));
                e.dataTransfer.effectAllowed = "move";
                setDraggedRoomIndex(roomIdx);
              }}
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
                if (dragOverRoomIndex !== roomIdx) {
                  setDragOverRoomIndex(roomIdx);
                }
              }}
              onDragLeave={() => {
                if (dragOverRoomIndex === roomIdx) {
                  setDragOverRoomIndex(null);
                }
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                const fromIdxStr = e.dataTransfer.getData("text/plain");
                const parsedFrom =
                  fromIdxStr !== "" && !isNaN(parseInt(fromIdxStr, 10))
                    ? parseInt(fromIdxStr, 10)
                    : draggedRoomIndex;
                if (parsedFrom !== null && parsedFrom >= 0 && parsedFrom !== roomIdx) {
                  reorderRooms(parsedFrom, roomIdx);
                }
                setDraggedRoomIndex(null);
                setDragOverRoomIndex(null);
                setTimeout(() => {
                  dragJustFinishedRef.current = false;
                }, 80);
              }}
              onDragEnd={() => {
                setDraggedRoomIndex(null);
                setDragOverRoomIndex(null);
                setTimeout(() => {
                  dragJustFinishedRef.current = false;
                }, 80);
              }}
              onClick={() => {
                if (dragJustFinishedRef.current) return;
                toggleRoom(room.id);
              }}
              className={cn(
                "p-3.5 rounded-2xl border transition-all flex flex-col justify-between gap-3 shadow-2xs cursor-grab active:cursor-grabbing select-none relative group",
                isSelected
                  ? "border-primary bg-primary/[0.04] ring-1 ring-primary/40"
                  : "border-border/70 bg-card hover:border-primary/30 hover:bg-muted/20",
                isDraggingThis && "opacity-40 scale-[0.98] border-dashed border-primary shadow-inner",
                isDragOverThis && "ring-2 ring-primary ring-offset-2 bg-primary/10 border-primary scale-[1.02] shadow-md"
              )}
            >
              {/* Top Row: Sequence Badge with Drag Grip, Room Name, Quick Move Up/Down, Edit Icon, Checkbox */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  {/* Drag Grip Handle */}
                  <div
                    title="Drag to reorder room priority"
                    className="p-1 -ml-1 text-muted-foreground/40 hover:text-foreground cursor-grab active:cursor-grabbing shrink-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <GripVertical className="h-4 w-4" />
                  </div>

                  <span
                    className={cn(
                      "h-6 px-2 rounded-md text-[11px] font-bold font-mono tracking-wider flex items-center justify-center shrink-0 border",
                      isSelected
                        ? "bg-primary text-primary-foreground border-primary shadow-2xs"
                        : "bg-muted text-muted-foreground border-border"
                    )}
                  >
                    #{roomIdx + 1}
                  </span>
                  <div className="min-w-0">
                    <h4 className="font-bold text-xs text-foreground truncate">
                      {room.roomNumber}
                    </h4>
                    {room.floor && (
                      <p className="text-[10px] text-muted-foreground truncate">
                        {room.floor}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {/* Move Up/Down Quick Buttons */}
                  <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      disabled={roomIdx === 0}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMoveRoom(roomIdx, "up");
                      }}
                      className="h-6 w-6 rounded text-muted-foreground/60 hover:text-foreground hover:bg-background flex items-center justify-center transition-all disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed"
                      title="Move room up"
                    >
                      <ChevronLeft className="h-3.5 w-3.5 rotate-90" />
                    </button>
                    <button
                      type="button"
                      disabled={roomIdx === rooms.length - 1}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMoveRoom(roomIdx, "down");
                      }}
                      className="h-6 w-6 rounded text-muted-foreground/60 hover:text-foreground hover:bg-background flex items-center justify-center transition-all disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed"
                      title="Move room down"
                    >
                      <ChevronRight className="h-3.5 w-3.5 rotate-90" />
                    </button>
                  </div>

                  {/* Minimal Edit Icon Button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenEditRoom(room);
                    }}
                    className="h-7 w-7 rounded-lg text-muted-foreground/70 hover:text-foreground hover:bg-background border border-transparent hover:border-border/60 flex items-center justify-center transition-all cursor-pointer"
                    title="Edit Room Layout"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </button>

                  {/* Crisp Checkbox */}
                  <div
                    className={cn(
                      "h-5 w-5 rounded-md border flex items-center justify-center transition-all",
                      isSelected
                        ? "bg-primary border-primary text-primary-foreground shadow-2xs"
                        : "border-muted-foreground/30 bg-background group-hover:border-primary/50"
                    )}
                  >
                    {isSelected && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                  </div>
                </div>
              </div>

              {/* Bottom Row: Columns/Benches & Total Seats */}
              <div className="pt-2 border-t border-border/40 flex items-center justify-between text-[11px]">
                <span className="text-muted-foreground font-medium">
                  {room.columns.length} Columns • {roomBenchCount} Benches
                </span>
                <span className="font-bold font-mono text-xs text-primary">
                  {roomDynamicSeats} Seats{" "}
                  <span className="text-[10px] text-muted-foreground font-normal">
                    ({studentsPerBench}/bench)
                  </span>
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom Execution */}
      <div className="pt-3 border-t border-border/60 flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setStep(2)}
          className="text-xs font-semibold gap-1 cursor-pointer"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back
        </Button>
        <Button
          size="sm"
          onClick={handleExecuteAllocation}
          disabled={loading || selectedRooms.length === 0}
          className="text-xs font-semibold gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground cursor-pointer shadow-sm disabled:opacity-50"
        >
          {loading ? (
            <>
              <Spinner className="h-4 w-4" />
              Preparing Arrangement...
            </>
          ) : (
            <>
              <Sparkles className="h-3.5 w-3.5 text-amber-300" />
              Proceed to Seat Arrangement <ArrowRight className="h-3.5 w-3.5" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
