"use client";

import { Controller } from "react-hook-form";
import { CustomSelect } from "@/components/ui/custom-select";
import { FormField, FormGrid, FormSection } from "@/components/forms/form-layout";

import type { StudentAddEditFormState } from "./use-student-add-edit-form";

export function FacilitiesSection({ sf }: { sf: StudentAddEditFormState }) {
  const { control, errors, register } = sf;
  return (
    <FormSection title="G. Facilities Profile & Extras">
      <FormGrid>
        <FormField label="General Facilities (Comma Separated)" error={errors.facilitiesProvidedInput?.message}>
          <input {...register("facilitiesProvidedInput")} placeholder="e.g. Free Uniform, Textbooks" />
        </FormField>
        <FormField label="CWSN Facilities (Comma Separated)" error={errors.cwsnFacilitiesInput?.message}>
          <input {...register("cwsnFacilitiesInput")} placeholder="e.g. Braille Book, Wheelchair" />
        </FormField>
        <FormField label="NCC Member?" error={errors.ncc?.message}>
          <Controller
            control={control}
            name="ncc"
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
        <FormField label="NSS Member?" error={errors.nss?.message}>
          <Controller
            control={control}
            name="nss"
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
        <FormField label="Scouts and Guides?" error={errors.scoutsGuides?.message}>
          <Controller
            control={control}
            name="scoutsGuides"
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
        <FormField label="Distance to School (KM)" error={errors.distanceToSchool?.message}>
          <input {...register("distanceToSchool")} type="number" step="0.1" placeholder="e.g. 1.2" />
        </FormField>
        <FormField label="Highest Parent Education Level" error={errors.highestEducationParents?.message}>
          <input {...register("highestEducationParents")} placeholder="e.g. Post Graduate" />
        </FormField>
        <FormField label="Competitions/Olympiads (Comma Separated)" error={errors.competitionsOlympiadsInput?.message}>
          <input {...register("competitionsOlympiadsInput")} placeholder="e.g. National Math Olympiad" />
        </FormField>
      </FormGrid>
    </FormSection>
  );
}
