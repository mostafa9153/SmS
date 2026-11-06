"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, BookOpen, BookPlus, FileSpreadsheet, Library, Printer, Tags, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { SearchInput } from "@/components/ui/search-input";
import { Spinner } from "@/components/ui/spinner";
import { StatCard } from "@/components/ui/stat-card";
import { AddBookDialog } from "@/components/library/catalog/add-book-dialog";
import { BookTable } from "@/components/library/catalog/book-table";
import { ImportBooksDialog } from "@/components/library/catalog/import-books-dialog";
import { useBooks, useCatalogStats } from "@/lib/library/use-catalog";

export default function LibraryCatalogPage() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [adding, setAdding] = useState(false);
  const [importing, setImporting] = useState(false);
  const books = useBooks(q.trim());
  const stats = useCatalogStats().data;
  const list = books.data?.pages.flat() ?? [];

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-5">
      <PageHeader
        title="Library Catalog"
        icon={Library}
        actions={
          <>
            <Button variant="outline" onClick={() => setImporting(true)}>
              <FileSpreadsheet /> Excel import
            </Button>
            <Button onClick={() => setAdding(true)}>
              <BookPlus /> New book
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <StatCard label="Titles" value={stats?.titles ?? "–"} icon={BookOpen} />
        <StatCard label="Copies" value={stats?.copies ?? "–"} icon={Tags} />
        <StatCard label="On loan" value={stats?.onLoan ?? "–"} icon={Users} />
        <StatCard
          label="Overdue"
          value={stats?.overdue ?? "–"}
          icon={AlertTriangle}
          iconClassName={stats?.overdue ? "text-rose-600" : undefined}
          onClick={() => router.push("/library/overdue")}
        />
        <StatCard label="Stickers to print" value={stats?.unprinted ?? "–"} icon={Printer} onClick={() => router.push("/library/stickers")} />
      </div>

      <SearchInput
        value={q}
        onChange={setQ}
        placeholder="Title, author, code or old Accession No."
      />

      {books.isLoading ? (
        <Spinner label="Loading…" className="py-16" />
      ) : list.length === 0 ? (
        <EmptyState
          icon={Library}
          title={q.trim() ? "No results" : "No books yet"}
          action={
            !q.trim() && (
              <Button onClick={() => setAdding(true)}>
                <BookPlus /> New book
              </Button>
            )
          }
        />
      ) : (
        <>
          <BookTable books={list} />
          {books.hasNextPage && (
            <div className="flex justify-center">
              <Button variant="outline" onClick={() => books.fetchNextPage()} disabled={books.isFetchingNextPage}>
                Show more
              </Button>
            </div>
          )}
        </>
      )}

      <AddBookDialog open={adding} onOpenChange={setAdding} />
      <ImportBooksDialog open={importing} onOpenChange={setImporting} />
    </div>
  );
}
