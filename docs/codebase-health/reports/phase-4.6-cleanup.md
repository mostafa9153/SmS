# Phase 4.6 — dependencies, dead code, cleanup (group F)

## Done
- `uuid` pinned to 11.1.1 through `overrides` (it only comes from `exceljs`); exceljs write/read round trip, 145 tests and `next build` pass. Advisories 7 → 5.
- 144 exports used only inside their own file lost the `export` keyword (88 files; shadcn `components/ui`, route/page files and `scripts/` skipped). Five exports that `scratch/` or a type re-export still import were put back.
- 30 exported symbols that nothing uses were deleted (found with knip, removed with the TypeScript AST so ranges are exact). Seven stay: they are used through `...spread` or other files.
- Removed `patch_*.js` (6), `current_diff.patch`, `routine-forge-pro.html` and their entries in `knip.json`, `eslint.config.mjs`, `CLAUDE.md`. `scratch/` is git-ignored and untracked, so it was left alone.

## Deferred
- **`xlsx` → `exceljs`**: `exceljs` cannot read legacy `.xls` files, and `parseExcelFile` relies on `xlsx`'s formatted-text conversion (`raw: false`) for dates and numbers. Government portal exports are often `.xls`. No test can show these are matched, so `xlsx` stays; its two advisories (prototype pollution, ReDoS) have no upstream fix and only affect files staff upload themselves.
- **`lib/data/*` fetch migration and student form section merge**: not done; `/api/students` and others return `data` in shapes that `apiFetch` would unwrap, and the two forms use different form types. Both need signed-in checks first.

## Live database check (read-only, Supabase plugin)
Project "SMS" has no `undoable_actions`, `student_attendance` or `app_notifications` table. Migrations `20261028_undoable_actions.sql`, `20261028_app_notifications.sql` and `20260922_teacher_workspace_v2.sql` (and probably `20261028_public_admission_link.sql`) are not applied. Until they are: no Undo button appears for any action (the journal returns no id), the bell stays empty, and student attendance saves fail. Nothing was written to the database.

## Scorecard (7.6 → 8.0)
Dead exports 253 → 97, circular imports 1 → 0, advisories 7 → 5, no file over 1,000 lines, 145 tests, `verify.mjs --build` 0 fail / 0 warn.

## Not verified
Signed-in browser flows, live Supabase writes and undo round trips, the solver on real data.
