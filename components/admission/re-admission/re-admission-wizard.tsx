"use client";

import React, { useState, useEffect } from "react";
import { Step1ModeSelect } from "./steps/step1-mode";
import { Step2Offline } from "./steps/step2-offline";
import { Step2Online } from "./steps/step2-online";
import { Step3Review } from "./steps/step3-review";
import { Step4Finalize } from "./steps/step4-finalize";
import { Step4SuccessDialog } from "./steps/step4-success";
import { ReAdmissionDashboard } from "./re-admission-dashboard";
import { Button } from "@/components/ui/button";
import { Check, Receipt, RotateCcw, LayoutDashboard } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

import { useSearchParams } from "next/navigation";

export function ReAdmissionWizard() {
  const searchParams = useSearchParams();
  const urlClass = searchParams.get("class");
  const urlSection = searchParams.get("section");

  const [step, setStep] = useState(1);
  const [mode, setMode] = useState<"online" | "offline" | null>(null);
  const [studentData, setStudentData] = useState<any>(null);
  const [admissionResult, setAdmissionResult] = useState<any>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // Restore wizard state on mount if saved
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        if (urlClass) {
          setMode("offline");
          setStep(2);
        } else {
          const saved = localStorage.getItem("sms_readmission_wizard_state");
          if (saved) {
            const parsed = JSON.parse(saved);
            if (parsed.admissionResult || parsed.showSuccessModal || parsed.step === 4) {
              localStorage.removeItem("sms_readmission_wizard_state");
              setStep(1);
              setMode(null);
              setStudentData(null);
              setAdmissionResult(null);
              setShowSuccessModal(false);
            } else {
              if (parsed.step) setStep(parsed.step);
              if (parsed.mode) setMode(parsed.mode);
              if (parsed.studentData) setStudentData(parsed.studentData);
            }
          }
        }
      } catch (e) {
        console.warn("Could not restore re-admission state:", e);
      } finally {
        setIsLoaded(true);
      }
    }
  }, [urlClass]);

  // Save state on change
  useEffect(() => {
    if (isLoaded && typeof window !== "undefined") {
      try {
        if (!admissionResult && !showSuccessModal && step > 1 && step < 4) {
          localStorage.setItem(
            "sms_readmission_wizard_state",
            JSON.stringify({ step, mode, studentData })
          );
        } else if (step === 1 || admissionResult || showSuccessModal) {
          localStorage.removeItem("sms_readmission_wizard_state");
        }
      } catch (e) {
        console.warn("Could not save re-admission state:", e);
      }
    }
  }, [step, mode, studentData, admissionResult, showSuccessModal, isLoaded]);

  const handleRestart = () => {
    setStep(1);
    setMode(null);
    setStudentData(null);
    setAdmissionResult(null);
    setShowSuccessModal(false);
    if (typeof window !== "undefined") {
      localStorage.removeItem("sms_readmission_wizard_state");
    }
  };

  const handleAdmitNext = () => {
    setStudentData(null);
    setAdmissionResult(null);
    setShowSuccessModal(false);
    setStep(2); // Keep existing mode and sticky class/section
    if (typeof window !== "undefined") {
      localStorage.removeItem("sms_readmission_wizard_state");
    }
  };

  const handleSelectMode = (selectedMode: "online" | "offline") => {
    setMode(selectedMode);
    setStep(2);
  };

  const handleStep2Next = (data: any) => {
    setStudentData(data);
    setStep(3);
  };

  const handleStep3Next = (updatedData: any) => {
    setStudentData(updatedData);
    setStep(4);
  };

  const handleAdmitComplete = (result: any) => {
    setAdmissionResult(result);
    setShowSuccessModal(true);
  };

  const steps = [
    { num: 1, title: "Mode" },
    { num: 2, title: "Student" },
    { num: 3, title: "Verification" },
    { num: 4, title: "Finalize" },
  ];

  return (
    <div className="w-full max-w-[1400px] mx-auto border rounded-xl bg-card shadow-xs relative">
      {/* Header */}
      <div className="flex justify-between items-center px-3 sm:px-6 py-2.5 sm:py-3.5 border-b bg-muted/20 gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <h1 className="text-sm sm:text-lg font-bold tracking-tight text-foreground truncate">Re-Admission</h1>

          {!showDashboard && step > 1 && (
            <Button
              onClick={handleRestart}
              variant="outline"
              size="sm"
              className="h-6.5 sm:h-7 px-2 sm:px-2.5 text-[10px] sm:text-xs text-muted-foreground hover:text-foreground gap-1 border-dashed shrink-0"
              title="Reset Wizard"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </Button>
          )}
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <Button
            variant={showDashboard ? "default" : "outline"}
            size="sm"
            onClick={() => setShowDashboard(!showDashboard)}
            className="gap-1 sm:gap-1.5 rounded-lg h-7.5 sm:h-8 px-2 sm:px-3 text-[11px] sm:text-xs font-semibold"
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            <span>{showDashboard ? "Wizard" : "Dashboard"}</span>
          </Button>

          <Link href="/admission/invoices">
            <Button
              variant="outline"
              size="sm"
              className="gap-1 sm:gap-1.5 rounded-lg h-7.5 sm:h-8 px-2 sm:px-3 text-[11px] sm:text-xs font-semibold hover:bg-muted"
            >
              <Receipt className="w-3.5 h-3.5 text-primary" />
              <span>Invoices</span>
            </Button>
          </Link>
        </div>
      </div>

      {showDashboard ? (
        <div className="p-2 sm:p-6 min-h-[450px]">
          <ReAdmissionDashboard
            onClose={() => setShowDashboard(false)}
            onSelectStudentForAdmission={(student) => {
              setStudentData(student);
              setMode("offline");
              setStep(3);
              setShowDashboard(false);
            }}
          />
        </div>
      ) : (
        <>
          {/* Connected Stepper Line */}
          <div className="bg-muted/10 px-2 sm:px-8 py-2.5 sm:py-3 border-b">
            <div className="max-w-xl mx-auto flex items-center justify-between">
              {steps.map((s, idx) => {
                const isCompleted = step > s.num;
                const isCurrent = step === s.num;
                const hasNext = idx < steps.length - 1;

                return (
                  <React.Fragment key={s.num}>
                    <div className="flex flex-col items-center gap-0.5 sm:gap-1 min-w-[42px] sm:min-w-[70px] text-center">
                      <div
                        className={cn(
                          "w-6.5 h-6.5 sm:w-8 sm:h-8 rounded-full flex items-center justify-center font-bold text-[11px] sm:text-xs transition-all duration-200",
                          isCompleted
                            ? "bg-emerald-600 text-white shadow-xs"
                            : isCurrent
                            ? "bg-primary text-primary-foreground ring-2 ring-primary/20 shadow-xs"
                            : "bg-muted text-muted-foreground border"
                        )}
                      >
                        {isCompleted ? <Check className="w-3 h-3 sm:w-3.5 sm:h-3.5 stroke-[2.5]" /> : s.num}
                      </div>

                      <span
                        className={cn(
                          "text-[9px] sm:text-xs font-semibold transition-colors",
                          isCurrent ? "text-primary font-bold" : isCompleted ? "text-foreground" : "text-muted-foreground"
                        )}
                      >
                        {s.title}
                      </span>
                    </div>

                    {hasNext && (
                      <div className="flex-1 mx-1 sm:mx-2 -mt-3.5 sm:-mt-4 flex items-center">
                        <div className="w-full h-0.5 bg-muted rounded-full overflow-hidden">
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

          {/* Step Content Area */}
          <div className="p-2 sm:p-6 min-h-[420px]">
        {step === 1 && (
          <Step1ModeSelect onSelectMode={handleSelectMode} selectedMode={mode} />
        )}

        {step === 2 && mode === "offline" && (
          <Step2Offline
            onNext={handleStep2Next}
            onBack={() => setStep(1)}
            initialClass={urlClass || undefined}
            initialSection={urlSection || undefined}
          />
        )}

        {step === 2 && mode === "online" && (
          <Step2Online
            onNext={handleStep2Next}
            onBack={() => setStep(1)}
          />
        )}

        {step === 3 && (
          <Step3Review
            onBack={() => setStep(2)}
            onNext={handleStep3Next}
            mode={mode || "offline"}
            initialData={studentData}
          />
        )}

        {step === 4 && (
          <Step4Finalize
            onBack={() => setStep(3)}
            onAdmit={handleAdmitComplete}
            studentData={studentData}
          />
        )}
      </div>
      </>
      )}

      {/* Success Dialog */}
      <Step4SuccessDialog
        open={showSuccessModal}
        onOpenChange={setShowSuccessModal}
        result={admissionResult}
        onAdmitNext={handleAdmitNext}
      />
    </div>
  );
}
