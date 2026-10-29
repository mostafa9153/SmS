import React from "react";
import { type AdmissionFormData } from "@/lib/validations/admission-form-schema";


export interface AdmissionApplicationFormProps {
  initialData?: Record<string, any>;
  aiExtractedData?: Record<string, any>;
  onSubmit: (data: AdmissionFormData) => Promise<void> | void;
  submitButtonText?: string;
  isSubmitting?: boolean;
  mode?: "public" | "offline" | "review";
  checklist?: React.ReactNode;
  /** Enables refresh-safe drafts, scoped to this key (e.g. `readmission:<studentId>`). Callers clear it on success. */
  draftKey?: string;
}
