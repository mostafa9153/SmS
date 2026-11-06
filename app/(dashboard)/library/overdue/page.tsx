"use client";

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
        badge={<span className="rounded-full bg-muted px-2 py-0.5 text-xs tabular-nums">{books}টি বই</span>}
      />
      <div className="flex flex-wrap items-center gap-2">
        <Toggle value={p.scope} onChange={p.setScope} options={[["overdue", "Overdue"], ["open", "সব খোলা বই"]]} />
        <Toggle value={p.basis} onChange={p.setBasis} options={[["issue", "Issue-এর সময়ের class"], ["now", "এখনকার class"]]} />
        <FilterSelect
          value={p.group && groups.some((g) => g.key === p.group) ? p.group : ""}
          onChange={p.setGroup}
          placeholder="Class"
          allLabel="সব class"
          options={groups.map((g) => ({ label: g.label, value: g.key }))}
        />
      </div>
      <SearchInput value={p.q} onChange={p.setQ} placeholder="নাম, ID, বইয়ের নাম বা code" />
      {query.isLoading ? (
        <Spinner label="লোড হচ্ছে…" className="py-16" />
      ) : p.shown.length === 0 ? (
        <EmptyState icon={AlertTriangle} title={p.scope === "overdue" ? "কোনো overdue বই নেই" : "কোনো বই বাইরে নেই"} />
      ) : (
        <ClearanceList groups={p.shown} today={today} scope={p.scope} basis={p.basis} />
      )}
    </div>
  );
}
