import { describe, expect, it } from "vitest";
import { DEFAULT_ROUTINE_SETTINGS } from "@/lib/routine/types";
import { detectWindow, normalizeSlots, settingsForClass, slotStats, slotsFromWindow } from "@/lib/routine/slots";

// Mon–Sat, 8 periods, Saturday half day (4), tiffin after P4
const S = DEFAULT_ROUTINE_SETTINGS;

describe("routine subject slots", () => {
  it("builds presets around tiffin and the half day", () => {
    const m = slotsFromWindow("morning", S);
    expect(m["0"]).toEqual([1, 2, 3, 4]);
    const a = slotsFromWindow("afternoon", S);
    expect(a["0"]).toEqual([5, 6, 7, 8]);
    expect(a["5"]).toEqual([]);
  });

  it("stores nothing when every slot is open", () => {
    expect(normalizeSlots(slotsFromWindow("any", S), S)).toBeNull();
    expect(normalizeSlots(null, S)).toBeNull();
  });

  it("drops stale days and periods beyond the day cap", () => {
    const out = normalizeSlots({ "0": [1, 9, 2], "5": [3, 6], "6": [1] }, S);
    expect(out?.["0"]).toEqual([1, 2]);
    expect(out?.["5"]).toEqual([3]);
    expect(out?.["6"]).toBeUndefined();
    // missing working days stay unrestricted
    expect(out?.["1"]).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it("detects presets and custom maps", () => {
    expect(detectWindow(slotsFromWindow("morning", S), S)).toBe("morning");
    expect(detectWindow({ "0": [1] }, S)).toBe("custom");
    expect(detectWindow(null, S)).toBe("any");
  });

  it("limits the matrix to the class's daily periods", () => {
    const classes = [
      { id: "a", className: "Class V", section: "A", dailyPeriods: 5 },
      { id: "b", className: "Class V", section: "B", dailyPeriods: 5 },
      { id: "c", className: "Class VII", section: "A", dailyPeriods: null },
    ];
    const v = settingsForClass(S, classes, "Class V");
    expect(v.periodsPerDay).toBe(5);
    expect(v.halfDayPeriods).toBe(4);
    expect(slotsFromWindow("afternoon", v)["0"]).toEqual([5]);
    expect(normalizeSlots(slotsFromWindow("any", v), v)).toBeNull();
    expect(settingsForClass(S, classes, "Class VII")).toBe(S);
    expect(settingsForClass(S, classes, "Class IX")).toBe(S);
  });

  it("caps weekly capacity by max per day", () => {
    const slots = { "0": [1, 2, 3], "1": [], "2": [1, 2, 3], "3": [], "4": [], "5": [] };
    expect(slotStats(slots, S, 1)).toEqual({ total: 6, openDays: 2, capacity: 2 });
    expect(slotStats(slots, S, 3).capacity).toBe(6);
  });
});
