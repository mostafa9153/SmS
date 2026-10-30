"use client";

import { Controller } from "react-hook-form";
import { CustomSelect } from "@/components/ui/custom-select";
import { FormField, FormGrid, FormSection } from "@/components/forms/form-layout";

import type { EditStudentState } from "./use-edit-student";

export function CwsnSection({ edit }: { edit: EditStudentState }) {
  const { control, errors, hasDisabilityCertChecked, isCwsnChecked, register } = edit;
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
              <input {...register("impairmentType")} />
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
              <>
                <FormField label="Disability Certificate Number (সার্টিফিকেট নম্বর)" error={errors.disabilityCertificateNo?.message}>
                  <input {...register("disabilityCertificateNo")} placeholder="Enter certificate number" />
                </FormField>
                <FormField label="Disability Percentage (%)" error={errors.disabilityPercentage?.message}>
                  <input {...register("disabilityPercentage")} type="number" />
                </FormField>
              </>
            )}
          </>
        )}
        <FormField label="Specific Learning Disability (SLD)" error={errors.sldType?.message}>
          <input {...register("sldType")} />
        </FormField>
      </FormGrid>
    </FormSection>
  );
}
