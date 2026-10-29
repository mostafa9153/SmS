"use client";

import { Controller } from "react-hook-form";
import { CustomSelect } from "@/components/ui/custom-select";
import { FormField, FormGrid, FormSection } from "@/components/forms/form-layout";

import type { StudentAddEditFormState } from "./use-student-add-edit-form";

export function CwsnSection({ sf }: { sf: StudentAddEditFormState }) {
  const { control, errors, hasDisabilityCertChecked, isCwsnChecked, register } = sf;
  return (
    <FormSection title="C. CWSN Profile">
      <FormGrid>
        <FormField label="CWSN Status?" error={errors.isCwsn?.message}>
          <Controller
            control={control}
            name="isCwsn"
            render={({ field }) => (
              <CustomSelect
                value={String(field.value ?? false)}
                onChange={(val) => field.onChange(val === "true" || val === true)}
                options={[
                  { label: "No", value: "false" },
                  { label: "Yes", value: "true" },
                ]}
              />
            )}
          />
        </FormField>
        {isCwsnChecked && (
          <>
            <FormField label="Type of Impairment" error={errors.impairmentType?.message}>
              <input {...register("impairmentType")} placeholder="e.g. Blindness, Hearing impairment" />
            </FormField>
            <FormField label="Disability Certificate?" error={errors.hasDisabilityCertificate?.message}>
              <Controller
                control={control}
                name="hasDisabilityCertificate"
                render={({ field }) => (
                  <CustomSelect
                    value={String(field.value ?? false)}
                    onChange={(val) => field.onChange(val === "true" || val === true)}
                    options={[
                      { label: "No", value: "false" },
                      { label: "Yes", value: "true" },
                    ]}
                  />
                )}
              />
            </FormField>
            {hasDisabilityCertChecked && (
              <FormField label="Disability Percentage (%)" error={errors.disabilityPercentage?.message}>
                <input {...register("disabilityPercentage")} type="number" placeholder="e.g. 40" />
              </FormField>
            )}
          </>
        )}
        <FormField label="Specific Learning Disability (SLD)" error={errors.sldType?.message}>
          <input {...register("sldType")} placeholder="e.g. Dyslexia, None" />
        </FormField>
      </FormGrid>
    </FormSection>
  );
}
