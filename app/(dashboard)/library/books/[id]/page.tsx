"use client";

import { use } from "react";
import Link from "next/link";
import { Archive, ArchiveRestore, BookX, CopyPlus, Library, Pencil, Tags, Trash2 } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { Spinner } from "@/components/ui/spinner";
import { StatCard } from "@/components/ui/stat-card";
import { AddCopiesDialog } from "@/components/library/catalog/add-copies-dialog";
import { CopiesTable } from "@/components/library/catalog/copies-table";
import { EditBookDialog } from "@/components/library/catalog/edit-book-dialog";
import { LoanHistory } from "@/components/library/catalog/loan-history";
import { useBookDetail } from "@/lib/library/use-book-detail";

export default function LibraryBookPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const d = useBookDetail(id);
  const book = d.book.data;

  if (d.book.isLoading) return <Spinner label="লোড হচ্ছে…" className="py-24" />;
  if (!book) {
    return (
      <div className="p-6">
        <EmptyState icon={BookX} title="বইটা পাওয়া যায়নি" />
      </div>
    );
  }

  const withdrawn = book.status === "withdrawn";
  const details = [
    book.author,
    book.publisher,
    book.category,
    book.language,
    book.edition && `সংস্করণ ${book.edition}`,
    book.isbn && `ISBN ${book.isbn}`,
    book.legacy_no && `Acc. ${book.legacy_no}`,
  ].filter(Boolean);

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-5">
      <PageHeader
        title={book.title}
        icon={Library}
        back="/library/books"
        badge={
          <span className="rounded-full bg-muted px-2 py-0.5 font-mono text-xs">
            {book.book_code}
            {withdrawn ? " · Withdrawn" : ""}
          </span>
        }
        actions={
          <>
            {book.copies.length > 0 && (
              <Link href={`/library/stickers?book=${book.id}`} className={buttonVariants({ variant: "outline" })}>
                <Tags /> Sticker
              </Link>
            )}
            <Button variant="outline" onClick={() => d.setEditing(true)}>
              <Pencil /> সম্পাদনা
            </Button>
            {!withdrawn && (
              <Button onClick={() => d.setAddingCopies(true)}>
                <CopyPlus /> কপি যোগ
              </Button>
            )}
            {book.deletable ? (
              <Button variant="destructive" onClick={d.remove} disabled={d.busy}>
                <Trash2 /> মুছে ফেলো
              </Button>
            ) : (
              <Button variant="outline" onClick={() => d.setTitleWithdrawn(!withdrawn)} disabled={d.busy}>
                {withdrawn ? <ArchiveRestore /> : <Archive />} {withdrawn ? "আবার সক্রিয় করো" : "Withdraw"}
              </Button>
            )}
          </>
        }
      />

      {details.length > 0 && <p className="text-sm text-muted-foreground">{details.join(" · ")}</p>}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Shelf-এ" value={book.stock.onShelf} />
        <StatCard label="ধার দেওয়া" value={book.stock.onLoan} />
        <StatCard label="হারানো" value={book.stock.lost} />
        <StatCard label="মোট কপি" value={book.stock.total} />
      </div>

      <section className="space-y-2">
        <h2 className="text-sm font-bold">কপি</h2>
        {book.copies.length ? (
          <CopiesTable copies={book.copies} busyId={d.busyCopy} onWithdraw={d.withdrawCopy}
            onRestore={d.restoreCopy}
            onLost={d.markLost}
            onFound={d.markFound}
            lostHolder={new Map(book.history.filter((h) => h.outcome === "lost").reverse().map((h) => [h.code, h.borrower]))}
          />
        ) : (
          <EmptyState icon={CopyPlus} title="কোনো কপি নেই" compact />
        )}
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-bold">ধারের ইতিহাস</h2>
        <LoanHistory history={book.history} />
      </section>

      <EditBookDialog book={book} open={d.editing} onOpenChange={d.setEditing} />
      <AddCopiesDialog
        book={d.addingCopies ? { id: book.id, title: book.title } : null}
        defaultPrice={book.copies.at(-1)?.price != null ? String(book.copies.at(-1)!.price) : ""}
        onOpenChange={d.setAddingCopies}
      />
    </div>
  );
}
