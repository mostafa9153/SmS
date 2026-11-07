import { describe, expect, it } from "vitest";
import {
  addDays,
  isHoliday,
  isSunday,
  isWorkingDay,
  nextWorkingDay,
  workingDaysBetween,
  libraryToday,
} from "@/lib/library/dates";

// 2026-11-01 is a Sunday.
const PUJA = [{ from: "2026-11-09", to: "2026-11-13" }];

describe("library dates", () => {
  it("adds calendar days across month and year ends", () => {
    expect(addDays("2026-11-28", 5)).toBe("2026-12-03");
    expect(addDays("2026-12-30", 3)).toBe("2027-01-02");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });

  it("knows Sundays and holiday ranges (inclusive)", () => {
    expect(isSunday("2026-11-01")).toBe(true);
    expect(isSunday("2026-11-02")).toBe(false);
    expect(isHoliday("2026-11-09", PUJA)).toBe(true);
    expect(isHoliday("2026-11-13", PUJA)).toBe(true);
    expect(isHoliday("2026-11-14", PUJA)).toBe(false);
    expect(isWorkingDay("2026-11-01", PUJA)).toBe(false);
    expect(isWorkingDay("2026-11-11", PUJA)).toBe(false);
    expect(isWorkingDay("2026-11-14", PUJA)).toBe(true);
  });

  it("accepts a holiday range entered backwards", () => {
    expect(isHoliday("2026-11-10", [{ from: "2026-11-13", to: "2026-11-09" }])).toBe(true);
  });

  it("moves a non-working day to the next working day", () => {
    expect(nextWorkingDay("2026-11-01", [])).toBe("2026-11-02");
    // Puja ends Fri 13th, Sat 14th is a working day
    expect(nextWorkingDay("2026-11-10", PUJA)).toBe("2026-11-14");
    // Holiday ending on Saturday rolls past Sunday too
    expect(nextWorkingDay("2026-11-07", [{ from: "2026-11-07", to: "2026-11-07" }])).toBe("2026-11-09");
    expect(nextWorkingDay("2026-11-04", PUJA)).toBe("2026-11-04");
  });

  it("counts working days in (start, end]", () => {
    // Mon 2nd .. Mon 9th exclusive start: 3,4,5,6,7,(8 Sun),9 → 6
    expect(workingDaysBetween("2026-11-02", "2026-11-09", [])).toBe(6);
    expect(workingDaysBetween("2026-11-02", "2026-11-09", PUJA)).toBe(5);
    expect(workingDaysBetween("2026-11-09", "2026-11-09", [])).toBe(0);
    expect(workingDaysBetween("2026-11-09", "2026-11-02", [])).toBe(0);
  });

  it("uses the IST calendar day for today", () => {
    expect(libraryToday(new Date("2026-11-06T18:00:00Z"))).toBe("2026-11-06"); // 23:30 IST
    expect(libraryToday(new Date("2026-11-06T19:00:00Z"))).toBe("2026-11-07"); // 00:30 IST
  });
});
