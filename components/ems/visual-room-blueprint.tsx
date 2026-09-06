"use client";

import React, { useState, useMemo } from "react";
import { AllocatedRoom, SeatAssignment } from "@/lib/ems/types";
import { SeatCard, getClassColorStyle } from "./seat-card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Maximize2,
  Minimize2,
  ArrowLeftRight,
  X,
  DoorOpen,
} from "lucide-react";

interface VisualRoomBlueprintProps {
  room: AllocatedRoom;
  onSwapSeats?: (seat1: SeatAssignment, seat2: SeatAssignment) => void;
  examTitle?: string;
  examType?: string;
}

export function VisualRoomBlueprint({
  room,
  onSwapSeats,
  examType,
}: VisualRoomBlueprintProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClassFilter, setSelectedClassFilter] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [swapSourceSeat, setSwapSourceSeat] = useState<SeatAssignment | null>(null);

  // Group seats by column and then by bench
  const columnData = useMemo(() => {
    return room.columns.map((colConfig) => {
      const colSeats = room.seats.filter((s) => s.columnIndex === colConfig.columnIndex);
      const benches: { benchIndex: number; seats: SeatAssignment[] }[] = [];

      for (let b = 1; b <= colConfig.benchCount; b++) {
        const benchSeats = colSeats
          .filter((s) => s.benchIndex === b)
          .sort((a, b) => a.seatPosition - b.seatPosition);
        benches.push({ benchIndex: b, seats: benchSeats });
      }

      return {
        config: colConfig,
        benches,
      };
    });
  }, [room]);

  // Seat swap handlers
  const handleInitiateSwap = (seat: SeatAssignment) => {
    setSwapSourceSeat(seat);
  };

  const handleCompleteSwap = (targetSeat: SeatAssignment) => {
    if (!swapSourceSeat || swapSourceSeat.seatId === targetSeat.seatId) {
      setSwapSourceSeat(null);
      return;
    }
    if (onSwapSeats) {
      onSwapSeats(swapSourceSeat, targetSeat);
    }
    setSwapSourceSeat(null);
  };

  const cancelSwap = () => {
    setSwapSourceSeat(null);
  };

  const handleZoomIn = () => setZoomLevel((prev) => Math.min(prev + 0.15, 1.6));
  const handleZoomOut = () => setZoomLevel((prev) => Math.max(prev - 0.15, 0.7));
  const handleResetZoom = () => setZoomLevel(1);

  // Seat search match
  const isSeatMatched = (seat: SeatAssignment) => {
    if (seat.isVacant) return false;

    if (selectedClassFilter) {
      const classKey = `${seat.studentClass}-${seat.studentSection || "A"}`;
      if (classKey !== selectedClassFilter && seat.studentClass !== selectedClassFilter) {
        return false;
      }
    }

    if (!searchQuery.trim()) return false;
    const q = searchQuery.trim().toLowerCase();
    const nameMatch = seat.studentName?.toLowerCase().includes(q);
    const rollMatch = seat.studentRoll !== undefined && String(seat.studentRoll).includes(q);

    return Boolean(nameMatch || rollMatch);
  };

  return (
    <div
      className={`relative flex flex-col rounded-2xl border border-border/80 bg-card/60 backdrop-blur-md shadow-xl transition-all duration-300 ${
        isFullscreen ? "fixed inset-0 z-50 rounded-none bg-background p-4 overflow-y-auto" : "p-4 sm:p-6"
      }`}
    >
      {/* Top Clean Header: Room title & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border/60">
        <div className="flex items-center gap-2.5">
          <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <DoorOpen className="h-5 w-5 text-primary" />
            <span>{room.roomNumber}</span>
          </h2>
          {examType && (
            <Badge className="bg-primary/15 text-primary border-primary/20 text-xs font-bold">
              {examType}
            </Badge>
          )}
          <span className="text-xs text-muted-foreground">
            ({room.occupiedSeats}/{room.totalSeats} Seated)
          </span>
        </div>

        {/* Search & Zoom Controls */}
        <div className="flex items-center gap-2">
          <div className="relative w-44 sm:w-52">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search Roll / Name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 text-xs h-8 bg-background/80 rounded-xl"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1 bg-muted/40 p-0.5 rounded-xl border border-border/60">
            <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg" onClick={handleZoomOut} title="Zoom Out">
              <ZoomOut className="h-3.5 w-3.5" />
            </Button>
            <span className="text-[10px] font-mono px-1 font-semibold text-muted-foreground">
              {Math.round(zoomLevel * 100)}%
            </span>
            <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg" onClick={handleZoomIn} title="Zoom In">
              <ZoomIn className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg" onClick={handleResetZoom} title="Reset">
              <RotateCcw className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-lg"
              onClick={() => setIsFullscreen(!isFullscreen)}
              title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
            >
              {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Class Quick Filters (if multiple classes) */}
      {room.classesPresent.length > 1 && (
        <div className="flex items-center gap-1.5 py-2 overflow-x-auto text-xs">
          <Button
            size="sm"
            variant={selectedClassFilter === null ? "default" : "outline"}
            className="h-6 text-xs rounded-md px-2"
            onClick={() => setSelectedClassFilter(null)}
          >
            All
          </Button>
          {room.classesPresent.map((cls) => (
            <Button
              key={cls}
              size="sm"
              variant={selectedClassFilter === cls ? "default" : "outline"}
              className="h-6 text-xs rounded-md px-2 font-semibold"
              onClick={() => setSelectedClassFilter(selectedClassFilter === cls ? null : cls)}
            >
              Class {cls}
            </Button>
          ))}
        </div>
      )}

      {/* Swap Mode Banner */}
      {swapSourceSeat && (
        <div className="my-2 p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/40 flex items-center justify-between text-xs text-amber-900 dark:text-amber-200">
          <span>
            Click on another seat to swap with <strong>Roll {swapSourceSeat.studentRoll}</strong>
          </span>
          <Button size="sm" variant="ghost" onClick={cancelSwap} className="h-6 px-2 text-xs">
            <X className="h-3 w-3 mr-1" /> Cancel
          </Button>
        </div>
      )}

      {/* Canvas / 2D Seating Floor Plan */}
      <div className="relative overflow-x-auto overflow-y-auto p-4 sm:p-6 bg-slate-950/5 dark:bg-slate-950/40 rounded-2xl border border-border/50 min-h-[440px] flex justify-center">
        <div
          style={{ transform: `scale(${zoomLevel})`, transformOrigin: "top center" }}
          className="transition-transform duration-150 flex flex-col items-center min-w-max px-4 py-2"
        >
          {/* ======================================================== */}
          {/* FRONT: BLACKBOARD                                        */}
          {/* ======================================================== */}
          <div className="w-full max-w-xl mb-7 flex flex-col items-center">
            <div className="w-full bg-slate-900 dark:bg-slate-950 text-white py-2 px-6 rounded-xl shadow-md border border-border text-center">
              <span className="text-xs font-mono font-bold tracking-widest text-emerald-300 uppercase">
                ⬛ BLACKBOARD (FRONT)
              </span>
            </div>
          </div>

          {/* ======================================================== */}
          {/* COLUMNS & BENCHES                                        */}
          {/* ======================================================== */}
          <div className="flex flex-row justify-center items-start gap-6 sm:gap-8 min-w-full">
            {columnData.map((col, cIdx) => (
              <React.Fragment key={col.config.columnIndex}>
                {/* Column */}
                <div className="flex flex-col items-center space-y-3 shrink-0">
                  {/* Column Header */}
                  <div className="w-full text-center py-1.5 px-3 rounded-lg bg-muted/40 border border-border/70 shadow-2xs">
                    <span className="text-xs font-bold text-foreground tracking-wide">
                      {col.config.columnLabel || `Column ${col.config.columnIndex}`}
                    </span>
                  </div>

                  {/* Benches */}
                  <div className="space-y-3 flex flex-col items-center w-full">
                    {col.benches.map((bench) => (
                      <div
                        key={bench.benchIndex}
                        className="flex flex-col items-center bg-card/90 dark:bg-card/50 rounded-xl p-2 sm:p-2.5 border border-border/70 shadow-2xs w-fit min-w-full transition-all"
                      >
                        {/* Bench Desk Bar: Matches full width of seats */}
                        <div className="w-full h-2 rounded-t-md bg-gradient-to-r from-amber-700 via-amber-600 to-amber-800 dark:from-amber-800 dark:to-amber-900 shadow-2xs mb-2" />

                        {/* Seats Row */}
                        <div className="flex items-center justify-center gap-1.5 sm:gap-2">
                          {bench.seats.map((seat) => (
                            <SeatCard
                              key={seat.seatId}
                              seat={seat}
                              isSearchMatch={isSeatMatched(seat)}
                              isSwapSource={swapSourceSeat?.seatId === seat.seatId}
                              swapModeActive={Boolean(swapSourceSeat)}
                              onInitiateSwap={handleInitiateSwap}
                              onCompleteSwap={handleCompleteSwap}
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Subtle Aisle Divider between columns */}
                {cIdx < columnData.length - 1 && (
                  <div className="flex flex-col items-center self-stretch justify-center px-1 shrink-0">
                    <div className="h-full w-px border-r border-dashed border-border/60" />
                    <span className="text-[9px] font-mono text-muted-foreground/60 uppercase tracking-widest my-3 select-none">
                      Aisle
                    </span>
                    <div className="h-full w-px border-r border-dashed border-border/60" />
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>

          {/* ======================================================== */}
          {/* REAR: DOOR                                               */}
          {/* ======================================================== */}
          <div className="w-full max-w-sm mt-10 mb-2 flex flex-col items-center">
            <div className="w-full py-1.5 px-4 rounded-lg border border-dashed border-border bg-muted/20 text-muted-foreground text-center text-xs font-mono">
              🚪 REAR ENTRANCE / EXIT
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
