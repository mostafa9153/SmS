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
import { ArrangementPromptState } from "@/lib/ems/seat-arrangement-types";
import { AlertCircle, ArrowRight, CheckCircle2, Footprints, GraduationCap, Users } from "lucide-react";
import { cn } from "@/lib/utils";

interface MidFillClassPromptProps {
  promptState: ArrangementPromptState | null;
  onConfirm: (selectedClassCode: string) => void;
  onCancelLeaveVacant: () => void;
}

export function MidFillClassPrompt({
  promptState,
  onConfirm,
  onCancelLeaveVacant,
}: MidFillClassPromptProps) {
  const [selectedClass, setSelectedClass] = useState<string>("");

  if (!promptState || !promptState.isOpen) return null;

  const handleConfirm = () => {
    if (!selectedClass && promptState.availableClasses.length > 0) {
      onConfirm(promptState.availableClasses[0].classCode);
    } else {
      onConfirm(selectedClass);
    }
  };

  const activeSelection =
    selectedClass || (promptState.availableClasses.length > 0 ? promptState.availableClasses[0].classCode : "");

  return (
    <Dialog open={promptState.isOpen} onOpenChange={(open) => !open && onCancelLeaveVacant()}>
      <DialogContent className="max-w-md p-5 sm:p-6 rounded-2xl border bg-card shadow-2xl">
        <DialogHeader className="space-y-2">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              <Footprints className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-foreground">
                Class Rolls Finished — Select Next Class
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                UU (Uneven) Continuous S-Curve Seating Transition
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-3.5 my-2">
          {/* Transition Context Banner */}
          <div className="p-3 rounded-xl bg-muted/40 border border-border/70 space-y-1.5 text-xs">
            <div className="flex items-center justify-between text-muted-foreground">
              <span>Room:</span>
              <span className="font-semibold text-foreground">{promptState.roomNumber}</span>
            </div>
            <div className="flex items-center justify-between text-muted-foreground">
              <span>Completed Class:</span>
              <Badge variant="outline" className="font-semibold text-foreground">
                Class {promptState.currentClass} (Roll {promptState.exhaustedRoll || "End"})
              </Badge>
            </div>
            <div className="flex items-center justify-between text-muted-foreground border-t border-border/50 pt-1.5">
              <span>Next Seat to Fill:</span>
              <span className="font-mono text-primary font-bold">
                Col {promptState.columnIndex}, Bench {promptState.benchIndex}, Seat {promptState.seatPosition}
              </span>
            </div>
          </div>

          {/* Candidate Classes List */}
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase text-muted-foreground flex items-center justify-between">
              <span>Which class continues from this seat?</span>
              <span className="text-[10px] lowercase text-muted-foreground">select one</span>
            </label>

            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {promptState.availableClasses.map((item) => {
                const isSelected = activeSelection === item.classCode;
                return (
                  <div
                    key={item.classCode}
                    onClick={() => setSelectedClass(item.classCode)}
                    className={cn(
                      "p-2.5 rounded-xl border flex items-center justify-between gap-3 cursor-pointer transition-all text-xs select-none",
                      isSelected
                        ? "border-primary bg-primary/8 ring-2 ring-primary/20 shadow-xs"
                        : "border-border/70 bg-card hover:bg-muted/30"
                    )}
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className={cn(
                          "h-4 w-4 rounded-full border flex items-center justify-center text-[9px]",
                          isSelected ? "border-primary bg-primary text-white" : "border-muted-foreground/50"
                        )}
                      >
                        {isSelected && "✓"}
                      </div>
                      <span className="font-bold text-foreground">Class {item.classCode}</span>
                    </div>

                    <Badge variant="secondary" className="text-[10px] font-mono">
                      {item.remainingCount} unseated remaining
                    </Badge>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2 pt-2 border-t border-border/60">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onCancelLeaveVacant}
            className="text-xs cursor-pointer"
          >
            Leave Remaining Vacant
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleConfirm}
            disabled={promptState.availableClasses.length === 0}
            className="text-xs font-bold gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground cursor-pointer"
          >
            <span>Continue with Class {activeSelection || "Selected"}</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
