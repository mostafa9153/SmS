"use client";

import Link from "next/link";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { StatCard } from "@/components/ui/stat-card";
import { cn } from "@/lib/utils";
import type { DayReport as Report } from "@/lib/library/db-library-fines";

const money = (n: number) => `₹${n.toLocaleString("en-IN")}`;

/** R13: collection, refunds, voids and waivers of one day, each apart. */
export function DayReport({ day, onDay, report, loading }: { day: string; onDay: (d: string) => void; report?: Report; loading: boolean }) {
  return (
    <div className="space-y-4">
      <Input type="date" value={day} onChange={(e) => e.target.value && onDay(e.target.value)} className="w-44" />
      {loading || !report ? (
        <Spinner label="লোড হচ্ছে…" className="py-16" />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <StatCard label="আদায়" value={money(report.totals.collected)} />
            <StatCard label="ফেরত" value={money(report.totals.refunded)} />
            <StatCard label="বাতিল (আদায়)" value={money(report.totals.voidedPayments)} />
            <StatCard label="বাতিল (ফেরত)" value={money(report.totals.voidedRefunds)} />
            <StatCard label="মওকুফ" value={money(report.totals.waived)} />
            <StatCard label="নিট নগদ" value={money(report.totals.net)} />
          </div>
          {report.receipts.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">এদিন কোনো রসিদ নেই</p>
          ) : (
            <div className="overflow-hidden rounded-2xl border bg-card">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-xs text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold">রসিদ</th>
                    <th className="px-3 py-2 text-left font-semibold">Borrower</th>
                    <th className="hidden px-3 py-2 text-left font-semibold sm:table-cell">ধরন</th>
                    <th className="px-3 py-2 text-right font-semibold">টাকা</th>
                    <th className="px-3 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {report.receipts.map((r) => (
                    <tr key={r.receiptNo} className={cn("border-t", r.voidedOn && "text-muted-foreground")}>
                      <td className={cn("px-3 py-2 tabular-nums", r.voidedOn && "line-through")}>#{r.receiptNo}</td>
                      <td className="px-3 py-2">{r.borrowerName}</td>
                      <td className="hidden px-3 py-2 text-xs sm:table-cell">
                        {r.kind === "refund" ? "ফেরত" : "আদায়"}
                        {r.paidOn !== day && ` (${r.paidOn})`}
                        {r.voidedOn && ` · বাতিল ${r.voidedOn}`}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">{money(r.total)}</td>
                      <td className="px-3 py-2 text-right">
                        <Button size="sm" variant="ghost" asChild>
                          <Link href={`/library/fines/receipt/${r.receiptNo}`} target="_blank">
                            <Printer />
                          </Link>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
