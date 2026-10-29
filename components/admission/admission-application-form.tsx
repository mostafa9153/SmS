"use client";

import { type AdmissionFormData } from "@/lib/validations/admission-form-schema";

import { StepMap } from "@/components/admission/application-form/step-map";
import { StudentSection } from "@/components/admission/application-form/section-student";
import { CategoriesSection } from "@/components/admission/application-form/section-categories";
import { CwsnSection } from "@/components/admission/application-form/section-cwsn";
import { FamilySection } from "@/components/admission/application-form/section-family";
import { EnrolmentSection } from "@/components/admission/application-form/section-enrolment";
import { PreviousSchoolSection } from "@/components/admission/application-form/section-previous-school";
import { OtherInfoSection } from "@/components/admission/application-form/section-other";
import { BankSection } from "@/components/admission/application-form/section-bank";
import { IdentifiersSection } from "@/components/admission/application-form/section-identifiers";
import { SubmitBar } from "@/components/admission/application-form/submit-bar";
import { useAdmissionForm } from "@/components/admission/application-form/use-admission-form";
import type { AdmissionApplicationFormProps } from "@/components/admission/application-form/props";

export type { AdmissionFormData };

export function AdmissionApplicationForm(props: AdmissionApplicationFormProps) {
  const form = useAdmissionForm(props);
  const { checklist, handleSubmit, onFormError, onSubmit } = form;

  return (
    <form onSubmit={handleSubmit(onSubmit, onFormError)} className="space-y-4 max-w-4xl mx-auto w-full">
      {/* ALWAYS STICKY ULTRA-SMART COLORFUL STEP MAP (A to I) */}
      <StepMap form={form} />

      {/* SECTION A: Student Demographics */}
      <StudentSection form={form} />

      {/* SECTION B: Social & Eligibility Categories */}
      <CategoriesSection form={form} />

      {/* SECTION C: CWSN Profile */}
      <CwsnSection form={form} />

      {/* SECTION D: Family, Contacts & Addresses */}
      <FamilySection form={form} />

      {/* SECTION E: Enrolment & Academic Details */}
      <EnrolmentSection form={form} />

      {/* SECTION F: Previous Schooling */}
      <PreviousSchoolSection form={form} />

      {/* SECTION G: Other Information */}
      <OtherInfoSection form={form} />

      {/* SECTION H: Bank Details */}
      <BankSection form={form} />

      {/* SECTION I: Government Identifiers */}
      <IdentifiersSection form={form} />

      {/* Optional Document Verification Checklist Slot for Teacher */}
      {checklist}

      {/* SUBMIT BUTTON - Clean, Responsive & Mobile-Optimized */}
      <SubmitBar form={form} />
    </form>
  );
}
