import { describe, expect, it } from "vitest";
import { createScannerBuffer, deskShortcut, type KeyLike } from "@/lib/library/scanner-input";

const key = (k: string, extra: Partial<KeyLike> = {}): KeyLike => ({ key: k, ...extra });

/** Types `text` then Enter, `gap` ms apart, starting at `start`. */
function type(buf: ReturnType<typeof createScannerBuffer>, text: string, gap: number, start = 0) {
  let t = start;
  for (const ch of text) {
    buf.push(key(ch), t);
    t += gap;
  }
  return buf.push(key("Enter"), t);
}

describe("deskShortcut", () => {
  it("uses Alt for renew, issue and search, Esc for close", () => {
    expect(deskShortcut(key("r", { altKey: true, code: "KeyR" }))).toBe("renew");
    expect(deskShortcut(key("i", { altKey: true, code: "KeyI" }))).toBe("issue");
    expect(deskShortcut(key("s", { altKey: true, code: "KeyS" }))).toBe("search");
    expect(deskShortcut(key("Escape"))).toBe("close");
  });

  it("never treats bare letters or / as shortcuts", () => {
    expect(deskShortcut(key("r", { code: "KeyR" }))).toBeNull();
    expect(deskShortcut(key("/", { code: "Slash" }))).toBeNull();
    expect(deskShortcut(key("s", { code: "KeyS" }))).toBeNull();
  });

  it("ignores Ctrl and Meta combinations", () => {
    expect(deskShortcut(key("r", { ctrlKey: true, altKey: true, code: "KeyR" }))).toBeNull();
    expect(deskShortcut(key("r", { metaKey: true, code: "KeyR" }))).toBeNull();
  });
});

describe("createScannerBuffer", () => {
  it("delivers a fast burst as one code on Enter", () => {
    expect(type(createScannerBuffer(), "B0045-3", 10)).toBe("B0045-3");
  });

  it("keeps a School ID with slashes whole, with no shortcut firing on the way", () => {
    const code = "SCH/2026/0142";
    const buf = createScannerBuffer();
    let t = 0;
    for (const ch of code) {
      expect(deskShortcut(key(ch, { code: ch === "/" ? "Slash" : `Key${ch}` }))).toBeNull();
      buf.push(key(ch), t);
      t += 8;
    }
    expect(buf.push(key("Enter"), t)).toBe(code);
  });

  it("drops text typed at human speed", () => {
    expect(type(createScannerBuffer(), "B0045-3", 180)).toBeNull();
  });

  it("drops a burst that is too short to be a code", () => {
    expect(type(createScannerBuffer(), "AB", 10)).toBeNull();
  });

  it("starts over after a pause, so stray keys before a scan do not stick to it", () => {
    const buf = createScannerBuffer();
    buf.push(key("x"), 0);
    buf.push(key("y"), 5);
    expect(type(buf, "B0045-3", 10, 5000)).toBe("B0045-3");
  });

  it("is empty again after a scan", () => {
    const buf = createScannerBuffer();
    expect(type(buf, "B0045-3", 10)).toBe("B0045-3");
    expect(buf.push(key("Enter"), 1000)).toBeNull();
  });

  it("ignores Alt shortcuts mid-burst and Shift for capitals", () => {
    const buf = createScannerBuffer();
    let t = 0;
    for (const ch of "AB12") {
      buf.push(key("Shift"), t);
      buf.push(key(ch), (t += 5));
      if (ch === "B") buf.push(key("r", { altKey: true }), (t += 1));
    }
    expect(buf.push(key("Enter"), (t += 5))).toBe("AB12");
  });

  it("resets on Backspace", () => {
    const buf = createScannerBuffer();
    buf.push(key("A"), 0);
    buf.push(key("Backspace"), 5);
    expect(type(buf, "B0045-3", 10, 10)).toBe("B0045-3");
  });
});
