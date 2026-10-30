"use client";

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Trash2, AlertTriangle } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";

import type { StudentProfileState } from "./use-student-profile";

export function DeleteStudentDialog({ profile }: { profile: StudentProfileState }) {
  const { deleteDialogOpen, handleDeleteStudent, isDeleting, setDeleteDialogOpen, student } = profile;
  return (
    <Dialog open={deleteDialogOpen} onOpenChange={(open) => !isDeleting && setDeleteDialogOpen(open)}>
      <DialogContent className="max-w-md p-6 rounded-2xl border bg-card shadow-2xl">
        <DialogHeader className="space-y-3">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <DialogTitle className="text-center text-lg font-bold text-foreground">
            Delete Student Profile?
          </DialogTitle>
          <DialogDescription className="text-center text-sm text-muted-foreground">
            Are you sure you want to permanently delete{" "}
            <span className="font-semibold text-foreground">{student?.name}</span>
            {student?.schoolId ? (
              <> (School ID: <span className="font-mono text-foreground font-semibold">{student.schoolId}</span>)</>
            ) : null}?
            <br />
            <span className="text-rose-600 dark:text-rose-400 font-medium mt-2 block">
              This action cannot be undone. All academic records, results, and history for this student will be removed.
            </span>
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 mt-4 pt-3 border-t">
          <button
            type="button"
            disabled={isDeleting}
            onClick={() => setDeleteDialogOpen(false)}
            className="px-4 py-2 rounded-xl text-xs font-semibold border bg-background hover:bg-muted text-foreground transition-colors disabled:opacity-50 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isDeleting}
            onClick={handleDeleteStudent}
            className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white transition-colors shadow-2xs disabled:opacity-50 cursor-pointer"
          >
            {isDeleting ? (
              <>
                <Spinner className="h-3.5 w-3.5" />
                <span>Deleting...</span>
              </>
            ) : (
              <>
                <Trash2 className="h-3.5 w-3.5" />
                <span>Yes, Delete Student</span>
              </>
            )}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
