"use client";

import { Archive, ArchiveRestore } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { COPY_STATUS_META, copyState } from "@/lib/library/use-catalog";
import type { BookCopy } from "@/lib/library/db-library";

/** Copies of one title. Withdraw is offered only for a copy on the shelf, restore for a withdrawn one. */
export function CopiesTable({
  copies,
  busyId,
  onWithdraw,
  onRestore,
}: {
  copies: BookCopy[];
  busyId: string | null;
  onWithdraw: (copy: BookCopy) => void;
  onRestore: (copy: BookCopy) => void;
}) {
  return (
    <div className="rounded-2xl border bg-card overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-xs text-muted-foreground">
          <tr>
            <th className="px-3 py-2 text-left font-semibold">Code</th>
            <th className="px-3 py-2 text-left font-semibold">অবস্থা</th>
            <th className="px-3 py-2 text-right font-semibold hidden sm:table-cell">দাম</th>
            <th className="px-3 py-2 text-left font-semibold hidden sm:table-cell">Sticker</th>
            <th className="px-3 py-2" />
          </tr>
        </thead>
        <tbody>
          {copies.map((c) => {
            const state = copyState(c);
            const meta = COPY_STATUS_META[state];
            return (
              <tr key={c.id} className="border-t">
                <td className="px-3 py-2 font-mono text-xs whitespace-nowrap">{c.code}</td>
                <td className="px-3 py-2">
                  <span className={cn("inline-flex rounded-full px-2 py-0.5 text-xs font-semibold", meta.className)}>{meta.label}</span>
                </td>
                <td className="px-3 py-2 text-right tabular-nums hidden sm:table-cell">{c.price === null ? "–" : `₹${c.price}`}</td>
                <td className="px-3 py-2 text-xs text-muted-foreground hidden sm:table-cell">
                  {c.stickerPrintedAt ? new Date(c.stickerPrintedAt).toLocaleDateString("en-IN") : "বাকি"}
                </td>
                <td className="px-3 py-2 text-right">
                  {state === "shelf" && (
                    <Button size="sm" variant="ghost" disabled={busyId === c.id} onClick={() => onWithdraw(c)}>
                      <Archive /> Withdraw
                    </Button>
                  )}
                  {state === "withdrawn" && (
                    <Button size="sm" variant="ghost" disabled={busyId === c.id} onClick={() => onRestore(c)}>
                      <ArchiveRestore /> Shelf-এ ফেরত
                    </Button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
