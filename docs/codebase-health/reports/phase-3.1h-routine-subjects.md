# Phase 3.1h — Routine subjects tab split

`components/routine/routine-subjects-tab.tsx`: 2,140 → 35 lines, no feature change. `RoutineSubjectsTab` and the backward-compat helper re-exports stay in the page file; the one importer (`app/(dashboard)/routine/page.tsx`) needed no edit.

## Layout (`components/routine/subjects/`)

- `use-routine-subjects.ts` (18 lines) composes `use-subjects-core` (state, effects, URL and storage sync), `use-subjects-derived` (presets, filtered rows, groups, load totals), `use-subjects-editing` (drag-end, add/edit/delete handlers, dialog submit) and `use-subjects-sync` (select class/stream, save all, preset syncs).
- Sections: `class-switcher`, `subjects-table`, `subject-dialog`; rows `subject-table-row`, `group-subject-row`; `props.ts`.

## Behaviour edits (convention only)

Two raw `fetch("/api/routine/subjects-order")` calls became `apiFetch` (load order on mount, save order with "save all"). The load stays silent on failure and the save still only warns, then continues with the subject rows.

## Verified

`npm run verify -- --build`: PASS, 0 fail, 0 warn. A whitespace-insensitive line comparison shows only added `export` keywords and changed signatures.

## Not verified

- No signed-in run: switch class and stream tabs, add/edit/delete a subject and a group, drag to reorder, save all, preset syncs.

## Review

An independent static review found no regression: hook order and dependency arrays match HEAD, the two `apiFetch` calls keep the old silent-load and warn-on-save behaviour, JSX and the helper re-exports are unchanged.
