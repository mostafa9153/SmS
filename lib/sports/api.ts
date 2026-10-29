import { NextResponse } from "next/server";
import { SportsRuleError } from "./db-sports";

/** Sports route failure: broken rules are 400, everything else 500. */
export function sportsError(err: unknown) {
  const message = err instanceof Error ? err.message : "Internal server error";
  return NextResponse.json({ success: false, error: message }, { status: err instanceof SportsRuleError ? 400 : 500 });
}

/** `?academicYear=2026` as a number, or undefined (the data layer then uses the current year). */
export function yearParam(value: string | null | undefined): number | undefined {
  const n = value ? parseInt(String(value), 10) : NaN;
  return Number.isFinite(n) ? n : undefined;
}
