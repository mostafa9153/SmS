"use client";

import { Controller } from "react-hook-form";
import { CustomSelect } from "@/components/ui/custom-select";
import { GuardianRelationshipSelect } from "@/components/students/guardian-relationship-select";
import { SmartAddressInput } from "@/components/students/smart-address-input";
import { OCCUPATION_OPTIONS } from "@/lib/constants/student-options";
import { FormField, FormGrid, FormSection } from "@/components/forms/form-layout";
import { QUALIFICATION_OPTIONS } from "@/components/students/add-form/constants";
import type { StudentAddEditFormState } from "./use-student-add-edit-form";

export function FamilySection({ sf }: { sf: StudentAddEditFormState }) {
  const { control, errors, register, setValue, watch } = sf;
  return (
    <FormSection title="D. Family & Contacts">
      <FormGrid>
        <FormField label="Father's Name *" error={errors.fatherName?.message}>
          <input {...register("fatherName")} placeholder="e.g. Ratan Mondal" />
        </FormField>
        <FormField label="Father's Occupation" error={errors.fatherOccupation?.message}>
          <Controller
            control={control}
            name="fatherOccupation"
            render={({ field }) => (
              <CustomSelect
                value={field.value ?? ""}
                onChange={field.onChange}
                placeholder="Select father's occupation..."
                options={OCCUPATION_OPTIONS}
              />
            )}
          />
        </FormField>
        <FormField label="Mother's Name *" error={errors.motherName?.message}>
          <input {...register("motherName")} placeholder="e.g. Sujata Mondal" />
        </FormField>
        <FormField label="Mother's Occupation" error={errors.motherOccupation?.message}>
          <Controller
            control={control}
            name="motherOccupation"
            render={({ field }) => (
              <CustomSelect
                value={field.value ?? ""}
                onChange={field.onChange}
                placeholder="Select mother's occupation..."
                options={OCCUPATION_OPTIONS}
              />
            )}
          />
        </FormField>
        <FormField label="Guardian's Name" error={errors.guardianName?.message}>
          <input {...register("guardianName")} placeholder="e.g. Ramesh Mondal" />
        </FormField>
        <FormField label="Relationship with Guardian" error={errors.relationshipWithGuardian?.message}>
          <Controller
            control={control}
            name="relationshipWithGuardian"
            render={({ field }) => (
              <GuardianRelationshipSelect
                value={field.value ?? ""}
                onChange={field.onChange}
              />
            )}
          />
        </FormField>
        <FormField label="Guardian's Occupation" error={errors.guardianOccupation?.message}>
          <Controller
            control={control}
            name="guardianOccupation"
            render={({ field }) => (
              <CustomSelect
                value={field.value ?? ""}
                onChange={field.onChange}
                placeholder="Select guardian's occupation..."
                options={OCCUPATION_OPTIONS}
              />
            )}
          />
        </FormField>
        <FormField label="Guardian's Qualification" error={errors.guardianQualification?.message}>
          <Controller
            control={control}
            name="guardianQualification"
            render={({ field }) => (
              <CustomSelect
                value={field.value ?? ""}
                onChange={field.onChange}
                placeholder="Select qualification..."
                options={QUALIFICATION_OPTIONS}
              />
            )}
          />
        </FormField>
        <FormField label="Annual Family Income" error={errors.annualFamilyIncome?.message}>
          <input {...register("annualFamilyIncome")} type="number" placeholder="e.g. 120000" />
        </FormField>
        <FormField label="Primary Contact Mobile *" error={errors.studentContact?.message}>
          <input {...register("studentContact")} placeholder="e.g. 9876543210" />
        </FormField>
        <FormField label="Guardian Contact No" error={errors.altMobile?.message}>
          <input {...register("altMobile")} placeholder="10-digit guardian mobile" />
        </FormField>
        <FormField label="Contact Email ID" error={errors.email?.message}>
          <input {...register("email")} type="email" placeholder="e.g. guardian@mail.com" />
        </FormField>
        <div className="sm:col-span-2 md:col-span-3">
          <SmartAddressInput
            value={watch("address") || ""}
            onChange={(addr) => setValue("address", addr, { shouldValidate: true })}
            pincodeValue={watch("pincode") || ""}
            onPincodeChange={(pin) => setValue("pincode", pin, { shouldValidate: true })}
            gramPanchayatValue={watch("gramPanchayat") || ""}
            onGramPanchayatChange={(gp) => setValue("gramPanchayat", gp, { shouldValidate: true })}
            blockValue={watch("block") || ""}
            onBlockChange={(blk) => setValue("block", blk, { shouldValidate: true })}
            error={errors.address?.message}
            pincodeError={errors.pincode?.message}
            gramPanchayatError={errors.gramPanchayat?.message}
            blockError={errors.block?.message}
          />
        </div>
      </FormGrid>
    </FormSection>
  );
}
