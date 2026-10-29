# Phase 3.1e — Routine viewer split

`components/routine/routine-viewer-tab.tsx`: 2,473 → 121 lines, no feature change. The export `RoutineViewerTab` and its props are unchanged, so `app/(dashboard)/routine/viewer/page.tsx` needed no edit.

## Layout (`components/routine/viewer/`)

- `use-routine-viewer.ts` (17 lines) composes four hooks: `use-viewer-core` (state, effects, memos), `use-viewer-editing` (cell swap, undo), `use-viewer-export` (Excel export), `use-viewer-paper` (paper settings, print).
- Sections: `viewer-toolbar`, `print-sheet-header`, `grid-head`, `master-day-rows`, `master-teacher-rows`, `day-rows`, `navigation-footer`.
- Units: `viewer-dropdown.tsx`, `labels.ts` (`getSubjectShort`, `getClassShort`), `constants.ts` (day colour themes, tiffin border), `props.ts`, `types.ts` (`ViewMode`).

The empty-state card, the grid wrapper with its print `<style>` block, the `<tbody>` and its three view conditionals stay in the page. Split by the same AST scripts as 3.1c, extended for a component that takes props: the hook receives the props, and the prop names are returned from the core hook so sections read them from the same state object.

## Notes

- Hook order: the core hook keeps every `useState`, `useEffect`, `useMemo` and `useRef` in their original order; `usePaperSettings` is the last hook in both versions.
- The three row components read `routine`, which the page narrows to non-null before rendering them. They now return `null` when it is missing, a state the page never reaches.
- A whitespace-insensitive line comparison with the old file shows only added `export` keywords and changed function signatures.

## Verified

`npm run verify -- --build`: PASS, 0 fail, 0 warn.

## Not verified

- No signed-in run: switch every view mode, drag-swap a cell, undo, export Excel, print, fullscreen and zoom on `/routine/viewer`.
- The React Compiler warnings (`set-state-in-effect`, `any`) that were in the original file moved with the code; none is new.

## Review

An independent static review found no regression: hook order, identifiers, the three `routine` guards and JSX order all match HEAD.
