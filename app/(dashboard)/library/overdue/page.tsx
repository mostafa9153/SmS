"use client";

import { DeskLink } from "@/components/library/nav/desk-link";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { FilterSelect } from "@/components/ui/filter-select";
import { PageHeader } from "@/components/ui/page-header";
import { SearchInput } from "@/components/ui/search-input";
import { Spinner } from "@/components/ui/spinner";
import { ClearanceList } from "@/components/library/overdue/clearance-list";
import { useOverduePage } from "@/lib/library/use-clearance";

function Toggle<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: [T, string][] }) {
  return (
    <div className="flex rounded-lg border p-0.5">
      {options.map(([v, label]) => (
        <Button key={v} size="sm" variant={value === v ? "default" : "ghost"} onClick={() => onChange(v)}>
          {label}
        </Button>
      ))}
    </div>
  );
}

export default function LibraryOverduePage() {
  const p = useOverduePage();
  const { query, today, groups, books } = p.view;

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-4">
      <PageHeader
        title="Overdue / Clearance"
        icon={AlertTriangle}
        back="/library"
        actions={<DeskLink />}
        badge={<span className="rounded-full bg-muted px-2 py-0.5 text-xs tabular-nums">{books} books</span>}
      />
      <div className="flex flex-wrap items-center gap-2">
        <Toggle value={p.scope} onChange={p.setScope} options={[["overdue", "Overdue"], ["open", "All open loans"]]} />
        <Toggle value={p.basis} onChange={p.setBasis} options={[["issue", "Class at issue"], ["now", "Current class"]]} />
        <FilterSelect
          value={p.group && groups.some((g) => g.key === p.group) ? p.group : ""}
          onChange={p.setGroup}
          placeholder="Class"
          allLabel="All classes"
          options={groups.map((g) => ({ label: g.label, value: g.key }))}
        />
      </div>
      <SearchInput value={p.q} onChange={p.setQ} placeholder="Name, ID, book title or code" />
      {query.isLoading ? (
        <Spinner label="Loading…" className="py-16" />
      ) : p.shown.length === 0 ? (
        <EmptyState icon={AlertTriangle} title={p.scope === "overdue" ? "No overdue books" : "No books out"} />
      ) : (
        <ClearanceList groups={p.shown} today={today} scope={p.scope} basis={p.basis} />
      )}
    </div>
  );
}
