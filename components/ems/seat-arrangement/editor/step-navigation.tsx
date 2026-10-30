"use client";

import { Button } from "@/components/ui/button";
import { ArrowRight, ArrowLeft, Printer } from "lucide-react";

import type { SeatEditorState } from "./use-seat-arrangement-editor";

export function StepNavigation({ seat }: { seat: SeatEditorState }) {
  const { handleCommitToStep5, onBackToStep3 } = seat;
  return (
    <div className="pt-3 border-t border-border/60 flex items-center justify-between">
      <Button
        variant="outline"
        size="sm"
        onClick={onBackToStep3}
        className="text-xs font-semibold gap-1.5 cursor-pointer shadow-2xs hover:border-primary/40"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to Room Setup
      </Button>

      <Button
        size="sm"
        onClick={handleCommitToStep5}
        className="text-xs font-bold gap-1.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white cursor-pointer shadow-md hover:scale-[1.01] active:scale-[0.98] transition-all px-4"
      >
        <Printer className="h-3.5 w-3.5" />
        <span>Proceed to Print Suite</span>
        <ArrowRight className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
