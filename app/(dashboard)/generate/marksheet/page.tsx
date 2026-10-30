"use client";

import { Suspense } from "react";
import { MarksheetPrintableView, MarksheetPrintableBatchView } from "@/components/marksheet/marksheet-printable-view";
import { Spinner } from "@/components/ui/spinner";

import { StudioHeader } from "@/components/generate/marksheet/studio-header";
import { SingleModeSection } from "@/components/generate/marksheet/single-mode-section";
import { BulkModeSection } from "@/components/generate/marksheet/bulk-mode-section";
import { useMarksheetGenerator } from "@/components/generate/marksheet/use-marksheet-generator";

function MarksheetGeneratorContent() {
  const mk = useMarksheetGenerator();
  const { bulkMarksheets, generatorMode, includeDigitalSignature, marksheet, schoolProfile } = mk;

  return (
    <div className="p-3.5 sm:p-6 max-w-[1700px] mx-auto space-y-6 print:p-0 print:m-0 print:max-w-none print:space-y-0">
      {/* ========================================================================= */}
      {/* EMBEDDED PRINT STYLESHEET (STRICT A4 LANDSCAPE 297mm × 210mm)             */}
      {/* ========================================================================= */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page { size: 297mm 210mm; margin: 0; }
          html, body {
            margin: 0 !important; padding: 0 !important; background: #ffffff !important;
            -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important;
            width: 297mm !important; height: 210mm !important;
          }
          body * { visibility: hidden; }
          #pure-print-container, #pure-print-container * { visibility: visible !important; }
          #pure-print-container {
            position: absolute !important; left: 0 !important; top: 0 !important;
            width: 297mm !important; padding: 0 !important; margin: 0 !important; background: transparent !important;
          }
          #pure-a4-landscape-marksheet-sheet {
            page-break-inside: avoid !important; break-inside: avoid !important;
            box-shadow: none !important; margin: 0 auto !important;
          }
        }
      ` }} />

      {/* ========================================================================= */}
      {/* DEDICATED PRINT CONTAINER (Off-screen on Web, Solo Visible in Print)      */}
      {/* ========================================================================= */}
      <div id="pure-print-container" className="hidden print:block">
        {generatorMode === "single" ? (
          <div className="w-full flex justify-center">
            <MarksheetPrintableView data={marksheet} schoolProfile={schoolProfile} includeDigitalSignature={includeDigitalSignature} />
          </div>
        ) : (
          <MarksheetPrintableBatchView marksheets={bulkMarksheets} schoolProfile={schoolProfile} includeDigitalSignature={includeDigitalSignature} />
        )}
      </div>

      {/* ========================================================================= */}
      {/* TOP HEADER & STUDIO CONTROLS                                              */}
      {/* ========================================================================= */}
      <StudioHeader mk={mk} />

      {/* ========================================================================= */}
      {/* SINGLE STUDENT GENERATOR CONTENT                                          */}
      {/* ========================================================================= */}
      <SingleModeSection mk={mk} />

      {/* ========================================================================= */}
      {/* CLASS BATCH (BULK) MODE CONTENT                                           */}
      {/* ========================================================================= */}
      <BulkModeSection mk={mk} />
    </div>
  );
}

export default function MarksheetGeneratorPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex items-center gap-2 text-muted-foreground text-xs">
            <Spinner className="h-4 w-4 text-primary" />
            <span>Loading Marksheet Studio...</span>
          </div>
        </div>
      }
    >
      <MarksheetGeneratorContent />
    </Suspense>
  );
}
