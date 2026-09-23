"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Printer, PlusCircle } from "lucide-react";
import { useRouter } from "next/navigation";

interface Step4SuccessProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  result?: any;
  onRestart: () => void;
}

export function Step4SuccessDialog({
  open,
  onOpenChange,
  result,
  onRestart,
}: Step4SuccessProps) {
  const router = useRouter();
  const res = result || {};

  const handlePrint = () => {
    onOpenChange(false);
    router.push("/admission/invoices");
  };

  const handleNewAdmission = () => {
    onOpenChange(false);
    onRestart();
  };

  return (
    <Dialog 
      open={open} 
      onOpenChange={(isOpen) => {
        onOpenChange(isOpen);
        if (!isOpen) {
          onRestart();
        }
      }}
    >
      <DialogContent className="max-w-md w-[95vw] p-6 rounded-2xl animate-in zoom-in-95 duration-200">
        <DialogHeader className="flex flex-col items-center justify-center text-center pb-2">
          <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-950/60 rounded-full flex items-center justify-center mb-3 shadow-inner">
            <CheckCircle2 className="w-9 h-9 text-emerald-600 dark:text-emerald-400" />
          </div>
          <DialogTitle className="text-2xl font-black text-center text-foreground">
            Admission Confirmed!
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 my-2">
          <div className="p-4 rounded-xl bg-muted/40 border space-y-3 text-sm">
            <div className="flex justify-between items-center pb-2 border-b">
              <span className="text-xs text-muted-foreground font-medium">Student Name</span>
              <span className="font-bold text-base text-foreground">{res.studentName || "New Student"}</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-[11px] text-muted-foreground">School ID</div>
                <div className="font-mono font-bold text-primary">{res.schoolId || "MHS-2026-V-001"}</div>
              </div>
              <div>
                <div className="text-[11px] text-muted-foreground">Form Number</div>
                <div className="font-mono font-medium">{res.formNo || "FRM-2026-001"}</div>
              </div>
              <div>
                <div className="text-[11px] text-muted-foreground">Class & Section</div>
                <div className="font-semibold">{res.targetClass || "V"} - {res.section || "A"}</div>
              </div>
              <div>
                <div className="text-[11px] text-muted-foreground">Roll No.</div>
                <div className="font-semibold">{res.rollNo || "01"}</div>
              </div>
              <div>
                <div className="text-[11px] text-muted-foreground">Receipt No.</div>
                <div className="font-mono text-xs">{res.receiptNo || "REC-0001"}</div>
              </div>
              <div>
                <div className="text-[11px] text-muted-foreground">Fee Status</div>
                <div className="font-bold text-emerald-600 dark:text-emerald-400">
                  {res.totalFee ? `₹${res.totalFee} Paid` : "Paid"}
                </div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-3 pt-2">
          <Button
            variant="outline"
            className="flex-1 gap-2"
            onClick={handlePrint}
          >
            <Printer className="w-4 h-4" />
            Print Invoice
          </Button>
          <Button
            className="flex-1 gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
            onClick={handleNewAdmission}
          >
            <PlusCircle className="w-4 h-4" />
            New Admission
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
