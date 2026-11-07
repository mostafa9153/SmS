"use client";

import { BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { LIBRARY_ERRORS } from "@/lib/library/errors";
import { PageHeader } from "@/components/ui/page-header";
import { Spinner } from "@/components/ui/spinner";
import { MyBooksList } from "@/components/library/my/my-books-list";
import { useMyBooksPage } from "@/lib/library/use-my-books";

const money = (n: number) => `₹${n.toLocaleString("en-IN")}`;

export default function MyBooksPage() {
  const { books, busy, renew } = useMyBooksPage();
  const d = books.data;

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto space-y-4">
      <PageHeader title="My books" icon={BookOpen} back="/teacher" />
      {books.isError && !d ? (
        <EmptyState
          icon={BookOpen}
          title="Could not load"
          action={
            <Button variant="outline" onClick={() => void books.refetch()}>
              Retry
            </Button>
          }
        />
      ) : books.isLoading || !d ? (
        <Spinner label="Loading…" className="py-16" />
      ) : !d.linked ? (
        <EmptyState icon={BookOpen} title="No staff profile linked to your account" />
      ) : (
        <>
          {d.overdue > 0 && (
            <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm font-semibold text-rose-700 dark:text-rose-400">
              {d.overdue} book(s) overdue. Please return.
            </div>
          )}
          <div className="flex flex-wrap gap-2 text-sm">
            <span className="rounded-full bg-muted px-2.5 py-0.5 font-medium">
              {d.loans.length}/{d.maxBooks} books
            </span>
            <span className={d.balance.total > 0 ? "rounded-full bg-rose-500/10 px-2.5 py-0.5 font-medium text-rose-600" : "rounded-full bg-muted px-2.5 py-0.5 font-medium"}>
              Due {money(d.balance.total)}
            </span>
          </div>
          {d.loans.length ? (
            <MyBooksList
              loans={d.loans}
              today={d.today}
              busy={busy}
              blockedReason={d.renewBlocked.length ? d.renewBlocked.map((r) => LIBRARY_ERRORS[r][1]).join(" ") : null}
              onRenew={renew}
            />
          ) : (
            <EmptyState icon={BookOpen} title="No books borrowed" />
          )}
          {d.fines.length > 0 && (
            <section className="space-y-1.5">
              <h2 className="text-sm font-semibold text-muted-foreground">Fines due</h2>
              {d.fines.map((f) => (
                <div key={f.fineId} className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm">
                  <span className="flex-1 truncate">
                    {f.kind === "overdue" ? "Overdue" : f.kind === "lost" ? "Lost" : "Damaged"} · {f.title}
                  </span>
                  <span className="font-semibold tabular-nums text-rose-600">{money(f.outstanding)}</span>
                </div>
              ))}
            </section>
          )}
        </>
      )}
    </div>
  );
}
