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
import { Printer, UserPlus, Copy, Check, Sparkles, Receipt, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

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
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Play satisfying Google Pay / UPI style 2-tone success chime
  useEffect(() => {
    if (open) {
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          const ctx = new AudioCtx();
          const now = ctx.currentTime;

          // Master gain
          const masterGain = ctx.createGain();
          masterGain.gain.setValueAtTime(0.12, now);
          masterGain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
          masterGain.connect(ctx.destination);

          // Tone 1 (E5: 659.25Hz)
          const osc1 = ctx.createOscillator();
          osc1.type = "sine";
          osc1.frequency.setValueAtTime(659.25, now);
          osc1.connect(masterGain);
          osc1.start(now);
          osc1.stop(now + 0.18);

          // Tone 2 (B5: 987.77Hz)
          const osc2 = ctx.createOscillator();
          osc2.type = "sine";
          osc2.frequency.setValueAtTime(987.77, now + 0.12);
          osc2.connect(masterGain);
          osc2.start(now + 0.12);
          osc2.stop(now + 0.55);
        }
      } catch (e) {
        // AudioContext blocked by policy or unsupported; ignore silently
      }
    }
  }, [open]);

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    toast.success(`Copied ${field}: ${text}`);
    setTimeout(() => setCopiedField(null), 2000);
  };

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
      <DialogContent className="max-w-md w-[92vw] sm:w-[460px] p-0 overflow-hidden rounded-3xl bg-background border-2 border-emerald-500/30 shadow-2xl animate-in zoom-in-90 duration-300">
        {/* Animated Background Aura */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-64 h-64 bg-gradient-to-b from-emerald-500/20 via-teal-500/10 to-transparent rounded-full blur-3xl pointer-events-none" />

        {/* Celebration Particles */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-8 left-10 w-2 h-2 rounded-full bg-emerald-400 animate-ping opacity-75" />
          <div className="absolute top-12 right-12 w-2.5 h-2.5 rounded-full bg-teal-400 animate-pulse opacity-80" />
          <div className="absolute top-20 left-1/4 w-1.5 h-1.5 rounded-full bg-amber-400 animate-bounce opacity-70" />
          <div className="absolute top-16 right-1/4 w-2 h-2 rounded-full bg-blue-400 animate-pulse opacity-75" />
        </div>

        <div className="p-6 sm:p-7 space-y-5 text-center relative z-10">
          {/* UPI-Style Satisfying Dynamic Checkmark */}
          <div className="relative flex items-center justify-center my-2">
            {/* Outer Sonar Ring 1 */}
            <div className="absolute w-24 h-24 rounded-full bg-emerald-500/15 animate-ping duration-1000" />
            {/* Outer Sonar Ring 2 */}
            <div className="absolute w-20 h-20 rounded-full bg-emerald-500/25 animate-pulse duration-700" />

            {/* Glowing Center Badge */}
            <div className="relative w-16 h-16 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/35 border-4 border-white dark:border-slate-900 transition-transform hover:scale-105 active:scale-95 duration-200">
              {/* Animated SVG Checkmark */}
              <svg
                className="w-8 h-8 text-white stroke-current"
                viewBox="0 0 24 24"
                fill="none"
                strokeWidth="3.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path
                  d="M5 13l4 4L19 7"
                  className="animate-[dash_0.5s_cubic-bezier(0.65,0,0.45,1)_forwards]"
                  style={{
                    strokeDasharray: 24,
                    strokeDashoffset: 0,
                  }}
                />
              </svg>
            </div>
          </div>

          <DialogHeader className="space-y-1">
            <DialogTitle className="text-2xl sm:text-3xl font-black tracking-tight text-foreground bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 dark:from-emerald-400 dark:to-teal-300 bg-clip-text text-transparent">
              Admission Confirmed
            </DialogTitle>
          </DialogHeader>

          {/* Student Receipt Summary Card */}
          <div className="p-4 sm:p-5 rounded-2xl bg-card border border-emerald-500/20 shadow-xs space-y-3.5 text-left text-xs transition-all hover:border-emerald-500/40">
            {/* Student Name Banner */}
            <div className="flex items-center justify-between pb-3 border-b border-border/80">
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
                Student Name
              </span>
              <span className="font-black text-sm sm:text-base text-foreground uppercase truncate max-w-[200px]">
                {res.studentName || "New Student"}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3.5">
              {/* School ID with 1-click Copy */}
              <div
                onClick={() => handleCopy(res.schoolId || "MHS-2026-V-001", "School ID")}
                className="p-2 rounded-xl bg-muted/40 hover:bg-muted/70 border border-border/60 transition-colors cursor-pointer group"
                title="Click to copy School ID"
              >
                <div className="flex items-center justify-between text-[10px] text-muted-foreground font-medium mb-0.5">
                  <span>School ID</span>
                  {copiedField === "School ID" ? (
                    <Check className="w-3 h-3 text-emerald-600" />
                  ) : (
                    <Copy className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  )}
                </div>
                <div className="font-mono font-black text-xs text-primary truncate">
                  {res.schoolId || "MHS-2026-V-001"}
                </div>
              </div>

              {/* Form Number */}
              <div
                onClick={() => handleCopy(res.formNo || "FRM-2026-001", "Form Number")}
                className="p-2 rounded-xl bg-muted/40 hover:bg-muted/70 border border-border/60 transition-colors cursor-pointer group"
                title="Click to copy Form Number"
              >
                <div className="flex items-center justify-between text-[10px] text-muted-foreground font-medium mb-0.5">
                  <span>Form Number</span>
                  {copiedField === "Form Number" ? (
                    <Check className="w-3 h-3 text-emerald-600" />
                  ) : (
                    <Copy className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  )}
                </div>
                <div className="font-mono font-bold text-xs text-foreground truncate">
                  {res.formNo || "FRM-2026-001"}
                </div>
              </div>

              {/* Class & Section */}
              <div className="p-2 rounded-xl bg-muted/20 border border-border/40">
                <span className="block text-[10px] text-muted-foreground font-medium">Class & Section</span>
                <span className="font-bold text-xs text-foreground">
                  Class {res.targetClass || "V"} — {res.section || "A"}
                </span>
              </div>

              {/* Roll Number */}
              <div className="p-2 rounded-xl bg-muted/20 border border-border/40">
                <span className="block text-[10px] text-muted-foreground font-medium">Assigned Roll</span>
                <span className="font-black text-xs text-foreground font-mono">
                  #{res.rollNo || "01"}
                </span>
              </div>

              {/* Receipt Number */}
              <div className="p-2 rounded-xl bg-muted/20 border border-border/40">
                <span className="block text-[10px] text-muted-foreground font-medium">Receipt No.</span>
                <span className="font-mono text-[11px] font-semibold text-muted-foreground truncate block">
                  {res.receiptNo || "REC-0001"}
                </span>
              </div>

              {/* Fee Status */}
              <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex flex-col justify-center">
                <span className="block text-[10px] text-emerald-800 dark:text-emerald-300 font-semibold">Fee Status</span>
                <span className="font-black text-xs text-emerald-600 dark:text-emerald-400">
                  {res.totalFee ? `₹${res.totalFee} Paid` : "Paid"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <DialogFooter className="p-4 sm:p-6 pt-0 flex flex-col sm:flex-row items-center gap-2.5">
          <Button
            variant="outline"
            className="w-full sm:flex-1 h-11 rounded-xl text-xs font-bold gap-2 border-border shadow-2xs hover:bg-muted cursor-pointer"
            onClick={handlePrint}
          >
            <Printer className="w-4 h-4 text-primary" />
            <span>Print Invoice</span>
          </Button>
          <Button
            className="w-full sm:flex-1 h-11 rounded-xl text-xs font-black gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-md shadow-emerald-600/20 active:scale-95 transition-all cursor-pointer"
            onClick={handleNewAdmission}
          >
            <UserPlus className="w-4 h-4" />
            <span>New Admission</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
