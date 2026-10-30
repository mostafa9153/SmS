# Phase 3.1l — Routine teachers tab split

`components/routine/routine-teachers-tab.tsx`: 1,718 → 26 lines, no feature change. `RoutineTeachersTab` is unchanged; the one importer (`app/(dashboard)/routine/page.tsx`) needed no edit.

## Layout (`components/routine/teachers/`, next to the existing editor form and row components)

- `use-routine-teachers.ts` (18 lines) composes four hooks:
  - `use-teachers-core` (preset classes, staff list, group and subject memos, editor form state, load totals),
  - `use-teachers-editor` (open add and edit, cancel, restore from the URL, staff dropdown, class and section selection),
  - `use-teachers-allocation` (section subjects and periods, allocation stats, group picks),
  - `use-teachers-save` (period and subject toggles, availability, save, delete, save all to cloud).
- Sections: `teachers-header-card`, `teacher-editor-dialog`, `teachers-list-table`; `props.ts`.

The existing `teacher-editor-form.tsx` (884 lines), `teacher-table-row.tsx`, `teacher-summary-badges.tsx` and `teacher-availability-matrix.tsx` were not touched. The editor form is the next candidate in this area.

## Notes

- Hook order is unchanged: the sections are called in the original order, including the two late `useState` calls and the three effects.
- The generated files first imported the existing components as `./teachers/x`; they were corrected to `./x`.
- No convention edits were needed (the file had no `alert` or raw `fetch`).

## Verified

`npm run verify -- --build`: PASS, 0 fail, 0 warn. A whitespace-insensitive line comparison shows only the component signature changed.

## Not verified

- No signed-in run: add and edit a teacher, subject and period selection per class and section, group picks, availability, save, delete, save all to cloud.

## Review

An independent static review found no regression: effect and hook order match HEAD, the save section reads nothing from the editor section, JSX and the importer are unchanged. The two existing files my relative-import fix touched have no content diff and are not part of the commit.
