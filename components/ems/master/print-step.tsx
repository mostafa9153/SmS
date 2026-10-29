"use client";

import { Button } from "@/components/ui/button";
import { ArrowLeft, Printer } from "lucide-react";
import { EmsPrintStudio } from "@/components/ems/print/ems-print-studio";

import type { EmsMasterState } from "./use-ems-master";

export function PrintStep({ ems }: { ems: EmsMasterState }) {
  const { examStartTime, generatedAllocation, routinesByClass, setStep } = ems;
  return (
    generatedAllocation ? (
      <EmsPrintStudio
        allocation={{
          ...generatedAllocation,
          routinesByClass: generatedAllocation.routinesByClass || routinesByClass,
          examStartTime: generatedAllocation.examStartTime || examStartTime,
        }}
        onBackToStep4={() => setStep(4)}
      />
    ) : (
      <div className="p-10 text-center border border-dashed rounded-2xl bg-muted/10 space-y-3">
        <Printer className="h-8 w-8 text-muted-foreground mx-auto mb-1" />
        <p className="text-sm font-semibold text-foreground">No Active Seating Allocation</p>
        <p className="text-xs text-muted-foreground">
          Please complete Step 3 and Step 4 to generate exam seat allocation.
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setStep(3)}
          className="text-xs font-semibold gap-1.5 cursor-pointer"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Return to Room Setup
        </Button>
      </div>
    )
  );
}
