"use client";

import React, { useState } from "react";
import { RoomColumnConfig } from "@/lib/ems/types";
import { ColumnClassAllocationConfig, ArrangementPattern } from "@/lib/ems/seat-arrangement-types";
import { CustomSelect, CustomSelectOption } from "@/components/ui/custom-select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ArrowLeftRight,
  Columns,
  Sparkles,
  Copy,
  ArrowDown,
  ArrowUp,
  Settings2,
  Link2,
  Unlink2,
  Layers,
  Armchair,
  HelpCircle,
} from "lucide-react";
import { getClassColorStyle } from "../seat-card";
import { cn } from "@/lib/utils";

export interface AvailableClassOption {
  code: string;
  name: string;
  count?: number;
}

interface ColumnClassAssignerProps {
  columns: RoomColumnConfig[];
  availableClasses: AvailableClassOption[];
  columnAssignments: ColumnClassAllocationConfig[];
  onAssignmentChange: (
    columnIndex: number,
    primaryOrUpdates: string | Partial<ColumnClassAllocationConfig>,
    secondaryClass?: string
  ) => void;
  onApplyToAllRooms?: () => void;
  pattern: ArrangementPattern;
  disabled?: boolean;
}

export function ColumnClassAssigner({
  columns,
  availableClasses,
  columnAssignments,
  onAssignmentChange,
  onApplyToAllRooms,
  pattern,
  disabled = false,
}: ColumnClassAssignerProps) {
  // Track open state of advanced settings per column
  const [openAdvancedMap, setOpenAdvancedMap] = useState<Record<number, boolean>>({});

  const toggleAdvanced = (colIndex: number) => {
    setOpenAdvancedMap((prev) => ({
      ...prev,
      [colIndex]: !prev[colIndex],
    }));
  };

  const classSelectOptions: CustomSelectOption[] = [
    { value: "", label: "Select Class" },
    ...availableClasses.map((c) => ({
      value: c.code,
      label: c.name || `Class ${c.code}${c.count !== undefined ? ` (${c.count})` : ""}`,
    })),
  ];

  const overflowSelectOptions: CustomSelectOption[] = [
    { value: "", label: "Auto (Next Class)" },
    ...availableClasses.map((c) => ({
      value: c.code,
      label: c.name || `Class ${c.code}`,
    })),
  ];

  // Helper to update a column configuration cleanly
  const updateColumnConfig = (
    columnIndex: number,
    updates: Partial<ColumnClassAllocationConfig>
  ) => {
    onAssignmentChange(columnIndex, updates);
  };

  // Quick helper: Alternate classes across columns (A-B-A-B...)
  const handleAutoAlternate = () => {
    if (availableClasses.length === 0) return;
    const c1 = availableClasses[0]?.code || "";
    const c2 = availableClasses[1]?.code || c1;

    columns.forEach((col, idx) => {
      const s1 = idx % 2 === 0 ? c1 : c2;
      const s2 = idx % 2 === 0 ? c2 : c1;
      updateColumnConfig(col.columnIndex, {
        s1ClassCode: s1,
        s2ClassCode: s2,
        s3MirrorS1: true,
        s3ClassCode: s1,
        assignedClassCode: s1,
        secondaryClassCode: s2,
      });
    });
  };

  // Quick helper: Sync all columns to Fixed U standard (S1/S3: c1, S2: c2)
  const handleSyncFixedU = () => {
    if (availableClasses.length === 0) return;
    const c1 = availableClasses[0]?.code || "";
    const c2 = availableClasses[1]?.code || c1;

    columns.forEach((col) => {
      updateColumnConfig(col.columnIndex, {
        s1ClassCode: c1,
        s2ClassCode: c2,
        s3MirrorS1: true,
        s3ClassCode: c1,
        assignedClassCode: c1,
        secondaryClassCode: c2,
      });
    });
  };

  // Helper to quickly swap S1 and S2 in a column
  const handleSwapSeats = (
    columnIndex: number,
    s1Class: string,
    s2Class: string,
    s3MirrorS1: boolean
  ) => {
    updateColumnConfig(columnIndex, {
      s1ClassCode: s2Class,
      s2ClassCode: s1Class,
      assignedClassCode: s2Class,
      secondaryClassCode: s1Class,
      s3ClassCode: s3MirrorS1 ? s2Class : undefined,
    });
  };

  return (
    <div className="relative z-20 space-y-3.5">
      {/* Top Header & Actions Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold">
            <Columns className="h-4 w-4" />
          </div>
          <span className="text-xs font-bold uppercase tracking-wider text-foreground">
            Column & Seat Classes
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {availableClasses.length >= 2 && !disabled && (
            <>
              {pattern === "FIXED_U" ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleSyncFixedU}
                  className="h-8 text-xs font-semibold gap-1.5 text-primary hover:text-primary cursor-pointer border-primary/30 hover:bg-primary/5 shadow-2xs transition-all hover:scale-[1.01]"
                >
                  <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                  <span>Sync All (Outer: {availableClasses[0]?.code} / Mid: {availableClasses[1]?.code})</span>
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAutoAlternate}
                  className="h-8 text-xs font-semibold gap-1.5 text-primary hover:text-primary cursor-pointer border-primary/30 hover:bg-primary/5 shadow-2xs transition-all hover:scale-[1.01]"
                >
                  <ArrowLeftRight className="h-3.5 w-3.5" />
                  <span>Auto-Alternate (A-B-A)</span>
                </Button>
              )}
            </>
          )}

          {onApplyToAllRooms && !disabled && (
            <Button
              type="button"
              size="sm"
              onClick={onApplyToAllRooms}
              className="h-8 text-xs font-bold gap-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white cursor-pointer shadow-xs px-3 transition-all hover:scale-[1.01]"
              title="Apply this room's configuration to all examination rooms"
            >
              <Copy className="h-3.5 w-3.5" />
              <span>Apply to All Rooms</span>
            </Button>
          )}
        </div>
      </div>

      {/* Visual Bench Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {columns.map((col) => {
          const currentConfig = columnAssignments.find((c) => c.columnIndex === col.columnIndex);

          const s1Class = currentConfig?.s1ClassCode || currentConfig?.assignedClassCode || "";
          const s2Class = currentConfig?.s2ClassCode || currentConfig?.secondaryClassCode || "";
          const s3MirrorS1 = currentConfig?.s3MirrorS1 !== false;
          const s3Class = s3MirrorS1 ? s1Class : (currentConfig?.s3ClassCode || s1Class);
          const overflowClass = currentConfig?.overflowClassCode || "";

          const seatsPerBench = col.seatsPerBench || 2;
          const isThreeSeat = seatsPerBench >= 3;
          const capacity = col.benchCount * seatsPerBench;
          const isAdvancedOpen = !!openAdvancedMap[col.columnIndex] || !!overflowClass;

          // Seat Directions (Default is "top-to-bottom")
          const s1Dir = currentConfig?.seatDirections?.[1] || "top-to-bottom";
          const s2Dir = currentConfig?.seatDirections?.[2] || "top-to-bottom";
          const s3Dir = currentConfig?.seatDirections?.[3] || "top-to-bottom";

          const s1Style = getClassColorStyle(s1Class);

          return (
            <div
              key={col.columnIndex}
              className={cn(
                "relative focus-within:z-30 p-4 rounded-2xl border-2 transition-all space-y-3.5 shadow-xs bg-card/95 backdrop-blur-xs",
                s1Style ? s1Style.border : "border-border/80"
              )}
            >
              {/* Column Header */}
              <div className="flex items-center justify-between gap-2 border-b border-border/50 pb-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Layers className="h-4 w-4 text-primary" />
                    <h5 className="text-xs font-bold text-foreground tracking-tight truncate">
                      {col.columnLabel || `Column ${col.columnIndex}`}
                    </h5>
                  </div>
                  <Badge variant="secondary" className="text-[11px] font-mono font-medium px-2 py-0.5 h-5 shrink-0">
                    {col.benchCount} Benches • {capacity} Seats ({seatsPerBench}/bench)
                  </Badge>
                </div>

                {/* Quick Action Tools */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    title="Swap S1 & S2 classes"
                    onClick={() => handleSwapSeats(col.columnIndex, s1Class, s2Class, s3MirrorS1)}
                    disabled={disabled}
                    className="h-7 px-2.5 text-[11px] font-semibold text-muted-foreground hover:text-foreground gap-1.5 cursor-pointer border-border/70 hover:bg-muted/70"
                  >
                    <ArrowLeftRight className="h-3 w-3" />
                    <span>Swap</span>
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    title="Advanced column rules (Overflow class)"
                    onClick={() => toggleAdvanced(col.columnIndex)}
                    className={cn(
                      "h-7 w-7 p-0 cursor-pointer border transition-colors",
                      isAdvancedOpen
                        ? "bg-primary/15 text-primary border-primary/40 hover:bg-primary/20"
                        : "text-muted-foreground hover:text-foreground border-border/70 hover:bg-muted/70"
                    )}
                  >
                    <Settings2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              {/* Visual Bench Layout: Side-by-Side Seat Slots */}
              <div className="p-3 rounded-xl bg-muted/30 dark:bg-muted/20 border border-border/50 space-y-2.5">
                <div
                  className={cn(
                    "grid gap-2.5",
                    isThreeSeat ? "grid-cols-1 sm:grid-cols-3" : "grid-cols-2"
                  )}
                >
                  {/* ────────────────── SEAT 1 (LEFT) ────────────────── */}
                  <div className="p-2.5 rounded-xl bg-background border border-border/70 space-y-2 shadow-2xs">
                    <div className="flex items-center justify-between gap-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-blue-500 ring-2 ring-blue-500/20" />
                        <span className="text-xs font-bold text-foreground truncate" title="Seat 1 (Left)">
                          S1 (Left)
                        </span>
                      </div>

                      {/* S1 Direction Toggle Button */}
                      <button
                        type="button"
                        disabled={disabled}
                        title={s1Dir === "bottom-to-top" ? "Filling: Back to Front (Row N → 1)" : "Filling: Front to Back (Row 1 → N)"}
                        onClick={() => {
                          updateColumnConfig(col.columnIndex, {
                            seatDirections: {
                              ...currentConfig?.seatDirections,
                              1: s1Dir === "top-to-bottom" ? "bottom-to-top" : "top-to-bottom",
                            },
                          });
                        }}
                        className={cn(
                          "shrink-0 h-6 w-6 rounded-md flex items-center justify-center transition-all cursor-pointer border shadow-2xs",
                          s1Dir === "bottom-to-top"
                            ? "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/30 hover:bg-indigo-500/25"
                            : "bg-muted/80 text-muted-foreground hover:text-foreground border-border/60 hover:bg-muted"
                        )}
                      >
                        {s1Dir === "bottom-to-top" ? (
                          <ArrowUp className="h-3 w-3 text-indigo-600 dark:text-indigo-400" />
                        ) : (
                          <ArrowDown className="h-3 w-3 text-primary" />
                        )}
                      </button>
                    </div>

                    <CustomSelect
                      value={s1Class}
                      onChange={(val) => {
                        updateColumnConfig(col.columnIndex, {
                          s1ClassCode: val,
                          assignedClassCode: val,
                          ...(s3MirrorS1 ? { s3ClassCode: val } : {}),
                        });
                      }}
                      options={classSelectOptions}
                      placeholder="Select Class"
                      className="text-xs"
                      triggerClassName="h-8.5 text-xs px-2.5 font-medium"
                      dropdownClassName="w-full min-w-full z-[100] shadow-xl rounded-xl"
                      disabled={disabled}
                    />
                  </div>

                  {/* ────────────────── SEAT 2 (CENTER / RIGHT) ────────────────── */}
                  <div className="p-2.5 rounded-xl bg-background border border-border/70 space-y-2 shadow-2xs">
                    <div className="flex items-center justify-between gap-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-amber-500 ring-2 ring-amber-500/20" />
                        <span className="text-xs font-bold text-foreground truncate" title={isThreeSeat ? "Seat 2 (Center)" : "Seat 2 (Right)"}>
                          {isThreeSeat ? "S2 (Center)" : "S2 (Right)"}
                        </span>
                      </div>

                      {/* S2 Direction Toggle Button */}
                      <button
                        type="button"
                        disabled={disabled}
                        title={s2Dir === "bottom-to-top" ? "Filling: Back to Front (Row N → 1)" : "Filling: Front to Back (Row 1 → N)"}
                        onClick={() => {
                          updateColumnConfig(col.columnIndex, {
                            seatDirections: {
                              ...currentConfig?.seatDirections,
                              2: s2Dir === "top-to-bottom" ? "bottom-to-top" : "top-to-bottom",
                            },
                          });
                        }}
                        className={cn(
                          "shrink-0 h-6 w-6 rounded-md flex items-center justify-center transition-all cursor-pointer border shadow-2xs",
                          s2Dir === "bottom-to-top"
                            ? "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/30 hover:bg-indigo-500/25"
                            : "bg-muted/80 text-muted-foreground hover:text-foreground border-border/60 hover:bg-muted"
                        )}
                      >
                        {s2Dir === "bottom-to-top" ? (
                          <ArrowUp className="h-3 w-3 text-indigo-600 dark:text-indigo-400" />
                        ) : (
                          <ArrowDown className="h-3 w-3 text-primary" />
                        )}
                      </button>
                    </div>

                    <CustomSelect
                      value={s2Class}
                      onChange={(val) => {
                        updateColumnConfig(col.columnIndex, {
                          s2ClassCode: val,
                          secondaryClassCode: val,
                        });
                      }}
                      options={classSelectOptions}
                      placeholder="Select Class"
                      className="text-xs"
                      triggerClassName="h-8.5 text-xs px-2.5 font-medium"
                      dropdownClassName="w-full min-w-full z-[100] shadow-xl rounded-xl"
                      disabled={disabled}
                    />
                  </div>

                  {/* ────────────────── SEAT 3 (RIGHT - 3 SEATS ONLY) ────────────────── */}
                  {isThreeSeat && (
                    <div className="p-2.5 rounded-xl bg-background border border-border/70 space-y-2 shadow-2xs">
                      <div className="flex items-center justify-between gap-1">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-purple-500 ring-2 ring-purple-500/20" />
                          <span className="text-xs font-bold text-foreground truncate" title="Seat 3 (Right)">
                            S3 (Right)
                          </span>
                        </div>

                        {/* Controls (Relink when custom + Direction Toggle) */}
                        <div className="flex items-center gap-1 shrink-0">
                          {!s3MirrorS1 && (
                            <button
                              type="button"
                              title="Link back to Seat 1"
                              onClick={() => {
                                updateColumnConfig(col.columnIndex, {
                                  s3MirrorS1: true,
                                  s3ClassCode: s1Class,
                                });
                              }}
                              className="h-6 w-6 rounded-md flex items-center justify-center bg-purple-500/10 text-purple-600 hover:bg-purple-500/20 border border-purple-300 dark:border-purple-800 transition-all cursor-pointer"
                            >
                              <Link2 className="h-3 w-3" />
                            </button>
                          )}

                          <button
                            type="button"
                            disabled={disabled}
                            title={s3Dir === "bottom-to-top" ? "Filling: Back to Front (Row N → 1)" : "Filling: Front to Back (Row 1 → N)"}
                            onClick={() => {
                              updateColumnConfig(col.columnIndex, {
                                seatDirections: {
                                  ...currentConfig?.seatDirections,
                                  3: s3Dir === "top-to-bottom" ? "bottom-to-top" : "top-to-bottom",
                                },
                              });
                            }}
                            className={cn(
                              "h-6 w-6 rounded-md flex items-center justify-center transition-all cursor-pointer border shadow-2xs",
                              s3Dir === "bottom-to-top"
                                ? "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/30 hover:bg-indigo-500/25"
                                : "bg-muted/80 text-muted-foreground hover:text-foreground border-border/60 hover:bg-muted"
                            )}
                          >
                            {s3Dir === "bottom-to-top" ? (
                              <ArrowUp className="h-3 w-3 text-indigo-600 dark:text-indigo-400" />
                            ) : (
                              <ArrowDown className="h-3 w-3 text-primary" />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Mirroring / Custom Class Picker for S3 */}
                      {s3MirrorS1 ? (
                        <div className="flex items-center justify-between gap-1 text-xs px-2.5 h-8.5 bg-purple-500/10 dark:bg-purple-950/30 rounded-lg border border-dashed border-purple-300 dark:border-purple-800">
                          <span className="text-[11px] text-purple-700 dark:text-purple-300 font-semibold truncate flex items-center gap-1 min-w-0">
                            <Link2 className="h-3 w-3 text-purple-600 dark:text-purple-400 shrink-0" />
                            <span className="truncate">= S1 {s1Class ? `(${s1Class})` : ""}</span>
                          </span>
                          <button
                            type="button"
                            title="Unlock to set custom class for Seat 3"
                            onClick={() => {
                              updateColumnConfig(col.columnIndex, {
                                s3MirrorS1: false,
                                s3ClassCode: currentConfig?.s3ClassCode || s1Class,
                              });
                            }}
                            className="text-[10px] font-bold text-purple-600 hover:text-purple-700 dark:text-purple-400 underline shrink-0 cursor-pointer flex items-center gap-0.5 px-1 py-0.5"
                          >
                            <Unlink2 className="h-2.5 w-2.5" />
                            <span>Custom</span>
                          </button>
                        </div>
                      ) : (
                        <CustomSelect
                          value={s3Class}
                          onChange={(val) => {
                            updateColumnConfig(col.columnIndex, {
                              s3ClassCode: val,
                            });
                          }}
                          options={classSelectOptions}
                          placeholder="Select Class"
                          className="text-xs w-full"
                          triggerClassName="h-8.5 text-xs px-2.5 font-medium w-full"
                          dropdownClassName="w-full min-w-full z-[100] shadow-xl rounded-xl"
                          disabled={disabled}
                        />
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Expandable Advanced Options (Overflow Class) */}
              {isAdvancedOpen && (
                <div className="p-3 rounded-xl bg-muted/40 border border-border/60 space-y-2 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-muted-foreground">
                    <span className="flex items-center gap-1.5 text-foreground font-bold">
                      <Settings2 className="h-3.5 w-3.5 text-primary" />
                      <span>Overflow Class</span>
                    </span>
                    <span
                      className="cursor-help text-muted-foreground hover:text-foreground inline-flex items-center"
                      title="Used when primary class students are exhausted"
                    >
                      <HelpCircle className="h-3 w-3" />
                    </span>
                  </div>
                  <CustomSelect
                    value={overflowClass}
                    onChange={(val) => {
                      updateColumnConfig(col.columnIndex, {
                        overflowClassCode: val,
                      });
                    }}
                    options={overflowSelectOptions}
                    placeholder="Auto (Next Class)"
                    className="text-xs"
                    triggerClassName="h-8 text-xs px-2.5 font-medium"
                    disabled={disabled}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}


