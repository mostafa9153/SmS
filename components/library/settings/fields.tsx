"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/forms/form-layout";

const blankOf = (v: number | null) => (v === null || Number.isNaN(v) ? null : v);

/**
 * A number field. Clearing the box is allowed while typing: a blank value is
 * kept as NaN (or null when `nullable`, meaning "no limit") and Save reports it
 * as an invalid value instead of silently writing 0. Whole numbers only unless
 * `step` is fractional.
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
  // The text the user is typing. Kept apart from `value` so "0" can be erased and "012" stays as typed.
  const [text, setText] = useState(() => (blankOf(value) === null ? "" : String(value)));
  const [seen, setSeen] = useState(() => blankOf(value));

  // Follow outside changes (Discard, a refetch) without overwriting what is being typed.
  if (blankOf(value) !== seen) {
    setSeen(blankOf(value));
    const typed = text === "" ? null : blankOf(Number(text));
    if (typed !== blankOf(value)) setText(blankOf(value) === null ? "" : String(value));
  }

  return (
    <FormField label={suffix ? `${label} (${suffix})` : label} error={error}>
      <Input
        type="number"
        inputMode="decimal"
        min={0}
        step={step}
        value={text}
        placeholder={nullable ? "No limit" : undefined}
        disabled={disabled}
        onChange={(e) => {
          const raw = e.target.value;
          setText(raw);
          if (raw === "") set(nullable ? null : Number.NaN);
          else set(Number(raw));
        }}
        onBlur={() => {
          // "012" becomes "12" once the user leaves the box.
          if (text !== "" && !Number.isNaN(Number(text))) setText(String(Number(text)));
        }}
      />
    </FormField>
  );
}
