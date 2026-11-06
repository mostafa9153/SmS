"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { FileText, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { Spinner } from "@/components/ui/spinner";
import { PrintPageStyle, PrintPreview } from "@/components/print/print-preview";
import { PaperSettingsPanel } from "@/components/print/paper-settings-panel";
import { usePaperSettings } from "@/components/print/use-paper-settings";
import { SlipSheet } from "@/components/library/overdue/slip-sheet";
import { useSchoolProfile } from "@/lib/hooks/use-school-profile";
import { useClearanceView, type LoanScope } from "@/lib/library/use-clearance";

const NORMAL = { top: 10, right: 10, bottom: 10, left: 10 };

export default function LibrarySlipPage() {
  return (
    <Suspense fallback={<Spinner className="py-24" />}>
      <SlipPage />
    </Suspense>
  );
}

function SlipPage() {
  const params = useSearchParams();
  const scope: LoanScope = params.get("scope") === "open" ? "open" : "overdue";
  const basis = params.get("basis") === "now" ? "now" : "issue";
  const only = params.get("group");
  const { profile } = useSchoolProfile();
  const { query, today, groups } = useClearanceView(scope, basis);
  const paper = usePaperSettings("library-slip-paper-settings", { paper: "A4", papers: ["A4", "A5"], margins: NORMAL });
  const widthMm = paper.pageW - paper.margins.left - paper.margins.right;
  const slips = only ? groups.filter((g) => g.key === only) : groups;
  const title = scope === "open" ? "Clearance" : "Overdue slip";
  const sheet = (g: (typeof slips)[number]) => (
    <SlipSheet group={g} school={profile.schoolName} today={today} widthMm={widthMm} basis={basis} title={title} />
  );

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-4 print:p-0 print:m-0 print:max-w-none print:space-y-0">
      <PrintPageStyle pageW={paper.pageW} pageH={paper.pageH} margins={paper.margins} />
      <div className="print:hidden space-y-4">
        <PageHeader
          title={title}
          icon={FileText}
          back="/library/overdue"
          badge={<span className="rounded-full bg-muted px-2 py-0.5 text-xs tabular-nums">{slips.length} class</span>}
          actions={
            <Button onClick={() => window.print()} disabled={slips.length === 0}>
              <Printer /> Print
            </Button>
          }
        />
        {query.isLoading ? (
          <Spinner label="লোড হচ্ছে…" className="py-16" />
        ) : slips.length === 0 ? (
          <EmptyState icon={FileText} title="ছাপার মতো কিছু নেই" />
        ) : (
          <div className="grid gap-4 lg:grid-cols-[18rem_1fr]">
            <PaperSettingsPanel settings={paper} papers={["A4", "A5"]} />
            <PrintPreview resetKey={`${paper.paper}-${slips.length}`}>
              <div className="flex flex-col gap-6">
                {slips.map((g) => (
                  <div key={g.key} className="shadow-lg ring-1 ring-black/10">
                    {sheet(g)}
                  </div>
                ))}
              </div>
            </PrintPreview>
          </div>
        )}
      </div>
      <div className="hidden print:block">
        {slips.map((g, i) => (
          <div key={g.key} style={{ breakAfter: i === slips.length - 1 ? "auto" : "page" }}>
            {sheet(g)}
          </div>
        ))}
      </div>
    </div>
  );
}
