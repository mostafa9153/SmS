/** Splits a comma-separated form field into trimmed, non-empty values. */
export function splitCsvFields(value: string | null | undefined): string[] {
  return value ? value.split(",").map((s) => s.trim()).filter(Boolean) : [];
}
