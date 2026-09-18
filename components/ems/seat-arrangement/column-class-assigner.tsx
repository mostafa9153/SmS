"use client";

import React from "react";
import { RoomColumnConfig } from "@/lib/ems/types";
import { ColumnClassAllocationConfig, ArrangementPattern } from "@/lib/ems/seat-arrangement-types";
import { getDefaultSeatDirection } from "@/lib/ems/seat-arrangement-algorithm";
import { cleanColumnLabel } from "@/lib/ems/room-storage";
import { CustomSelect, CustomSelectOption } from "@/components/ui/custom-select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/components/ui/tooltip";
import {
  ArrowLeftRight,
  Columns,
  Sparkles,
  Copy,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
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
  onBulkAssignmentChange?: (newAssignments: ColumnClassAllocationConfig[]) => void;
  onApplyToAllRooms?: () => void;
  roomNumber?: string;
  scope?: "ALL_ROOMS" | "SINGLE_ROOM";
  onScopeChange?: (scope: "ALL_ROOMS" | "SINGLE_ROOM") => void;
  pattern: ArrangementPattern;
  disabled?: boolean;
}

export function ColumnClassAssigner({
  columns,
  availableClasses,
  columnAssignments,
  onAssignmentChange,
  onBulkAssignmentChange,
  onApplyToAllRooms,
  roomNumber,
  scope = "ALL_ROOMS",
  onScopeChange,
  pattern,
  disabled = false,
}: ColumnClassAssignerProps) {
  const classSelectOptions: CustomSelectOption[] = [
    { value: "", label: "Select Class" },
    ...availableClasses.map((c) => ({
      value: c.code,
      label: `Class ${c.code}${c.count !== undefined ? ` (${c.count})` : ""}`,
    })),
  ];

  const overflowSelectOptions: CustomSelectOption[] = [
    { value: "", label: "Auto (Default)" },
    ...availableClasses.map((c) => ({
      value: c.code,
      label: `Class ${c.code}`,
    })),
  ];

  // Helper to update a column configuration cleanly
  const updateColumnConfig = (
    columnIndex: number,
    updates: Partial<ColumnClassAllocationConfig>
  ) => {
    onAssignmentChange(columnIndex, updates);
  };

  // Quick helper: Smartly alternate or switch classes across all columns (A-B-A ⇄ B-A-B)
  const handleAutoAlternate = () => {
    if (availableClasses.length < 2 || columns.length === 0) return;
    const c1 = availableClasses[0]?.code || "";
    const c2 = availableClasses[1]?.code || c1;

    // Check what the current first column has as S1
    const firstColAssign = columnAssignments.find((c) => c.columnIndex === columns[0]?.columnIndex);
    const firstS1 = firstColAssign?.s1ClassCode || firstColAssign?.assignedClassCode;

    // If first column is currently c1, flip to start with c2; otherwise start with c1
    const shouldStartWithC2 = firstS1 === c1;
    const primary = shouldStartWithC2 ? c2 : c1;
    const secondary = shouldStartWithC2 ? c1 : c2;

    const newAssignments: ColumnClassAllocationConfig[] = columns.map((col, idx) => {
      const s1 = idx % 2 === 0 ? primary : secondary;
      const s2 = idx % 2 === 0 ? secondary : primary;
      const existing = columnAssignments.find((c) => c.columnIndex === col.columnIndex);

      return {
        columnIndex: col.columnIndex,
        s1ClassCode: s1,
        s2ClassCode: s2,
        s3MirrorS1: true,
        s3ClassCode: s1,
        assignedClassCode: s1,
        secondaryClassCode: s2,
        overflowClassCode: existing?.overflowClassCode,
        direction: existing?.direction,
        s1Direction: existing?.s1Direction,
        s2Direction: existing?.s2Direction,
        s3Direction: existing?.s3Direction,
      };
    });

    if (onBulkAssignmentChange) {
      onBulkAssignmentChange(newAssignments);
    } else {
      newAssignments.forEach((cfg) => {
        onAssignmentChange(cfg.columnIndex, cfg);
      });
    }
  };

  // Quick helper: Sync or Swap Fixed U Outer & Center classes across all columns
  const handleSyncFixedU = () => {
    if (availableClasses.length < 2 || columns.length === 0) return;
    const c1 = availableClasses[0]?.code || "";
    const c2 = availableClasses[1]?.code || c1;

    const firstColAssign = columnAssignments.find((c) => c.columnIndex === columns[0]?.columnIndex);
    const firstS1 = firstColAssign?.s1ClassCode || firstColAssign?.assignedClassCode;

    // Toggle: If currently Outer is c1, flip so Outer is c2, Center is c1; else Outer is c1, Center is c2
    const shouldStartWithC2 = firstS1 === c1;
    const outerClass = shouldStartWithC2 ? c2 : c1;
    const centerClass = shouldStartWithC2 ? c1 : c2;

    const newAssignments: ColumnClassAllocationConfig[] = columns.map((col) => {
      const existing = columnAssignments.find((c) => c.columnIndex === col.columnIndex);
      return {
        columnIndex: col.columnIndex,
        s1ClassCode: outerClass,
        s2ClassCode: centerClass,
        s3MirrorS1: true,
        s3ClassCode: outerClass,
        assignedClassCode: outerClass,
        secondaryClassCode: centerClass,
        overflowClassCode: existing?.overflowClassCode,
        direction: existing?.direction,
        s1Direction: existing?.s1Direction,
        s2Direction: existing?.s2Direction,
        s3Direction: existing?.s3Direction,
      };
    });

    if (onBulkAssignmentChange) {
      onBulkAssignmentChange(newAssignments);
    } else {
      newAssignments.forEach((cfg) => {
        onAssignmentChange(cfg.columnIndex, cfg);
      });
    }
  };

  return (
    <TooltipProvider delay={100}>
      <div className="relative z-20 space-y-3">
        {/* Top Header & Actions */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Columns className="h-3.5 w-3.5 text-primary" />
            <span>Column & Seat Classes</span>
          </label>

          <div className="flex flex-wrap items-center gap-2">
            {/* Quick Swap / Alternate Buttons */}
            {availableClasses.length >= 2 && !disabled && (
              <>
                {pattern === "FIXED_U" ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleSyncFixedU}
                    className="h-7.5 text-xs font-bold gap-1.5 text-primary hover:text-primary cursor-pointer border-primary/30 hover:bg-primary/10 shadow-2xs transition-all active:scale-95"
                    title="Click to swap Outer and Center classes across all columns"
                  >
                    <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                    <span>Swap Roles (Outer ↔ Center)</span>
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAutoAlternate}
                    className="h-7.5 text-xs font-bold gap-1.5 text-primary hover:text-primary cursor-pointer border-primary/30 hover:bg-primary/10 shadow-2xs transition-all active:scale-95"
                    title="Click to switch or alternate classes across all columns (A-B-A ⇄ B-A-B)"
                  >
                    <ArrowLeftRight className="h-3.5 w-3.5" />
                    <span>Switch / Alternate Classes (A ⇄ B)</span>
                  </Button>
                )}
              </>
            )}

            {/* Proper 2-Option Segmented Switch Button: [Room Number] | [All Rooms] */}
            {onScopeChange ? (
              <div className="inline-flex items-center p-0.5 rounded-xl bg-muted/80 dark:bg-muted/50 border border-border/70 shadow-2xs">
                <button
                  type="button"
                  onClick={() => !disabled && onScopeChange("SINGLE_ROOM")}
                  disabled={disabled}
                  className={cn(
                    "px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer select-none",
                    scope === "SINGLE_ROOM"
                      ? "bg-primary text-primary-foreground font-bold shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                  title={`Apply changes only to ${roomNumber || "this room"}`}
                >
                  {roomNumber || "Room"}
                </button>
                <button
                  type="button"
                  onClick={() => !disabled && onScopeChange("ALL_ROOMS")}
                  disabled={disabled}
                  className={cn(
                    "px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer select-none",
                    scope === "ALL_ROOMS"
                      ? "bg-primary text-primary-foreground font-bold shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                  title="Apply changes to all examination rooms"
                >
                  All Rooms
                </button>
              </div>
            ) : onApplyToAllRooms && !disabled ? (
              <Button
                type="button"
                size="sm"
                onClick={onApplyToAllRooms}
                className="h-7 text-[11px] font-bold gap-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white cursor-pointer shadow-2xs px-2.5"
                title="Apply this room's configuration to all examination rooms"
              >
                <span>Apply to All Rooms</span>
              </Button>
            ) : null}
          </div>
        </div>

        {/* Clean & Minimal Column Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
          {columns.map((col, colIdx) => {
            const currentConfig = columnAssignments.find((c) => c.columnIndex === col.columnIndex);

            const s1Class = currentConfig?.s1ClassCode || currentConfig?.assignedClassCode || "";
            const s2Class = currentConfig?.s2ClassCode || currentConfig?.secondaryClassCode || "";
            const s3MirrorS1 = currentConfig?.s3MirrorS1 !== false;
            const s3Class = s3MirrorS1 ? s1Class : (currentConfig?.s3ClassCode || s1Class);
            const overflowClass = currentConfig?.overflowClassCode || "";

            const capacity = col.benchCount * (col.seatsPerBench || 2);
            const seatsPerBench = col.seatsPerBench || 2;
            const isThreeSeat = seatsPerBench >= 3;
            const classStyle = getClassColorStyle(s1Class);

            // Compute active roll fill direction for each seat position
            const s1Dir =
              currentConfig?.s1Direction ||
              currentConfig?.direction ||
              getDefaultSeatDirection(pattern, colIdx, 1, seatsPerBench);
            const s2Dir =
              currentConfig?.s2Direction ||
              currentConfig?.direction ||
              getDefaultSeatDirection(pattern, colIdx, 2, seatsPerBench);
            const s3Dir =
              currentConfig?.s3Direction ||
              currentConfig?.direction ||
              getDefaultSeatDirection(pattern, colIdx, 3, seatsPerBench);

            return (
              <div
                key={col.columnIndex}
                className={cn(
                  "relative focus-within:z-30 p-3.5 rounded-2xl border transition-all space-y-3 shadow-2xs bg-card/85 backdrop-blur-xs",
                  classStyle ? classStyle.border : "border-border/70"
                )}
              >
                {/* Header: Column Name + Badge + Capacity + Column Roll Flip */}
                <div className="flex items-center justify-between gap-2 border-b border-border/40 pb-2">
                  <div className="flex items-center gap-2">
                    <h5 className="text-xs font-bold text-foreground tracking-tight">
                      {cleanColumnLabel(col.columnLabel, col.columnIndex)}
                    </h5>
                    {s1Class && (
                      <Badge
                        className={cn(
                          "text-[9px] font-bold px-1.5 py-0 h-4",
                          classStyle?.badgeBg || "bg-primary text-white"
                        )}
                      >
                        Class {s1Class}
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground font-mono">
                    <span>{col.benchCount} Benches</span>
                    <span>•</span>
                    <Badge variant="secondary" className="text-[10px] font-semibold px-1.5 py-0 h-4.5">
                      {capacity} Seats
                    </Badge>

                    {/* Quick Invert All Seats in Column */}
                    <Tooltip>
                      <TooltipTrigger
                        type="button"
                        onClick={() => {
                          const nextS1 = s1Dir === "top-to-bottom" ? "bottom-to-top" : "top-to-bottom";
                          const nextS2 = s2Dir === "top-to-bottom" ? "bottom-to-top" : "top-to-bottom";
                          const nextS3 = s3Dir === "top-to-bottom" ? "bottom-to-top" : "top-to-bottom";
                          updateColumnConfig(col.columnIndex, {
                            s1Direction: nextS1,
                            s2Direction: nextS2,
                            s3Direction: nextS3,
                          });
                        }}
                        disabled={disabled}
                        className="h-5 px-1.5 rounded-md text-[10px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted/80 flex items-center gap-1 border border-border/50 cursor-pointer transition-colors"
                      >
                        <ArrowUpDown className="h-2.5 w-2.5 text-primary" />
                        <span>Flip</span>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="text-[10px] p-2 shadow-lg max-w-[200px]">
                        Click to reverse Top-to-Bottom / Bottom-to-Top roll flow for all seats in this column.
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </div>

                {/* Per-Seat Controls with Icon-only Direction Toggles */}
                <div className="space-y-2.5">
                  {/* Seat 1 */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px] font-medium text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                        <span>Seat 1 (Left)</span>
                      </span>

                      {/* Icon-only Direction Toggle for Seat 1 */}
                      <Tooltip>
                        <TooltipTrigger
                          type="button"
                          onClick={() => {
                            const next = s1Dir === "top-to-bottom" ? "bottom-to-top" : "top-to-bottom";
                            updateColumnConfig(col.columnIndex, { s1Direction: next });
                          }}
                          disabled={disabled}
                          className={cn(
                            "h-6 w-6 rounded-md flex items-center justify-center transition-all border cursor-pointer select-none",
                            s1Dir === "bottom-to-top"
                              ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/25"
                              : "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 hover:bg-blue-500/20"
                          )}
                        >
                          {s1Dir === "bottom-to-top" ? (
                            <ArrowUp className="h-3.5 w-3.5 stroke-[2.5]" />
                          ) : (
                            <ArrowDown className="h-3.5 w-3.5 stroke-[2.5]" />
                          )}
                        </TooltipTrigger>
                        <TooltipContent side="top" className="text-[10px] p-2 shadow-lg">
                          {s1Dir === "bottom-to-top"
                            ? "Bottom to Top (Bench N → 1). Click to switch to Top to Bottom (1 → N)."
                            : "Top to Bottom (Bench 1 → N). Click to switch to Bottom to Top (N → 1)."}
                        </TooltipContent>
                      </Tooltip>
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
                      className="text-xs h-8.5"
                      disabled={disabled}
                    />
                  </div>

                  {/* Seat 2 */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px] font-medium text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                        <span>Seat 2 {isThreeSeat ? "(Center)" : "(Right)"}</span>
                      </span>

                      {/* Icon-only Direction Toggle for Seat 2 */}
                      <Tooltip>
                        <TooltipTrigger
                          type="button"
                          onClick={() => {
                            const next = s2Dir === "top-to-bottom" ? "bottom-to-top" : "top-to-bottom";
                            updateColumnConfig(col.columnIndex, { s2Direction: next });
                          }}
                          disabled={disabled}
                          className={cn(
                            "h-6 w-6 rounded-md flex items-center justify-center transition-all border cursor-pointer select-none",
                            s2Dir === "bottom-to-top"
                              ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/25"
                              : "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 hover:bg-blue-500/20"
                          )}
                        >
                          {s2Dir === "bottom-to-top" ? (
                            <ArrowUp className="h-3.5 w-3.5 stroke-[2.5]" />
                          ) : (
                            <ArrowDown className="h-3.5 w-3.5 stroke-[2.5]" />
                          )}
                        </TooltipTrigger>
                        <TooltipContent side="top" className="text-[10px] p-2 shadow-lg">
                          {s2Dir === "bottom-to-top"
                            ? "Bottom to Top (Bench N → 1). Click to switch to Top to Bottom (1 → N)."
                            : "Top to Bottom (Bench 1 → N). Click to switch to Bottom to Top (N → 1)."}
                        </TooltipContent>
                      </Tooltip>
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
                      className="text-xs h-8.5"
                      disabled={disabled}
                    />
                  </div>

                  {/* Seat 3 (Only for 3-seat benches) */}
                  {isThreeSeat && (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[11px] font-medium text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                          <span className="h-1.5 w-1.5 rounded-full bg-purple-500" />
                          <span>Seat 3 (Right)</span>
                        </span>

                        <div className="flex items-center gap-2">
                          {/* Icon-only Direction Toggle for Seat 3 */}
                          <Tooltip>
                            <TooltipTrigger
                              type="button"
                              onClick={() => {
                                const next = s3Dir === "top-to-bottom" ? "bottom-to-top" : "top-to-bottom";
                                updateColumnConfig(col.columnIndex, { s3Direction: next });
                              }}
                              disabled={disabled}
                              className={cn(
                                "h-6 w-6 rounded-md flex items-center justify-center transition-all border cursor-pointer select-none",
                                s3Dir === "bottom-to-top"
                                  ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/25"
                                  : "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 hover:bg-blue-500/20"
                              )}
                            >
                              {s3Dir === "bottom-to-top" ? (
                                <ArrowUp className="h-3.5 w-3.5 stroke-[2.5]" />
                              ) : (
                                <ArrowDown className="h-3.5 w-3.5 stroke-[2.5]" />
                              )}
                            </TooltipTrigger>
                            <TooltipContent side="top" className="text-[10px] p-2 shadow-lg">
                              {s3Dir === "bottom-to-top"
                                ? "Bottom to Top (Bench N → 1). Click to switch to Top to Bottom (1 → N)."
                                : "Top to Bottom (Bench 1 → N). Click to switch to Bottom to Top (N → 1)."}
                            </TooltipContent>
                          </Tooltip>

                          {/* Clean Mirror S1 Switch without label text */}
                          <label
                            className="flex items-center cursor-pointer select-none"
                            title={s3MirrorS1 ? "Mirroring Seat 1 (Click to select custom class)" : "Custom class enabled (Click to mirror Seat 1)"}
                          >
                            <Switch
                              checked={s3MirrorS1}
                              onCheckedChange={(checked: boolean) => {
                                updateColumnConfig(col.columnIndex, {
                                  s3MirrorS1: checked,
                                  s3ClassCode: checked ? s1Class : (currentConfig?.s3ClassCode || s1Class),
                                });
                              }}
                              disabled={disabled}
                              className="scale-75 origin-right"
                            />
                          </label>
                        </div>
                      </div>

                      {!s3MirrorS1 ? (
                        <CustomSelect
                          value={s3Class}
                          onChange={(val) => {
                            updateColumnConfig(col.columnIndex, {
                              s3ClassCode: val,
                            });
                          }}
                          options={classSelectOptions}
                          placeholder="Select Class"
                          className="text-xs h-8.5"
                          disabled={disabled}
                        />
                      ) : (
                        <div className="flex items-center justify-between text-xs text-muted-foreground px-2.5 h-8.5 bg-muted/40 rounded-xl border border-border/40 font-mono">
                          <span className="text-[11px]">Mirrors S1</span>
                          <span className="font-semibold text-foreground">
                            {s1Class ? `Class ${s1Class}` : "—"}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Minimal Overflow Selector without 'on finish' label */}
                  <div className="pt-2 border-t border-border/40 space-y-1">
                    <div className="text-[11px] font-medium text-muted-foreground">
                      <span>Overflow Class</span>
                    </div>
                    <CustomSelect
                      value={overflowClass}
                      onChange={(val) => {
                        updateColumnConfig(col.columnIndex, {
                          overflowClassCode: val,
                        });
                      }}
                      options={overflowSelectOptions}
                      placeholder="Auto Next Class"
                      className="text-xs h-8"
                      disabled={disabled}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </TooltipProvider>
  );
}
