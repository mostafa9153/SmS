"use client";

import { Controller } from "react-hook-form";
import { CustomSelect } from "@/components/ui/custom-select";
import { SmartPreviousSchoolInput } from "@/components/students/smart-previous-school-input";
import { FormField, FormGrid, FormSection } from "@/components/forms/form-layout";

import type { EditStudentState } from "./use-edit-student";

export function PreviousSchoolSection({ edit }: { edit: EditStudentState }) {
  const { control, errors, register, rteSection12CChecked, setValue, streamOptions, watch } = edit;
  return (
    <FormSection title="F. Previous Schooling & RTE">
      <FormGrid>
        <div className="sm:col-span-2 md:col-span-3">
          <SmartPreviousSchoolInput
            value={watch("previousSchool") || ""}
            onChange={(val) => setValue("previousSchool", val, { shouldValidate: true })}
            error={errors.previousSchool?.message}
          />
        </div>
        <FormField label="Schooling Status" error={errors.previousStatus?.message}>
          <input {...register("previousStatus")} />
        </FormField>
        <FormField label="Previous Grade/Class" error={errors.previousClass?.message}>
          <input {...register("previousClass")} />
        </FormField>
        <FormField label="Previous Section" error={errors.previousSection?.message}>
          <input {...register("previousSection")} />
        </FormField>
        <FormField label="Previous Roll No" error={errors.previousRollNo?.message}>
          <input {...register("previousRollNo")} type="number" />
        </FormField>
        <FormField label="Previous Stream" error={errors.previousStream?.message}>
          <Controller
            control={control}
            name="previousStream"
            render={({ field }) => {
              const options = field.value && !streamOptions.some(o => o.value.toLowerCase() === field.value?.toLowerCase())
                ? [{ label: field.value, value: field.value }, ...streamOptions]
                : streamOptions;
              return (
                <CustomSelect
                  value={field.value ?? ""}
                  onChange={field.onChange}
                  placeholder="Select stream..."
                  options={options}
                />
              );
            }}
          />
        </FormField>
        <FormField label="Appeared for Exams?" error={errors.previousAppearedForExams?.message}>
          <Controller
            control={control}
            name="previousAppearedForExams"
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
        <FormField label="Exam Result" error={errors.previousResult?.message}>
          <input {...register("previousResult")} />
        </FormField>
        <FormField label="Marks Obtained (%)" error={errors.previousMarksPercent?.message}>
          <input {...register("previousMarksPercent")} type="number" />
        </FormField>
        <FormField label="Days Attended" error={errors.previousDaysAttended?.message}>
          <input {...register("previousDaysAttended")} type="number" />
        </FormField>
        <FormField label="Admitted under RTE Sec 12C?" error={errors.rteSection12C?.message}>
          <Controller
            control={control}
            name="rteSection12C"
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
        {rteSection12CChecked && (
          <FormField label="Amount Claimed from Govt" error={errors.rteAmountClaimed?.message}>
            <input {...register("rteAmountClaimed")} type="number" />
          </FormField>
        )}
      </FormGrid>
    </FormSection>
  );
}
