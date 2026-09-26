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
import { issueTransferCertificate } from "@/lib/data/students";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Loader2, FileText, Printer, AlertTriangle } from "lucide-react";

const TC_REASONS = [
  { label: "Transfer / Parent Relocation", value: "Transfer / Parent Relocation" },
  { label: "Higher Studies / Course Complete", value: "Higher Studies / Course Complete" },
  { label: "Personal / Distance from School", value: "Personal / Distance from School" },
  { label: "Admission to Other Institution", value: "Admission to Other Institution" },
  { label: "Parent Request / Guardian Choice", value: "Parent Request / Guardian Choice" },
];

interface IssueTcDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  student: Student | null;
  onSuccess?: () => void;
}

export function IssueTcDialog({
  open,
  onOpenChange,
  student,
  onSuccess,
}: IssueTcDialogProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const todayStr = new Date().toISOString().split("T")[0];

  const [tcDate, setTcDate] = useState<string>(todayStr);
  const [tcReason, setTcReason] = useState<string>("Transfer / Parent Relocation");
  const [tcNo, setTcNo] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  React.useEffect(() => {
    if (student) {
      setTcDate(todayStr);
      setTcReason("Transfer / Parent Relocation");
      setTcNo("");
    }
  }, [student, todayStr]);

  if (!student) return null;

  async function handleIssue(andPrint = false) {
    if (!student) return;
    setIsSubmitting(true);
    try {
      await issueTransferCertificate(student.id, {
        tcDate,
        tcReason,
        tcNo: tcNo.trim() || undefined,
      });

      toast.success(`Transfer Certificate issued for ${student.name}. Moved to Old Register.`);
      queryClient.invalidateQueries({ queryKey: ["students"] });
      queryClient.invalidateQueries({ queryKey: ["pending-students"] });
      queryClient.invalidateQueries({ queryKey: ["old-students"] });
      queryClient.invalidateQueries({ queryKey: ["students-infinite"] });

      onOpenChange(false);
      onSuccess?.();

      if (andPrint) {
        router.push(`/generate/transfer-certificate?studentId=${student.id}`);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to issue Transfer Certificate");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[460px] p-5">
        <DialogHeader className="pb-2 border-b">
          <DialogTitle className="text-base font-bold flex items-center gap-2">
            <FileText className="h-4 w-4 text-amber-600" />
            Issue Transfer Certificate (TC Out)
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3.5 py-2">
          {/* Warning Notice */}
          <div className="rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/30 p-2.5 flex items-start gap-2 text-amber-800 dark:text-amber-300 text-xs">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <p>
              Issuing a TC sets status to <strong className="font-semibold">TC Out</strong> and archives this student to the <strong className="font-semibold">Old Students Register</strong>.
            </p>
          </div>

          {/* Student Profile Card */}
          <div className="rounded-xl border bg-muted/30 p-3 space-y-1">
            <p className="text-xs font-bold text-foreground">{student.name}</p>
            <div className="grid grid-cols-2 gap-2 text-[11px] text-muted-foreground">
              <span>ID: <strong className="text-foreground">{student.schoolId || "N/A"}</strong></span>
              <span>Class: <strong className="text-foreground">{student.presentClass}-{student.presentSection} (Roll {student.presentRoll})</strong></span>
              <span>Father: <strong className="text-foreground">{student.fatherName || "N/A"}</strong></span>
              <span>PEN: <strong className="text-foreground">{student.pen || "N/A"}</strong></span>
            </div>
          </div>

          {/* TC Date & Certificate No */}
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <Label className="text-[11px] font-bold text-muted-foreground mb-1 block">Date of TC Issue</Label>
              <Input
                type="date"
                value={tcDate}
                onChange={(e) => setTcDate(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            <div>
              <Label className="text-[11px] font-bold text-muted-foreground mb-1 block">TC / Ref Number (Optional)</Label>
              <Input
                placeholder="e.g. TC/2026/042"
                value={tcNo}
                onChange={(e) => setTcNo(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
          </div>

          {/* Departure Reason */}
          <div>
            <Label className="text-[11px] font-bold text-muted-foreground mb-1 block">Reason for Departure</Label>
            <CustomSelect
              value={tcReason}
              onChange={setTcReason}
              options={TC_REASONS}
            />
          </div>
        </div>

        <DialogFooter className="gap-2 pt-2 border-t flex-col sm:flex-row">
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
            variant="outline"
            size="sm"
            onClick={() => handleIssue(true)}
            disabled={isSubmitting}
            className="text-xs h-8 gap-1.5 border-primary/40 text-primary hover:bg-primary/10"
          >
            {isSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Printer className="h-3.5 w-3.5" />}
            Issue &amp; Print TC
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={() => handleIssue(false)}
            disabled={isSubmitting}
            className="text-xs h-8 gap-1.5 bg-amber-600 hover:bg-amber-700 text-white"
          >
            {isSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5" />}
            Confirm TC Out
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
