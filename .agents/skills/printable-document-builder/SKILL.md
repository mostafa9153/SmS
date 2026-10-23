---
name: printable-document-builder
description: >-
  Blueprint for pixel-accurate printable documents, generators, and certificates
  (Character Certificates, CCE Marksheets, Fee Invoices, Admit Cards, Transfer Certificates)
  in Next.js. Asks the user for page sizes (A5, A4, A3), orientation, and margins before
  building. Auto-fits content to any selected page size, uses the full printable area,
  and supports one-page output with multi-page overflow when needed.
---

# Printable Document Builder Guide

Institutional printable documents, marksheets, fee receipts, and certificates in Next.js. Follow this flow in order.

---

## 0. Requirements Interview (MANDATORY before building)

Before writing any code, ask the user with `AskUserQuestion` (options, not open text):

1. **Page sizes**: multi-select from `A5`, `A4`, `A3`. Also ask orientation (Portrait / Landscape / Both).
2. **Margin**: ask per print, not hardcoded. Ask one value per side (top, right, bottom, left) in mm, or a single value for all sides. Default suggestion: `0` (full bleed) is allowed only if the user asks for it.
3. **Fit behaviour**: default is `Auto fit`. Other options: `Font only` or `Fixed layout template per size`.
4. **Page count**: default is `1 page`. If content overflows, allow multiple pages only when the user confirms.

Do not assume defaults silently. Record the answers in a comment at the top of the generator page.

---

## 1. Paper Dimensions

Sheet = exact outer size. Margin is applied by the user, not hardcoded in the table.

| Paper | Portrait (mm) | Landscape (mm) |
| :--- | :--- | :--- |
| **A5** | `148 × 210` | `210 × 148` |
| **A4** | `210 × 297` | `297 × 210` |
| **A3** | `297 × 420` | `420 × 297` |

Set the `@page` size from the selected paper and orientation at runtime (see Section 5). Never hardcode one size.

---

## 2. Three-Layer File Architecture

```
components/
  └── <feature>/
        └── <feature>-printable-view.tsx    # Pure presentation (layout, typography, auto-fit)
app/(dashboard)/
  └── generate/
        └── <feature>/
              └── page.tsx                  # Studio UI (inputs, size/margin picker, preview, print)
```

---

## 3. Auto-Fit Layout (Content Adapts to Page Size)

Content is authored once. Sizes adapt automatically.

1. **Reference box**: design the content against one reference (A4 portrait). Use mm and pt units.
2. **Scale factor**: compute at runtime:
   ```ts
   const usableW = paperW - marginLeft - marginRight;
   const usableH = paperH - marginTop - marginBottom;
   const k = Math.min(usableW / REF_W, usableH / REF_H);
   ```
3. **Apply the factor** through CSS variables on the sheet root, for example `--k: 1.2`. Font sizes use `calc(var(--base) * var(--k))`. Spacing and gaps use the same multiplier.
4. **Use the full area**: the sheet grows to fill the usable box. Use `flex flex-col` with `flex-1` and `justify-between` so header, body and footer spread across the full height. Do not leave unused space at the bottom.
5. **Justify**: text blocks use `text-justify` where appropriate. Tables and grids use `w-full` with `table-layout: fixed`.
6. **Never shrink content just to make room for a margin.** Margin is taken from the paper first, then the content expands into the remaining space.

---

## 4. Pure Presentation Component (`<feature>-printable-view.tsx`)

### Rules
1. **Root sheet**: `w-full h-full` inside a wrapper sized to the selected paper. Use `flex flex-col justify-between`.
2. **Page break safety**: `break-inside: avoid; break-after: avoid;` on each block that must stay whole.
3. **Perimeter border**: `absolute inset-1` (or `inset-1.5`) so the border sits on the printable edge.
4. **Watermark**: centered, `opacity-[0.045] grayscale pointer-events-none`.
5. **Signature footer**: `mt-auto`, fixed signature image height (`max-h-7` or `max-h-8`).
6. **Grammar and comma formatting**: never put `inline-block` with newlines before punctuation. Use `<span className="font-bold border-b border-dotted px-0.5">{value}</span>,`.

---

## 5. Studio Page and Native Print Engine (`page.tsx`)

### Print trigger
Use direct `window.print()`. Do not use async hidden iframes in App Router (they cause blank pages).

```tsx
const handlePrint = () => {
  setDocumentState((prev) => ({ ...prev, issueDate: getLiveDate() }));
  setTimeout(() => window.print(), 60);
};
```

