export type PaperSize = "A5" | "A4" | "A3";
export type PaperOrientation = "portrait" | "landscape";
export interface PrintMargins {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export const PAPER_MM: Record<PaperSize, { w: number; h: number }> = {
  A5: { w: 148, h: 210 },
  A4: { w: 210, h: 297 },
  A3: { w: 297, h: 420 },
};

export const PAPER_SIZES = Object.keys(PAPER_MM) as PaperSize[];

export const MARGIN_SIDES = ["top", "right", "bottom", "left"] as const;

const even = (mm: number): PrintMargins => ({ top: mm, right: mm, bottom: mm, left: mm });

/** One-click margins in the paper panel. */
export const MARGIN_PRESETS = [
  { label: "None", margins: even(0) },
  { label: "Narrow", margins: even(5) },
  { label: "Normal", margins: even(10) },
] as const;

export const sameMargins = (a: PrintMargins, b: PrintMargins) => MARGIN_SIDES.every((s) => a[s] === b[s]);

/** Page width/height in mm for a paper size turned to an orientation. */
export function pageSizeMm(paper: PaperSize, orientation: PaperOrientation = "portrait") {
  const { w, h } = PAPER_MM[paper];
  return orientation === "landscape" ? { pageW: h, pageH: w } : { pageW: w, pageH: h };
}

/** `@page` rule for the browser print dialog. */
export function pageRuleCss(pageW: number, pageH: number, m: PrintMargins) {
  return `@page { size: ${pageW}mm ${pageH}mm; margin: ${m.top}mm ${m.right}mm ${m.bottom}mm ${m.left}mm; }`;
}
