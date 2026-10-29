"use client";

import { Controller } from "react-hook-form";
import { CustomSelect } from "@/components/ui/custom-select";
import { FormField, FormGrid, FormSection } from "@/components/forms/form-layout";

import type { EditStudentState } from "./use-edit-student";

export function SocialCategoriesSection({ edit }: { edit: EditStudentState }) {
  const { control, errors, isOutOfSchoolChecked, register, watchBplStatus, watchSocialCategory } = edit;
  return (
    <FormSection title="B. Social & Eligibility Categories">
      <FormGrid>
        <FormField label="Social Category" error={errors.socialCategory?.message}>
          <Controller
            control={control}
            name="socialCategory"
            render={({ field }) => (
              <CustomSelect
                value={field.value ?? ""}
                onChange={field.onChange}
                placeholder="Select category..."
                options={[
                  { label: "General", value: "General" },
                  { label: "OBC", value: "OBC" },
                  { label: "SC", value: "SC" },
                  { label: "ST", value: "ST" },
                  { label: "Other", value: "Other" },
                ]}
              />
            )}
          />
        </FormField>
        {watchSocialCategory && watchSocialCategory.trim() !== "" && (
          <FormField label="Category / Caste Certificate Number" error={errors.casteCertificateNo?.message}>
            <input
              {...register("casteCertificateNo")}
              placeholder="Enter certificate number (e.g. WB/SC/2024/...)"
            />
          </FormField>
        )}
        <FormField label="Minority Group" error={errors.minorityGroup?.message}>
          <input {...register("minorityGroup")} />
        </FormField>
        <FormField label="AAY (Antyodaya Anna Yojana)?" error={errors.isAay?.message}>
          <Controller
            control={control}
            name="isAay"
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
        <FormField label="EWS / Disadvantaged Group?" error={errors.isEws?.message}>
          <Controller
            control={control}
            name="isEws"
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
        <FormField label="BPL Status (বিপিএল তালিকাভুক্ত কি?)" error={errors.bplStatus?.message}>
          <Controller
            control={control}
            name="bplStatus"
            render={({ field }) => (
              <CustomSelect
                value={field.value ?? "NO"}
                onChange={field.onChange}
                options={[
                  { label: "No (না)", value: "NO" },
                  { label: "Yes (হ্যাঁ)", value: "YES" },
                ]}
              />
            )}
          />
        </FormField>
        {watchBplStatus === "YES" && (
          <FormField label="BPL Card Number (বিপিএল কার্ড নং)" error={errors.bplNo?.message}>
            <input {...register("bplNo")} placeholder="Enter BPL card number" />
          </FormField>
        )}
        <FormField label="Out-of-School Child?" error={errors.isOutOfSchool?.message}>
          <Controller
            control={control}
            name="isOutOfSchool"
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
        {isOutOfSchoolChecked && (
          <FormField label="When Mainstreamed" error={errors.mainstreamedDate?.message}>
            <input {...register("mainstreamedDate")} type="date" />
          </FormField>
        )}
      </FormGrid>
    </FormSection>
  );
}
