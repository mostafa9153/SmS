"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Armchair, Columns, Sparkles, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { EmsRoom, RoomColumnConfig } from "@/lib/ems/types";
import { calculateRoomCapacity } from "@/lib/ems/room-storage";

interface RoomEditorDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (room: EmsRoom) => void;
  initialRoom?: EmsRoom | null;
}

export function RoomEditorDialog({
  isOpen,
  onClose,
  onSave,
  initialRoom,
}: RoomEditorDialogProps) {
  const [roomNumber, setRoomNumber] = useState("");
  const [floor, setFloor] = useState("");
  const [building, setBuilding] = useState("");
  const [notes, setNotes] = useState("");
  const [columns, setColumns] = useState<RoomColumnConfig[]>([
    { columnIndex: 1, columnLabel: "Column 1", benchCount: 6, seatsPerBench: 3 },
    { columnIndex: 2, columnLabel: "Column 2", benchCount: 5, seatsPerBench: 3 },
    { columnIndex: 3, columnLabel: "Column 3", benchCount: 6, seatsPerBench: 3 },
  ]);

  useEffect(() => {
    if (initialRoom) {
      setRoomNumber(initialRoom.roomNumber);
      setFloor(initialRoom.floor || "");
      setBuilding(initialRoom.building || "");
      setNotes(initialRoom.notes || "");
      setColumns(
        initialRoom.columns.map((c, idx) => ({
          columnIndex: idx + 1,
          columnLabel: c.columnLabel || `Column ${idx + 1}`,
          benchCount: c.benchCount || 5,
          seatsPerBench: c.seatsPerBench || 3,
        }))
      );
    } else {
      setRoomNumber("");
      setFloor("1st Floor");
      setBuilding("Main Building");
      setNotes("");
      setColumns([
        { columnIndex: 1, columnLabel: "Column 1", benchCount: 6, seatsPerBench: 3 },
        { columnIndex: 2, columnLabel: "Column 2", benchCount: 5, seatsPerBench: 3 },
        { columnIndex: 3, columnLabel: "Column 3", benchCount: 6, seatsPerBench: 3 },
      ]);
    }
  }, [initialRoom, isOpen]);

  const updateColumnBenchCount = (index: number, count: number) => {
    const updated = [...columns];
    updated[index].benchCount = Math.max(1, count);
    setColumns(updated);
  };

  const updateColumnLabel = (index: number, label: string) => {
    const updated = [...columns];
    updated[index].columnLabel = label;
    setColumns(updated);
  };

  const updateColumnSeatsPerBench = (index: number, seats: number) => {
    const updated = [...columns];
    updated[index].seatsPerBench = seats;
    setColumns(updated);
  };

  const handleAddColumn = () => {
    const nextIdx = columns.length + 1;
    setColumns([
      ...columns,
      {
        columnIndex: nextIdx,
        columnLabel: `Column ${nextIdx}`,
        benchCount: 6,
        seatsPerBench: 3,
      },
    ]);
  };

  const handleRemoveColumn = (index: number) => {
    if (columns.length <= 1) return;
    const filtered = columns
      .filter((_, i) => i !== index)
      .map((c, i) => ({ ...c, columnIndex: i + 1 }));
    setColumns(filtered);
  };

  const totalCapacity = calculateRoomCapacity(columns);

  const handleSave = () => {
    if (!roomNumber.trim()) return;

    const room: EmsRoom = {
      id: initialRoom?.id || `room-${Date.now()}`,
      roomNumber: roomNumber.trim(),
      floor: floor.trim() || undefined,
      building: building.trim() || undefined,
      notes: notes.trim() || undefined,
      defaultSeatsPerBench: 2,
      columns,
      totalCapacity,
      createdAt: initialRoom?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSave(room);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl md:max-w-3xl w-[95vw] sm:w-full max-h-[88vh] overflow-y-auto overflow-x-hidden p-5 sm:p-6 border border-border/80 shadow-2xl backdrop-blur-xl bg-card rounded-2xl">
        <DialogHeader className="space-y-1 pb-2 border-b border-border/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary/10 text-primary border border-primary/20">
              <Armchair className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base sm:text-lg font-bold">
                {initialRoom ? "Edit Classroom / Hall" : "New Classroom / Hall"}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Configure room layout with custom bench counts per column (supports unequal bench counts)
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2 text-xs">
          {/* Basic Info */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">Room Name *</Label>
              <Input
                placeholder="e.g. Room 101, Hall A"
                value={roomNumber}
                onChange={(e) => setRoomNumber(e.target.value)}
                className="h-9 text-xs rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">Floor</Label>
              <Input
                placeholder="e.g. 1st Floor"
                value={floor}
                onChange={(e) => setFloor(e.target.value)}
                className="h-9 text-xs rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">Building</Label>
              <Input
                placeholder="e.g. Main Academic Block"
                value={building}
                onChange={(e) => setBuilding(e.target.value)}
                className="h-9 text-xs rounded-xl"
              />
            </div>
          </div>

          {/* Column & Bench Configurations */}
          <div className="p-4 rounded-xl border border-border/70 bg-muted/20 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Columns className="h-4 w-4 text-primary" />
                  <span>Column-Wise Bench Configuration</span>
                </h4>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Adjust individual column bench counts to account for doors or pillars
                </p>
              </div>

              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleAddColumn}
                className="h-7 text-xs gap-1 font-semibold hover:border-primary/40 cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" /> Add Column
              </Button>
            </div>

            {/* List of Columns */}
            <div className="space-y-2">
              {columns.map((col, idx) => (
                <div
                  key={col.columnIndex}
                  className="p-3 rounded-xl border border-border/80 bg-background flex flex-wrap items-center justify-between gap-3 shadow-2xs"
                >
                  {/* Column Label */}
                  <div className="flex items-center gap-2">
                    <span className="h-7 w-7 rounded-lg bg-primary/10 text-primary font-bold text-xs flex items-center justify-center shrink-0 font-mono">
                      C{col.columnIndex}
                    </span>
                    <Input
                      value={col.columnLabel}
                      onChange={(e) => updateColumnLabel(idx, e.target.value)}
                      placeholder={`Column ${col.columnIndex}`}
                      className="h-8 text-xs w-32 font-medium rounded-lg"
                    />
                  </div>

                  <div className="flex items-center gap-3 flex-wrap">
                    {/* Benches input */}
                    <div className="flex items-center gap-1.5 text-xs">
                      <span className="text-[11px] text-muted-foreground font-medium">Benches:</span>
                      <Input
                        type="number"
                        min={1}
                        max={30}
                        value={col.benchCount}
                        onChange={(e) => updateColumnBenchCount(idx, parseInt(e.target.value) || 1)}
                        className="h-8 w-16 text-center text-xs font-bold font-mono rounded-lg"
                      />
                    </div>

                    {/* Seats Per Bench Dropdown */}
                    <div className="flex items-center gap-1.5 text-xs">
                      <span className="text-[11px] text-muted-foreground font-medium">Seats/Bench:</span>
                      <div className="relative">
                        <select
                          value={col.seatsPerBench}
                          onChange={(e) => updateColumnSeatsPerBench(idx, parseInt(e.target.value))}
                          className="h-8 pl-2.5 pr-7 text-xs font-semibold rounded-lg border border-input bg-background hover:border-primary/40 focus:ring-2 focus:ring-primary/20 outline-none appearance-none cursor-pointer transition-all shadow-2xs"
                        >
                          <option value={1}>1 Seat / Bench</option>
                          <option value={2}>2 Seats / Bench</option>
                          <option value={3}>3 Seats / Bench</option>
                          <option value={4}>4 Seats / Bench</option>
                        </select>
                        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground absolute right-2 top-2.5 pointer-events-none" />
                      </div>
                    </div>

                    {/* Capacity badge */}
                    <Badge variant="secondary" className="text-xs font-mono h-7 px-2.5 shrink-0">
                      {col.benchCount * col.seatsPerBench} Seats
                    </Badge>

                    {/* Delete Column */}
                    {columns.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveColumn(idx)}
                        className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 flex items-center justify-center rounded-lg transition-colors cursor-pointer"
                        title="Delete Column"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Total Capacity Bar */}
            <div className="pt-2 border-t border-border/40 flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Calculated Room Capacity:</span>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-foreground">{totalCapacity} Seats</span>
                <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-[9px] uppercase font-bold">
                  Ready for Exams
                </Badge>
              </div>
            </div>
          </div>

          {/* Mini Blueprint Preview */}
          <div className="p-3.5 rounded-xl border border-border/60 bg-muted/10 space-y-2">
            <Label className="text-[11px] font-bold text-muted-foreground flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-primary" /> Mini Blueprint Preview:
            </Label>

            <div className="p-3 bg-slate-950/10 dark:bg-slate-950/40 rounded-xl flex flex-col items-center">
              <div className="w-48 h-4 rounded bg-emerald-800 text-[9px] font-bold text-white flex items-center justify-center uppercase tracking-wider mb-2.5 shadow-2xs">
                Blackboard (Front)
              </div>

              <div className="flex items-start justify-center gap-4 flex-wrap">
                {columns.map((c) => (
                  <div key={c.columnIndex} className="flex flex-col items-center gap-1">
                    <span className="text-[9px] font-mono font-bold text-muted-foreground">
                      C{c.columnIndex} ({c.benchCount}B)
                    </span>
                    <div className="space-y-1">
                      {Array.from({ length: c.benchCount }).map((_, bIdx) => (
                        <div
                          key={bIdx}
                          className="h-2.5 px-2 rounded-xs bg-amber-700/70 dark:bg-amber-800/80 flex items-center justify-center gap-1 shadow-2xs"
                          style={{ width: c.seatsPerBench === 3 ? "40px" : c.seatsPerBench === 4 ? "48px" : "32px" }}
                        >
                          {Array.from({ length: c.seatsPerBench }).map((_, sIdx) => (
                            <div key={sIdx} className="h-1.5 w-1.5 rounded-full bg-white/90" />
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0 mt-2 border-t border-border/60 pt-3">
          <Button variant="outline" size="sm" onClick={onClose} className="text-xs font-semibold cursor-pointer">
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={!roomNumber.trim()}
            className="text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground cursor-pointer"
          >
            {initialRoom ? "Update Room" : "Save Room"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
