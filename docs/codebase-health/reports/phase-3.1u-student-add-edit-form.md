# Phase 3.1u — Student add/edit form split

`components/students/student-add-edit-form.tsx`: 1,282 → 71 lines, no feature change. `StudentAddEditForm` and the `StudentAddEditFormProps` type export are unchanged; the two importers (`students/add/page.tsx`, `admission/new/ai-scan/page.tsx`) needed no edit. The form was not merged with the student edit page (`components/students/edit/`); both keep their own copy of the schema and constants.

## Layout (`components/students/add-form/`)

- `use-student-add-edit-form.ts` (317 lines): form setup with the initial and AI-extracted data, watchers, Aadhaar and RTE state, six effects, create mutation, submit handler with the `onSubmitData` branch.
- `schema.ts` (`studentSchema`, `FormData`), `constants.ts`, `props.ts` (`StudentAddEditFormProps`).
- Sections: `section-demographics`, `section-social`, `section-cwsn`, `section-family`, `section-enrolment`, `section-previous-school`, `section-facilities`, `section-bank`, `section-identifiers`, `submit-bar`.

The page keeps the outer wrapper with the embedded layout logic, the optional page header, the form wrapper and the mutation error paragraph.

## Behaviour edits

None. The file had no raw fetch, `alert` or `confirm`.

## Verified

`npm run verify -- --build`: PASS, 0 fail, 0 warn. A whitespace-insensitive line comparison shows only `export` keywords added to the schema and constants and the component signature.

## Not verified

- No signed-in run: add a student (standalone and embedded), AI-scan prefill, CWSN and RTE toggles, Aadhaar handling, class and stream dependent fields, save, redirect or `onSuccess`, `onSubmitData` flow.
- The roughly 1,000 duplicated lines between this form and the edit page remain (merge is a separate task).

## Review

An independent static review found no regression: the hook body matches HEAD line for line, a whitespace-normalised diff of the JSX against the ten section files is empty apart from comments, and every segment destructures what it uses.
