# Phase 3.1m — Admission form generator split

`app/(dashboard)/generate/admission-form/page.tsx`: 1,656 → 112 lines, no feature change. `AdmissionFormGeneratorContent` (used by `admission/new/offline/page.tsx`) and the default page with `Suspense` are unchanged.

## Layout (`components/admission-form/generator/`)

- `use-admission-form-generator.ts` (about 750 lines): serial and class state, roster queries, preview data, print and bulk-print handlers. It takes the `embedded` flag and returns it.
- Sections: `print-container`, `studio-header`, `class-tab-card`, `print-quantity-card`, `preview-toolbar`, `preview-viewport`.

The page keeps the print `<style>` block (with its justified `@page`), the layout wrappers, the tracker and history modals, and the `embedded` class logic.

## Behaviour edits (convention only)

Two fire-and-forget `fetch("/api/admission/applications/bulk-blank")` calls (single blank form and bulk blank forms) became `apiFetch`. Success is unchanged. A non-ok response now reaches the same `.catch` (console error) instead of being ignored, and may notify the bell.

## Verified

`npm run verify -- --build`: PASS, 0 fail, 0 warn. A whitespace-insensitive line comparison shows only the two fetch conversions.

## Not verified

- No signed-in run: blank and pre-filled single print, bulk print, serial advance after print, class and tab switching, preview paging, tracker and history modals.

## Review

An independent static review found no regression: hook body, JSX sections, destructuring and exports match HEAD. It did not open `apiFetch`, hence the bell note above.
