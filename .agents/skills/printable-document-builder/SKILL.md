---
name: printable-document-builder
description: >-
  Standardized blueprint and best practices for building pixel-perfect, zero-waste
  printable documents, generators, and certificates (Character Certificates, CCE Marksheets,
  Fee Invoices, Admit Cards, Transfer Certificates) in Next.js. Supports dynamic paper sizes
  (A4, A5, Letter in Portrait/Landscape), zero-margin full bleed, bulletproof print CSS,
  strict 1-page guarantees, and database auto-fill.
---

# Printable Document Builder Guide

This skill defines the battle-tested, high-performance architecture for creating institutional printable documents, academic marksheets, fee receipts, and official school certificates in Next.js.

---

## 1. Paper Dimensions & Geometry Standards

Always design the printable component using exact physical dimensions (`mm` units) and zero-margin page setups:

| Paper Format | Orientation | Outer Dimensions | Recommended Printable Box | Usable Inset |
| :--- | :--- | :--- | :--- | :--- |
| **A5** | Portrait | `148mm × 210mm` | `148mm × 208mm` | `3.5mm` |
| **A5** | Landscape | `210mm × 148mm` | `208mm × 148mm` | `3.5mm` |
| **A4** | Portrait | `210mm × 297mm` | `210mm × 295mm` | `5.0mm` |
| **A4** | Landscape | `297mm × 210mm` | `295mm × 208mm` | `5.0mm` |

---

## 2. Three-Layer File Architecture

Every generator feature must follow this clean separation of concerns:

```
components/
  └── <feature>/
        └── <feature>-printable-view.tsx    # Pure presentation layer (exact geometry & typography)
app/(dashboard)/
  └── generate/
        └── <feature>/
              └── page.tsx                  # Studio UI (Search, inputs, live preview & print engine)
```

---

## 3. Pure Presentation Component (`<feature>-printable-view.tsx`)

### Key Rules:
1. **Root Sheet Container**:
   - Use fixed width/height matching the paper size (e.g. `w-[148mm] h-[208mm]`).
   - Use `flex flex-col justify-between` to distribute Header, Body, and Footer naturally across the vertical height.
   - Include `page-break-inside: avoid; break-inside: avoid; page-break-after: avoid; break-after: avoid;`.
2. **Perimeter Borders**:
   - Place outer decorative borders with `absolute inset-1` or `absolute inset-1.5` so the border touches the perimeter of the physical paper without wasting margins.
3. **Institutional Watermark**:
   - Centered inside the sheet with `opacity-[0.045] grayscale pointer-events-none`.
4. **Anchored Signature Footer**:
   - Always place the signature block inside `mt-auto` with a fixed signature image height (`max-h-7` or `max-h-8`).
   - This guarantees signatures are never pushed out of the printable area.
5. **Grammar & Comma Formatting**:
   - Never use `inline-block` with newlines for text spans followed by punctuation.
   - Use `<span className="font-bold border-b border-dotted px-0.5">{value}</span>,` directly to prevent unwanted spaces before commas.

---

## 4. Studio Page & Native Print Engine (`page.tsx`)

### Direct Native Print Engine Pattern (100% Reliable, No Blank Pages):
Never use asynchronous hidden iframes for printing in Next.js App Router (which often causes blank pages due to stylesheet loading latency). Use direct native `window.print()` with isolated CSS:

```tsx
// 1. Direct Print Trigger
const handlePrint = () => {
  setDocumentState((prev) => ({
    ...prev,
    issueDate: getLiveDate(),
  }));
  setTimeout(() => {
    window.print();
  }, 60);
};

// 2. Responsive Studio Layout with Print Overrides
<div className="p-4 max-w-[1700px] mx-auto space-y-6 print:p-0 print:m-0 print:max-w-none print:space-y-0">
  {/* Studio Header: Hidden in print */}
  <div className="print:hidden">...</div>

  {/* Main Studio Grid: Unwraps grid into full-width block in print */}
  <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 print:block print:w-full print:m-0 print:p-0">
    {/* Left Form Controls: Hidden in print */}
    <div className="xl:col-span-5 print:hidden">...</div>

    {/* Right Preview Column: Full width in print */}
    <div className="xl:col-span-7 print:w-full print:m-0 print:p-0">
      <div
        id="printable-canvas"
        className="w-full print:p-0 print:border-none print:bg-transparent print:w-full print:block"
      >
        <div
          style={{ transform: `scale(${previewScale})` }}
          className="print:transform-none print:w-full print:h-full print:m-0 print:p-0 print:block"
        >
          <DocumentPrintableView data={docData} />
        </div>
      </div>
    </div>
  </div>
</div>
```

---

## 5. Bulletproof Print CSS Template

Embed this exact print stylesheet inside the generator page or component:

```css
@media print {
  /* 1. Hide non-printable UI elements */
  header,
  aside,
  nav,
  .print\:hidden,
  button {
    display: none !important;
  }

  /* 2. Lock page size to exact paper format with zero margins (NEVER use !important inside @page) */
  @page {
    size: 210mm 297mm; /* Or '297mm 210mm' for A4 landscape, '148mm 210mm' for A5 portrait. Note: NO !important inside @page */
    margin: 0;
  }

  /* 3. Base page reset */
  html,
  body {
    background: white !important;
    color: black !important;
    padding: 0 !important;
    margin: 0 !important;
    width: 148mm !important; /* Match target paper width */
    height: 210mm !important; /* Match target paper height */
    max-width: 148mm !important;
    max-height: 210mm !important;
    overflow: hidden !important;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }

  /* 4. Canvas Isolation */
  #printable-canvas {
    background: transparent !important;
    padding: 0 !important;
    margin: 0 auto !important;
    border: none !important;
    box-shadow: none !important;
    width: 148mm !important;
    max-width: 148mm !important;
    height: 208mm !important;
    max-height: 208mm !important;
    box-sizing: border-box !important;
    overflow: hidden !important;
    display: block !important;
  }

  #printable-canvas > div {
    transform: none !important;
    width: 148mm !important;
    height: 208mm !important;
    margin: 0 !important;
    display: block !important;
  }

  /* 5. Target Sheet */
  #pure-printable-sheet {
    width: 148mm !important;
    height: 208mm !important;
    min-width: 148mm !important;
    max-width: 148mm !important;
    min-height: 208mm !important;
    max-height: 208mm !important;
    margin: 0 auto !important;
    padding: 3.5mm !important;
    box-sizing: border-box !important;
    page-break-inside: avoid !important;
    break-inside: avoid !important;
    page-break-after: avoid !important;
    break-after: avoid !important;
  }
}
```

---

## 6. Batch / Bulk Printing Extensions

When building bulk generation for entire classes/rosters:
1. Wrap each student's sheet inside a container with `page-break-after: always; break-after: page;`.
2. Do not use `overflow: hidden` on the root body during batch print mode, allowing multi-page continuous printing.
3. Include an interactive checklist with **Select All / Deselect All** and quick search.
