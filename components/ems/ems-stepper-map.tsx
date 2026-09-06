"use client";

import React from "react";
import { CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface StepItem {
  id: number;
  title: string;
}

interface EmsStepperMapProps {
  steps: StepItem[];
  currentStep: number;
  completedSteps: number[];
  onStepClick: (stepId: number) => void;
}

export function EmsStepperMap({
  steps,
  currentStep,
  completedSteps,
  onStepClick,
}: EmsStepperMapProps) {
  return (
    <div className="rounded-xl border bg-card p-3.5 sm:p-4 shadow-xs">
      <div className="flex items-center gap-0">
        {steps.map((s, idx) => {
          const isDone = completedSteps.includes(s.id);
          const isCurrent = currentStep === s.id;
          const isClickable = isDone || s.id <= Math.max(...completedSteps, 1);

          return (
            <div key={s.id} className="flex items-center flex-1 last:flex-none">
              <div
                onClick={() => isClickable && onStepClick(s.id)}
                className={cn(
                  "flex items-center gap-2 select-none",
                  isClickable ? "cursor-pointer group" : "cursor-not-allowed opacity-60"
                )}
              >
                <div
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold border-2 transition-colors",
                    isDone
                      ? "bg-primary border-primary text-primary-foreground"
                      : isCurrent
                      ? "border-primary text-primary bg-primary/10"
                      : "border-muted-foreground/30 text-muted-foreground/50"
                  )}
                >
                  {isDone ? <CheckCircle2 className="h-4 w-4" /> : s.id}
                </div>
                <span
                  className={cn(
                    "text-xs font-medium hidden sm:block",
                    isCurrent
                      ? "text-foreground font-semibold"
                      : isDone
                      ? "text-foreground group-hover:text-primary"
                      : "text-muted-foreground"
                  )}
                >
                  {s.title}
                </span>
              </div>
              {idx < steps.length - 1 && (
                <div
                  className={cn("flex-1 h-px mx-3", isDone ? "bg-primary" : "bg-border")}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
