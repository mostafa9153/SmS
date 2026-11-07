/**
 * A4 sticker sheet layout (plan K5–K8). Pure millimetre geometry, shared by
 * the on-screen preview and the 1:1 print copy, and unit-tested.
 *
 *  - The grid (cols × rows of w × h with gaps) is centred on the page, then
 *    shifted by this computer's printer offset (K6).
 *  - Every sticker keeps a 4 mm empty border; QR and text sit inside it (K7).
 *  - The QR is at least 15 mm; the white border doubles as its quiet zone (K8).
 *  - Printing can start at any cell, so a half-used sheet is not wasted.
 */

export const PAGE_MM = { w: 210, h: 297 } as const;
export const SAFE_MM = 4;
export const MIN_QR_MM = 15;
export const MAX_QR_MM = 26;
/** Room between the QR and the text. */
export const QR_TEXT_GAP_MM = 2.5;

export interface StickerGrid {
  cols: number;
  rows: number;
  widthMm: number;
  heightMm: number;
  gapXMm: number;
  gapYMm: number;
}

export interface PrinterOffset {
  x: number;
  y: number;
}

export interface StickerCell<T> {
  /** 0-based cell on the sheet, row by row. */
  cell: number;
  x: number;
  y: number;
  item: T;
}

export interface StickerInner {
  /** QR square, relative to the sticker's top-left. */
  qr: { x: number; y: number; size: number };
  /** Text box, relative to the sticker's top-left. */
  text: { x: number; y: number; w: number; h: number };
}

export const perSheet = (g: StickerGrid) => g.cols * g.rows;

/** What is wrong with a grid for A4 (empty when it prints). */
export function gridProblems(g: StickerGrid): string[] {
  const out: string[] = [];
  const gridW = g.cols * g.widthMm + (g.cols - 1) * g.gapXMm;
  const gridH = g.rows * g.heightMm + (g.rows - 1) * g.gapYMm;
  if (gridW > PAGE_MM.w + 0.01) out.push(`${(gridW - PAGE_MM.w).toFixed(1)} mm too wide`);
  if (gridH > PAGE_MM.h + 0.01) out.push(`${(gridH - PAGE_MM.h).toFixed(1)} mm too tall`);
  if (g.heightMm - 2 * SAFE_MM < MIN_QR_MM) out.push(`Sticker must be at least ${MIN_QR_MM + 2 * SAFE_MM} mm tall for the QR`);
  if (g.widthMm - 2 * SAFE_MM < MIN_QR_MM + QR_TEXT_GAP_MM + 10) out.push("Sticker too narrow");
  return out;
}

/** Top-left of the grid on the page: centred, then moved by the printer offset. */
export function gridOrigin(g: StickerGrid, offset: PrinterOffset = { x: 0, y: 0 }) {
  const gridW = g.cols * g.widthMm + (g.cols - 1) * g.gapXMm;
  const gridH = g.rows * g.heightMm + (g.rows - 1) * g.gapYMm;
  return { x: (PAGE_MM.w - gridW) / 2 + offset.x, y: (PAGE_MM.h - gridH) / 2 + offset.y };
}

/** Top-left of one cell on the page. */
export function cellPosition(g: StickerGrid, cell: number, offset?: PrinterOffset) {
  const o = gridOrigin(g, offset);
  const col = cell % g.cols;
  const row = Math.floor(cell / g.cols) % g.rows;
  return { x: o.x + col * (g.widthMm + g.gapXMm), y: o.y + row * (g.heightMm + g.gapYMm) };
}

/** Splits items over sheets; the first sheet starts at `startCell`, later sheets at cell 0. */
export function layoutSheets<T>(g: StickerGrid, items: readonly T[], startCell = 0, offset?: PrinterOffset): StickerCell<T>[][] {
  const n = perSheet(g);
  const start = Math.min(Math.max(0, Math.floor(startCell)), n - 1);
  const pages: StickerCell<T>[][] = [];
  let cell = start;
  let page: StickerCell<T>[] = [];
  for (const item of items) {
    if (cell >= n) {
      pages.push(page);
      page = [];
      cell = 0;
    }
    page.push({ cell, ...cellPosition(g, cell, offset), item });
    cell++;
  }
  if (page.length) pages.push(page);
  return pages;
}

/** QR and text boxes inside one sticker, all within the safe border. */
export function stickerInner(g: StickerGrid): StickerInner {
  const innerW = g.widthMm - 2 * SAFE_MM;
  const innerH = g.heightMm - 2 * SAFE_MM;
  const size = Math.max(MIN_QR_MM, Math.min(MAX_QR_MM, innerH, innerW * 0.45));
  const qr = { x: SAFE_MM, y: SAFE_MM + (innerH - size) / 2, size };
  const textX = SAFE_MM + size + QR_TEXT_GAP_MM;
  return { qr, text: { x: textX, y: SAFE_MM, w: g.widthMm - SAFE_MM - textX, h: innerH } };
}

/** Clamp a printer offset to something sensible (a few mm either way). */
export function clampOffset(v: number): number {
  if (!Number.isFinite(v)) return 0;
  return Math.round(Math.max(-10, Math.min(10, v)) * 10) / 10;
}
