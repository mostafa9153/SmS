# Phase 4.1 — small fixes (group A)

## Layout
- Invoice tracker reads `data.invoice` (the route returns `invoice`); the route is unchanged.
- `app/api/push/send/route.ts` removed (no caller; `notify({ push: true })` covers push).
- `app/api/teachers/absence`: records an undo step (delete the new row), returns `undoId`, one `notify({ roles: ["Admin"], push: true })` replaces the dispatch loop and direct push.
- `app/api/teachers/attendance` POST: before-image of the saved students on that date, restore steps (upsert old rows, delete newly created ids), returns `undoId`. Clients show `toastWithUndo`.
- CI runs `next build` with placeholder env (15 min timeout). Built locally without `.env.local` to confirm.
- Three native `alert()` calls became `toast.error`.

## Behaviour edits
- Admin absence alerts now go to the admin bell (`app_notifications`) instead of `teacher_notifications`, so an Admin inside `/teacher` no longer sees them in that portal's bell.
- Undoing an absence leaves the earlier bell notification and push in place.
- Attendance undo has no guard: within 24 h it overwrites a later edit to the same students and date.

## Verified
`verify.mjs --build` 0 fail / 0 warn; `npx tsc --noEmit` clean; next build with placeholder env.

## Not verified
Signed-in flows, live Supabase writes, undo round trips against the real database.

## Review
Independent subagent: no blocking bugs. One real finding fixed: the attendance before-image loaded the whole day and could truncate at 1,000 rows; it now filters by `student_id`.
