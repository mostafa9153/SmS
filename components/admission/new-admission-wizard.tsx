"use client";

import React, { useState, useEffect } from "react";
import { Step1ModeSelect } from "./steps/step1-mode-select";
import { Step2Online } from "./steps/step2-online";
import { Step2Offline } from "./steps/step2-offline";
import { Step3Review } from "./steps/step3-review";
import { Step4Finalize } from "./steps/step4-finalize";
import { Step4SuccessDialog } from "./steps/step4-success";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, Check, Calendar } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function NewAdmissionWizard({ onOpenDashboard }: { onOpenDashboard: () => void }) {
  const [step, setStep] = useState(1);
  const [mode, setMode] = useState<"online" | "offline" | null>(null);
  const [academicYear, setAcademicYear] = useState<string>("2026");
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
          if (parsed.academicYear) setAcademicYear(parsed.academicYear);
          // If the previous state had an admission result, success modal, or was step 4, do NOT restore it
          if (parsed.admissionResult || parsed.showSuccessModal || parsed.step === 4) {
            localStorage.removeItem("sms_new_admission_wizard_state");
            localStorage.removeItem("sms_new_admission_step4_draft");
            localStorage.removeItem("sms_new_admission_offline_entry_draft");
            setStep(1);
            setMode(null);
            setAppData(null);
            setAdmissionResult(null);
            setShowSuccessModal(false);
          } else {
            if (parsed.step) setStep(parsed.step);
            if (parsed.mode) setMode(parsed.mode);
            if (parsed.appData) setAppData(parsed.appData);
          }
        }
      } catch (e) {
        console.warn("Could not restore wizard state:", e);
      } finally {
        setIsLoaded(true);
      }
    }
  }, []);

  // Save wizard state on change (only save active pre-admission progress)
  useEffect(() => {
    if (isLoaded && typeof window !== "undefined") {
      try {
        if (!admissionResult && !showSuccessModal && step > 1 && step < 4) {
          localStorage.setItem(
            "sms_new_admission_wizard_state",
            JSON.stringify({ step, mode, academicYear, appData })
          );
        } else if (step === 1 || admissionResult || showSuccessModal) {
          localStorage.removeItem("sms_new_admission_wizard_state");
        }
      } catch (e) {
        console.warn("Could not save wizard state:", e);
      }
    }
  }, [step, mode, academicYear, appData, admissionResult, showSuccessModal, isLoaded]);

  const handleRestart = () => {
    setStep(1);
    setMode(null);
    setAppData(null);
    setAdmissionResult(null);
    setShowSuccessModal(false);
    if (typeof window !== "undefined") {
      localStorage.removeItem("sms_new_admission_wizard_state");
      localStorage.removeItem("sms_new_admission_step4_draft");
      localStorage.removeItem("sms_new_admission_offline_entry_draft");
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
    <div className="w-full max-w-[1500px] mx-auto border rounded-xl bg-card shadow-xs relative">
      {/* Header */}
      <div className="flex justify-between items-center px-4 sm:px-6 py-3.5 sm:py-4 border-b bg-muted/20">
        <div className="flex items-center gap-2 sm:gap-3">
          <h1 className="text-base sm:text-xl font-bold tracking-tight text-foreground">New Admission</h1>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* Academic Year Selector Dropdown */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-muted-foreground hidden sm:inline">Session:</span>
            <Select value={academicYear} onValueChange={(val) => val && setAcademicYear(val)}>
              <SelectTrigger className="h-8 w-[125px] sm:w-[155px] text-xs font-bold bg-background shadow-2xs border-border/80 cursor-pointer">
                <Calendar className="w-3.5 h-3.5 text-primary shrink-0 mr-1" />
                <SelectValue placeholder="Select Year" />
              </SelectTrigger>
              <SelectContent align="end">
                <SelectItem value="2026" className="text-xs font-medium cursor-pointer">
                  2026 (Current)
                </SelectItem>
                <SelectItem value="2027" className="text-xs font-medium cursor-pointer">
                  2027 (Next Year)
                </SelectItem>
                <SelectItem value="2025" className="text-xs font-medium cursor-pointer">
                  2025 (Previous)
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button onClick={onOpenDashboard} variant="outline" size="sm" className="gap-1.5 sm:gap-2 rounded-lg h-8 px-2.5 sm:px-3 text-xs font-semibold shadow-2xs hover:bg-muted cursor-pointer">
            <LayoutDashboard className="w-3.5 h-3.5 text-primary" />
            <span className="hidden sm:inline">Dashboard</span>
          </Button>
        </div>
      </div>
      
      {/* Connected Line Stepper Bar */}
      {step < 5 && (
        <div className="bg-muted/10 px-2 sm:px-8 py-3 sm:py-4 border-b">
          <div className="max-w-2xl mx-auto flex items-center justify-between">
            {steps.map((s, idx) => {
              const isCompleted = step > s.num;
              const isCurrent = step === s.num;
              const hasNext = idx < steps.length - 1;

              return (
                <React.Fragment key={s.num}>
                  {/* Step Node */}
                  <div className="flex flex-col items-center gap-1 group min-w-[38px] sm:min-w-[70px] text-center">
                    <div
                      className={cn(
                        "w-6 h-6 sm:w-9 sm:h-9 rounded-full flex items-center justify-center font-bold text-[10px] sm:text-sm transition-all duration-200",
                        isCompleted
                          ? "bg-emerald-600 text-white shadow-xs"
                          : isCurrent
                          ? "bg-primary text-primary-foreground ring-2 ring-primary/20 shadow-xs"
                          : "bg-muted text-muted-foreground border"
                      )}
                    >
                      {isCompleted ? <Check className="w-3.5 h-3.5 stroke-[2.5]" /> : s.num}
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

                  {/* Connecting Line between steps */}
                  {hasNext && (
                    <div className="flex-1 mx-1 sm:mx-3 -mt-3 sm:-mt-5 flex items-center">
                      <div className="w-full h-0.5 sm:h-1 bg-muted rounded-full overflow-hidden">
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

      <div className="p-3 sm:p-6 lg:p-8 pb-28 sm:pb-8">
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
            academicYear={academicYear}
            onBack={() => setStep(1)}
            onNext={(data) => {
              setAppData({ ...data, academicYear: data?.academicYear || academicYear });
              setStep(3);
            }}
          />
        )}
        {step === 2 && mode === "offline" && (
          <Step2Offline
            academicYear={academicYear}
            onBack={() => setStep(1)}
            onNext={(data) => {
              setAppData({ ...data, academicYear: data?.academicYear || academicYear });
              setStep(3);
            }}
          />
        )}
        {step === 3 && (
          <Step3Review
            appData={{ ...appData, academicYear: appData?.academicYear || academicYear }}
            onBack={() => setStep(2)}
            onNext={(data) => {
              setAppData({ ...data, academicYear: data?.academicYear || academicYear });
              setStep(4);
            }}
          />
        )}
        {step === 4 && (
          <Step4Finalize
            appData={{ ...appData, academicYear: appData?.academicYear || academicYear }}
            academicYear={academicYear}
            onBack={() => setStep(3)}
            onAdmit={(res) => {
              setAdmissionResult(res);
              setShowSuccessModal(true);
              if (typeof window !== "undefined") {
                localStorage.removeItem("sms_new_admission_wizard_state");
                localStorage.removeItem("sms_new_admission_step4_draft");
                localStorage.removeItem("sms_new_admission_offline_entry_draft");
                localStorage.removeItem("sms_admission_apply_draft");
              }
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
