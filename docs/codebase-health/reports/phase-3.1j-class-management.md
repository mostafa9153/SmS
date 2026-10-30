# Phase 3.1j — Class management tab split

`components/settings/class-management-tab.tsx`: 1,847 → 29 lines, no feature change. `ClassManagementTab` is unchanged; its one importer (`preset-addresses-tab.tsx`) needed no edit.

## Layout (`components/settings/class-management/`)

- `use-class-management.ts` (about 800 lines): class list state, staff list, add and edit form state, save and delete handlers.
- Sections: `class-kpi-cards`, `classes-grid`, `add-class-dialog`, `edit-class-dialog`.
- `types.ts` (`ClassItem`), `helpers.ts` (higher-secondary check, section letters, section teacher lookup), `constants.ts` (`DEFAULT_CLASSES`).

## Behaviour edits (convention only)

The background `fetch("/api/school-config", POST)` in the save function became `apiFetch`. It stays fire-and-forget and still invalidates the school-config client cache on success; a failed save now lands in the same `catch` (a console warning) instead of being ignored.

## Verified

`npm run verify -- --build`: PASS, 0 fail, 0 warn. A whitespace-insensitive line comparison with the old file shows no missing line.

## Not verified

- No signed-in run: add, edit and delete a class, stream sections for XI and XII, section teachers, and the database sync.
- The save still writes localStorage first and the database in the background, with no undo journal entry. That is the open settings-undo item from phase 3, unchanged here.

## Review

An independent static review found no regression: effect, state and handler bodies match HEAD, the JSX segments differ only by wrappers, and the one importer still resolves. The `apiFetch` call is outside TanStack Query, so a failure adds only a console warning and does not reach the bell.
