# Phase 3.1 — Students & Admission, part 1: who may write, and which year

Scope so far: every API route under `app/api/students/**` and `app/api/admission/**` (32 routes), checked for guard, teacher class scope, undo and year handling. The large pages (`students/[id]/edit` 1,416 lines, `bulk-upload` 1,736, `invoices` 1,394, `excel-parser` 2,888) come in the next parts.

The owner asked for fixes without a confirmation round (2026-10-29), so this report records what was found **and** fixed.

## Found and fixed
| # | Where | Problem | Effect | Fix |
|---|---|---|---|---|
| ST-1 | `api/students/[id]` PATCH | Guarded by `requireRole()` only. Any Teacher could edit any student in any class: no `can_edit_student_profile` check, no class scope | A teacher could change names, classes, rolls and guardian data school-wide | `requireStaff("can_edit_student_profile")`, plus `denyOutsideClasses` on both the current class and the new class |
| ST-2 | `api/students/bulk` POST | Any signed-in user (including Teachers) could bulk-edit students. No screen calls it (Audit 3) | Same as ST-1, for many students at once | Route deleted, with its client wrapper and schema |
| ST-3 | `api/students/status-action` | Teachers with the edit permission could issue TC or Drop Out for **any** class, and run the school-wide "archive stale" | Mass status changes outside a teacher's classes | Teachers are limited to their classes; archive is Admin/Staff only |
| ST-4 | `status-action` (TC Out, Drop Out, archive) | No undo, against the CLAUDE.md rule. A wrong TC moved the student to the Old Register for good | No way back after a misclick | Undo restores the student rows and this year's history, and removes history rows the action created. The TC dialog and the pending-students page show the Undo toast |
| ST-5 | 24 places in 20 server files | The **calendar** year was used where the academic year was meant (admission year, history year, results, teacher class assignments, next roll, public admission, old-students default). Audit 2 A-YEAR-1 fixed only the client | Between January and the session change, the client asks for session 2026 while the server writes 2027: admissions, TCs and results land in the wrong year | New `lib/academic/current-year.ts` `getAcademicYear()` reads `admission_settings.current_academic_year` (60s cache, cleared when the settings are saved), with the IST year as fallback |
| ST-6 | 4 routes touched by ST-5 | Hand-written auth checks | No bug, but they bypassed the shared guard | Moved to `requireRole()` (readiness: Admin/Staff) |

**Kept on the calendar year on purpose:**
- **Teacher activity log filter:** it is a time filter, not a session.
- **Invoice numbering (`MHS/<year>/ADM-…`):** changing it would break the running sequence for this year.

## Checked, no change needed
- Routes without the standard guard still authenticate: `check-duplicate`, `invoices/count`, `stats`, `re-admission/candidates`, `students/[id]/history` (Admin only), `bulk-upload` and its rollback (Admin only).
- Applications, admit, revert, edit, transfer, ai-scan and mark-printed use `requireStaff` with the matching permission.

## Verified
- `npm run verify -- --build` passed.
- Smoke test without a session: the 10 changed routes answer 401, and the deleted `bulk` route answers 405.

## Not verified
Nothing was run signed in. Worth trying as a Teacher limited to one class:
- Editing a student of another class should be refused.
- Issuing a TC, then Undo, should bring the student back to the active list.

## Next (part 2)
- `students/[id]/edit/page.tsx`: about 1,000 lines duplicate `student-add-edit-form.tsx`. Make the edit page reuse the form.
- `bulk-upload/page.tsx` and `excel-parser.ts`: split them up and add parser tests.
- `admission/invoices/page.tsx`: split it up.

## Deferred: merging the student edit page into the shared form
Measured overlap: the edit page and `student-add-edit-form.tsx` share about 900 lines, but differ in 493 added and 359 removed lines. The edit page has fields and logic the form lacks: status fields, masked Aadhaar, undo on save.

Merging them blind risks a field that silently stops saving on the most important record in the system. Do this with a signed-in session:
1. Make a field-by-field list of both forms.
2. Move the edit-only parts into the form behind a `mode="edit"` prop.
3. Save one student before and after the change and compare the row.

Also noted for that change: the form's default `admissionYear` is still the calendar year. It should be `useAcademicYear()`.
