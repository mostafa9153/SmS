"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { showToast } from "@/components/ui/toast-banner";
import { AlertTriangle, Loader2, Trash2 } from "lucide-react";

interface StaffDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  staffId: string;
  staffName: string;
  uniqueId: string;
}

export function StaffDeleteDialog({
  open,
  onOpenChange,
  staffId,
  staffName,
  uniqueId,
}: StaffDeleteDialogProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    try {
      setIsDeleting(true);

      const res = await fetch(`/api/employees/${staffId}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to delete staff record");
      }

      showToast({
        type: "success",
        title: "Staff Deleted",
        description: `${staffName} (${uniqueId}) has been removed from the registry.`,
      });

      onOpenChange(false);
      router.push("/employees");
      router.refresh();
    } catch (err: any) {
      showToast({
        type: "error",
        title: "Delete Failed",
        description: err.message || "Failed to delete staff record.",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-2xl">
        <DialogHeader>
          <div className="mx-auto w-12 h-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mb-2">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <DialogTitle className="text-center text-lg font-bold">
            Delete Staff Record?
          </DialogTitle>
          <DialogDescription className="text-center text-xs text-muted-foreground pt-1">
            Are you sure you want to permanently delete{" "}
            <strong className="text-foreground font-semibold">{staffName}</strong> (ID:{" "}
            <span className="font-mono">{uniqueId}</span>)? This will remove all institutional records, personal details, and documents associated with this employee.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="pt-4 flex flex-col sm:flex-row gap-2 sm:justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={isDeleting}
            className="rounded-xl"
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={handleDelete}
            disabled={isDeleting}
            className="rounded-xl font-semibold shadow-xs"
          >
            {isDeleting ? (
              <>
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                Yes, Delete Record
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
