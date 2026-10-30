"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { RotateCcw } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";

import type { PromotionDeskState } from "./use-promotion-desk";

export function RollbackDialog({ desk }: { desk: PromotionDeskState }) {
  const { academicYear, selectedClass, setUndoModalOpen, undoModalOpen, undoMutation } = desk;
  return (
    <Dialog open={undoModalOpen} onOpenChange={setUndoModalOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-bold text-rose-700 dark:text-rose-400">
            <RotateCcw className="h-5 w-5" />
            Undo Promotion Batch
          </DialogTitle>
        </DialogHeader>

        <div className="py-2 text-xs text-foreground">
          Restore Class {selectedClass} students to previous session and reset status to Continuing?
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <button
            onClick={() => setUndoModalOpen(false)}
            className="rounded-xl border px-4 py-2 text-xs font-semibold hover:bg-muted transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={() =>
              undoMutation.mutate({
                sourceClass: selectedClass,
                academicYear,
                resetToContinuing: true,
              })
            }
            disabled={undoMutation.isPending}
            className="rounded-xl bg-rose-600 text-white px-5 py-2 text-xs font-bold hover:bg-rose-700 transition-all shadow-xs active:scale-95 cursor-pointer inline-flex items-center gap-2"
          >
            {undoMutation.isPending && <Spinner className="h-3.5 w-3.5" />}
            {undoMutation.isPending ? "Restoring..." : "Confirm Undo"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
