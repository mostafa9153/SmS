# Phase 3.1f — Invoice tracker modal split

`components/invoice/invoice-tracker-modal.tsx`: 2,289 → 55 lines, no feature change. `InvoiceTrackerModal` and its props are unchanged; both importers (`admission/invoices`, `generate/invoice`) needed no edit.

## Layout (`components/invoice/tracker/`)

- `use-invoice-tracker.ts` (18 lines) composes `use-tracker-core` (state, effects, verify), `use-tracker-derived` (memos, filters, pagination), `use-tracker-actions` (print, copy, CSV) and `use-tracker-settlement`.
- Sections: `tracker-header`, `analytics-tab`, `verify-tab`, `settlement-tab`, `tracker-print-layer` (print CSS and both print portals).
- Units: `helpers.ts`, `constants.ts`, `props.ts`.

## Behaviour edits (convention only)

Six raw `fetch("/api/invoices/…")` calls became `apiFetch` (list, stats, teacher assignments, verify, per-teacher list, settle). Success paths and fallbacks (local cache, computed stats and settlements) are unchanged; failures now reach the notification bell. For verify, the catch maps a 400 to the server message, a 500 to "Error verifying invoice" and other statuses to the "not found" text, as before.

## Verified

`npm run verify -- --build`: PASS, 0 fail. The one warn is the hand-written A4 portrait `@page` of the ledger print, moved unchanged (fixed-sheet layout; moving it to `PrintPageStyle` changes print output).

## Not verified

- No signed-in run: analytics filters and pagination, CSV export, ledger print, verify, reprint, teacher settlement with undo.
- Existing bug, not changed: the verify route returns the invoice under `invoice` but the client reads `data.data`, so a remote hit still shows "not found" (the local-cache lookup runs first). Worth a separate fix.

## Review

An independent static review found no regression. Hook order and dependency arrays match HEAD. Two cosmetic differences on rare failures (verify outer-catch 500 and 401 messages).
