import { describe, expect, it } from "vitest";
import {
  createScanDebouncer,
  diagnoseScan,
  isCopyCode,
  isScannerBurst,
  normalizeScan,
  parseCopyCode,
  resolveScan,
} from "@/lib/library/scan-code";

describe("normalizeScan", () => {
  it("trims, drops control characters and upper-cases", () => {
    expect(normalizeScan("  b0045-3\r\n")).toBe("B0045-3");
    expect(normalizeScan("\tmhs/2026/v/a/12/007\n")).toBe("MHS/2026/V/A/12/007");
  });
  it("drops zero-width and no-break spaces around a pasted code", () => {
    expect(normalizeScan("\u00a0\u200bB0045-3\ufeff")).toBe("B0045-3");
  });
  it("keeps leading zeros of a PEN", () => {
    expect(normalizeScan("00123456789")).toBe("00123456789");
  });
});

describe("copy codes", () => {
  it("recognises the configured prefix", () => {
    expect(isCopyCode("B0045-3", "B")).toBe(true);
    expect(isCopyCode("B12345-10", "B")).toBe(true);
    expect(isCopyCode("LIB0045-3", "LIB")).toBe(true);
    expect(isCopyCode("B045-3", "B")).toBe(false);
    expect(isCopyCode("B0045", "B")).toBe(false);
    expect(isCopyCode("MHS/2026/007", "B")).toBe(false);
  });
  it("escapes regex characters in the prefix", () => {
    expect(isCopyCode("L.B0045-3", "L.B")).toBe(true);
    expect(isCopyCode("LXB0045-3", "L.B")).toBe(false);
  });
  it("splits a copy code", () => {
    expect(parseCopyCode("B0045-3", "B")).toEqual({ bookCode: "B0045", copyNo: 3 });
    expect(parseCopyCode("B0045", "B")).toBeNull();
  });
});

describe("resolveScan", () => {
  const empty = { copies: [], bySchoolId: [], byPen: [], staff: [] };
  it("prefers a copy, then School ID, then PEN, then staff", () => {
    expect(resolveScan({ ...empty, copies: [{ id: "c1" }], bySchoolId: [{ id: "s1" }] })).toEqual({ kind: "copy", id: "c1" });
    expect(resolveScan({ ...empty, bySchoolId: [{ id: "s1" }], byPen: [{ id: "s2" }] })).toEqual({ kind: "student", id: "s1" });
    expect(resolveScan({ ...empty, byPen: [{ id: "s2" }], staff: [{ id: "t1" }] })).toEqual({ kind: "student", id: "s2" });
    expect(resolveScan({ ...empty, staff: [{ id: "t1" }] })).toEqual({ kind: "staff", id: "t1" });
  });
  it("treats the same row returned twice as one match", () => {
    expect(resolveScan({ ...empty, bySchoolId: [{ id: "s1" }, { id: "s1" }] })).toEqual({ kind: "student", id: "s1" });
  });
  it("never picks one of several matches", () => {
    expect(resolveScan({ ...empty, byPen: [{ id: "s1" }, { id: "s2" }] })).toEqual({
      kind: "ambiguous",
      options: [
        { kind: "student", id: "s1" },
        { kind: "student", id: "s2" },
      ],
    });
  });
  it("reports an unknown code", () => {
    expect(resolveScan(empty)).toEqual({ kind: "unknown" });
  });
});

describe("diagnoseScan (scanner test)", () => {
  it("matches after normalising", () => {
    expect(diagnoseScan("mhs/2026/007\r\n", "MHS/2026/007")).toMatchObject({ match: true, normalized: "MHS/2026/007" });
  });
  it("points at a keyboard-layout swap of a symbol", () => {
    expect(diagnoseScan("MHS-2026-007", "MHS/2026/007")).toMatchObject({
      match: false,
      hint: "keyboard_layout",
      position: 3,
      expected: "/",
      got: "-",
    });
  });
  it("spots lost leading zeros", () => {
    expect(diagnoseScan("123456789", "00123456789")).toMatchObject({ match: false, hint: "leading_zeros" });
  });
  it("spots a cut-off or extra tail", () => {
    expect(diagnoseScan("MHS/2026/00", "MHS/2026/007")).toMatchObject({ match: false, hint: "length" });
  });
});

describe("scanner input timing", () => {
  it("ignores the same code again within the window", () => {
    const accept = createScanDebouncer(2000);
    expect(accept("B0045-3", 1000)).toBe(true);
    expect(accept("B0045-3", 2500)).toBe(false);
    expect(accept("B0046-1", 2600)).toBe(true);
    // the rejected beep at 2500 restarted the window
    expect(accept("B0045-3", 3100)).toBe(false);
    expect(accept("B0045-3", 5200)).toBe(true);
  });
  it("still ignores a code when another code came in between (A, B, A)", () => {
    const accept = createScanDebouncer(2000);
    expect(accept("A", 0)).toBe(true);
    expect(accept("B", 100)).toBe(true);
    expect(accept("A", 500)).toBe(false);
  });
  it("tells a scanner burst from human typing", () => {
    expect(isScannerBurst([0, 8, 15, 24, 31, 40])).toBe(true);
    expect(isScannerBurst([0, 120, 260, 400, 510])).toBe(false);
    expect(isScannerBurst([0, 8, 15])).toBe(false); // too short
  });
  it("treats a whole School ID with slashes as one burst", () => {
    const code = "MHS/2026/V/A/12/007";
    const times = [...code].map((_, i) => i * 10);
    expect(isScannerBurst(times)).toBe(true);
  });
});
