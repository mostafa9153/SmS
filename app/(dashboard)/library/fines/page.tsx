"use client";

import { Suspense } from "react";
import { HandCoins } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { SearchInput } from "@/components/ui/search-input";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { DayReport } from "@/components/library/fines/day-report";
import { LedgerPanel } from "@/components/library/fines/ledger-panel";
import { useFines } from "@/lib/library/use-fines";

export default function LibraryFinesPage() {
  return (
    <Suspense fallback={<Spinner className="py-24" />}>
      <FinesPage />
    </Suspense>
  );
}

function FinesPage() {
  const f = useFines();
  const list = f.debtors.data ?? [];

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-4">
      <PageHeader
        title="Library Fines"
        icon={HandCoins}
        back="/library"
        actions={
          <div className="flex rounded-lg border p-0.5">
            {(["due", "day"] as const).map((t) => (
              <Button key={t} size="sm" variant={f.tab === t ? "default" : "ghost"} onClick={() => f.setTab(t)}>
                {t === "due" ? "Due" : "Daily report"}
              </Button>
            ))}
          </div>
        }
      />

      {f.tab === "day" ? (
        <DayReport day={f.day} onDay={f.setDay} report={f.report.data} loading={f.report.isLoading} />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[2fr_3fr]">
          <div className="space-y-3">
            <SearchInput value={f.q} onChange={f.setQ} placeholder="Name, class or ID" />
            {f.debtors.isLoading ? (
              <Spinner label="Loading…" className="py-16" />
            ) : list.length === 0 ? (
              <EmptyState icon={HandCoins} title={f.q.trim() ? "No results" : "Nothing due"} />
            ) : (
              <ul className="space-y-1.5">
                {list.map((d) => (
                  <li key={d.key}>
                    <button
                      type="button"
                      onClick={() => f.select(d.key)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left hover:bg-muted/50",
                        f.selected === d.key && "border-primary bg-primary/5",
                      )}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{d.name}</p>
                        <p className="truncate text-xs text-muted-foreground">{d.detail}</p>
                      </div>
                      <span className="text-sm font-bold tabular-nums text-rose-600">₹{d.outstanding.toLocaleString("en-IN")}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          {f.selected ? (
            <LedgerPanel f={f} />
          ) : (
            <p className="py-16 text-center text-sm text-muted-foreground">Select a borrower</p>
          )}
        </div>
      )}
    </div>
  );
}
