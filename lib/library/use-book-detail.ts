"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { toastWithUndo } from "@/lib/undo/client";
import type { BookCopy } from "./db-library";
import { LIBRARY_ERRORS } from "./errors";
import { libraryKeys, libraryWrite, useBook, useRefreshLibrary } from "./use-catalog";

/** State and handlers for the book detail page (K9: delete only if never lent, otherwise withdraw). */
export function useBookDetail(id: string) {
  const book = useBook(id);
  const refresh = useRefreshLibrary();
  const confirm = useConfirm();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [busyCopy, setBusyCopy] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [addingCopies, setAddingCopies] = useState(false);

  const fail = (err: unknown, fallback: string) => toast.error(err instanceof Error ? err.message : fallback);

  const setCopyWithdrawn = async (copy: BookCopy, withdrawn: boolean) => {
    setBusyCopy(copy.id);
    try {
      const r = await libraryWrite("/api/library/desk", "POST", { action: withdrawn ? "withdraw" : "restore", copyId: copy.id });
      toastWithUndo(withdrawn ? `${copy.code} withdrawn` : `${copy.code} shelf-এ ফেরত`, r.undoId, refresh);
      refresh();
    } catch (err) {
      fail(err, "করা যায়নি");
    } finally {
      setBusyCopy(null);
    }
  };

  /** R11: on a loan the borrower is charged overdue to today plus the lost charge. */
  const markLost = async (copy: BookCopy) => {
    const ok = await confirm({ title: `${copy.code} হারানো?`, confirmLabel: "হারানো", destructive: true });
    if (!ok) return;
    setBusyCopy(copy.id);
    try {
      const r = await libraryWrite<{ overdue: number; lost: number }>("/api/library/desk", "POST", { action: "lost", copyId: copy.id });
      const charged = r.data.overdue + r.data.lost;
      toastWithUndo(charged > 0 ? `${copy.code} হারানো · ₹${charged}` : `${copy.code} হারানো`, r.undoId, refresh);
      refresh();
    } catch (err) {
      fail(err, "করা যায়নি");
    } finally {
      setBusyCopy(null);
    }
  };

  /**
   * R12. Returns "touched" when the lost charge has money paid or waived on
   * it: the caller shows those totals and offers keep or the Fines page.
   */
  const markFound = async (copy: BookCopy, source: "borrower" | "library", keepLostFine = false): Promise<"done" | "touched" | "failed"> => {
    setBusyCopy(copy.id);
    try {
      const r = await libraryWrite("/api/library/desk", "POST", { action: "found", copyId: copy.id, source, keepLostFine });
      toastWithUndo(`${copy.code} পাওয়া গেছে`, r.undoId, refresh);
      refresh();
      return "done";
    } catch (err) {
      if (err instanceof Error && err.message === LIBRARY_ERRORS.fine_has_payments[1]) return "touched";
      fail(err, "করা যায়নি");
      return "failed";
    } finally {
      setBusyCopy(null);
    }
  };

  const setTitleWithdrawn = async (withdrawn: boolean) => {
    if (!book.data) return;
    setBusy(true);
    try {
      const r = await libraryWrite(`/api/library/books/${id}`, "PATCH", { status: withdrawn ? "withdrawn" : "active" });
      toastWithUndo(withdrawn ? "বই withdrawn" : "বই আবার সক্রিয়", r.undoId, refresh);
      refresh();
    } catch (err) {
      fail(err, "করা যায়নি");
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!book.data) return;
    const ok = await confirm({ title: `"${book.data.title}" মুছবেন?`, confirmLabel: "মুছে ফেলো", destructive: true });
    if (!ok) return;
    setBusy(true);
    try {
      const r = await libraryWrite(`/api/library/books/${id}`, "DELETE");
      // Leave first and drop the deleted book from the cache, so nothing refetches it (a 404 would reach the bell).
      router.push("/library/books");
      await queryClient.cancelQueries({ queryKey: libraryKeys.book(id) });
      queryClient.removeQueries({ queryKey: libraryKeys.book(id) });
      toastWithUndo("বই মোছা হলো", r.undoId, refresh);
      refresh();
    } catch (err) {
      fail(err, "মোছা যায়নি");
    } finally {
      setBusy(false);
    }
  };

  return {
    book,
    busy,
    busyCopy,
    editing,
    setEditing,
    addingCopies,
    setAddingCopies,
    withdrawCopy: (c: BookCopy) => setCopyWithdrawn(c, true),
    restoreCopy: (c: BookCopy) => setCopyWithdrawn(c, false),
    markLost,
    markFound,
    setTitleWithdrawn,
    remove,
  };
}
