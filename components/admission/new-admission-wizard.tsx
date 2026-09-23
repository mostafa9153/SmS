"use client";

import React, { useState, useEffect } from "react";
import { Step1ModeSelect } from "./steps/step1-mode-select";
import { Step2Online } from "./steps/step2-online";
import { Step2Offline } from "./steps/step2-offline";
import { Step3Review } from "./steps/step3-review";
import { Step4Finalize } from "./steps/step4-finalize";
import { Step4SuccessDialog } from "./steps/step4-success";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export function NewAdmissionWizard({ onOpenDashboard }: { onOpenDashboard: () => void }) {
  const [step, setStep] = useState(1);
  const [mode, setMode] = useState<"online" | "offline" | null>(null);
  const [appData, setAppData] = useState<any>(null);
  const [admissionResult, setAdmissionResult] = useState<any>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // Restore wizard state on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("sms_new_admission_wizard_state");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.step) setStep(parsed.step);
          if (parsed.mode) setMode(parsed.mode);
          if (parsed.appData) setAppData(parsed.appData);
          if (parsed.admissionResult) setAdmissionResult(parsed.admissionResult);
          if (parsed.showSuccessModal) setShowSuccessModal(parsed.showSuccessModal);
        }
      } catch (e) {
        console.warn("Could not restore wizard state:", e);
      } finally {
        setIsLoaded(true);
      }
    }
  }, []);

  // Save wizard state on change
  useEffect(() => {
    if (isLoaded && typeof window !== "undefined") {
      try {
        localStorage.setItem(
          "sms_new_admission_wizard_state",
          JSON.stringify({ step, mode, appData, admissionResult, showSuccessModal })
        );
      } catch (e) {
        console.warn("Could not save wizard state:", e);
      }
    }
  }, [step, mode, appData, admissionResult, showSuccessModal, isLoaded]);

  const handleRestart = () => {
    setStep(1);
    setMode(null);
    setAppData(null);
    setAdmissionResult(null);
    setShowSuccessModal(false);
    if (typeof window !== "undefined") {
      localStorage.removeItem("sms_new_admission_wizard_state");
      localStorage.removeItem("sms_admission_apply_draft");
      localStorage.removeItem("sms_admission_saved_sections");
    }
  };

  const steps = [
    { num: 1, title: "Mode" },
    { num: 2, title: "Form Entry" },
    { num: 3, title: "Verification" },
    { num: 4, title: "Finalize" },
  ];

  return (
    <div className="w-full max-w-[1500px] mx-auto border rounded-xl bg-card shadow-xs overflow-hidden">
      {/* Header */}
      <div className="flex justify-between items-center px-6 py-4 border-b bg-muted/20">
        <div>
          <h1 className="text-lg sm:text-xl font-bold tracking-tight text-foreground">New Admission</h1>
        </div>
        <Button onClick={onOpenDashboard} variant="outline" size="sm" className="gap-2 rounded-lg h-8 px-3 text-xs font-semibold shadow-2xs hover:bg-muted">
          <LayoutDashboard className="w-3.5 h-3.5 text-primary" />
          <span>Dashboard</span>
        </Button>
      </div>
      
      {/* Connected Line Stepper Bar */}
      {step < 5 && (
        <div className="bg-muted/10 px-4 sm:px-8 py-4 border-b">
          <div className="max-w-2xl mx-auto flex items-center justify-between">
            {steps.map((s, idx) => {
              const isCompleted = step > s.num;
              const isCurrent = step === s.num;
              const hasNext = idx < steps.length - 1;

              return (
                <React.Fragment key={s.num}>
                  {/* Step Node */}
                  <div className="flex flex-col items-center gap-1.5 group min-w-[50px] sm:min-w-[70px] text-center">
                    <div
                      className={cn(
                        "w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center font-bold text-xs sm:text-sm transition-all duration-200",
                        isCompleted
                          ? "bg-emerald-600 text-white shadow-xs"
                          : isCurrent
                          ? "bg-primary text-primary-foreground ring-2 ring-primary/20 shadow-xs"
                          : "bg-muted text-muted-foreground border"
                      )}
                    >
                      {isCompleted ? <Check className="w-4 h-4 stroke-[2.5]" /> : s.num}
                    </div>

                    <span
                      className={cn(
                        "text-xs font-semibold transition-colors",
                        isCurrent ? "text-primary font-bold" : isCompleted ? "text-foreground" : "text-muted-foreground"
                      )}
                    >
                      {s.title}
                    </span>
                  </div>

                  {/* Connecting Line between steps */}
                  {hasNext && (
                    <div className="flex-1 mx-2 sm:mx-3 -mt-5 flex items-center">
                      <div className="w-full h-1 bg-muted rounded-full overflow-hidden">
                        <div
                          className={cn(
                            "h-full transition-all duration-300 ease-out",
                            step > s.num ? "w-full bg-emerald-500" : "w-0 bg-primary"
                          )}
                        />
                      </div>
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      )}

      <div className="p-4 sm:p-6 lg:p-8">
        {step === 1 && (
          <Step1ModeSelect
            onNext={(m) => {
              setMode(m);
              setStep(2);
            }}
          />
        )}
        {step === 2 && mode === "online" && (
          <Step2Online
            onBack={() => setStep(1)}
            onNext={(data) => {
              setAppData(data);
              setStep(3);
            }}
          />
        )}
        {step === 2 && mode === "offline" && (
          <Step2Offline
            onBack={() => setStep(1)}
            onNext={(data) => {
              setAppData(data);
              setStep(3);
            }}
          />
        )}
        {step === 3 && (
          <Step3Review
            appData={appData}
            onBack={() => setStep(2)}
            onNext={(data) => {
              setAppData(data);
              setStep(4);
            }}
          />
        )}
        {step === 4 && (
          <Step4Finalize
            appData={appData}
            onBack={() => setStep(3)}
            onAdmit={(res) => {
              setAdmissionResult(res);
              setShowSuccessModal(true);
            }}
          />
        )}

        {/* Success Popup Dialog */}
        <Step4SuccessDialog
          open={showSuccessModal}
          onOpenChange={setShowSuccessModal}
          result={admissionResult}
          onRestart={handleRestart}
        />
      </div>
    </div>
  );
}
