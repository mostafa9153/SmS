"use client";

import { Suspense } from "react";
import { cn } from "@/lib/utils";
import { PrintHistoryModal } from "@/components/ui/print-history-modal";
import { AdmissionFormTrackerModal } from "@/components/admission-form/admission-form-tracker";

import { PrintContainer } from "@/components/admission-form/generator/print-container";
import { StudioHeader } from "@/components/admission-form/generator/studio-header";
import { ClassTabCard } from "@/components/admission-form/generator/class-tab-card";
import { PrintQuantityCard } from "@/components/admission-form/generator/print-quantity-card";
import { PreviewToolbar } from "@/components/admission-form/generator/preview-toolbar";
import { PreviewViewport } from "@/components/admission-form/generator/preview-viewport";
import { useAdmissionFormGenerator } from "@/components/admission-form/generator/use-admission-form-generator";

export function AdmissionFormGeneratorContent({ embedded = false }: { embedded?: boolean } = {}) {
  const gen = useAdmissionFormGenerator(embedded);
  const { isHistoryOpen, isTrackerOpen, setIsHistoryOpen, setIsTrackerOpen, setStartSerial } = gen;

  return (
    <>
      {/* ------------------------------------------------------------- */}
      {/* ISOLATED BULLETPROOF PRINT CSS STYLESHEET */}
      {/* ------------------------------------------------------------- */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          header, aside, nav, button, .print\\:hidden, .no-print { display: none !important; }
          body * { visibility: hidden; }
          @page { size: 210mm 297mm; margin: 0; }
          html, body {
            background: white !important; color: black !important; padding: 0 !important;
            margin: 0 !important; width: 210mm !important;
            -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important;
          }
          #pure-print-container, #pure-print-container * { visibility: visible !important; }
          #pure-print-container {
            display: block !important; position: absolute !important; left: 0 !important; top: 0 !important;
            width: 210mm !important; padding: 0 !important; margin: 0 !important; background: transparent !important;
          }
          .admission-sheet {
            width: 205mm !important; min-height: 291mm !important; max-height: 291mm !important;
            margin: 2.5mm auto !important; padding: 3.5mm 4.5mm !important; box-sizing: border-box !important;
            border: 2px solid black !important; page-break-inside: avoid !important; break-inside: avoid !important;
          }
          .page-break-after-sheet { page-break-after: always !important; break-after: page !important; }
          .no-page-break-after { page-break-after: auto !important; break-after: auto !important; }
          .bulk-form-wrapper { page-break-inside: avoid !important; break-inside: avoid !important; }
        }
      ` }} />

      {/* ========================================================================= */}
      {/* DEDICATED PURE PRINT CONTAINER (Hidden on Screen, Sole Element in Print)  */}
      {/* ========================================================================= */}
      <PrintContainer gen={gen} />

      <div className={cn("space-y-6 print:hidden", !embedded && "p-4 md:p-6 max-w-[1700px] mx-auto")}>
        {/* ========================================================= */}
        {/* STUDIO HEADER / CONTROLS */}
        {/* ========================================================= */}
          <StudioHeader gen={gen} />

        {/* ========================================================= */}
        {/* MAIN STUDIO GRID */}
        {/* ========================================================= */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 print:block print:w-full print:m-0 print:p-0">
          {/* ======================================================= */}
          {/* LEFT COLUMN: CONTROLS & SETTINGS (Hidden in Print) */}
          {/* ======================================================= */}
          <div className="xl:col-span-4 space-y-5 print:hidden">
            {/* Tab Selection (Class V-X vs Class XI-XII) & Class Selection */}
            <ClassTabCard gen={gen} />

            {/* Print Quantity Mode (Bulk vs Single) & Pre-filled Settings */}
            <PrintQuantityCard gen={gen} />
          </div>

          {/* ======================================================= */}
          {/* RIGHT COLUMN: LIVE CANVAS PREVIEW (Full Width in Print) */}
          {/* ======================================================= */}
          <div className="xl:col-span-8 print:w-full print:m-0 print:p-0">
            {/* Preview Toolbar (Hidden in Print) */}
            <PreviewToolbar gen={gen} />

            {/* Screen Preview Viewport */}
            <PreviewViewport gen={gen} />
          </div>
        </div>
      </div>

      <AdmissionFormTrackerModal
        isOpen={isTrackerOpen}
        onClose={() => setIsTrackerOpen(false)}
      />

      <PrintHistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        docType="admission-form"
        onUndoBatch={(newStart) => setStartSerial(newStart)}
      />
    </>
  );
}

export default function AdmissionFormGeneratorPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-sm font-medium">Loading Admission Form Generator...</div>}>
      <AdmissionFormGeneratorContent />
    </Suspense>
  );
}

