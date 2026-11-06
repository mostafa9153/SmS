import { describe, expect, it } from "vitest";
import { findDuplicates, titleKey } from "@/lib/library/catalog";

const BOOKS = [
  { id: "1", title: "পথের পাঁচালী", author: "বিভূতিভূষণ বন্দ্যোপাধ্যায়" },
  { id: "2", title: "Pather Panchali", author: null },
  { id: "3", title: "আম আঁটির ভেঁপু", author: "বিভূতিভূষণ বন্দ্যোপাধ্যায়" },
  { id: "4", title: "Gitanjali", author: "Rabindranath Tagore" },
];

describe("titleKey", () => {
  it("folds case, punctuation, spacing and the danda", () => {
    expect(titleKey("  Gitanjali:  Song-Offerings! ")).toBe("gitanjali song offerings");
    expect(titleKey("পথের পাঁচালী।")).toBe("পথের পাঁচালী");
  });
  it("treats decomposed Bengali and zero-width marks as the same text", () => {
    const nfd = "পথের পাঁচালী".normalize("NFD");
    expect(titleKey(`পথের‌ ${nfd.slice(5)}`)).toBe(titleKey("পথের পাঁচালী"));
  });
});

describe("findDuplicates (K1)", () => {
  it("matches the same title and author", () => {
    expect(findDuplicates({ title: "পথের  পাঁচালী", author: "বিভূতিভূষণ বন্দ্যোপাধ্যায়" }, BOOKS).map((b) => b.id)).toEqual(["1"]);
  });
  it("matches when either side has no author", () => {
    expect(findDuplicates({ title: "pather panchali" }, BOOKS).map((b) => b.id)).toEqual(["2"]);
    expect(findDuplicates({ title: "Pather Panchali", author: "Someone" }, BOOKS).map((b) => b.id)).toEqual(["2"]);
  });
  it("keeps different authors of the same title apart", () => {
    expect(findDuplicates({ title: "Gitanjali", author: "Another Poet" }, BOOKS)).toEqual([]);
  });
  it("does not match a different title by the same author", () => {
    expect(findDuplicates({ title: "অপরাজিত", author: "বিভূতিভূষণ বন্দ্যোপাধ্যায়" }, BOOKS)).toEqual([]);
  });
  it("ignores an empty title", () => {
    expect(findDuplicates({ title: " ।" }, BOOKS)).toEqual([]);
  });
});

describe("titleKey across Bengali input forms", () => {
  it("gives one key for precomposed and two-part য় and ো", () => {
    const ya = String.fromCodePoint(0x09df);
    const yaParts = String.fromCodePoint(0x09af, 0x09bc);
    expect(titleKey(`পরিচ${ya}পত্র`)).toBe(titleKey(`পরিচ${yaParts}পত্র`));
    const o = String.fromCodePoint(0x09cb);
    const oParts = String.fromCodePoint(0x09c7, 0x09be);
    expect(titleKey(`ক${o}থা`)).toBe(titleKey(`ক${oParts}থা`));
  });
});
