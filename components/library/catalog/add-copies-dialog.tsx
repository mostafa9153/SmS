"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FormField, FormGrid } from "@/components/forms/form-layout";
import { Input } from "@/components/ui/input";
import { toastWithUndo } from "@/lib/undo/client";
import { newRequestId } from "@/lib/library/request-id";
import { libraryWrite, useRefreshLibrary } from "@/lib/library/use-catalog";
import { isSubmitEnter } from "./book-fields";

/** More copies of an existing title; their numbers continue after the highest ever used (D3). */
export function AddCopiesDialog({
  book,
  defaultCount = 1,
  defaultPrice = "",
  onOpenChange,
  onAdded,
}: {
  book: { id: string; title: string } | null;
  defaultCount?: number;
  defaultPrice?: string;
  onOpenChange: (open: boolean) => void;
  onAdded?: () => void;
}) {
  return (
    <Dialog open={Boolean(book)} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-2xl">
        {book && (
          <AddCopiesForm
            key={book.id}
            book={book}
            defaultCount={defaultCount}
            defaultPrice={defaultPrice}
            onClose={() => onOpenChange(false)}
            onAdded={onAdded}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function AddCopiesForm({
  book,
  defaultCount,
  defaultPrice,
  onClose,
  onAdded,
}: {
  book: { id: string; title: string };
  defaultCount: number;
  defaultPrice: string;
  onClose: () => void;
  onAdded?: () => void;
}) {
  const [count, setCount] = useState(String(defaultCount));
  const [price, setPrice] = useState(defaultPrice);
  const [saving, setSaving] = useState(false);
  const refresh = useRefreshLibrary();
  const inFlight = useRef(false);
  const requestId = useRef(newRequestId());
  const n = Number(count);
  const priceValue = price.trim() === "" ? null : Number(price);
  const valid = Number.isInteger(n) && n >= 1 && n <= 500 && (priceValue === null || priceValue >= 0);

  const save = async () => {
    if (!valid || inFlight.current) return;
    inFlight.current = true;
    setSaving(true);
    try {
      const r = await libraryWrite<{ copyIds: string[] }>(
        `/api/library/books/${book.id}/copies`,
        "POST",
        { count: n, price: priceValue },
        requestId.current,
      );
      toastWithUndo(`${r.data.copyIds.length}টি কপি যোগ হলো`, r.undoId, refresh);
      refresh();
      onClose();
      onAdded?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "কপি যোগ করা যায়নি");
    } finally {
      inFlight.current = false;
      setSaving(false);
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle className="truncate">কপি যোগ: {book.title}</DialogTitle>
      </DialogHeader>
      <div onKeyDown={(e) => isSubmitEnter(e) && save()}>
        <FormGrid>
          <FormField label="কপির সংখ্যা">
            <Input type="number" inputMode="numeric" min={1} max={500} value={count} autoFocus onChange={(e) => setCount(e.target.value)} />
          </FormField>
          <FormField label="দাম (প্রতি কপি, ₹)">
            <Input type="number" inputMode="decimal" min={0} step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} />
          </FormField>
        </FormGrid>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          বাতিল
        </Button>
        <Button onClick={save} disabled={saving || !valid}>
          {saving ? "যোগ হচ্ছে…" : "যোগ করো"}
        </Button>
      </DialogFooter>
    </>
  );
}
