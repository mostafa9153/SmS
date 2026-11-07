import { describe, expect, it } from "vitest";
import { subtractMonths } from "@/lib/library/dates";

describe("subtractMonths", () => {
  it("keeps the same day when it exists", () => {
    expect(subtractMonths("2026-11-07", 1)).toBe("2026-10-07");
    expect(subtractMonths("2026-11-07", 12)).toBe("2025-11-07");
  });

  it("clamps to the last day of a shorter month", () => {
    expect(subtractMonths("2026-03-31", 1)).toBe("2026-02-28");
    expect(subtractMonths("2028-03-31", 1)).toBe("2028-02-29");
  });

  it("crosses the year boundary", () => {
    expect(subtractMonths("2026-02-10", 6)).toBe("2025-08-10");
  });
});
