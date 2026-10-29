"use client";

import { Suspense } from "react";
import { BlankPadPrintableView } from "@/components/certificate/blank-pad-printable-view";
import { Card, CardContent } from "@/components/ui/card";
import { PrintPreview, PrintPageStyle } from "@/components/print/print-preview";

import { StudioHeader } from "@/components/generate/blank-pad/studio-header";
import { PaperFormatCard } from "@/components/generate/blank-pad/paper-format-card";
import { HeaderElementsCard } from "@/components/generate/blank-pad/header-elements-card";
import { LetterModeHeader } from "@/components/generate/blank-pad/letter-mode-header";
import { StructuredComposer } from "@/components/generate/blank-pad/structured-composer";
import { FreeformComposer } from "@/components/generate/blank-pad/freeform-composer";
import { useBlankPadGenerator } from "@/components/generate/blank-pad/use-blank-pad-generator";

function BlankPadGeneratorContent() {
  const pad = useBlankPadGenerator();
  const { bodyAlign, bodyFontSize, bodyLineHeight, effectiveDate, effectiveRefNo, fontStyle, isA4, letterMode, margins, padData, pageH, pageW, schoolProfile, structuredLetter } = pad;

  return (
    <div className="p-2 sm:p-4 md:p-6 max-w-[1700px] mx-auto space-y-3 sm:space-y-4 print:p-0 print:m-0 print:max-w-none print:space-y-0">
      {/* Studio Header: Hidden in Print */}
      <StudioHeader pad={pad} />

      {/* Main Studio Grid: Unwraps in Print */}
      <div className="grid grid-cols-1 xl:grid-cols-[420px_1fr] gap-4 sm:gap-5 print:block print:w-full print:m-0 print:p-0">
        {/* Left Form Controls: Hidden in Print */}
        <div className="order-2 xl:order-1 space-y-4 print:hidden">
          {/* 1. Paper Format & Border */}
          <PaperFormatCard pad={pad} />

          {/* 2. Header & Elements Settings */}
          <HeaderElementsCard pad={pad} />

          {/* 3. Letter Mode Switcher & Content Area */}
          <Card className="rounded-2xl border shadow-2xs">
            <LetterModeHeader pad={pad} />

            <CardContent className="p-3.5 pt-0 space-y-3.5">
              {/* STRUCTURED LETTER COMPOSER MODE */}
              {letterMode === "structured" ? (
                <StructuredComposer pad={pad} />
              ) : (
                /* FREEFORM / BLANK PAD MODE */
                <FreeformComposer pad={pad} />
              )}
            </CardContent>
          </Card>
        </div>

        <PrintPreview resetKey={`${padData.paperSize}-${padData.borderStyle}`} className="order-1 xl:order-2 sticky top-2 xl:top-4 z-20">
          <BlankPadPrintableView
            data={{
              ...padData,
              fontStyle,
              letterMode,
              structuredLetter,
              bodyFontSize,
              bodyLineHeight,
              bodyAlign,
              refNo: effectiveRefNo,
              issueDate: effectiveDate,
            }}
            schoolProfile={schoolProfile}
          />
        </PrintPreview>
        <PrintPageStyle pageW={pageW} pageH={pageH} margins={margins} />
        <div id="printable-pad-canvas" className="hidden print:block print:w-full print:m-0 print:p-0">
          <BlankPadPrintableView
            data={{
              ...padData,
              fontStyle,
              letterMode,
              structuredLetter,
              bodyFontSize,
              bodyLineHeight,
              bodyAlign,
              refNo: effectiveRefNo,
              issueDate: effectiveDate,
            }}
            schoolProfile={schoolProfile}
          />
        </div>
      </div>

      {/* Bulletproof Native Print CSS */}
      <style jsx global>{`
        @media print {
          header,
          aside,
          nav,
          .print\\:hidden,
          button {
            display: none !important;
          }

          html,
          body {
            background: white !important;
            color: black !important;
            padding: 0 !important;
            margin: 0 !important;
            width: ${isA4 ? "210mm" : "148mm"} !important;
            height: ${isA4 ? "297mm" : "210mm"} !important;
            max-width: ${isA4 ? "210mm" : "148mm"} !important;
            max-height: ${isA4 ? "297mm" : "210mm"} !important;
            overflow: hidden !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          #printable-pad-canvas {
            background: transparent !important;
            padding: 0 !important;
            margin: 0 auto !important;
            border: none !important;
            box-shadow: none !important;
            width: ${isA4 ? "210mm" : "148mm"} !important;
            max-width: ${isA4 ? "210mm" : "148mm"} !important;
            height: ${isA4 ? "295mm" : "208mm"} !important;
            max-height: ${isA4 ? "295mm" : "208mm"} !important;
            box-sizing: border-box !important;
            overflow: hidden !important;
            display: block !important;
          }

          #pure-blank-pad-sheet {
            width: ${isA4 ? "210mm" : "148mm"} !important;
            height: ${isA4 ? "295mm" : "208mm"} !important;
            min-width: ${isA4 ? "210mm" : "148mm"} !important;
            max-width: ${isA4 ? "210mm" : "148mm"} !important;
            min-height: ${isA4 ? "295mm" : "208mm"} !important;
            max-height: ${isA4 ? "295mm" : "208mm"} !important;
            margin: 0 auto !important;
            padding: ${isA4 ? "6mm" : "4mm"} !important;
            box-sizing: border-box !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            page-break-after: avoid !important;
            break-after: avoid !important;
          }
        }
      `}</style>
    </div>
  );
}

export default function BlankPadGeneratorPage() {
  return (
    <Suspense
      fallback={
        <div className="p-6 text-xs text-muted-foreground">
          Loading Blank Pad Studio...
        </div>
      }
    >
      <BlankPadGeneratorContent />
    </Suspense>
  );
}