### Dynamic `@page` size and margin
`@page` size cannot read CSS variables, so inject it from the selected settings:

```tsx
<style>{`
  @media print {
    @page {
      size: ${paperW}mm ${paperH}mm;
      margin: ${m.top}mm ${m.right}mm ${m.bottom}mm ${m.left}mm;
    }
  }
`}</style>
```

Do not use `!important` inside `@page`.

### Studio layout with print overrides

Use `ZoomPanViewport` (Section 9) for the preview — never use a bare `transform: scale()` div. On mobile the preview is `order-1`, settings `order-2` (reversed on `lg:`), so the user sees the paper update in real-time as they change settings.

```tsx
<div className="p-3 sm:p-5 max-w-[1700px] mx-auto grid grid-cols-1 lg:grid-cols-[250px_1fr] gap-3 lg:gap-4 items-start print:block print:p-0 print:m-0 print:max-w-none">
  <aside className="order-2 lg:order-1 print:hidden lg:sticky lg:top-4 ...">
    {/* paper / orientation / margin controls + Print button */}
  </aside>

  <ZoomPanViewport
    fitMode={pageCount > 1 ? "width" : "contain"}
    resetKey={`${paper}-${orientation}-${pageCount}`}
    className="h-[46dvh] sm:h-[52dvh] lg:h-[calc(100dvh-2rem)] sticky top-2 lg:top-4 z-20 order-1 lg:order-2 w-full print:hidden"
  >
    <DocumentPrintableView {...props} preview />
  </ZoomPanViewport>
</div>
```

The print portal (body-level portal via `createPortal`) renders the non-preview version and is hidden until `window.print()` fires — see Section 6 print CSS.

---

## 6. Print CSS Template

```css
@media print {
  header, aside, nav, .print\:hidden, button {
    display: none !important;
  }

  html, body {
    background: white !important;
    color: black !important;
    margin: 0 !important;
    padding: 0 !important;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }

  /* Canvas uses the full paper; margin comes from @page (Section 5) */
  #printable-canvas {
    background: transparent !important;
    margin: 0 !important;
    padding: 0 !important;
    border: none !important;
    box-shadow: none !important;
    width: 100% !important;
    height: 100% !important;
    overflow: hidden !important;
    display: block !important;
  }

  #printable-canvas > div {
    transform: none !important;
    width: 100% !important;
    height: 100% !important;
    margin: 0 !important;
    display: block !important;
  }

  #pure-printable-sheet {
    width: 100% !important;
    height: 100% !important;
    box-sizing: border-box !important;
    break-inside: avoid !important;
    break-after: avoid !important;
  }
}
```

Margins are set once in `@page` (Section 5), so content is never pushed in by hardcoded padding.

---

## 7. One Page by Default, Multi-Page on Overflow

- Default: the sheet must fit one page. Auto-fit (Section 3) reduces font and spacing until it fits.
- If the content still does not fit at a readable minimum (for example, below the agreed minimum font size), warn the user and ask whether to allow multiple pages.
- When multi-page is allowed, wrap each page in its own `break-after: page` container.

---

## 8. Batch / Bulk Printing

1. Each student sheet wrapped in a container with `break-after: page;`.
2. Do not use `overflow: hidden` on the root body in batch mode.
3. Include a checklist with **Select All / Deselect All** and quick search.
4. Apply the same selected paper size and margin to every sheet in the batch.

---

## 9. Preview Viewport — `ZoomPanViewport`

Use the reusable `components/generate/zoom-pan-viewport.tsx` component for all generator preview areas. It replaces the old `transform: scale()` approach.

### Props

```ts
interface ZoomPanViewportProps {
  children: React.ReactNode;
  fitMode?: "contain" | "width"; // "contain" = full page fit; "width" = fit by width (multi-page)
  minScale?: number;             // default 0.1
  maxScale?: number;             // default 5
  resetKey?: string | number;    // change this to re-fit (e.g. paper+orientation+pageCount)
  className?: string;
}
```

### Usage

```tsx
<ZoomPanViewport
  fitMode={pageCount > 1 ? "width" : "contain"}
  resetKey={`${paper}-${orientation}-${pageCount}`}
  className="h-[46dvh] sm:h-[52dvh] lg:h-[calc(100dvh-2rem)] sticky top-2 lg:top-4 z-20 w-full print:hidden"
>
  <YourPrintableComponent {...props} preview />
</ZoomPanViewport>
```

### Structure (CRITICAL — do not break)

