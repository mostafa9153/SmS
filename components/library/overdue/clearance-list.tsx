"use client";

import Link from "next/link";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { daysOverdue, type ClassGroup, type ClearanceBasis } from "@/lib/library/clearance";
import type { LoanScope } from "@/lib/library/use-clearance";

const money = (n: number) => `₹${n.toLocaleString("en-IN")}`;

export function ClearanceList({
  groups,
  today,
  scope,
  basis,
}: {
  groups: ClassGroup[];
  today: string;
  scope: LoanScope;
  basis: ClearanceBasis;
}) {
  const slipHref = (group?: string) =>
    `/library/overdue/slip?scope=${scope}&basis=${basis}${group ? `&group=${encodeURIComponent(group)}` : ""}`;
  return (
    <div className="space-y-4">
      {groups.map((g) => (
        <section key={g.key} className="overflow-hidden rounded-2xl border bg-card">
          <header className="flex items-center gap-3 border-b bg-muted/40 px-4 py-2">
            <h2 className="flex-1 text-sm font-bold">{g.label}</h2>
            <span className="text-xs text-muted-foreground tabular-nums">
              {g.borrowers.length} borrowers · {g.books} books
            </span>
            <Button size="sm" variant="ghost" asChild>
              <Link href={slipHref(g.key)} target="_blank">
                <Printer /> Slip
              </Link>
            </Button>
          </header>
          <ul className="divide-y">
            {g.borrowers.map((b) => (
              <li key={b.borrower} className="px-4 py-2">
                <div className="flex items-center gap-2">
                  {b.roll && <span className="w-8 text-xs text-muted-foreground tabular-nums">{b.roll}</span>}
                  <span className="flex-1 truncate text-sm font-semibold">{b.name}</span>
                  {!b.active && <span className="rounded-full bg-muted px-2 py-0.5 text-xs">Inactive</span>}
                  {b.fine > 0 && <span className="text-xs font-semibold tabular-nums text-rose-600">{money(b.fine)}</span>}
                </div>
                <ul className="mt-1 space-y-0.5 pl-8">
                  {b.loans.map((l) => {
                    const late = daysOverdue(l.dueOn, today);
                    return (
                      <li key={l.loanId} className="flex items-center gap-2 text-xs">
                        <span className="flex-1 truncate">
                          {l.title} <span className="text-muted-foreground">({l.code})</span>
                        </span>
                        <span className={cn("tabular-nums", late > 0 ? "text-rose-600" : "text-muted-foreground")}>
                          {late > 0 ? `${late} days overdue` : `due ${l.dueOn}`}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </li>
            ))}
          </ul>
        </section>
      ))}
      {groups.length > 1 && (
        <div className="flex justify-end">
          <Button variant="outline" asChild>
            <Link href={slipHref()} target="_blank">
              <Printer /> Slips for all classes
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
}
