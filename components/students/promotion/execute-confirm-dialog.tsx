"use client";

import { StatusBadge } from "@/components/students/status-badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { GraduationCap } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";

import type { PromotionDeskState } from "./use-promotion-desk";

export function ExecuteConfirmDialog({ desk }: { desk: PromotionDeskState }) {
  const { academicYear, confirmOpen, handleExecuteConfirm, promotionMutation, rollStrategy, selectedClass, selectedStudentsToPromote, setConfirmOpen, targetAcademicYear } = desk;
  return (
    <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-bold">
            <GraduationCap className="h-5 w-5 text-primary" />
            Confirm Cohort Promotion Execution
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2 text-xs">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center p-3 rounded-xl bg-muted/40 border">
            <div>
              <p className="text-[10px] text-muted-foreground font-bold">Source Session</p>
              <p className="font-bold text-foreground">{academicYear} (Class {selectedClass})</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground font-bold">Target Session</p>
              <p className="font-bold text-foreground">{targetAcademicYear}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground font-bold">Roll Strategy</p>
              <p className="font-bold capitalize text-foreground">{rollStrategy}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground font-bold">Total Batch</p>
              <p className="font-bold text-primary">{selectedStudentsToPromote.length} Selected</p>
            </div>
          </div>

          <div className="max-h-60 overflow-y-auto rounded-xl border divide-y">
            {selectedStudentsToPromote.map((item) => (
              <div key={item.student.id} className="p-2.5 flex items-center justify-between gap-2">
                <div>
                  <p className="font-bold text-foreground">{item.student.name}</p>
                  <p className="text-[10px] text-muted-foreground">
                    Current: Class {item.student.presentClass} ({item.student.presentSection}) • Roll: #{item.student.presentRoll}
                  </p>
                </div>
                <div className="text-right space-y-0.5">
                  <div className="flex items-center gap-1.5 font-bold">
                    <span>{item.targetClass}{item.targetSemester ? ` (${item.targetSemester})` : ""}</span>
                    <span className="text-[10px] font-mono text-muted-foreground">(Roll #{item.predictedRoll})</span>
                  </div>
                  <StatusBadge status={item.targetStatus} size="sm" />
                </div>
              </div>
            ))}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <button
            onClick={() => setConfirmOpen(false)}
            className="rounded-xl border px-4 py-2 text-xs font-semibold hover:bg-muted transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleExecuteConfirm}
            disabled={promotionMutation.isPending}
            className="rounded-xl bg-primary text-primary-foreground px-5 py-2 text-xs font-bold hover:bg-primary/90 transition-all shadow-xs active:scale-95 cursor-pointer inline-flex items-center gap-2"
          >
            {promotionMutation.isPending && <Spinner className="h-3.5 w-3.5" />}
            {promotionMutation.isPending ? "Executing Transitions..." : "Confirm & Execute Promotion"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
