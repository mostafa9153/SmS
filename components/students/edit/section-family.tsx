"use client";

import { Controller } from "react-hook-form";
import { CustomSelect } from "@/components/ui/custom-select";
import { GuardianRelationshipSelect } from "@/components/students/guardian-relationship-select";
import { SmartAddressInput } from "@/components/students/smart-address-input";
import { OCCUPATION_OPTIONS } from "@/lib/constants/student-options";
import { FormField, FormGrid, FormSection } from "@/components/forms/form-layout";
import { QUALIFICATION_OPTIONS } from "@/components/students/edit/constants";
import type { EditStudentState } from "./use-edit-student";

export function FamilySection({ edit }: { edit: EditStudentState }) {
  const { control, errors, register, setValue, watch } = edit;
  return (
    <FormSection title="D. Family & Contacts">
      <FormGrid>
        <FormField label="Father's Name *" error={errors.fatherName?.message}>
          <input {...register("fatherName")} />
        </FormField>
        <FormField label="Father's Name in Bengali (পিতার নাম বাংলায়)" error={errors.fatherNameBengali?.message}>
          <input {...register("fatherNameBengali")} placeholder="পিতার পুরো নাম বাংলায়" />
        </FormField>
        <FormField label="Father's Occupation" error={errors.fatherOccupation?.message}>
          <Controller
            control={control}
            name="fatherOccupation"
            render={({ field }) => {
              const matched = OCCUPATION_OPTIONS.find(
                (o) => o.value.toLowerCase() === (field.value || "").toLowerCase()
              );
              const options = field.value && !matched
                ? [{ label: field.value, value: field.value }, ...OCCUPATION_OPTIONS]
                : OCCUPATION_OPTIONS;
              return (
                <CustomSelect
                  value={matched ? matched.value : (field.value ?? "")}
                  onChange={field.onChange}
                  placeholder="Select father's occupation..."
                  options={options}
                />
              );
            }}
          />
        </FormField>
        <FormField label="Mother's Name *" error={errors.motherName?.message}>
          <input {...register("motherName")} />
        </FormField>
        <FormField label="Mother's Name in Bengali (মাতার নাম বাংলায়)" error={errors.motherNameBengali?.message}>
          <input {...register("motherNameBengali")} placeholder="মাতার পুরো নাম বাংলায়" />
        </FormField>
        <FormField label="Mother's Occupation" error={errors.motherOccupation?.message}>
          <Controller
            control={control}
            name="motherOccupation"
            render={({ field }) => {
              const matched = OCCUPATION_OPTIONS.find(
                (o) => o.value.toLowerCase() === (field.value || "").toLowerCase()
              );
              const options = field.value && !matched
                ? [{ label: field.value, value: field.value }, ...OCCUPATION_OPTIONS]
                : OCCUPATION_OPTIONS;
              return (
                <CustomSelect
                  value={matched ? matched.value : (field.value ?? "")}
                  onChange={field.onChange}
                  placeholder="Select mother's occupation..."
                  options={options}
                />
              );
            }}
          />
        </FormField>
        <FormField label="Guardian's Name" error={errors.guardianName?.message}>
          <input {...register("guardianName")} />
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
            render={({ field }) => {
              const cleanVal = field.value?.replace(/\s*\([^)]*\)/g, "").trim();
              const matched = OCCUPATION_OPTIONS.find(
                (o) =>
                  o.value.toLowerCase() === field.value?.toLowerCase() ||
                  (cleanVal && o.value.toLowerCase() === cleanVal.toLowerCase())
              );
              const options = field.value && !matched
                ? [{ label: cleanVal || field.value, value: field.value }, ...OCCUPATION_OPTIONS]
                : OCCUPATION_OPTIONS;
              return (
                <CustomSelect
                  value={matched ? matched.value : (field.value ?? "")}
                  onChange={field.onChange}
                  placeholder="Select guardian's occupation..."
                  options={options}
                />
              );
            }}
          />
        </FormField>
        <FormField label="Guardian's Qualification" error={errors.guardianQualification?.message}>
          <Controller
            control={control}
            name="guardianQualification"
            render={({ field }) => {
              const cleanVal = field.value?.replace(/\s*\([^)]*\)/g, "").trim();
              const matched = QUALIFICATION_OPTIONS.find(
                (o) =>
                  o.value.toLowerCase() === field.value?.toLowerCase() ||
                  (cleanVal && o.value.toLowerCase() === cleanVal.toLowerCase())
              );
              const options = field.value && !matched
                ? [{ label: cleanVal || field.value, value: field.value }, ...QUALIFICATION_OPTIONS]
                : QUALIFICATION_OPTIONS;
              return (
                <CustomSelect
                  value={matched ? matched.value : (field.value ?? "")}
                  onChange={field.onChange}
                  placeholder="Select qualification..."
                  options={options}
                />
              );
            }}
          />
        </FormField>
        <FormField label="Annual Family Income" error={errors.annualFamilyIncome?.message}>
          <input {...register("annualFamilyIncome")} type="number" />
        </FormField>
        <FormField label="Primary Contact Mobile *" error={errors.studentContact?.message}>
          <input {...register("studentContact")} />
        </FormField>
        <FormField label="Guardian Contact No" error={errors.altMobile?.message}>
          <input {...register("altMobile")} placeholder="10-digit guardian mobile" />
        </FormField>
        <FormField label="Contact Email ID" error={errors.email?.message}>
          <input {...register("email")} type="email" />
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
