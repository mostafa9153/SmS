"use client";

import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";

import type { AdmissionFormState } from "./use-admission-form";

export function SubmitBar({ form }: { form: AdmissionFormState }) {
  const { isSubmitting, submitButtonText } = form;
  return (
    <div className="pt-4 pb-8 sm:pb-4 w-full">
      <Button
        type="submit"
        size="lg"
        disabled={isSubmitting}
        className="w-full text-sm sm:text-base md:text-lg h-12 sm:h-14 font-bold gap-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-600 hover:from-blue-700 hover:to-emerald-700 text-white shadow-lg shadow-indigo-500/20 transition-all active:scale-[0.99] cursor-pointer rounded-xl sm:rounded-2xl px-3 sm:px-6"
      >
        {isSubmitting ? (
          <>
            <Spinner className="h-5 w-5 shrink-0" />
            <span className="truncate">আবেদন জমা হচ্ছে… (Processing…)</span>
          </>
        ) : (
          <>
            <CheckCircle2 className="h-5 w-5 shrink-0 text-white" />
            <span className="truncate">{submitButtonText}</span>
          </>
        )}
      </Button>
    </div>
  );
}
