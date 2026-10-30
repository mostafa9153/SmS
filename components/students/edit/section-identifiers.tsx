"use client";

import { CustomSelect } from "@/components/ui/custom-select";
import { FormField, FormGrid, FormSection } from "@/components/forms/form-layout";

import type { EditStudentState } from "./use-edit-student";

export function IdentifiersSection({ edit }: { edit: EditStudentState }) {
  const { errors, hasAadhaarVal, register, setHasAadhaarVal, setValue, student, watch, watchGender } = edit;
  return (
    <FormSection title="I. Government Identifiers">
      <FormGrid>
        <FormField label="PEN" error={errors.pen?.message}>
          <input {...register("pen")} />
        </FormField>
        <FormField label="DISE Code" error={errors.diseCode?.message}>
          <input {...register("diseCode")} />
        </FormField>
        <FormField label="Health ID" error={errors.healthId?.message}>
          <input {...register("healthId")} />
        </FormField>
        <FormField label="Student Unique Code" error={errors.studentUniqueCode?.message}>
          <input {...register("studentUniqueCode")} />
        </FormField>
        {(watchGender === "Female" || Boolean(student?.kanyashreeId)) && (
          <FormField label="Kanyashree ID / Applicant ID" error={errors.kanyashreeId?.message}>
            <input {...register("kanyashreeId")} placeholder="e.g. 19190100101150000001" />
          </FormField>
        )}
        <FormField label="Aadhaar Available? (Yes/No)">
          <CustomSelect
            value={hasAadhaarVal ?? (watch("aadhaar") ? "Yes" : "No")}
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
            maxLength={12}
            placeholder={(hasAadhaarVal ?? (watch("aadhaar") ? "Yes" : "No")) === "Yes" ? "Enter 12-digit Aadhaar Number" : "Not Available"}
            disabled={(hasAadhaarVal ?? (watch("aadhaar") ? "Yes" : "No")) === "No"}
            className={(hasAadhaarVal ?? (watch("aadhaar") ? "Yes" : "No")) === "No" ? "bg-muted/40 cursor-not-allowed text-muted-foreground" : ""}
          />
        </FormField>
        <FormField label="Name (as per Aadhaar)" error={errors.nameAsPerAadhaar?.message}>
          <input
            {...register("nameAsPerAadhaar")}
            placeholder={(hasAadhaarVal ?? (watch("aadhaar") ? "Yes" : "No")) === "Yes" ? "Exact name on Aadhaar" : "Not Available"}
            disabled={(hasAadhaarVal ?? (watch("aadhaar") ? "Yes" : "No")) === "No"}
            className={(hasAadhaarVal ?? (watch("aadhaar") ? "Yes" : "No")) === "No" ? "bg-muted/40 cursor-not-allowed text-muted-foreground" : ""}
          />
        </FormField>
      </FormGrid>
    </FormSection>
  );
}
