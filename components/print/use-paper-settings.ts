"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  MARGIN_SIDES,
  PAPER_SIZES,
  pageSizeMm,
  type PaperOrientation,
  type PaperSize,
  type PrintMargins,
} from "@/lib/print/paper";

export interface PaperDefaults {
  paper: PaperSize;
  /** Sizes this layout supports; also the panel's choices. */
  papers?: PaperSize[];
  orientation?: PaperOrientation;
  margins: PrintMargins;
}

export type PaperSettings = ReturnType<typeof usePaperSettings>;

function isMargins(v: unknown): v is PrintMargins {
  return !!v && typeof v === "object" && MARGIN_SIDES.every((s) => typeof (v as Record<string, unknown>)[s] === "number");
}

/** Parses a saved settings string. Accepts both shapes pages used before (`paper` or `paperSize`). */
export function readSavedPaper(
  raw: string | null,
  papers: PaperSize[] = PAPER_SIZES
): Partial<Pick<Required<PaperDefaults>, "paper" | "orientation" | "margins">> {
  if (!raw) return {};
  try {
    const s = JSON.parse(raw);
    const paper = s.paper ?? s.paperSize;
    return {
      ...(papers.includes(paper) && { paper: paper as PaperSize }),
      ...((s.orientation === "portrait" || s.orientation === "landscape") && { orientation: s.orientation }),
      ...(isMargins(s.margins) && { margins: s.margins }),
    };
  } catch {
    return {};
  }
}

/** Paper size, orientation and margins for one print page, remembered per page under `storageKey`. */
export function usePaperSettings(storageKey: string, defaults: PaperDefaults) {
  const [paper, setPaper] = useState<PaperSize>(defaults.paper);
  const [orientation, setOrientation] = useState<PaperOrientation>(defaults.orientation ?? "portrait");
  const [margins, setMargins] = useState<PrintMargins>(defaults.margins);
  const papersKey = (defaults.papers ?? PAPER_SIZES).join(",");
  const papers = useMemo(() => papersKey.split(",") as PaperSize[], [papersKey]);

  useEffect(() => {
    let saved: ReturnType<typeof readSavedPaper> = {};
    try {
      saved = readSavedPaper(localStorage.getItem(storageKey), papers);
    } catch {}
    if (saved.paper) setPaper(saved.paper);
    if (saved.orientation) setOrientation(saved.orientation);
    if (saved.margins) setMargins(saved.margins);
  }, [storageKey, papers]);

  const setMargin = useCallback((side: keyof PrintMargins, raw: string) => {
    const value = Math.max(0, Number(raw) || 0);
    setMargins((prev) => ({ ...prev, [side]: value }));
  }, []);

  const save = useCallback(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify({ paper, paperSize: paper, orientation, margins }));
      toast.success("Paper settings saved");
    } catch {
      toast.error("Could not save paper settings");
    }
  }, [storageKey, paper, orientation, margins]);

  const { pageW, pageH } = useMemo(() => pageSizeMm(paper, orientation), [paper, orientation]);

  return { papers, paper, setPaper, orientation, setOrientation, margins, setMargins, setMargin, save, pageW, pageH };
}
