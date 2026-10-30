# Phase 3.1s — Student profile page split

`app/(dashboard)/students/[id]/page.tsx`: 1,334 → 155 lines, no feature change. The default export `StudentProfilePage` (with its `Suspense` fallback) is unchanged.

## Layout (`components/students/profile/`)

- `use-student-profile.ts` (134 lines): active tab with URL sync, student and result history queries, add-result mutation, delete handler with the undo toast.
- Sections: `profile-header-card`, `tab-personal`, `tab-academic`, `tab-facilities`, `tab-bank`, `tab-identification`, `tab-results`, `record-marks-dialog`, `delete-student-dialog`.
- `info-primitives.tsx` (`SectionTitle`, `InfoGrid`, `InfoField`), `constants.ts` (valid tab ids).

The page keeps the loading and not-found screens, the back button, `Tabs` with its tab list and the small history tab, so every tab panel stays a direct child of `Tabs`.

## Behaviour edits

None. Each section that reads `student` starts with `if (!student) return null;`. The page already returns early when there is no student, so this only narrows the type. The file had no raw fetch, `alert` or `confirm`.

## Verified

`npm run verify -- --build`: PASS, 0 fail, 0 warn. A whitespace-insensitive line comparison shows only `export` keywords added to the moved helpers and the constant.

## Not verified

- No signed-in run: open a student, switch each tab (URL sync), welfare scheme result, add exam marks, result chart and table, delete with undo.

## Review

An independent static review found no regression: the hook body is identical to HEAD, every section matches its HEAD range, the tab panels stay direct children of `Tabs` in the same order, and no section calls a hook after a guard.
