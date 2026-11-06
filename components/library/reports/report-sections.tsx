"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import type { Ranked, WaiverMonth } from "@/lib/library/clearance";
import type { NeverLentBook } from "@/lib/library/db-library-reports";

const money = (n: number) => `₹${n.toLocaleString("en-IN")}`;

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2 rounded-2xl border bg-card p-4">
      <h2 className="text-sm font-bold">{title}</h2>
      {children}
    </section>
  );
}

const Empty = () => <p className="text-sm text-muted-foreground">কিছু নেই</p>;

export function RankedList({ title, items, unit }: { title: string; items: Ranked[]; unit: string }) {
  const max = items[0]?.count ?? 1;
  return (
    <Card title={title}>
      {items.length === 0 ? (
        <Empty />
      ) : (
        <ol className="space-y-1.5">
          {items.map((r, i) => (
            <li key={r.key} className="space-y-0.5">
              <div className="flex items-center gap-2 text-sm">
                <span className="w-5 text-xs text-muted-foreground tabular-nums">{i + 1}</span>
                <span className="flex-1 truncate">{r.label}</span>
                <span className="text-xs font-semibold tabular-nums">
                  {r.count} {unit}
                </span>
              </div>
              <div className="ml-7 h-1 rounded bg-muted">
                <div className="h-full rounded bg-primary/60" style={{ width: `${(r.count / max) * 100}%` }} />
              </div>
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}

export function NeverLentList({ books }: { books: NeverLentBook[] }) {
  return (
    <Card title={`কখনো না-নেওয়া বই (${books.length})`}>
      {books.length === 0 ? (
        <Empty />
      ) : (
        <ul className="max-h-80 space-y-1 overflow-y-auto">
          {books.map((b) => (
            <li key={b.id} className="flex items-center gap-2 text-sm">
              <Link href={`/library/books/${b.id}`} className="flex-1 truncate hover:underline">
                {b.title}
              </Link>
              <span className="truncate text-xs text-muted-foreground">{b.author}</span>
              <span className="text-xs tabular-nums text-muted-foreground">{b.copies} কপি</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export function WaiverMonths({ months }: { months: WaiverMonth[] }) {
  return (
    <Card title="মাসিক মওকুফ">
      {months.length === 0 ? (
        <Empty />
      ) : (
        <div className="space-y-3">
          {months.map((m) => (
            <div key={m.month} className="space-y-1">
              <div className="flex items-center justify-between text-sm font-semibold">
                <span>{m.month}</span>
                <span className="tabular-nums">
                  {money(m.total)} · {m.count}টি
                </span>
              </div>
              {m.byPerson.map((p) => (
                <div key={p.by} className="flex items-center justify-between pl-3 text-xs text-muted-foreground">
                  <span>{p.by}</span>
                  <span className="tabular-nums">
                    {money(p.total)} · {p.count}টি
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
