"use client";

import { BarChart3 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { Spinner } from "@/components/ui/spinner";
import { NeverLentList, RankedList, WaiverMonths } from "@/components/library/reports/report-sections";
import { useReports } from "@/lib/library/use-reports";

export default function LibraryReportsPage() {
  const r = useReports();
  const data = r.report.data;

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-4">
      <PageHeader title="Library Reports" icon={BarChart3} back="/library" />
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <Input type="date" value={r.from} onChange={(e) => r.setFrom(e.target.value)} className="w-40" aria-label="From" />
        <span className="text-muted-foreground">থেকে</span>
        <Input type="date" value={r.to} onChange={(e) => r.setTo(e.target.value)} className="w-40" aria-label="To" />
      </div>
      {!r.valid ? (
        <p className="py-12 text-center text-sm text-rose-600">তারিখের পরিসর ঠিক নেই</p>
      ) : r.report.isLoading || !data ? (
        <Spinner label="লোড হচ্ছে…" className="py-16" />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <RankedList title="সবচেয়ে বেশি পড়া বই" items={data.topBooks} unit="বার" />
          <RankedList title="সক্রিয় পাঠক" items={data.topReaders} unit="টি বই" />
          <NeverLentList books={data.neverLent} />
          <WaiverMonths months={data.waivers} />
        </div>
      )}
    </div>
  );
}
