"use client";

import { Input } from "@/components/ui/input";
import { FormField } from "@/components/forms/form-layout";

/**
 * A number field. Empty means 0, or "no limit" (null) when `nullable`. Whole
 * numbers only unless `step` is fractional.
 */
export function NumField({
  label,
  value,
  onChange,
  error,
  nullable = false,
  step = 1,
  suffix,
  disabled,
}: {
  label: string;
  value: number | null;
  onChange: (v: never) => void;
  error?: string;
  nullable?: boolean;
  step?: number;
  suffix?: string;
  disabled?: boolean;
}) {
  const set = onChange as (v: number | null) => void;
  return (
    <FormField label={suffix ? `${label} (${suffix})` : label} error={error}>
      <Input
        type="number"
        inputMode="decimal"
        min={0}
        step={step}
        value={value ?? ""}
        placeholder={nullable ? "সীমা নেই" : undefined}
        disabled={disabled}
        onChange={(e) => {
          const raw = e.target.value;
          if (raw === "") set(nullable ? null : 0);
          else set(Number(raw));
        }}
      />
    </FormField>
  );
}
