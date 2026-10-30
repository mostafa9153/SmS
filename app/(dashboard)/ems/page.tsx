"use client";

import { Suspense } from "react";
import { EmsStepperMap, StepItem } from "@/components/ems/ems-stepper-map";
import { Button } from "@/components/ui/button";
import { DoorOpen } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { PageHeader } from "@/components/ui/page-header";
import { SessionStep } from "@/components/ems/master/session-step";
import { ClassesStep } from "@/components/ems/master/classes-step";
import { RoomsStep } from "@/components/ems/master/rooms-step";
import { SeatArrangementStep } from "@/components/ems/master/seat-arrangement-step";
import { PrintStep } from "@/components/ems/master/print-step";
import { EmsDialogs } from "@/components/ems/master/ems-dialogs";
import { useEmsMaster } from "@/components/ems/master/use-ems-master";

const STEPS: StepItem[] = [
  { id: 1, title: "Session & Exam" },
  { id: 2, title: "Class & Students" },
  { id: 3, title: "Room & Benches" },
  { id: 4, title: "Seat Arrangement" },
  { id: 5, title: "Print Suite" },
];

function EmsMasterPageContent() {
  const ems = useEmsMaster();
  const { completedSteps, mounted, rooms, router, setRoomsManagerOpen, setStep, step } = ems;

  if (!mounted) {
    return (
      <div className="p-3.5 sm:p-6 max-w-7xl mx-auto w-full space-y-4 sm:space-y-6 animate-pulse">
        <div className="flex items-center justify-between gap-3">
          <div className="h-8 w-64 bg-muted/60 rounded-xl" />
          <div className="h-8 w-36 bg-muted/60 rounded-xl" />
        </div>
        <div className="h-16 rounded-2xl bg-muted/40 border border-border/70" />
        <div className="h-96 rounded-2xl bg-card/60 border border-border/70 flex flex-col items-center justify-center gap-3">
          <Spinner className="h-6 w-6 text-primary/70" />
          <p className="text-xs font-medium text-muted-foreground">Loading Examination Suite...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-3.5 sm:p-6 max-w-7xl mx-auto w-full space-y-4 sm:space-y-6">
      {/* Header matching Bulk Upload with Classrooms & Halls Management Button */}
      <PageHeader
        back={() => (step > 1 ? setStep(step - 1) : router.back())}
        title="EMS — Exam Seating Management"
        actions={<Button
          type="button"
          variant="outline"
          onClick={() => setRoomsManagerOpen(true)}
          className="flex items-center gap-2 rounded-xl border border-border/80 bg-card text-foreground px-3.5 py-2 text-xs font-semibold hover:bg-muted hover:border-primary/40 transition-all shadow-2xs cursor-pointer self-start sm:self-auto"
        >
          <DoorOpen className="h-4 w-4 text-primary" />
          <span suppressHydrationWarning>Classrooms & Halls ({mounted ? rooms.length : 0})</span>
        </Button>}
      />

      {/* Stepper Progress matching Bulk Upload */}
      <EmsStepperMap
        steps={STEPS}
        currentStep={step}
        completedSteps={completedSteps}
        onStepClick={(sId) => setStep(sId)}
      />

      {step === 1 && <SessionStep ems={ems} />}

      {step === 2 && <ClassesStep ems={ems} />}

      {step === 3 && <RoomsStep ems={ems} />}

      {step === 4 && <SeatArrangementStep ems={ems} />}

      {step === 5 && <PrintStep ems={ems} />}

      <EmsDialogs ems={ems} />
    </div>
  );
}

export default function EmsMasterPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
          <Spinner className="h-4 w-4 text-primary" />
          <span>Loading Examination Management System...</span>
        </div>
      }
    >
      <EmsMasterPageContent />
    </Suspense>
  );
}
