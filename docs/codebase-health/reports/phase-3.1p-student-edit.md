# Phase 3.1p — Student edit page split

`app/(dashboard)/students/[id]/edit/page.tsx`: 1,416 → 84 lines, no feature change. The default export `EditStudentPage` is unchanged. This page is not merged with `student-add-edit-form` (a separate, later task).

## Layout (`components/students/edit/`)

- `use-edit-student.ts` (327 lines): form setup, derived values, Madhyamik fields, update mutation with the undo toast, submit and validation-error handlers.
- `schema.ts` (`studentSchema`, `FormData`) and `constants.ts` (classes, religions, mother tongues, qualification and stream options).
- Sections: `section-demographics`, `section-social`, `section-cwsn`, `section-family`, `section-enrolment`, `section-previous-school`, `section-facilities`, `section-bank`, `section-identifiers`, `submit-bar`.

The page keeps the loading and not-found screens, the header, the form wrapper and the mutation error paragraph.

## Behaviour edits

None. One ordering change: the loading and not-found early returns used to sit before the `onSubmit` and `onFormError` function declarations. The handlers now live in the hook and the early returns are in the page. The handlers are only used in the form JSX, so nothing observable changes.

## Verified

`npm run verify -- --build`: PASS, 0 fail, 0 warn. A whitespace-insensitive line comparison shows only `export` keywords added to the schema and constants.

## Not verified

- No signed-in run: open a student, edit each section, CWSN toggle, Madhyamik percent, stream and section dropdowns, bank and Aadhaar inputs, save with the undo toast, validation error toast.
- Existing `any` casts in the form-error handler were moved as they were (lint warning only).

## Review

An independent static review found no regression: the hook body is identical to HEAD (state, effects, mutation and handlers), the nine sections and submit bar match HEAD, schema and constants match apart from `export`.