The outer container must NOT have `overflow-hidden`. The inner canvas div has it. The toolbar is a sibling of the canvas, not inside it — this prevents the toolbar from being clipped:

```tsx
{/* Outer container — pointer events, sizing, border, rounded. NO overflow-hidden */}
<div ref={containerRef} className="relative touch-none select-none rounded-2xl border ...">

  {/* Inner canvas — overflow-hidden clips the zoomed content only */}
  <div className="absolute inset-0 overflow-hidden rounded-2xl">
    <div ref={contentRef} style={{ transform: `translate(${x}px,${y}px) scale(${s})` }}>
      {children}
    </div>
  </div>

  {/* Toolbar — top-right corner, outside overflow-hidden, z-10 */}
  <div className="absolute top-3 right-3 ... z-10">
    <button>−</button>
    <button>{scale}%</button>
    <button>+</button>
    <button><Maximize2 /></button>
  </div>

</div>
```

### Controls

| Input | Action |
| :--- | :--- |
| One-finger drag / mouse drag | Pan |
| Two-finger pinch | Zoom around midpoint |
| Double-tap | Toggle fit ↔ 2× |
| `Ctrl`/`Cmd` + scroll / trackpad pinch | Zoom at cursor |
| Plain scroll (content overflows) | Pan |
| `+` / `-` / `0` keys | Zoom in / out / fit |
| Toolbar `%` button | Re-fit |

### Mobile layout

On mobile the preview comes **first** (sticky top), settings panel below — so the user sees the preview update as they change settings:

```tsx
const previewShell = "h-[46dvh] sm:h-[52dvh] lg:h-[calc(100dvh-2rem)] sticky top-2 lg:top-4 z-20 order-1 lg:order-2 print:hidden";
// aside: order-2 lg:order-1
```

### Auto-fit reset

Pass a `resetKey` that changes whenever paper size, orientation, or page count changes. The viewport re-fits automatically on `resetKey` change. The user's manual zoom is reset only when `resetKey` changes.

---

## 10. Studio UI Rules (learned from real fixes — follow on every generator)

### Paper & Margin section
- ONE collapsible "Paper & Margin" section (closed by default, `text-xs font-bold uppercase`, not `text-[10px]`) holds paper size, orientation and the 4 margins. Paper size lives ONLY here. Never add a separate "Paper Format" card or A4/A5 buttons elsewhere.
- Place it at the bottom of the settings column, after the content cards.
- Add a **Save Settings** button inside it. It writes `{ paper, orientation, margins }` to `localStorage` (key `<page>-paper-settings`) and a mount `useEffect` restores it. Wrap both in try/catch.
- Preview always updates live from state; Save is only for persistence.

### Default paper = the document's native size
- The default `paper` must match the size the printable view is designed for (character / transfer / pass certificate, Kanyashree, bonafide = `A5`; registers, tabulation = `A4`).
- A wrong default (A4 with an A5 sheet) makes `@page` larger than the content and prints the sheet in one corner with a big white area.

### Print button
- ONE button labelled just `Print`. No `(A5)`, `A4`, `Print Active`, `Print Selected (n)` labels, and no paper-size badge in the header.
- If the page has single + bulk modes, one handler decides: bulk selection non-empty → batch print, otherwise print the active item.

### Print CSS
- Use ONE `<style dangerouslySetInnerHTML>` block that builds everything from `pageW`/`pageH`/`margins`: `@page` size + margin, `html/body` width, canvas, batch wrapper, `.page-break`, sheet.
- Never keep a second `<style jsx global>` with hardcoded `148mm`/`208mm`/`@page` — it conflicts with the dynamic one and causes white space or clipped output.
- Do not fix heights with `208mm`-style magic numbers; let the sheet fill `pageH` minus margins so margin `0` gives a full-bleed fit.
- Every content block the user sees in preview must render identically in the print container (`hidden print:block` sibling or portal).

### Layout
- No "Preview" title row / icon / size badge above the canvas. The `ZoomPanViewport` is the first thing in the preview column.
- Do not put `overflow-y-auto` + `max-h` on the settings column (creates a nested scrollbar that overlaps content). Let it scroll with the page.
- Sticky preview column: `xl:sticky xl:top-4`, viewport height `xl:h-[calc(100dvh-2rem)]`.

### Verifying
- `npx tsc --noEmit` is not enough. Open the page, expand Paper & Margin, set margins to 0, open the print dialog, and check the sheet fills the paper with no white strip.
- The dashboard needs an admin login; ask the user to sign in in the browser pane first.
