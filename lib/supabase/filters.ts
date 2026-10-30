/**
 * Quote a user-supplied value for a PostgREST `.or()` filter string.
 * Without quoting, a `,` `(` or `)` in the input splits or extends the filter
 * (e.g. searching "Rahman, Abdul" breaks the query; "x,id.neq.0" adds a clause).
 */
export function pgQuote(value: string | number): string {
  return `"${String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

/** `%value%` pattern for `.ilike.` inside an `.or()` filter. */
export function pgContains(value: string): string {
  return pgQuote(`%${value}%`);
}
