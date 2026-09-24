"use client";

import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Check, Copy, CheckCircle2, UserPlus, Receipt, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface Step4SuccessProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  result?: any;
  onAdmitNext: () => void;
}

export function Step4SuccessDialog({
  open,
  onOpenChange,
  result,
  onAdmitNext,
}: Step4SuccessProps) {
  const router = useRouter();
  const res = result || {};
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Pleasant audio chime on success
  useEffect(() => {
    if (open) {
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          const ctx = new AudioCtx();
          const now = ctx.currentTime;

          const masterGain = ctx.createGain();
          masterGain.gain.setValueAtTime(0.12, now);
          masterGain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
          masterGain.connect(ctx.destination);

          const osc1 = ctx.createOscillator();
          osc1.type = "sine";
          osc1.frequency.setValueAtTime(659.25, now);
          osc1.connect(masterGain);
          osc1.start(now);
          osc1.stop(now + 0.18);

          const osc2 = ctx.createOscillator();
          osc2.type = "sine";
          osc2.frequency.setValueAtTime(987.77, now + 0.12);
          osc2.connect(masterGain);
          osc2.start(now + 0.12);
          osc2.stop(now + 0.55);
        }
      } catch (e) {
        // Silently ignore audio block
      }
    }
  }, [open]);

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    toast.success(`Copied ${field}: ${text}`);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleGoToInvoices = () => {
    onOpenChange(false);
    router.push("/admission/invoices");
  };

  const handleNextStudent = () => {
    onOpenChange(false);
    onAdmitNext();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md w-[92vw] sm:w-[440px] p-0 overflow-hidden rounded-2xl bg-background border shadow-xl">
        <div className="p-6 flex flex-col items-center text-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center border border-emerald-500/20 shadow-xs">
            <CheckCircle2 className="w-7 h-7" />
          </div>

          <div className="space-y-1">
            <h2 className="text-base sm:text-lg font-bold text-foreground">Re-Admission Complete</h2>
            <p className="text-xs font-semibold text-primary">{res.studentName || "Student"}</p>
          </div>

          {/* Details summary card */}
          <div className="w-full bg-muted/40 rounded-xl p-3.5 border space-y-2 text-left text-xs">
            <div className="flex justify-between items-center py-1 border-b border-border/60">
              <span className="text-muted-foreground font-medium">Promoted Class</span>
              <span className="font-bold text-foreground">Class {res.targetClass} ({res.targetSection})</span>
            </div>

            <div className="flex justify-between items-center py-1 border-b border-border/60">
              <span className="text-muted-foreground font-medium">Assigned Roll</span>
              <span className="font-bold text-primary">Roll #{res.targetRoll}</span>
            </div>

            {res.schoolId && (
              <div className="flex justify-between items-center py-1 border-b border-border/60">
                <span className="text-muted-foreground font-medium">School ID</span>
                <button
                  type="button"
                  onClick={() => handleCopy(res.schoolId, "School ID")}
                  className="flex items-center gap-1 font-mono font-bold text-foreground hover:text-primary transition-colors cursor-pointer"
                >
                  <span>{res.schoolId}</span>
                  {copiedField === "School ID" ? (
                    <Check className="w-3 h-3 text-emerald-600" />
                  ) : (
                    <Copy className="w-3 h-3 text-muted-foreground" />
                  )}
                </button>
              </div>
            )}

            {res.invoiceNo && (
              <div className="flex justify-between items-center py-1 border-b border-border/60">
                <span className="text-muted-foreground font-medium">Invoice No</span>
                <button
                  type="button"
                  onClick={() => handleCopy(res.invoiceNo, "Invoice No")}
                  className="flex items-center gap-1 font-mono font-bold text-foreground hover:text-primary transition-colors cursor-pointer"
                >
                  <span>{res.invoiceNo}</span>
                  {copiedField === "Invoice No" ? (
                    <Check className="w-3 h-3 text-emerald-600" />
                  ) : (
                    <Copy className="w-3 h-3 text-muted-foreground" />
                  )}
                </button>
              </div>
            )}

            {res.feeAmount !== undefined && (
              <div className="flex justify-between items-center py-1">
                <span className="text-muted-foreground font-medium">Fee Recorded</span>
                <span className="font-bold text-emerald-600">₹{res.feeAmount}</span>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="grid grid-cols-2 gap-2.5 w-full pt-1">
            <Button
              onClick={handleGoToInvoices}
              variant="outline"
              size="sm"
              className="h-9 text-xs font-semibold gap-1.5"
            >
              <Receipt className="w-3.5 h-3.5" />
              <span>Invoice Queue</span>
            </Button>

            <Button
              onClick={handleNextStudent}
              size="sm"
              className="h-9 text-xs font-semibold gap-1.5 bg-primary text-primary-foreground"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Admit Next</span>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
