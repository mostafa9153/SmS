"use client";

import { Controller } from "react-hook-form";
import { CustomSelect } from "@/components/ui/custom-select";
import { SchoolIdInput } from "@/components/students/school-id-input";
import { FormField, FormGrid, FormSection } from "@/components/forms/form-layout";
import { INDIAN_RELIGIONS, MOTHER_TONGUES } from "@/components/students/form/constants";
import type { EditStudentState } from "./use-edit-student";

export function DemographicsSection({ edit }: { edit: EditStudentState }) {
  const { control, errors, register, watchAdmissionNo, watchAdmissionYear, watchPresentClass } = edit;
  return (
    <FormSection title="A. Student Demographics">
      <FormGrid>
        <FormField label="Full Name *" error={errors.name?.message}>
          <input {...register("name")} />
        </FormField>
        <FormField label="Student Name in Bengali (ছাত্রের নাম বাংলায়)" error={errors.studentNameBengali?.message}>
          <input {...register("studentNameBengali")} placeholder="ছাত্রের পুরো নাম বাংলায় লিখুন" />
        </FormField>
        <FormField label="School ID *" error={errors.schoolId?.message}>
          <Controller
            control={control}
            name="schoolId"
            render={({ field }) => (
              <SchoolIdInput
                value={field.value}
                onChange={field.onChange}
                presentClass={watchPresentClass}
                admissionYear={watchAdmissionYear}
                admissionNo={watchAdmissionNo}
              />
            )}
          />
        </FormField>
        <FormField label="Date of Birth *" error={errors.dob?.message}>
          <input {...register("dob")} type="date" />
        </FormField>
        <FormField label="Gender *" error={errors.gender?.message}>
          <Controller
            control={control}
            name="gender"
            render={({ field }) => (
              <CustomSelect
                value={field.value}
                onChange={field.onChange}
                options={[
                  { label: "Male", value: "Male" },
                  { label: "Female", value: "Female" },
                  { label: "Other", value: "Other" },
                ]}
              />
            )}
          />
        </FormField>
        <FormField label="Mother Tongue" error={errors.motherTongue?.message}>
          <Controller
            control={control}
            name="motherTongue"
            render={({ field }) => (
              <CustomSelect
                value={field.value || "Bengali"}
                onChange={field.onChange}
                options={MOTHER_TONGUES}
              />
            )}
          />
        </FormField>
        <FormField label="Religion" error={errors.religion?.message}>
          <Controller
            control={control}
            name="religion"
            render={({ field }) => (
              <CustomSelect
                value={field.value ?? ""}
                onChange={field.onChange}
                placeholder="Select religion..."
                options={INDIAN_RELIGIONS}
              />
            )}
          />
        </FormField>
        <FormField label="Indian Nationality?" error={errors.indianNationality?.message}>
          <Controller
            control={control}
            name="indianNationality"
            render={({ field }) => (
              <CustomSelect
                value={String(field.value ?? true)}
                onChange={(val) => field.onChange(val === "true" || val === true)}
                options={[
                  { label: "Yes", value: "true" },
                  { label: "No", value: "false" },
                ]}
              />
            )}
          />
        </FormField>
        <FormField label="Blood Group" error={errors.bloodGroup?.message}>
          <Controller
            control={control}
            name="bloodGroup"
            render={({ field }) => (
              <CustomSelect
                value={field.value ?? ""}
                onChange={field.onChange}
                placeholder="Select blood group..."
                options={["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((bg) => ({
                  label: bg,
                  value: bg,
                }))}
              />
            )}
          />
        </FormField>
        <FormField label="Height (in CMs)" error={errors.heightCm?.message}>
          <input {...register("heightCm")} type="number" />
        </FormField>
        <FormField label="Weight (in KGs)" error={errors.weightKg?.message}>
          <input {...register("weightKg")} type="number" step="0.1" />
        </FormField>
        <FormField label="Birth Registration Number" error={errors.birthRegistrationNo?.message}>
          <input {...register("birthRegistrationNo")} />
        </FormField>
        <FormField label="Identification Mark" error={errors.identificationMark?.message}>
          <input {...register("identificationMark")} />
        </FormField>
      </FormGrid>
    </FormSection>
  );
}
