"use client";

import { useState } from "react";
import Link from "next/link";
import { Archive, ArchiveRestore, SearchCheck, SearchX } from "lucide-react";
import { apiFetch } from "@/lib/api/client";
import type { LedgerFine } from "@/lib/library/db-library-fines";
import type { Ledger } from "@/lib/library/use-fines";
import type { BorrowerKey } from "@/lib/library/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { COPY_STATUS_META, copyState } from "@/lib/library/use-catalog";
import type { BookCopy } from "@/lib/library/db-library";

type FoundResult = "done" | "touched" | "failed";
type OnFound = (copy: BookCopy, source: "borrower" | "library", keep?: boolean) => Promise<FoundResult>;

const rupees = (n: number) => `₹${n.toLocaleString("en-IN")}`;

/**
 * R12: where a lost copy turned up. If its lost charge already has money paid
 * or waived, it cannot simply be cancelled: show what is on it, and either keep
 * it (the rest can then be waived on the Fines page) or refund first.
 */
function FoundRow({ copy, busy, borrower, onFound }: { copy: BookCopy; busy: boolean; borrower: BorrowerKey | null; onFound: OnFound }) {
  const [blocked, setBlocked] = useState<{ source: "borrower" | "library"; fine: LedgerFine | null } | null>(null);
  const go = async (source: "borrower" | "library", keep = false) => {
    const r = await onFound(copy, source, keep);
    if (r !== "touched") {
      setBlocked(null);
      return;
    }
    let fine: LedgerFine | null = null;
    if (borrower) {
      const ledger = await apiFetch<Ledger>(`/api/library/fines/borrowers/${encodeURIComponent(borrower)}`).catch(() => null);
      fine = ledger?.fines.find((f) => f.kind === "lost" && !f.cancelled && f.title.endsWith(copy.code)) ?? null;
    }
    setBlocked({ source, fine });
  };
  const finesHref = borrower ? `/library/fines?borrower=${encodeURIComponent(borrower)}` : "/library/fines";
  const paidPart = blocked?.fine ? blocked.fine.paid - blocked.fine.refunded : 0;
  return (
    <tr className="border-t bg-amber-500/5">
      <td colSpan={5} className="px-3 py-2">
        {blocked ? (
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="flex-1 font-medium">
              {blocked.fine
                ? `Lost charge ${rupees(blocked.fine.amount)}: paid ${rupees(paidPart)} · waived ${rupees(blocked.fine.waived)} · due ${rupees(blocked.fine.outstanding)}`
                : "The lost charge has payments or waivers."}
            </span>
            <Button size="sm" disabled={busy} onClick={() => void go(blocked.source, true)}>
              {blocked.fine && blocked.fine.outstanding > 0 ? "Keep (waive the rest later)" : "Keep"}
            </Button>
            <Button size="sm" variant="outline" asChild>
              <Link href={finesHref}>Fines page</Link>
            </Button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="flex-1 font-medium">Where was it found?</span>
            <Button size="sm" disabled={busy} onClick={() => void go("borrower")}>
              Returned by borrower
            </Button>
            <Button size="sm" variant="outline" disabled={busy} onClick={() => void go("library")}>
              Was in the library
            </Button>
          </div>
        )}
      </td>
    </tr>
  );
}

/** Copies of one title. Withdraw is offered only for a copy on the shelf, restore for a withdrawn one. */
export function CopiesTable({
  copies,
  busyId,
  onWithdraw,
  onRestore,
  onLost,
  onFound,
  lostHolder,
}: {
  copies: BookCopy[];
  busyId: string | null;
  onWithdraw: (copy: BookCopy) => void;
  onRestore: (copy: BookCopy) => void;
  onLost: (copy: BookCopy) => void;
  onFound: OnFound;
  /** Who held each lost copy (latest lost loan by copy code). */
  lostHolder?: Map<string, BorrowerKey>;
}) {
  const [finding, setFinding] = useState<string | null>(null);
  return (
    <div className="rounded-2xl border bg-card overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-xs text-muted-foreground">
          <tr>
            <th className="px-3 py-2 text-left font-semibold">Code</th>
            <th className="px-3 py-2 text-left font-semibold">Status</th>
            <th className="px-3 py-2 text-right font-semibold hidden sm:table-cell">Price</th>
            <th className="px-3 py-2 text-left font-semibold hidden sm:table-cell">Sticker</th>
            <th className="px-3 py-2" />
          </tr>
        </thead>
        <tbody>
          {copies.map((c) => {
            const state = copyState(c);
            const meta = COPY_STATUS_META[state];
            return [
              <tr key={c.id} className="border-t">
                <td className="px-3 py-2 font-mono text-xs whitespace-nowrap">{c.code}</td>
                <td className="px-3 py-2">
                  <span className={cn("inline-flex rounded-full px-2 py-0.5 text-xs font-semibold", meta.className)}>{meta.label}</span>
                </td>
                <td className="px-3 py-2 text-right tabular-nums hidden sm:table-cell">{c.price === null ? "–" : `₹${c.price}`}</td>
                <td className="px-3 py-2 text-xs text-muted-foreground hidden sm:table-cell">
                  {c.stickerPrintedAt ? new Date(c.stickerPrintedAt).toLocaleDateString("en-IN") : "Pending"}
                </td>
                <td className="px-3 py-2 text-right">
                  {state === "shelf" && (
                    <Button size="sm" variant="ghost" disabled={busyId === c.id} onClick={() => onWithdraw(c)}>
                      <Archive /> Withdraw
                    </Button>
                  )}
                  {(state === "shelf" || state === "loan") && (
                    <Button size="sm" variant="ghost" disabled={busyId === c.id} onClick={() => onLost(c)}>
                      <SearchX /> Lost
                    </Button>
                  )}
                  {state === "lost" && (
                    <Button size="sm" variant="ghost" disabled={busyId === c.id} onClick={() => setFinding(finding === c.id ? null : c.id)}>
                      <SearchCheck /> Found
                    </Button>
                  )}
                  {state === "withdrawn" && (
                    <Button size="sm" variant="ghost" disabled={busyId === c.id} onClick={() => onRestore(c)}>
                      <ArchiveRestore /> Back to shelf
                    </Button>
                  )}
                </td>
              </tr>,
              finding === c.id && state === "lost" && <FoundRow key={`${c.id}-found`} copy={c} busy={busyId === c.id} borrower={lostHolder?.get(c.code) ?? null} onFound={onFound} />,
            ];
          })}
        </tbody>
      </table>
    </div>
  );
}
