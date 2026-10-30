"use client";

import { SmartBankInput } from "@/components/students/smart-bank-input";
import { FormSection } from "@/components/forms/form-layout";

import type { StudentAddEditFormState } from "./use-student-add-edit-form";

export function BankSection({ sf }: { sf: StudentAddEditFormState }) {
  const { errors, setValue, watch } = sf;
  return (
    <FormSection title="H. Bank Details">
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
