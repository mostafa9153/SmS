"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import type { BookListItem } from "@/lib/library/db-library";

/** Catalog rows: code, title and author, then stock as on shelf / on loan / total. */
export function BookTable({ books }: { books: BookListItem[] }) {
  return (
    <div className="rounded-2xl border bg-card overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-xs text-muted-foreground">
          <tr>
            <th className="px-3 py-2 text-left font-semibold">Code</th>
            <th className="px-3 py-2 text-left font-semibold">Book</th>
            <th className="px-3 py-2 text-right font-semibold whitespace-nowrap">On shelf</th>
            <th className="px-3 py-2 text-right font-semibold whitespace-nowrap hidden sm:table-cell">On loan</th>
            <th className="px-3 py-2 text-right font-semibold whitespace-nowrap hidden sm:table-cell">Total</th>
          </tr>
        </thead>
        <tbody>
          {books.map((b) => (
            <tr key={b.id} className={cn("border-t hover:bg-muted/40", b.status === "withdrawn" && "opacity-60")}>
              <td className="px-3 py-2.5 font-mono text-xs whitespace-nowrap align-top">
                <Link href={`/library/books/${b.id}`} className="hover:underline">
                  {b.book_code}
                </Link>
              </td>
              <td className="px-3 py-2.5 align-top min-w-0">
                <Link href={`/library/books/${b.id}`} className="font-semibold hover:underline break-words">
                  {b.title}
                </Link>
                <div className="text-xs text-muted-foreground break-words">
                  {[b.author, b.legacy_no && `Acc. ${b.legacy_no}`, b.status === "withdrawn" && "Withdrawn"].filter(Boolean).join(" · ")}
                </div>
              </td>
              <td className={cn("px-3 py-2.5 text-right tabular-nums align-top font-semibold", b.stock.onShelf === 0 && "text-rose-600")}>
                {b.stock.onShelf}
                <span className="sm:hidden text-muted-foreground font-normal">/{b.stock.total}</span>
              </td>
              <td className="px-3 py-2.5 text-right tabular-nums align-top hidden sm:table-cell">{b.stock.onLoan}</td>
              <td className="px-3 py-2.5 text-right tabular-nums align-top hidden sm:table-cell">{b.stock.total}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
