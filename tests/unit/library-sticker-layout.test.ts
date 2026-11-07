import { describe, expect, it } from "vitest";
import {
  MIN_QR_MM,
  PAGE_MM,
  SAFE_MM,
  cellPosition,
  clampOffset,
  gridProblems,
  layoutSheets,
  perSheet,
  stickerInner,
  type StickerGrid,
} from "@/lib/library/sticker-layout";

const A4_24: StickerGrid = { cols: 3, rows: 8, widthMm: 70, heightMm: 37, gapXMm: 0, gapYMm: 0 };
const items = (n: number) => Array.from({ length: n }, (_, i) => `B0001-${i + 1}`);

describe("sticker sheet (K5)", () => {
  it("holds 24 stickers of 70 × 37 mm on A4 and fits", () => {
    expect(perSheet(A4_24)).toBe(24);
    expect(gridProblems(A4_24)).toEqual([]);
  });

  it("places cells row by row, centred on the page", () => {
    expect(cellPosition(A4_24, 0)).toEqual({ x: 0, y: 0.5 });
    expect(cellPosition(A4_24, 1)).toEqual({ x: 70, y: 0.5 });
    expect(cellPosition(A4_24, 3)).toEqual({ x: 0, y: 37.5 });
    const last = cellPosition(A4_24, 23);
    expect(last.x + 70).toBeCloseTo(PAGE_MM.w);
    expect(last.y + 37).toBeCloseTo(PAGE_MM.h - 0.5);
  });

  it("includes gaps between cells", () => {
    const g = { ...A4_24, cols: 2, widthMm: 100, gapXMm: 5, rows: 7, heightMm: 40, gapYMm: 2 };
    expect(cellPosition(g, 0)).toEqual({ x: 2.5, y: 2.5 });
    expect(cellPosition(g, 1)).toEqual({ x: 107.5, y: 2.5 });
    expect(cellPosition(g, 2)).toEqual({ x: 2.5, y: 44.5 });
  });

  it("starts the first sheet at the chosen cell and later sheets at the top", () => {
    const pages = layoutSheets(A4_24, items(30), 20);
    expect(pages.map((p) => p.length)).toEqual([4, 24, 2]);
    expect(pages[0][0].cell).toBe(20);
    expect(pages[1][0].cell).toBe(0);
    expect(pages[0][0].item).toBe("B0001-1");
  });

  it("clamps a start cell past the sheet", () => {
    expect(layoutSheets(A4_24, items(2), 99)[0][0].cell).toBe(23);
  });

  it("moves everything by the printer offset (K6)", () => {
    const [page] = layoutSheets(A4_24, items(1), 0, { x: 1.5, y: -2 });
    expect(page[0]).toMatchObject({ x: 1.5, y: -1.5 });
    expect(clampOffset(25)).toBe(10);
    expect(clampOffset(Number.NaN)).toBe(0);
    expect(clampOffset(-1.234)).toBe(-1.2);
  });

  it("flags a grid that does not fit A4", () => {
    expect(gridProblems({ ...A4_24, cols: 4 }).length).toBeGreaterThan(0);
    expect(gridProblems({ ...A4_24, heightMm: 20 }).length).toBeGreaterThan(0);
  });
});

describe("inside one sticker (K7, K8)", () => {
  it("keeps the QR and the text inside the 4 mm border", () => {
    const { qr, text } = stickerInner(A4_24);
    expect(qr.x).toBeGreaterThanOrEqual(SAFE_MM);
    expect(qr.y).toBeGreaterThanOrEqual(SAFE_MM);
    expect(qr.y + qr.size).toBeLessThanOrEqual(37 - SAFE_MM + 1e-9);
    expect(text.x).toBeGreaterThan(qr.x + qr.size);
    expect(text.x + text.w).toBeLessThanOrEqual(70 - SAFE_MM + 1e-9);
    expect(text.y + text.h).toBeLessThanOrEqual(37 - SAFE_MM + 1e-9);
  });

  it("makes the QR at least 15 mm", () => {
    expect(stickerInner(A4_24).qr.size).toBeGreaterThanOrEqual(MIN_QR_MM);
    expect(stickerInner({ ...A4_24, heightMm: 23 }).qr.size).toBe(MIN_QR_MM);
  });
});
