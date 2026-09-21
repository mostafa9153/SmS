"use client";

import React, { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Printer, Check, FileText, ArrowRight, X } from "lucide-react";
import { InvoicePrintableView } from "@/components/invoice/invoice-printable-view";
import { type InvoiceData } from "@/lib/utils/fee-config";

interface AdmissionSuccessDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentName: string;
  className: string;
  section: string;
  roll: number;
  receiptNo: string;
  feeAmount: number;
  stream?: string;
  guardianName?: string;
  contactNumber?: string;
  onViewForm?: () => void;
}

export function AdmissionSuccessDialog({
  open,
  onOpenChange,
  studentName,
  className,
  section,
  roll,
  receiptNo,
  feeAmount,
  stream,
  guardianName,
  contactNumber,
  onViewForm,
}: AdmissionSuccessDialogProps) {
  const [showPrintModal, setShowPrintModal] = useState<boolean>(false);
  const currentYear = new Date().getFullYear();

  const invoiceData: InvoiceData = useMemo(() => ({
    invoiceNumber: receiptNo || `REC-${Math.abs(roll * 1000 + (feeAmount || 0)).toString().padStart(6, "0")}`,
    issueDate: new Date().toISOString().split("T")[0],
    issueTime: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true }),
    academicSession: `${currentYear} – ${currentYear + 1}`,
    studentName: studentName || "Student",
    studentClass: className || "V",
    section: section || "A",
    rollNo: String(roll || 1),
    guardianName: guardianName || "",
    contactNumber: contactNumber || "",
    feeItems: [
      {
        id: "admission-fee",
        name: `Admission & Session Fee (${className}${stream ? ` - ${stream}` : ""})`,
        amount: Number(feeAmount) || 0,
      },
    ],
    paymentMode: "Cash",
    paymentStatus: feeAmount > 0 ? "Paid" : "Paid",
    remarks: `New Admission (${currentYear}) - Staging Queue`,
  }), [receiptNo, roll, feeAmount, currentYear, studentName, className, section, guardianName, contactNumber, stream]);

  const handlePrintNow = () => {
    setShowPrintModal(true);
    setTimeout(() => {
      window.print();
    }, 400);
  };

  return (
    <>
      <Dialog open={open && !showPrintModal} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md w-[95vw] p-5 sm:p-6 rounded-3xl border-2 border-emerald-500/20 shadow-2xl">
          <div className="flex flex-col items-center text-center space-y-3 pt-2">
            <div className="h-14 w-14 rounded-full bg-emerald-100 dark:bg-emerald-950/60 border-2 border-emerald-500/40 flex items-center justify-center text-emerald-600 shadow-sm animate-in zoom-in-50 duration-300">
              <CheckCircle2 className="h-8 w-8" />
            </div>

            <DialogHeader>
              <DialogTitle className="text-xl font-black text-foreground tracking-tight">
                Admission Successful!
              </DialogTitle>
              <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                Student has been admitted into the staging queue with assigned roll and generated fee invoice.
              </p>
            </DialogHeader>

            {/* Student Summary Card */}
            <div className="w-full bg-muted/50 dark:bg-muted/20 border rounded-2xl p-4 text-left space-y-2 mt-1">
              <div className="flex items-center justify-between border-b pb-2">
                <span className="text-xs text-muted-foreground font-semibold">Student Name:</span>
                <span className="text-sm font-black text-foreground">{studentName}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 border-b pb-2 text-center">
                <div className="bg-background rounded-xl p-1.5 border">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold block">Class</span>
                  <span className="text-xs font-black text-purple-600 dark:text-purple-400">
                    {className} {stream ? `(${stream})` : ""}
                  </span>
                </div>
                <div className="bg-background rounded-xl p-1.5 border">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold block">Section</span>
                  <span className="text-xs font-black text-blue-600 dark:text-blue-400">{section}</span>
                </div>
                <div className="bg-background rounded-xl p-1.5 border">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold block">Roll No</span>
                  <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">#{roll}</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-xs text-muted-foreground font-semibold">Receipt No:</span>
                <span className="text-xs font-mono font-black text-foreground bg-background px-2 py-0.5 rounded-lg border">
                  {receiptNo}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground font-semibold">Fee Paid:</span>
                <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                  ₹{feeAmount.toLocaleString("en-IN")}
                </span>
              </div>
            </div>
          </div>

          <DialogFooter className="flex flex-col sm:flex-row items-center gap-2 pt-3 border-t mt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="w-full sm:w-auto rounded-xl text-xs font-semibold order-2 sm:order-1 cursor-pointer"
            >
              Done (Queue for Batch Print)
            </Button>

            <Button
              onClick={handlePrintNow}
              size="sm"
              className="w-full sm:w-auto rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white gap-1.5 order-1 sm:order-2 shadow-md cursor-pointer"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Print Invoice Now</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Full-screen Printable Invoice Viewer Modal */}
      {showPrintModal && (
        <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm overflow-y-auto p-4 flex flex-col items-center">
          <div className="w-full max-w-4xl flex items-center justify-between mb-4 border-b pb-3 print:hidden">
            <div className="flex items-center gap-2">
              <Printer className="h-5 w-5 text-purple-600" />
              <h2 className="text-base font-black">Admission Fee Invoice Viewer</h2>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={() => window.print()}
                className="bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs gap-1.5 cursor-pointer"
              >
                <Printer className="h-3.5 w-3.5" />
                <span>Print Document</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowPrintModal(false);
                  onOpenChange(false);
                }}
                className="rounded-xl text-xs cursor-pointer"
              >
                <X className="h-4 w-4 mr-1" />
                <span>Close</span>
              </Button>
            </div>
          </div>

          <div className="w-full max-w-4xl bg-white shadow-xl rounded-2xl border p-4 print:p-0 print:border-none print:shadow-none">
            <InvoicePrintableView data={invoiceData} copyType="both" />
          </div>
        </div>
      )}
    </>
  );
}
