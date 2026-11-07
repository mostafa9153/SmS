"use client";

import type { KeyboardEvent } from "react";
import { FormField, FormGrid } from "@/components/forms/form-layout";
import { Input } from "@/components/ui/input";
import { BOOK_CATEGORIES, BOOK_LANGUAGES } from "@/lib/library/book-options";
import { LookupField } from "./lookup-field";

export interface BookFormValues {
  title: string;
  author: string;
  publisher: string;
  category: string;
  language: string;
  edition: string;
  isbn: string;
  legacy_no: string;
}

export const EMPTY_BOOK: BookFormValues = {
  title: "",
  author: "",
  publisher: "",
  category: "",
  language: "Bengali",
  edition: "",
  isbn: "",
  legacy_no: "",
};

export function toBookValues(b: Partial<Record<keyof BookFormValues, string | null>>): BookFormValues {
  const out = { ...EMPTY_BOOK, language: "" };
  for (const k of Object.keys(EMPTY_BOOK) as (keyof BookFormValues)[]) out[k] = b[k] ?? "";
  return out;
}

const FIELDS: { key: keyof BookFormValues; label: string; full?: boolean }[] = [
  { key: "title", label: "Title *", full: true },
  { key: "author", label: "Author" },
  { key: "publisher", label: "Publisher" },
  { key: "category", label: "Category" },
  { key: "language", label: "Language" },
  { key: "edition", label: "Edition" },
  { key: "isbn", label: "ISBN" },
  { key: "legacy_no", label: "Old Accession No." },
];

export function BookFields({
  values,
  onChange,
  titleError,
  autoFocus,
}: {
  values: BookFormValues;
  onChange: (next: BookFormValues) => void;
  titleError?: string;
  autoFocus?: boolean;
}) {
  return (
    <FormGrid>
      {FIELDS.map((f) => (
        <FormField key={f.key} label={f.label} full={f.full} error={f.key === "title" ? titleError : undefined}>
          {f.key === "category" || f.key === "language" ? (
            <LookupField
              value={values[f.key]}
              options={f.key === "category" ? BOOK_CATEGORIES : BOOK_LANGUAGES}
              placeholder={f.key === "category" ? "Select category" : "Select language"}
              customPlaceholder={f.key === "category" ? "Type category" : "Type language"}
              onChange={(v) => onChange({ ...values, [f.key]: v })}
            />
          ) : (
            <Input
              value={values[f.key]}
              maxLength={300}
              autoFocus={autoFocus && f.key === "title"}
              onChange={(e) => onChange({ ...values, [f.key]: e.target.value })}
            />
          )}
        </FormField>
      ))}
    </FormGrid>
  );
}

/**
 * True for an Enter that should submit: in a text box, not held down, not
 * ending an IME composition. Enter on a button or link keeps its own meaning.
 */
export function isSubmitEnter(e: KeyboardEvent): boolean {
  if (e.key !== "Enter" || e.repeat || e.nativeEvent.isComposing || !(e.target instanceof HTMLInputElement)) return false;
  e.preventDefault();
  return true;
}

/** Payload for the API: empty strings become null (the server trims and NFC-normalises). */
export function bookPayload(v: BookFormValues) {
  const out: Record<string, string | null> = {};
  for (const k of Object.keys(v) as (keyof BookFormValues)[]) out[k] = v[k].trim() || null;
  return out;
}
