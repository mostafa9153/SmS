"use client";

import React, { useState } from "react";
import { Student } from "@/lib/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CustomSelect } from "@/components/ui/custom-select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { StatusBadge } from "@/components/students/status-badge";
import { updateReAdmissionStatus } from "@/lib/data/admission";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, UserCheck, GraduationCap } from "lucide-react";

const STANDARD_CLASSES = ["V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];
const SECTIONS = ["A", "B", "C", "D"];

function computeDefaultNextClass(currentClass: string, status: string): string {
  if (status === "Detained" || status === "10th test fail" || status === "C.C.H.S.") {
    return currentClass;
  }
  const idx = STANDARD_CLASSES.indexOf(currentClass);
  if (idx >= 0 && idx < STANDARD_CLASSES.length - 1) {
    return STANDARD_CLASSES[idx + 1];
  }
  return currentClass;
}

interface QuickReAdmitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  student: Student | null;
  onSuccess?: () => void;
}

export function QuickReAdmitDialog({
  open,
  onOpenChange,
  student,
  onSuccess,
}: QuickReAdmitDialogProps) {
  const queryClient = useQueryClient();
  const currentYear = new Date().getFullYear();

  const [targetClass, setTargetClass] = useState<string>("VI");
  const [targetSection, setTargetSection] = useState<string>("A");
  const [targetRoll, setTargetRoll] = useState<number>(1);
  const [queueInvoice, setQueueInvoice] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync state whenever student changes
  React.useEffect(() => {
    if (student) {
      const nextCls = computeDefaultNextClass(student.presentClass, student.currentStatus);
      setTargetClass(nextCls);
      setTargetSection(student.presentSection || "A");
      setTargetRoll(student.presentRoll || 1);
      setQueueInvoice(true);
    }
  }, [student]);

  if (!student) return null;

  async function handleConfirm() {
    if (!student) return;
    setIsSubmitting(true);
    try {
      await updateReAdmissionStatus(student.id, {
        action: "admit",
        newClass: targetClass,
        newSection: targetSection,
        newRoll: Number(targetRoll) || 1,
        feePaid: true,
      });

      toast.success(`${student.name} re-admitted to Class ${targetClass} (${targetSection})!`);
      queryClient.invalidateQueries({ queryKey: ["students"] });
      queryClient.invalidateQueries({ queryKey: ["pending-students"] });
      queryClient.invalidateQueries({ queryKey: ["students-infinite"] });
      onOpenChange(false);
      onSuccess?.();
    } catch (err: any) {
      toast.error(err.message || "Failed to re-admit student");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px] p-5">
        <DialogHeader className="pb-2 border-b">
          <DialogTitle className="text-base font-bold flex items-center gap-2">
            <UserCheck className="h-4 w-4 text-primary" />
            Quick Re-Admission
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3.5 py-2">
          {/* Student Info Summary */}
          <div className="rounded-xl border bg-muted/30 p-3 flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-xs font-bold text-foreground truncate">{student.name}</p>
              <p className="text-[11px] font-mono text-muted-foreground">
                {student.schoolId || student.pen || "No ID"} • Enrolled: Class {student.presentClass}-{student.presentSection} (Roll {student.presentRoll})
              </p>
            </div>
            <StatusBadge status={student.currentStatus} className="shrink-0" />
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            {/* Target Class */}
            <div>
              <Label className="text-[11px] font-bold text-muted-foreground mb-1 block">Target Class</Label>
              <CustomSelect
                value={targetClass}
                onChange={setTargetClass}
                options={STANDARD_CLASSES.map((c) => ({ label: `Class ${c}`, value: c }))}
              />
            </div>

            {/* Target Section */}
            <div>
              <Label className="text-[11px] font-bold text-muted-foreground mb-1 block">Target Section</Label>
              <CustomSelect
                value={targetSection}
                onChange={setTargetSection}
                options={SECTIONS.map((s) => ({ label: `Section ${s}`, value: s }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            {/* Target Roll */}
            <div>
              <Label className="text-[11px] font-bold text-muted-foreground mb-1 block">Target Roll No</Label>
              <Input
                type="number"
                min={1}
                value={targetRoll}
                onChange={(e) => setTargetRoll(parseInt(e.target.value) || 1)}
                className="h-9 text-xs"
              />
            </div>

            {/* Session */}
            <div>
              <Label className="text-[11px] font-bold text-muted-foreground mb-1 block">Academic Session</Label>
              <Input
                value={`${currentYear}`}
                disabled
                className="h-9 text-xs bg-muted text-muted-foreground"
              />
            </div>
          </div>

          {/* Fee Queue Switch */}
          <div className="flex items-center justify-between p-2.5 rounded-xl border bg-card">
            <div>
              <p className="text-xs font-semibold">Queue Admission Fee Invoice</p>
              <p className="text-[10px] text-muted-foreground">Adds student to admission invoice print queue</p>
            </div>
            <Switch checked={queueInvoice} onCheckedChange={setQueueInvoice} />
          </div>
        </div>

        <DialogFooter className="gap-2 pt-2 border-t">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
            className="text-xs h-8"
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleConfirm}
            disabled={isSubmitting}
            className="text-xs h-8 gap-1.5"
          >
            {isSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <GraduationCap className="h-3.5 w-3.5" />}
            Confirm Re-Admission
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
