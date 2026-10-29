import { describe, expect, it } from "vitest";
import { dateLabelIST, nowTimeIST, todayIST } from "@/lib/utils/date";

describe("IST dates", () => {
  it("uses the IST calendar day, not the UTC one", () => {
    // 2026-10-28 20:00 UTC is 2026-10-29 01:30 IST
    const lateUtc = new Date("2026-10-28T20:00:00Z");
    expect(lateUtc.toISOString().slice(0, 10)).toBe("2026-10-28");
    expect(todayIST(lateUtc)).toBe("2026-10-29");
    expect(dateLabelIST(lateUtc)).toBe("29/10/2026");
  });

  it("formats the IST wall-clock time", () => {
    expect(nowTimeIST(new Date("2026-10-29T04:45:00Z"))).toBe("10:15 AM");
  });
});
