"use client";

import { Suspense } from "react";
import { InvoicePrintableBatchView } from "@/components/invoice/invoice-printable-view";
import { InvoiceTrackerModal } from "@/components/invoice/invoice-tracker-modal";
import { PrintHistoryModal } from "@/components/ui/print-history-modal";

import { GeneratorHeader } from "@/components/invoice/generator/generator-header";
import { SingleInvoicePanel } from "@/components/invoice/generator/single-invoice-panel";
import { BulkInvoicePanel } from "@/components/invoice/generator/bulk-invoice-panel";
import { InvoicePrintStyles } from "@/components/invoice/generator/invoice-print-styles";
import { useInvoiceGenerator } from "@/components/invoice/generator/use-invoice-generator";

function InvoiceGeneratorContent() {
  const gen = useInvoiceGenerator();
  const { bulkInvoices, copyType, generatorMode, isHistoryOpen, isTrackerOpen, schoolProfile, setBulkStartingNo, setInvoiceSeq, setIsHistoryOpen, setIsTrackerOpen } = gen;

  return (
    <div className="p-3.5 sm:p-6 max-w-[1600px] mx-auto space-y-6 print:p-0 print:m-0 print:max-w-none print:space-y-0">
      <GeneratorHeader gen={gen} />

      {generatorMode === "single" && <SingleInvoicePanel gen={gen} />}

      {generatorMode === "bulk" && <BulkInvoicePanel gen={gen} />}

      {generatorMode === "bulk" && bulkInvoices.length > 0 && (
        <div id="printable-bulk-canvas" className="hidden print:block w-full">
          <InvoicePrintableBatchView
            invoices={bulkInvoices}
            copyType={copyType}
            schoolProfile={schoolProfile}
          />
        </div>
      )}

      <InvoicePrintStyles gen={gen} />

      {/* Invoice Verification & Registry Tracker Modal */}
      <InvoiceTrackerModal
        isOpen={isTrackerOpen}
        onClose={() => setIsTrackerOpen(false)}
      />

      {/* Print Batch History & Selective Undo Modal */}
      <PrintHistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        docType="invoice"
        onUndoBatch={(newStart) => {
          setInvoiceSeq(newStart);
          setBulkStartingNo(newStart);
        }}
      />
    </div>
  );
}

export default function AdmissionInvoicePage() {
  return (
    <Suspense fallback={<div className="p-6 text-xs text-muted-foreground">Loading Invoice Generator...</div>}>
      <InvoiceGeneratorContent />
    </Suspense>
  );
}
