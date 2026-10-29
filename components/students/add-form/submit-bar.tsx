"use client";

import { CheckCircle2 } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";

import type { StudentAddEditFormState } from "./use-student-add-edit-form";

export function SubmitBar({ sf }: { sf: StudentAddEditFormState }) {
  const { isEmbedded, mutation, router, submitButtonText } = sf;
  return (
    <div className="flex gap-3 pt-2">
      <button
        type="submit"
        disabled={mutation.isPending}
        className="flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-xs sm:text-sm font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-colors shadow-sm cursor-pointer"
      >
        {mutation.isPending ? <Spinner className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
        {mutation.isPending ? "Saving Record…" : (submitButtonText || "Save Student Record")}
      </button>
      {!isEmbedded && (
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-xl border px-4 py-2.5 text-xs sm:text-sm font-semibold hover:bg-muted transition-colors cursor-pointer"
        >
          Cancel
        </button>
      )}
    </div>
  );
}
