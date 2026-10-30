# Phase 3.2 — Academic (part 1: results, attendance analytics)

Scope read: `app/api/results/*`, `app/api/attendance/analytics`, `app/api/academic-session/transition`, `app/api/students/promotion`, `lib/supabase/db-results.ts`. The 1,016-line `db-academic-session.ts` (session transition) was not audited line by line.

## Findings and fixes

| ID | Finding | Fix |
|---|---|---|
| AC-1 | Saving marks (`POST /api/results`, `/results/subject-batch`) and rank recalculation overwrote results with no undo | `lib/academic/results-undo.ts`: before-image of the whole class/year/exam (ranks change for every row), `undoId` returned, `toastWithUndo` on the three result screens and the student profile "add result" dialog |
| AC-2 | `dbSaveSubjectBatchMarks` only logged a failed read of existing marks. The upsert then ran with empty `subject_marks`, wiping every other subject for those students | The read error is thrown, nothing is written |
| AC-3 | `GET /api/results` only checked "signed in"; a teacher could read any class | `requireRole()` + `denyOutsideClasses` |
| AC-4 | Attendance analytics used the UTC date as "today", so between 00:00 and 05:30 IST it showed yesterday and a shifted 7-day trend | `todayIST()` and UTC date arithmetic from that string |
| AC-5 | The three client helpers for results used raw `fetch`, so failures skipped the notification bell | `apiFetch` |

Test: `tests/unit/results-undo.test.ts` (3 tests: snapshot filter, restore + delete-created steps, edit-only save).

## Review follow-up

An independent review of this and the next two commits found three problems in the results undo, fixed afterwards: (1) the before-image only covered the class, but the save upserts on student + year + exam, so saving a past year's marks for a student now in a higher class would have been "undone" by deleting that student's old result — the saved students' own rows are now in the snapshot; (2) a failure to write the journal after a successful save made the request report failure — it now returns no `undoId` instead; (3) the whole-class before-image could revert marks entered later by someone else — the undo now expires after 1 hour instead of 24.

## Verified

`npm run verify -- --build`: PASS, 0 fail, 0 warn.

## Not verified

- No signed-in run: enter marks, then Undo, then check ranks come back. The undo path is unit-tested with a mocked client only.
- Undo of the restored ranks assumes the `student_results` primary key is `id` (used by every other call in `db-results.ts`).

## Not done in this part

- `bulk-upload` for results writes through its own import batch and rollback; not changed.
- Session transition (`db-academic-session.ts`) and its undo path are unaudited.
- Marksheet and tabulation screens are unaudited.
