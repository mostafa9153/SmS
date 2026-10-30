# Phase 3.1b — excel parser and two large pages

## Done

| Item | Before | After |
|---|---|---|
| `lib/utils/excel-parser.ts` | 2,888 lines, no tests | 8-line barrel over `lib/utils/excel/` (types, fields, presets, sheet, mapping, normalizers, students, results). Largest piece is `fields.ts`, which is a data table (1,283 lines). |
| `tests/unit/excel-parser.test.ts` | none | 26 characterization tests, written before the split and green before and after it |
| `students/bulk-upload/page.tsx` | 1,736 lines | 138 lines. State and handlers in `components/students/bulk-upload/use-bulk-upload.ts`; one component per step; sample-template and issue-log export in `bulk-templates.ts` |
| `admission/invoices/page.tsx` | 1,394 lines | 108 lines. `components/admission/invoice-queue/`: hook, types, stats, tabs, filters, list, print dialog |

The page splits are moves. A whitespace-insensitive line comparison against the original shows every moved line present, except the lines changed on purpose below.

## Bug found by the tests and fixed

`autoSuggestResultMapping` pass 2 matched `cleanHeader.includes(clean(alias))`. The `percentage` field has the alias `%`, which cleans to an empty string, and `includes("")` is always true. Any result-sheet column that matched nothing else was mapped to `percentage`. Blank aliases are now skipped in that pass. The student mapper already had a length guard and was not affected.

## Convention fixes in moved code

- `alert()` on rollback failure → `toast.error`.
- Three raw `fetch('/api/...')` calls and one mutation in the invoice queue → `apiFetch` (failures now reach the notification bell). Response shapes were checked against the routes: `next-sequence` and `mark-printed` return no `data` key, so `apiFetch` hands back the whole payload; `/api/invoices` returns `data: []`, which `apiFetch` unwraps to the array.

## Pinned quirk, not changed

`extractBannerMetadata`: for `School Name: ABC High School Dise Code: …` the lookahead cuts the trailing "School", giving `ABC High`. A test pins this. Fixing it needs sample banner files from real exports, so it is left for a later change.

## Verified

- `npm run verify -- --build`: PASS, 0 fail, 0 warn (types, lint, 26 new + existing tests, client→route, conventions, `next build`).
- `next start` on :3100: both pages answer 307 to `/login` without a session. The server was stopped afterwards.

## Not verified

- No signed-in run of either page: upload a real sheet, map, preview, import, rollback; build an invoice batch and print. The moves are mechanical but nobody has clicked through them.
- No independent `/code-review` pass; the check was the line-fidelity comparison above.

## Still open in this area

- `applyMapping`, `applyResultMapping` and `validateMappedRows` default the year to `new Date().getFullYear()` (calendar year). Callers pass an explicit year today; moving the default to the academic year belongs with the form-merge item.
- `students/[id]/edit/page.tsx` merge with `student-add-edit-form.tsx` stays deferred until a signed-in save comparison is possible.
