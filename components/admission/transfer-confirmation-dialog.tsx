"use client";

import React, { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { showToast } from "@/components/ui/toast-banner";
import {
  UserCheck,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Users,
  Loader2,
  X,
} from "lucide-react";
import type { AdmissionApplication } from "@/lib/types";
import { transferApplicationsToActive } from "@/lib/data/admission";

interface TransferConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  applications: AdmissionApplication[];
  onTransferSuccess: () => void;
  transferMode?: "selected" | "class" | "single";
  selectedClass?: string;
}

export function TransferConfirmationDialog({
  open,
  onOpenChange,
  applications,
  onTransferSuccess,
  transferMode = "selected",
  selectedClass,
}: TransferConfirmationDialogProps) {
  const [isTransferring, setIsTransferring] = useState(false);

  // Scan applications for missing mandatory fields
  const { validApps, invalidApps } = useMemo(() => {
    const valid: AdmissionApplication[] = [];
    const invalid: Array<{ app: AdmissionApplication; missing: string[] }> = [];

    applications.forEach((app) => {
      const missing: string[] = [];
      if (!app.studentName || !app.studentName.trim()) missing.push("Student Name");
      if (!app.guardianName && !app.fatherName && !app.motherName) missing.push("Guardian / Father Name");
      if (!app.dob) missing.push("Date of Birth");
      if (!app.gender) missing.push("Gender");
      if (!app.admittedRoll && !app.targetRoll) missing.push("Assigned Roll Number");

      if (missing.length > 0) {
        invalid.push({ app, missing });
      } else {
        valid.push(app);
      }
    });

    return { validApps: valid, invalidApps: invalid };
  }, [applications]);

  const handleConfirmTransfer = async () => {
    if (validApps.length === 0) {
      showToast("No valid applications available for transfer. Please fix missing details first.", "error");
      return;
    }

    try {
      setIsTransferring(true);
      const appIds = validApps.map((a) => a.id);
      const result = await transferApplicationsToActive({
        applicationIds: appIds,
      });

      if (result.success) {
        showToast(
          `Transferred ${result.transferredCount} student(s) to the Active Directory!`,
          "success"
        );
        onTransferSuccess();
        onOpenChange(false);
      } else {
        showToast(result.message || "Transfer failed", "error");
      }
    } catch (err: any) {
      showToast(err.message || "Failed to transfer students to active directory", "error");
    } finally {
      setIsTransferring(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl w-[95vw] p-5 sm:p-6 rounded-3xl">
        <DialogHeader className="border-b pb-3">
          <DialogTitle className="text-lg font-black flex items-center gap-2 text-foreground">
            <UserCheck className="h-5 w-5 text-emerald-600" />
            <span>Transfer to Active Students Directory</span>
          </DialogTitle>
          <p className="text-xs text-muted-foreground">
            This will push admitted applicants from the new admission staging queue into the official student roster (<code className="font-mono text-xs">students</code> table).
          </p>
        </DialogHeader>

        {/* Transfer Stats Breakdown */}
        <div className="space-y-4 my-2">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <div className="bg-purple-500/10 border border-purple-500/20 rounded-2xl p-3 text-center">
              <span className="text-[11px] font-bold text-purple-700 dark:text-purple-300 block">
                Total Admitted
              </span>
              <span className="text-xl font-black text-purple-800 dark:text-purple-200">
                {applications.length}
              </span>
            </div>

            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-3 text-center">
              <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 block">
                Ready to Transfer
              </span>
              <span className="text-xl font-black text-emerald-800 dark:text-emerald-200">
                {validApps.length}
              </span>
            </div>

            <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-3 text-center col-span-2 sm:col-span-1">
              <span className="text-[11px] font-bold text-amber-700 dark:text-amber-300 block">
                Missing Fields
              </span>
              <span className="text-xl font-black text-amber-800 dark:text-amber-200">
                {invalidApps.length}
              </span>
            </div>
          </div>

          {/* Missing Fields Warning Alert */}
          {invalidApps.length > 0 && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-3.5 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-700 dark:text-amber-300">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>
                  {invalidApps.length} student(s) have missing mandatory fields and will be skipped:
                </span>
              </div>
              <div className="max-h-32 overflow-y-auto space-y-1.5 pl-2">
                {invalidApps.map(({ app, missing }) => (
                  <div
                    key={app.id}
                    className="text-[11px] text-amber-800 dark:text-amber-200 bg-background/60 p-1.5 rounded-xl border border-amber-500/20 flex items-center justify-between"
                  >
                    <span className="font-bold">{app.studentName || "Unnamed"} ({app.targetClass || "V"})</span>
                    <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold">
                      Missing: {missing.join(", ")}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-muted/40 p-3 rounded-2xl text-xs space-y-1 text-muted-foreground border">
            <p className="flex items-center gap-1.5 font-bold text-foreground">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              <span>What happens next?</span>
            </p>
            <p className="text-[11px]">
              &bull; Permanent School IDs (<code className="font-mono">MHS-2026-XXXX</code>) will be generated.
            </p>
            <p className="text-[11px]">
              &bull; Students will immediately appear in the Active Students Directory, Class Roster, and Student Profile pages.
            </p>
            <p className="text-[11px]">
              &bull; Staged status will be marked as <span className="font-bold text-emerald-600">Transferred</span>.
            </p>
          </div>
        </div>

        <DialogFooter className="flex items-center justify-between sm:justify-between gap-2 border-t pt-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={isTransferring}
            className="rounded-xl text-xs cursor-pointer"
          >
            Cancel
          </Button>

          <Button
            onClick={handleConfirmTransfer}
            disabled={isTransferring || validApps.length === 0}
            size="sm"
            className="rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 shadow-md cursor-pointer"
          >
            {isTransferring ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Transferring to Active...</span>
              </>
            ) : (
              <>
                <UserCheck className="h-3.5 w-3.5" />
                <span>Confirm Transfer ({validApps.length} Students)</span>
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
