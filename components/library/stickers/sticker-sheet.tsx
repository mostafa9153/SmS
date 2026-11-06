"use client";

import QRCode from "react-qr-code";
import type { StickerCopy } from "@/lib/library/db-library";
import { PAGE_MM, perSheet, cellPosition, stickerInner, type PrinterOffset, type StickerCell, type StickerGrid } from "@/lib/library/sticker-layout";

const mm = (v: number) => `${v}mm`;

/**
 * One A4 sheet at real size (1 mm = 1 mm). The print copy uses it as is; the
 * preview wraps it in PrintPreview. `test` draws every cell's outline and the
 * QR box instead of data, for a trial on plain paper held against a sticker sheet (K6).
 */
export function StickerSheet({
  grid,
  cells,
  offset,
  test = false,
  outline = false,
}: {
  grid: StickerGrid;
  cells: StickerCell<StickerCopy>[];
  offset: PrinterOffset;
  test?: boolean;
  /** Faint cell borders on screen only. */
  outline?: boolean;
}) {
  const inner = stickerInner(grid);
  const testCells = test ? Array.from({ length: perSheet(grid) }, (_, cell) => ({ cell, ...cellPosition(grid, cell, offset) })) : [];

  return (
    <div className="relative bg-white text-black overflow-hidden" style={{ width: mm(PAGE_MM.w), height: mm(PAGE_MM.h) }}>
      {test
        ? testCells.map((c) => (
            <div
              key={c.cell}
              className="absolute border border-black"
              style={{ left: mm(c.x), top: mm(c.y), width: mm(grid.widthMm), height: mm(grid.heightMm) }}
            >
              <div
                className="absolute border border-dashed border-black"
                style={{ left: mm(inner.qr.x), top: mm(inner.qr.y), width: mm(inner.qr.size), height: mm(inner.qr.size) }}
              />
              <span className="absolute font-mono" style={{ left: mm(inner.text.x), top: mm(inner.text.y), fontSize: "8pt" }}>
                {c.cell + 1}
              </span>
            </div>
          ))
        : cells.map((c) => (
            <div
              key={c.cell}
              className={outline ? "absolute outline outline-1 outline-slate-300" : "absolute"}
              style={{ left: mm(c.x), top: mm(c.y), width: mm(grid.widthMm), height: mm(grid.heightMm) }}
            >
              <StickerLabel copy={c.item} inner={inner} />
            </div>
          ))}
    </div>
  );
}

/** QR with only the copy code; beside it the code, title, author and copy number in Bengali. */
function StickerLabel({ copy, inner }: { copy: StickerCopy; inner: ReturnType<typeof stickerInner> }) {
  return (
    <>
      <div className="absolute" style={{ left: mm(inner.qr.x), top: mm(inner.qr.y), width: mm(inner.qr.size), height: mm(inner.qr.size) }}>
        <QRCode value={copy.code} level="M" size={256} style={{ width: "100%", height: "100%" }} />
      </div>
      <div
        className="absolute flex flex-col justify-center overflow-hidden leading-tight"
        style={{ left: mm(inner.text.x), top: mm(inner.text.y), width: mm(inner.text.w), height: mm(inner.text.h) }}
      >
        <span className="font-mono font-bold" style={{ fontSize: "10pt" }}>
          {copy.code}
        </span>
        <span className="font-semibold line-clamp-2 break-words" style={{ fontSize: "8.5pt" }}>
          {copy.title}
        </span>
        {copy.author && (
          <span className="truncate" style={{ fontSize: "7pt" }}>
            {copy.author}
          </span>
        )}
        <span className="font-semibold" style={{ fontSize: "8pt" }}>
          Copy {copy.copyNo}
        </span>
      </div>
    </>
  );
}

