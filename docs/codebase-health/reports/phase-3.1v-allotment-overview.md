# Phase 3.1v — Routine allotment overview tab split

`components/routine/routine-allotment-overview-tab.tsx`: 1,219 → 30 lines, no feature change. `RoutineAllotmentOverviewTab` is unchanged; its importer (`app/(dashboard)/routine/page.tsx`) needed no edit.

## Layout (`components/routine/allotment-overview/`)

- `use-routine-allotment-overview.ts` (641 lines): search, class, teacher and issues filters (URL and localStorage initial values), class matrix, teacher load rows and their totals, class name list.
- Sections: `balance-ribbon`, `control-bar`, `class-allotment-chart`, `faculty-workload-chart`.
- `props.ts`, `types.ts` (cell and class row types), `teacher-load-types.ts`, `helpers.ts` (`shortSubject`).

The page keeps the outer wrapper and the section comments in the original order. The hook receives the props object and destructures it exactly as the component did (`groups = []` default, unused `settings`).

## Behaviour edits

None. The file had no raw fetch, `alert` or `confirm`.

## Verified

`npm run verify -- --build`: PASS, 0 fail, 0 warn. A whitespace-insensitive line comparison shows only `export` keywords added to the moved types and helper and the component signature.

## Not verified

- No signed-in run: the routine page overview tab with real classes, teachers and assignments: class and teacher filters (including URL and saved values), issues-only toggle, both charts, totals.

## Review

An independent static review found no regression: a `diff` of the hook body against HEAD shows only the signature wrapper and the return object, the four sections match HEAD, and `tsc` and eslint on the changed files are clean.
