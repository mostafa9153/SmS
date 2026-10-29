"use client";

import { CustomSelect } from "@/components/ui/custom-select";
import { FormField, FormGrid, FormSection } from "@/components/forms/form-layout";

import type { StudentAddEditFormState } from "./use-student-add-edit-form";

export function IdentifiersSection({ sf }: { sf: StudentAddEditFormState }) {
  const { errors, hasAadhaarVal, register, setHasAadhaarVal, setValue, watchGender } = sf;
  return (
    <FormSection title="I. Government Identifiers">
      <FormGrid>
        <FormField label="PEN" error={errors.pen?.message}>
          <input {...register("pen")} placeholder="Permanent Education Number" />
        </FormField>
        <FormField label="DISE Code" error={errors.diseCode?.message}>
          <input {...register("diseCode")} placeholder="School DISE Code" />
        </FormField>
        <FormField label="Health ID" error={errors.healthId?.message}>
          <input {...register("healthId")} placeholder="Student Health ID" />
        </FormField>
        <FormField label="Student Unique Code" error={errors.studentUniqueCode?.message}>
          <input {...register("studentUniqueCode")} placeholder="Unique identifier code" />
        </FormField>
        {watchGender === "Female" && (
          <FormField label="Kanyashree ID / Applicant ID" error={errors.kanyashreeId?.message}>
            <input {...register("kanyashreeId")} placeholder="e.g. 19190100101150000001" />
          </FormField>
        )}
        <FormField label="Aadhaar Available? (Yes/No)">
          <CustomSelect
            value={hasAadhaarVal}
            onChange={(val) => {
              setHasAadhaarVal(val);
              if (val === "No") {
                setValue("aadhaar", "");
                setValue("nameAsPerAadhaar", "");
              }
            }}
            options={[
              { label: "Yes (Aadhaar Available)", value: "Yes" },
              { label: "No (Aadhaar Not Available)", value: "No" },
            ]}
          />
        </FormField>
        <FormField label="Aadhaar Number (12 digits)" error={errors.aadhaar?.message}>
          <input
            {...register("aadhaar")}
            placeholder={hasAadhaarVal === "Yes" ? "Enter 12-digit Aadhaar Number" : "Not Available"}
            maxLength={12}
            disabled={hasAadhaarVal === "No"}
            className={hasAadhaarVal === "No" ? "bg-muted/40 cursor-not-allowed text-muted-foreground" : ""}
          />
        </FormField>
        <FormField label="Name (as per Aadhaar)" error={errors.nameAsPerAadhaar?.message}>
          <input
            {...register("nameAsPerAadhaar")}
            placeholder={hasAadhaarVal === "Yes" ? "Exact name on Aadhaar" : "Not Available"}
            disabled={hasAadhaarVal === "No"}
            className={hasAadhaarVal === "No" ? "bg-muted/40 cursor-not-allowed text-muted-foreground" : ""}
          />
        </FormField>
      </FormGrid>
    </FormSection>
  );
}
