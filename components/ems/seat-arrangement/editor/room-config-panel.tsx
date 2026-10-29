"use client";

import { PatternSelector } from "../pattern-selector";
import { ColumnClassAssigner } from "../column-class-assigner";
import { getClassColorStyle } from "@/components/ems/seat-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { RotateCcw, Armchair, AlertTriangle, ChevronDown, Sliders } from "lucide-react";
import { cn } from "@/lib/utils";

import type { SeatEditorState } from "./use-seat-arrangement-editor";

export function RoomConfigPanel({ seat }: { seat: SeatEditorState }) {
  const { activeConfig, activeRoom, activeRoomLabel, applyScope, availableClasses, examType, handleBulkColumnAssignmentChange, handleColumnAssignmentChange, handlePatternChange, handleResetActiveRoom, handleScopeChange, isConfigExpanded, missingRollsReport, setIsConfigExpanded, totalMissingRollsCount } = seat;
  return (
    <>
      {activeRoom && (
        <div className="relative z-30 p-4 sm:p-5 rounded-2xl border border-border/80 bg-card/80 backdrop-blur-xs space-y-4 shadow-xs">
          {/* Clean Step 4 Header with Short Exam Name, Selected Classes, and Highlighted Column Edit Toggle */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/40 pb-3">
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="h-8.5 w-8.5 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20 shadow-2xs">
                <Armchair className="h-4 w-4 text-primary" />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold text-foreground tracking-tight">
                  Seat Arrangement
                </h3>
                {examType && (
                  <Badge className="bg-primary/15 text-primary border-primary/25 text-xs font-bold px-2.5 py-0.5 shadow-2xs">
                    {examType.replace(" Evaluation", "")}
                  </Badge>
                )}
                {availableClasses.map((c) => {
                  const colorStyle = getClassColorStyle(c.code);
                  return (
                    <span
                      key={c.code}
                      className={cn(
                        "text-xs font-bold px-2 py-0.5 rounded-md shadow-2xs",
                        colorStyle?.badgeBg || "bg-muted text-foreground border border-border"
                      )}
                    >
                      Class {c.code}
                    </span>
                  );
                })}
              </div>
            </div>

            {/* Warning Button & Highlighted Column Edit Button */}
            <div className="flex items-center gap-2">
              {missingRollsReport.length > 0 && (
                <Popover>
                  <PopoverTrigger
                    className="h-8 text-xs font-bold inline-flex items-center gap-1.5 px-3 rounded-xl border border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-300 hover:bg-amber-500/20 shadow-2xs cursor-pointer active:scale-95 transition-all select-none"
                    title="View missing roll numbers detected in database"
                  >
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                    <span>Warning</span>
                    <Badge className="h-4.5 px-1.5 py-0 text-[10px] font-mono bg-amber-500/25 text-amber-900 dark:text-amber-200 border-amber-500/30">
                      {totalMissingRollsCount}
                    </Badge>
                  </PopoverTrigger>
                  <PopoverContent
                    align="end"
                    side="bottom"
                    sideOffset={8}
                    className="w-80 sm:w-96 p-3.5 rounded-2xl shadow-xl border border-amber-500/30 bg-popover/95 backdrop-blur-md"
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between pb-2 border-b border-border/60">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-amber-500" />
                          <h4 className="text-xs font-bold text-foreground">Missing Rolls Detected</h4>
                        </div>
                        <Badge className="bg-amber-500/20 text-amber-800 dark:text-amber-300 border-amber-500/40 text-[10px] font-mono">
                          {totalMissingRollsCount} Missing in DB
                        </Badge>
                      </div>
                      <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                        {missingRollsReport.map((m, idx) => (
                          <div
                            key={idx}
                            className="text-[11px] font-mono bg-muted/50 border border-border/70 rounded-lg p-2 text-foreground space-y-1"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-primary">Class {m.class}-{m.section}</span>
                              <span className="text-[10px] text-muted-foreground">({m.foundCount}/{m.expectedCount} active)</span>
                            </div>
                            <div className="text-[11px] text-muted-foreground flex items-baseline gap-1">
                              <span>Missing:</span>
                              <span className="font-bold text-amber-700 dark:text-amber-400 break-all">{m.missingFormatted}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              )}

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsConfigExpanded((prev) => !prev)}
                className={cn(
                  "h-8 text-xs font-bold gap-1.5 px-3.5 rounded-xl border transition-all duration-200 cursor-pointer shadow-xs active:scale-95",
                  isConfigExpanded
                    ? "bg-primary text-primary-foreground border-primary shadow-sm hover:bg-primary/90"
                    : "bg-primary/10 text-primary border-primary/40 hover:bg-primary/20 hover:border-primary"
                )}
              >
                <Sliders className={cn("h-3.5 w-3.5 transition-transform duration-200", isConfigExpanded ? "text-primary-foreground" : "text-primary")} />
                <span>Column Edit</span>
                <ChevronDown
                  className={cn(
                    "h-3.5 w-3.5 transition-transform duration-300 ease-out",
                    isConfigExpanded ? "rotate-180" : "rotate-0"
                  )}
                />
              </Button>
            </div>
          </div>

          {/* Grand Strategy Pattern Switcher (Full Width) */}
          <PatternSelector
            value={activeConfig.pattern}
            onChange={handlePatternChange}
          />

          {/* Collapsible Column Configuration & Actions with Ultra Smooth CSS Transition */}
          <div className={cn("ems-accordion-drawer", isConfigExpanded && "is-open")}>
            <div className="ems-accordion-content space-y-4">
              {/* Column Class Assigner */}
              <ColumnClassAssigner
                columns={activeRoom.columns}
                availableClasses={availableClasses}
                columnAssignments={activeConfig.columnAssignments}
                onAssignmentChange={handleColumnAssignmentChange}
                onBulkAssignmentChange={handleBulkColumnAssignmentChange}
                roomNumber={activeRoomLabel}
                scope={applyScope}
                onScopeChange={handleScopeChange}
                pattern={activeConfig.pattern}
              />

              {/* Action Row: Reset Room Seats */}
              <div className="pt-3 border-t border-border/60 flex items-center justify-end">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleResetActiveRoom}
                  className="h-8 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 gap-1.5 cursor-pointer border-rose-200 dark:border-rose-900 shadow-2xs active:scale-95"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>Reset {activeRoomLabel} Seats</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
