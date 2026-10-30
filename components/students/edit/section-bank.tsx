"use client";

import { SmartBankInput } from "@/components/students/smart-bank-input";
import { FormField, FormGrid, FormSection } from "@/components/forms/form-layout";

import type { EditStudentState } from "./use-edit-student";

export function BankSection({ edit }: { edit: EditStudentState }) {
  const { errors, register, setValue, watch } = edit;
  return (
    <FormSection title="H. Bank Details">
      <FormGrid>
        <FormField label="Bank Name (ব্যাংকের নাম)" error={errors.bankName?.message}>
          <input {...register("bankName")} placeholder="যেমন: State Bank of India" />
        </FormField>
        <FormField label="Branch Name (শাখার নাম)" error={errors.bankBranch?.message}>
          <input {...register("bankBranch")} placeholder="যেমন: Bongaon Branch" />
        </FormField>
      </FormGrid>
      <SmartBankInput
        accountNumberValue={watch("bankAccountNo") || ""}
        onAccountNumberChange={(val) => setValue("bankAccountNo", val, { shouldValidate: true })}
        ifscValue={watch("bankIfsc") || ""}
        onIfscChange={(val) => setValue("bankIfsc", val, { shouldValidate: true })}
        accountNumberError={errors.bankAccountNo?.message}
        ifscError={errors.bankIfsc?.message}
      />
    </FormSection>
  );
}
