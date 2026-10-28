import { describe, expect, it } from "vitest";
import { pgContains, pgQuote } from "@/lib/supabase/filters";

describe("PostgREST filter quoting", () => {
  it("wraps plain values in double quotes", () => {
    expect(pgQuote("IX")).toBe('"IX"');
    expect(pgQuote(42)).toBe('"42"');
    expect(pgContains("ram")).toBe('"%ram%"');
  });

  it("neutralises filter separators and quotes", () => {
    expect(pgContains("Rahman, Abdul")).toBe('"%Rahman, Abdul%"');
    expect(pgQuote("x,id.neq.0)")).toBe('"x,id.neq.0)"');
    expect(pgQuote('a"b\\c')).toBe('"a\\"b\\\\c"');
  });
});
