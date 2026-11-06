"use client";

import { useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api/client";
import { toastWithUndo } from "@/lib/undo/client";
import type { StickerCopy } from "./db-library";
import { newRequestId } from "./request-id";
import type { LibrarySettings } from "./settings";
import { clampOffset, gridProblems, layoutSheets, type PrinterOffset } from "./sticker-layout";
import { libraryKeys, libraryWrite, useRefreshLibrary } from "./use-catalog";

/** Printer offset is per computer (K6), never in shared settings. */
const OFFSET_KEY = "library-sticker-offset";

function readOffset(): PrinterOffset {
  try {
    const v = JSON.parse(localStorage.getItem(OFFSET_KEY) ?? "null");
    return { x: clampOffset(Number(v?.x) || 0), y: clampOffset(Number(v?.y) || 0) };
  } catch {
    return { x: 0, y: 0 };
  }
}

export type StickerSource = { copies: string[] } | { book: string } | { unprinted: true };

const sourceQuery = (s: StickerSource) =>
  "copies" in s ? `copies=${s.copies.join(",")}` : "book" in s ? `book=${s.book}` : "";

/** State for the sticker page: copies, layout, start cell, offset, print, and the "did it print right?" step (K4). */
export function useStickerPrint(source: StickerSource) {
  const settings = useQuery<LibrarySettings>({
    queryKey: [...libraryKeys.all, "settings"],
    queryFn: () => apiFetch<LibrarySettings>("/api/library/settings"),
  });
  const copies = useQuery<StickerCopy[]>({
    queryKey: [...libraryKeys.all, "stickers", sourceQuery(source)],
    queryFn: () => apiFetch<StickerCopy[]>(`/api/library/stickers?${sourceQuery(source)}`),
  });
  const refresh = useRefreshLibrary();

  const [startCell, setStartCell] = useState(0);
  // The page renders on the client only (useSearchParams under Suspense), so localStorage is safe here.
  const [offset, setOffsetState] = useState<PrinterOffset>(() => (typeof window === "undefined" ? { x: 0, y: 0 } : readOffset()));
  const [test, setTest] = useState(false);
  const [onlyUnprinted, setOnlyUnprinted] = useState(false);
  const [awaitingConfirm, setAwaitingConfirmState] = useState<string[] | null>(null);
  const [saving, setSaving] = useState(false);
  const requestId = useRef(newRequestId());
  // Each confirm prompt gets its own request id: a retry of it replays, a new print run never does.
  const setAwaitingConfirm = (ids: string[] | null) => {
    if (ids) requestId.current = newRequestId();
    setAwaitingConfirmState(ids);
  };

  const setOffset = (next: PrinterOffset) => {
    const v = { x: clampOffset(next.x), y: clampOffset(next.y) };
    setOffsetState(v);
    try {
      localStorage.setItem(OFFSET_KEY, JSON.stringify(v));
    } catch {}
  };

  const grid = settings.data?.sticker;
  const list = useMemo(
    () => (copies.data ?? []).filter((c) => !onlyUnprinted || !c.printedAt),
    [copies.data, onlyUnprinted],
  );
  const pages = useMemo(() => (grid ? layoutSheets(grid, list, startCell, offset) : []), [grid, list, startCell, offset]);
  const problems = grid ? gridProblems(grid) : [];

  const print = () => {
    if (!grid || problems.length) return;
    const printed = test ? null : list.map((c) => c.id);
    window.addEventListener("afterprint", () => printed?.length && setAwaitingConfirm(printed), { once: true });
    window.print();
  };

  /** Marks only after the librarian says the sheet came out right; a test print never marks. */
  const confirmPrinted = async () => {
    if (!awaitingConfirm?.length || saving) return;
    setSaving(true);
    try {
      const r = await libraryWrite<{ changed: number }>(
        "/api/library/stickers",
        "POST",
        { copyIds: awaitingConfirm, printed: true },
        requestId.current,
      );
      toastWithUndo(`${r.data.changed}টি sticker ছাপা হয়েছে`, r.undoId, refresh);
      setAwaitingConfirm(null);
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "চিহ্নিত করা যায়নি");
    } finally {
      setSaving(false);
    }
  };

  return {
    grid,
    loading: settings.isLoading || copies.isLoading,
    list,
    total: copies.data?.length ?? 0,
    pages,
    problems,
    startCell,
    setStartCell,
    offset,
    setOffset,
    test,
    setTest,
    onlyUnprinted,
    setOnlyUnprinted,
    print,
    awaitingConfirm,
    confirmPrinted,
    dismissConfirm: () => setAwaitingConfirm(null),
    saving,
  };
}
