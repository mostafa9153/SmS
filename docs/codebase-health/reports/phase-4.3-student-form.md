# Phase 4.3 — student add/edit form (group C)

## Layout
- `components/students/form/constants.ts`: single copy of the formerly identical add/edit constants.
- `lib/utils/csv-fields.ts` `splitCsvFields()` replaces 14 duplicated comma-split lines in both submit hooks; unit-tested.

## Deferred
Merging the sections behind `mode`. The two forms use different react-hook-form types (`StudentAddEditFormState` vs `EditStudentState`), the edit schema has extra fields and rules, and placeholders differ. A merge needs a shared form-state type and risks changing what each form saves. Recommend doing it only with a form-level type first.

## Verified
`verify.mjs --build` 0 fail. Saved payloads unchanged (same trimming and empty-drop logic).

## Not verified
Signed-in add/edit student flows.
