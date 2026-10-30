# Phase 3.1g — Admission application form split

`components/admission/admission-application-form.tsx`: 2,188 → 64 lines, no feature change. `AdmissionApplicationForm` and the `AdmissionFormData` type export are unchanged; the five importers needed no edit.

## Layout (`components/admission/application-form/`)

- `use-admission-form.ts` (657 lines): react-hook-form setup, accordion and saved-section state, address, school and bank presets, draft restore, validation error handler.
- `step-map`, nine section components (`section-student`, `-categories`, `-cwsn`, `-family`, `-enrolment`, `-previous-school`, `-other`, `-bank`, `-identifiers`), `submit-bar`.
- Shared pieces that lived at the bottom of the old file: `collapsible-card`, `input-wrapper`, `bilingual-text`, `section-themes`.
- `constants.ts` (districts, classes, occupations, qualifications, HS subjects), `format.ts` (`formatAadhaarNumber`), `props.ts`.

Split by the same AST script as 3.1c/3.1e. No `apiFetch`, `alert` or other convention edits were needed: the file had none of those.

## Verified

`npm run verify -- --build`: PASS, 0 fail, 0 warn. A whitespace-insensitive line comparison with the old file shows only added `export` keywords and changed signatures.

## Not verified

- No signed-in run: public apply link, offline entry and review mode; section save-and-next, draft restore, preset pickers, validation jump to the failing section, submit.

## Review

An independent static review found no regression: the hook body matches HEAD under `diff -w`, JSX and defaults are unchanged, importers resolve. The helpers `formatAadhaarNumber`, `CLASSES`, `WB_DISTRICTS` and `OCCUPATIONS` are no longer exported from the page file; nothing imported them.
