"use client";

import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import { Printer, ReceiptText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { Spinner } from "@/components/ui/spinner";
import { PrintPageStyle, PrintPreview } from "@/components/print/print-preview";
import { PaperSettingsPanel } from "@/components/print/paper-settings-panel";
import { usePaperSettings } from "@/components/print/use-paper-settings";
import { ReceiptSheet } from "@/components/library/fines/receipt-sheet";
import { apiFetch } from "@/lib/api/client";
import { useSchoolProfile } from "@/lib/hooks/use-school-profile";
import type { ReceiptDetail } from "@/lib/library/db-library-fines";

const NORMAL = { top: 10, right: 10, bottom: 10, left: 10 };

export default function LibraryReceiptPage({ params }: { params: Promise<{ no: string }> }) {
  const { no } = use(params);
  const receipt = useQuery<ReceiptDetail>({
    queryKey: ["library", "fines", "receipt", no],
    queryFn: () => apiFetch<ReceiptDetail>(`/api/library/fines/receipts/${encodeURIComponent(no)}`),
  });
  const { profile } = useSchoolProfile();
  const paper = usePaperSettings("library-receipt-paper-settings", { paper: "A5", papers: ["A5", "A4"], margins: NORMAL });
  const widthMm = paper.pageW - paper.margins.left - paper.margins.right;

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-4 print:p-0 print:m-0 print:max-w-none print:space-y-0">
      <PrintPageStyle pageW={paper.pageW} pageH={paper.pageH} margins={paper.margins} />
      <div className="print:hidden space-y-4">
        <PageHeader
          title={`Receipt #${no}`}
          icon={ReceiptText}
          back="/library/fines"
          actions={
            <Button onClick={() => window.print()} disabled={!receipt.data}>
              <Printer /> Print
            </Button>
          }
        />
        {receipt.isLoading ? (
          <Spinner label="Loading…" className="py-16" />
        ) : !receipt.data ? (
          <EmptyState icon={ReceiptText} title="Receipt not found" />
        ) : (
          <div className="grid gap-4 lg:grid-cols-[18rem_1fr]">
            <PaperSettingsPanel settings={paper} papers={["A5", "A4"]} />
            <PrintPreview resetKey={`${paper.paper}-${widthMm}`}>
              <div className="shadow-lg ring-1 ring-black/10">
                <ReceiptSheet receipt={receipt.data} school={profile.schoolName} widthMm={widthMm} />
              </div>
            </PrintPreview>
          </div>
        )}
      </div>
      {receipt.data && (
        <div className="hidden print:block">
          <ReceiptSheet receipt={receipt.data} school={profile.schoolName} widthMm={widthMm} />
        </div>
      )}
    </div>
  );
}
