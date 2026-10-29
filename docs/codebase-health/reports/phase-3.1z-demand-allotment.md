# Phase 3.1z — Routine demand allotment tab split

`components/routine/routine-demand-allotment-tab.tsx`: 1,123 → 30 lines, no feature change. `RoutineDemandAllotmentTab`, the `calculateClassWeeklyCapacity` re-export and the `ClassAllotmentRow` type export are unchanged; its importer (`app/(dashboard)/routine/page.tsx`) needed no edit.

## Layout (`components/routine/demand-allotment/`)

- `use-routine-demand-allotment.ts` (497 lines): search, class, stream and status filters (URL and localStorage initial values), per-class demand and capacity rows, grand totals, expand and collapse state.
- Sections: `kpi-ribbon`, `search-filter-bar`, `demand-table`.
- `allotment-row-item.tsx` (the memoised table row component), `props.ts`, `types.ts` (`ClassAllotmentRow`), `helpers.ts` (`isSubSubFullyAllotted`).

The page keeps the re-exports, the outer wrapper and the section comments. The hook receives the props object and destructures it exactly as the component did (`groups = []` default).

## Behaviour edits

None. The file had no raw fetch, `alert` or `confirm`.

## Verified

`npm run verify -- --build`: PASS, 0 fail, 0 warn. A whitespace-insensitive line comparison shows only `export` keywords on the moved types and helpers and the component signature.

## Not verified

- No signed-in run: the routine page demand tab with real data: class, stream and status filters (including URL and saved values), expand and collapse rows, KPI totals, subject rows with assigned teachers.

## Review

An independent static review found no regression: a `diff` of the hook body against HEAD is empty, the three sections and the row component match HEAD, and the re-exports are preserved.
