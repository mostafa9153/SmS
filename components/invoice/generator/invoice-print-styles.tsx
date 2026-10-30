"use client";



import type { InvoiceGeneratorState } from "./use-invoice-generator";

export function InvoicePrintStyles({ gen }: { gen: InvoiceGeneratorState }) {
  const { isA4FourUp } = gen;
  return (
    <style jsx global>{`
      @media print {
        /* Hide non-printable UI elements */
        header,
        aside,
        nav,
        .print\\:hidden,
        button {
          display: none !important;
        }

        @page {
          size: ${isA4FourUp ? "210mm 297mm" : "210mm 148mm"};
          margin: 0;
        }

        html,
        body {
          background: white !important;
          color: black !important;
          padding: 0 !important;
          margin: 0 !important;
          width: 210mm !important;
          height: auto !important;
          max-width: 210mm !important;
          max-height: none !important;
          overflow: visible !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }

        /* Single mode canvas layout */
        #printable-invoice-canvas {
          transform: none !important;
          background: transparent !important;
          padding: 0 !important;
          margin: 0 auto !important;
          border: none !important;
          box-shadow: none !important;
          width: 210mm !important;
          max-width: 210mm !important;
          height: ${isA4FourUp ? "295mm" : "146mm"} !important;
          max-height: ${isA4FourUp ? "295mm" : "146mm"} !important;
          box-sizing: border-box !important;
          overflow: hidden !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
        }

        #pure-a5-invoice-sheet {
          width: 210mm !important;
          height: 146mm !important;
          min-width: 210mm !important;
          max-width: 210mm !important;
          min-height: 146mm !important;
          max-height: 146mm !important;
          margin: 0 auto !important;
          padding: 1.5mm !important;
          box-sizing: border-box !important;
          border: 1px solid #475569 !important;
          page-break-inside: avoid !important;
          break-inside: avoid !important;
          page-break-after: avoid !important;
          break-after: avoid !important;
        }

        #pure-a4-invoice-sheet {
          width: 210mm !important;
          height: 295mm !important;
          min-width: 210mm !important;
          max-width: 210mm !important;
          min-height: 295mm !important;
          max-height: 295mm !important;
          margin: 0 auto !important;
          padding: 3mm !important;
          box-sizing: border-box !important;
          page-break-inside: avoid !important;
          break-inside: avoid !important;
        }

        /* Bulk batch print canvas */
        #printable-bulk-canvas {
          width: 100% !important;
          margin: 0 !important;
          padding: 0 !important;
          display: block !important;
        }

        /* Bulk batch print page break styles */
        .print\\:break-after-page {
          break-after: page !important;
          page-break-after: always !important;
        }
      }
    `}</style>
  );
}
