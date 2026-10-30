# Phase 3.1x — Promotion page split

`app/(dashboard)/students/promotion/page.tsx`: 1,209 → 61 lines, no feature change. The default export `PromotionPage` (with its `Suspense` fallback) is unchanged.

## Layout (`components/students/promotion/`)

- `use-promotion-desk.ts` (646 lines): class, exam and year selection, student and result queries, promotion evaluation, roll prediction, selection, manual and bulk overrides, the promotion and rollback mutations.
- Sections: `promotion-header`, `success-banner`, `filter-bar`, `summary-metrics`, `action-bar`, `roster-table`, `execute-confirm-dialog`, `rollback-dialog`.
- `constants.ts` (classes, exam options, override status options), `types.ts` (`ManualOverrideData`).

## Behaviour edits (convention only)

Three `alert()` calls became sonner `toast` with the same message strings: rollback success (`toast.success`), rollback failure and promotion failure (`toast.error`). The difference: the browser dialog blocked until dismissed, the toast does not. The state resets and query invalidations after success run as before.

## Verified

`npm run verify -- --build`: PASS, 0 fail, 0 warn. A whitespace-insensitive line comparison shows only `export` keywords on the moved constants and type.

## Not verified

- No signed-in run: choose class and exam, evaluate the cohort, select students, single and bulk overrides, execute a promotion (confirm dialog, success banner), roll back a promotion and see the toast.

## Review

An independent static review found no regression: the hook body matches HEAD apart from the three toast edits, the eight sections and both dialogs match HEAD in order, and every segment destructures what it uses.
