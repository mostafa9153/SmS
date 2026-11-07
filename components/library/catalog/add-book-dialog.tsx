"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { CopyPlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FormField, FormGrid } from "@/components/forms/form-layout";
import { Input } from "@/components/ui/input";
import { toastWithUndo } from "@/lib/undo/client";
import { newRequestId } from "@/lib/library/request-id";
import { libraryWrite, useDuplicateBooks, useRefreshLibrary } from "@/lib/library/use-catalog";
import { BookFields, EMPTY_BOOK, bookPayload, isSubmitEnter, type BookFormValues } from "./book-fields";
import { AddCopiesDialog } from "./add-copies-dialog";

/** New title with its first copies; warns when the title is already in the catalog (K1). */
export function AddBookDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl rounded-2xl">{open && <AddBookForm onDone={() => onOpenChange(false)} />}</DialogContent>
    </Dialog>
  );
}

function AddBookForm({ onDone }: { onDone: () => void }) {
  const [values, setValues] = useState<BookFormValues>(EMPTY_BOOK);
  const [copies, setCopies] = useState("1");
  const [price, setPrice] = useState("");
  const [saving, setSaving] = useState(false);
  const [titleError, setTitleError] = useState<string>();
  const [addTo, setAddTo] = useState<{ id: string; title: string } | null>(null);
  const refresh = useRefreshLibrary();
  const inFlight = useRef(false);
  const requestId = useRef(newRequestId());
  // Check against what was typed after a short pause, not on every key.
  const [checked, setChecked] = useState({ title: "", author: "" });
  const duplicates = useDuplicateBooks(checked.title, checked.author);
  const matches = checked.title === values.title.trim() ? (duplicates.data ?? []) : [];

  const count = Number(copies);
  const priceValue = price.trim() === "" ? null : Number(price);
  const valid = values.title.trim() && Number.isInteger(count) && count >= 0 && count <= 500 && (priceValue === null || priceValue >= 0);

  const save = async () => {
    if (!values.title.trim()) return setTitleError("Enter the title");
    if (!valid || inFlight.current) return;
    inFlight.current = true;
    setSaving(true);
    try {
      const r = await libraryWrite<{ bookId: string; bookCode: string }>(
        "/api/library/books",
        "POST",
        { book: bookPayload(values), copies: count, price: priceValue },
        requestId.current,
      );
      toastWithUndo(`Added: ${r.data.bookCode}`, r.undoId, refresh);
      refresh();
      onDone();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not add");
    } finally {
      inFlight.current = false;
      setSaving(false);
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>New book</DialogTitle>
      </DialogHeader>
      <div
        className="space-y-4"
        onBlur={() => setChecked({ title: values.title.trim(), author: values.author.trim() })}
        onKeyDown={(e) => isSubmitEnter(e) && save()}
      >
        <BookFields
          values={values}
          onChange={(v) => {
            setValues(v);
            setTitleError(undefined);
          }}
          titleError={titleError}
          autoFocus
        />
        {matches.length > 0 && (
          <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-sm space-y-2">
            <p className="font-semibold text-amber-800 dark:text-amber-300">Already exists</p>
            {matches.map((b) => (
              <div key={b.id} className="flex flex-wrap items-center justify-between gap-2">
                <Link href={`/library/books/${b.id}`} className="font-medium hover:underline">
                  {b.book_code} · {b.title}
                  {b.author ? ` — ${b.author}` : ""}
                </Link>
                <Button size="sm" variant="outline" onClick={() => setAddTo({ id: b.id, title: b.title })}>
                  <CopyPlus /> Add copies
                </Button>
              </div>
            ))}
          </div>
        )}
        <FormGrid>
          <FormField label="Copies">
            <Input type="number" inputMode="numeric" min={0} max={500} value={copies} onChange={(e) => setCopies(e.target.value)} />
          </FormField>
          <FormField label="Price (per copy, ₹)">
            <Input type="number" inputMode="decimal" min={0} step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} />
          </FormField>
        </FormGrid>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onDone}>
          Cancel
        </Button>
        <Button onClick={save} disabled={saving || !valid}>
          {saving ? "Adding…" : "Add"}
        </Button>
      </DialogFooter>
      <AddCopiesDialog
        book={addTo}
        defaultCount={count > 0 ? count : 1}
        defaultPrice={price}
        onOpenChange={(o) => !o && setAddTo(null)}
        onAdded={onDone}
      />
    </>
  );
}
