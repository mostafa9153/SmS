# Phase 3.1i — Results client split

`app/(dashboard)/results/results-client.tsx`: 1,906 → 53 lines, no feature change. The default export and its `allowedClasses` prop (teacher class scope) are unchanged; `results/page.tsx` needed no edit.

## Layout (`components/results/client/`)

- `use-results-client.tsx` (630 lines; `.tsx` because the rank badge helper returns JSX): filters, queries, mark entry, save and rank handlers.
- Sections: `results-filter-bar`, `results-page-header`, `subject-batch-view`, `class-summary-view`, `student-edit-dialog`.
- `helpers.ts` (`sanitizeScoreInput`), `constants.ts` (`CLASS_OPTIONS`).

The page keeps the module-level `NO_SCOPE` default (so the empty scope array keeps one identity), the `activeView` conditionals, the print dialog and the layout wrappers. Same AST script as the earlier splits; no convention edits were needed.

## Verified

`npm run verify -- --build`: PASS, 0 fail, 0 warn. A whitespace-insensitive line comparison shows only added `export` keywords and changed signatures.

## Not verified

- No signed-in run: teacher-scoped and admin views, subject batch entry and save, class summary and ranks, single-student edit dialog, print dialog.

## Review

An independent static review found no regression: the hook body matches HEAD line for line, `NO_SCOPE` keeps one identity, JSX and render order are unchanged.
