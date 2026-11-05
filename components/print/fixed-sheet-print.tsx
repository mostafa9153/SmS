"use client";

import { Children, type ReactNode } from "react";
import type { PrintMargins } from "@/lib/print/paper";
import { cn } from "@/lib/utils";

/** Margins for layouts that draw their own border to the paper edge (no browser header/footer room). */
export const NO_MARGINS: PrintMargins = { top: 0, right: 0, bottom: 0, left: 0 };

/** Headroom so rounding never pushes a full-height sheet onto a second page. */
const SAFETY_MM = 0.6;

/**
 * Print copy for a layout drawn at a fixed sheet size (e.g. a 148×210 mm certificate).
 * Each child is one printed page, scaled to fill the page's printable area and centred.
 * Hidden on screen; pair it with `PrintPreview` for the on-screen view.
 */
export function FixedSheetPrint({
  sheetW,
  sheetH,
  pageW,
  pageH,
  margins = NO_MARGINS,
  className,
  children,
}: {
  sheetW: number;
  sheetH: number;
  pageW: number;
  pageH: number;
  margins?: PrintMargins;
  className?: string;
  children: ReactNode;
}) {
  const areaW = pageW - margins.left - margins.right;
  const areaH = pageH - margins.top - margins.bottom - SAFETY_MM;
  const zoom = Math.min(areaW / sheetW, areaH / sheetH);
  const pages = Children.toArray(children);

  return (
    <div className={cn("hidden print:block", className)}>
      {pages.map((page, i) => (
        <div
          key={i}
          style={{
            width: `${areaW}mm`,
            height: `${areaH}mm`,
            overflow: "hidden",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            breakInside: "avoid",
            breakAfter: i === pages.length - 1 ? "auto" : "page",
          }}
        >
          <div style={{ zoom }}>{page}</div>
        </div>
      ))}
    </div>
  );
}
