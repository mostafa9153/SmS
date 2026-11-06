"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toastWithUndo } from "@/lib/undo/client";
import { libraryWrite, useRefreshLibrary } from "@/lib/library/use-catalog";
import type { BookRow } from "@/lib/library/db-library";
import { BookFields, bookPayload, isSubmitEnter, toBookValues, type BookFormValues } from "./book-fields";

export function EditBookDialog({ book, open, onOpenChange }: { book: BookRow; open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl rounded-2xl">
        {open && <EditBookForm key={book.updated_at} book={book} onDone={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  );
}

function EditBookForm({ book, onDone }: { book: BookRow; onDone: () => void }) {
  const [values, setValues] = useState<BookFormValues>(() => toBookValues(book));
  const [saving, setSaving] = useState(false);
  const refresh = useRefreshLibrary();
  const inFlight = useRef(false);

  const save = async () => {
    if (!values.title.trim() || inFlight.current) return;
    inFlight.current = true;
    setSaving(true);
    try {
      const r = await libraryWrite(`/api/library/books/${book.id}`, "PATCH", bookPayload(values));
      toastWithUndo("সংরক্ষিত", r.undoId, refresh);
      refresh();
      onDone();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "সংরক্ষণ হয়নি");
    } finally {
      inFlight.current = false;
      setSaving(false);
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>
          {book.book_code} সম্পাদনা
        </DialogTitle>
      </DialogHeader>
      <div onKeyDown={(e) => isSubmitEnter(e) && save()}>
        <BookFields values={values} onChange={setValues} titleError={values.title.trim() ? undefined : "নাম লিখুন"} autoFocus />
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onDone}>
          বাতিল
        </Button>
        <Button onClick={save} disabled={saving || !values.title.trim()}>
          {saving ? "সংরক্ষণ হচ্ছে…" : "সংরক্ষণ"}
        </Button>
      </DialogFooter>
    </>
  );
}
