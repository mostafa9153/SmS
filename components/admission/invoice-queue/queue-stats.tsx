"use client";

import { CustomSelect } from "@/components/ui/custom-select";
import type { InvoiceQueueState } from "./use-invoice-queue";

export function QueueStats({ queue }: { queue: InvoiceQueueState }) {
  const { groupedByClassSection, selectedSession, sessionOptions, setSelectedSession, tabCandidates } = queue;
  return (
  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 print:hidden">
    <div className="bg-card border rounded-2xl p-4 shadow-2xs">
      <span className="text-[11px] font-semibold text-muted-foreground">Queued Invoices</span>
      <p className="text-2xl font-black mt-1 text-emerald-600 dark:text-emerald-400">
        {tabCandidates.length}
      </p>
    </div>
    <div className="bg-card border rounded-2xl p-4 shadow-2xs">
      <span className="text-[11px] font-semibold text-muted-foreground">Class Batches</span>
      <p className="text-2xl font-black mt-1 text-foreground">{groupedByClassSection.length}</p>
    </div>
    <div className="bg-card border rounded-2xl p-4 shadow-2xs flex flex-col justify-between">
      <span className="text-[11px] font-semibold text-muted-foreground">Academic Session</span>
      <div className="w-28 mt-1">
        <CustomSelect
          value={selectedSession}
          onChange={(val) => setSelectedSession(String(val))}
          options={sessionOptions}
          searchable={false}
          triggerClassName="h-7 text-xs font-black bg-background border-border/70"
        />
      </div>
    </div>
    <div className="bg-card border rounded-2xl p-4 shadow-2xs">
      <span className="text-[11px] font-semibold text-muted-foreground">Print Engine</span>
      <p className="text-2xl font-black mt-1 text-teal-600 dark:text-teal-400">
        A4 4-Up / A5 Dual
      </p>
    </div>
  </div>
  );
}
