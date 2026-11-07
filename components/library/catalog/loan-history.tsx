"use client";

import { History } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";
import type { BookLoanHistory } from "@/lib/library/db-library";

const fmt = (iso: string | null) => (iso ? new Date(`${iso}T00:00:00`).toLocaleDateString("en-IN") : "");

/** Latest loans of every copy of the title (50 most recent). */
export function LoanHistory({ history }: { history: BookLoanHistory[] }) {
  if (!history.length) return <EmptyState icon={History} title="Never borrowed" compact />;
  return (
    <div className="rounded-2xl border bg-card overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-xs text-muted-foreground">
          <tr>
            <th className="px-3 py-2 text-left font-semibold">Borrower</th>
            <th className="px-3 py-2 text-left font-semibold hidden sm:table-cell">Code</th>
            <th className="px-3 py-2 text-left font-semibold">Issued</th>
            <th className="px-3 py-2 text-left font-semibold">Returned</th>
          </tr>
        </thead>
        <tbody>
          {history.map((h) => (
            <tr key={h.loanId} className="border-t">
              <td className="px-3 py-2">
                <div className="font-medium">{h.borrowerName}</div>
                {h.borrowerDetail && <div className="text-xs text-muted-foreground">{h.borrowerDetail}</div>}
              </td>
              <td className="px-3 py-2 font-mono text-xs hidden sm:table-cell">{h.code}</td>
              <td className="px-3 py-2 whitespace-nowrap tabular-nums">{fmt(h.issuedOn)}</td>
              <td
                className={cn(
                  "px-3 py-2 whitespace-nowrap tabular-nums",
                  h.outcome === "lost" && "text-rose-600",
                  !h.returnedOn && "text-blue-600 font-medium",
                )}
              >
                {h.outcome === "lost" ? "Lost" : h.returnedOn ? fmt(h.returnedOn) : `due ${fmt(h.dueOn)}`}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
