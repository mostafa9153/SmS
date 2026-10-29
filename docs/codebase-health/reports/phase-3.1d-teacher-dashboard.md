# Phase 3.1d — Teacher dashboard split

`app/(dashboard)/teacher/page.tsx`: 2,304 → 74 lines, no feature change.

## Layout (`components/teacher/dashboard/`)

- `use-teacher-dashboard.ts` (602 lines): all state, effects and handlers.
- Sections: `welcome-header`, `metrics-bar`, `absence-tracker`, `quick-action-hub`, `routine-card`, `assigned-duties`, `active-tasks`, `recent-activity`.
- Dialogs: `mark-absence-dialog`, `task-report-dialog`, `attachment-preview-dialog`, `attendance-dialog`.
- `constants.ts` (`DAYS_OF_WEEK`). The page keeps the loading skeleton, the lounge drawer and the composition.

Split by the same AST script as phase 3.1c. One reorder: `const teacherName` moved above the `if (loading)` early return so it lives in the hook (it is a pure expression). A whitespace-insensitive line comparison shows only the `DAYS_OF_WEEK` line changed (it gained `export`).

## Behaviour edits (convention only)

- Two `alert()` calls became `toast.error()`.
- Eight raw `fetch("/api/teachers/…")` calls became `apiFetch`: workspace load (the 401 redirect to `/teacher/login` is now handled from the thrown `ApiError`), mark notification read, record absence, load and save attendance, start task, submit task report. Success paths are unchanged. Differences on failure: a failed mark-read no longer flips the badge locally; a failed absence now shows the server message as a toast; failures reach the notification bell.

## Verified

`npm run verify -- --build`: PASS, 0 fail, 0 warn.

## Not verified

- No signed-in run as a teacher: load dashboard, mark absence (single and multi-date), roll-call load and save, start task and submit a completion report, mark notifications read, sign-out redirect on an expired session.
- The teacher routes `absence`, `attendance` and `notifications` have no undo (phase 3.3 covered `tasks`); they remain to be reviewed against the undo convention.

## Review

An independent read-only review found one regression, fixed: "Start task" threw on a failed status update and stopped navigating, while the old code ignored the failure and still opened the module. The status call is now wrapped so navigation continues as before. Everything else (hook order, 401 redirect, payload shapes, JSX lines) matched the original.
