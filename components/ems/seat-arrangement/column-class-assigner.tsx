"use client";

import React from "react";
import { RoomColumnConfig } from "@/lib/ems/types";
import { ColumnClassAllocationConfig, ArrangementPattern } from "@/lib/ems/seat-arrangement-types";
import { CustomSelect, CustomSelectOption } from "@/components/ui/custom-select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { ArrowLeftRight, Columns, Sparkles, Copy, RefreshCw } from "lucide-react";
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

  return (
    <div className="relative z-20 space-y-3">
      {/* Top Header & Actions */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <Columns className="h-3.5 w-3.5 text-primary" />
          <span>Column & Seat Classes</span>
        </label>

        <div className="flex flex-wrap items-center gap-2">
          {availableClasses.length >= 2 && !disabled && (
            <>
              {pattern === "FIXED_U" ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleSyncFixedU}
                  className="h-7 text-[11px] font-semibold gap-1.5 text-primary hover:text-primary cursor-pointer border-primary/30 hover:bg-primary/5 shadow-2xs"
                >
                  <Sparkles className="h-3 w-3 text-amber-500" />
                  <span>Sync All (Outer: {availableClasses[0]?.code} / Mid: {availableClasses[1]?.code})</span>
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAutoAlternate}
                  className="h-7 text-[11px] font-semibold gap-1.5 text-primary hover:text-primary cursor-pointer border-primary/30 hover:bg-primary/5 shadow-2xs"
                >
                  <ArrowLeftRight className="h-3 w-3" />
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
              className="h-7 text-[11px] font-bold gap-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white cursor-pointer shadow-2xs px-2.5"
              title="Apply this room's configuration to all examination rooms"
            >
              <Copy className="h-3 w-3" />
              <span>Apply to All Rooms</span>
            </Button>
          )}
        </div>
      </div>

      {/* Clean & Minimal Column Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
        {columns.map((col) => {
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

          return (
            <div
              key={col.columnIndex}
              className={cn(
                "relative focus-within:z-30 p-3.5 rounded-2xl border transition-all space-y-3 shadow-2xs bg-card/85 backdrop-blur-xs",
                classStyle ? classStyle.border : "border-border/70"
              )}
            >
              {/* Header: Column Name + Badge + Capacity */}
              <div className="flex items-center justify-between gap-2 border-b border-border/40 pb-2">
                <div className="flex items-center gap-2">
                  <h5 className="text-xs font-bold text-foreground tracking-tight">
                    {col.columnLabel || `Column ${col.columnIndex}`}
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

                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-mono">
                  <span>{col.benchCount} Benches</span>
                  <span>•</span>
                  <Badge variant="secondary" className="text-[10px] font-semibold px-1.5 py-0 h-4.5">
                    {capacity} Seats
                  </Badge>
                </div>
              </div>

              {/* Minimal Per-Seat Controls */}
              <div className="space-y-2.5">
                {/* [S1] Seat 1 */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px] font-medium text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                      <span>Seat 1 {isThreeSeat ? "(Left)" : "(Left)"}</span>
                    </span>
                    <span className="text-[10px] font-mono text-muted-foreground/70">S1</span>
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

                {/* [S2] Seat 2 */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px] font-medium text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                      <span>Seat 2 {isThreeSeat ? "(Center)" : "(Right)"}</span>
                    </span>
                    <span className="text-[10px] font-mono text-muted-foreground/70">S2</span>
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

                {/* [S3] Seat 3 (Only for 3-seat benches) */}
                {isThreeSeat && (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px] font-medium text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-purple-500" />
                        <span>Seat 3 (Right)</span>
                      </span>

                      {/* Clean Mirror S1 Switch */}
                      <label className="flex items-center gap-1.5 text-[10px] text-muted-foreground hover:text-foreground cursor-pointer select-none">
                        <span>Mirror S1</span>
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

                {/* Minimal Overflow Selector */}
                <div className="pt-2 border-t border-border/40 space-y-1">
                  <div className="flex items-center justify-between text-[11px] font-medium text-muted-foreground">
                    <span>Overflow Class</span>
                    <span className="text-[9px] text-muted-foreground/60">on finish</span>
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
  );
}
