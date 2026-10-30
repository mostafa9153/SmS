# Phase 3.1k — Teacher management page split

`app/(dashboard)/teacher-management/page.tsx`: 1,839 → 82 lines, no feature change. The page keeps the `Suspense` default export and the loading and tab wrappers.

## Layout (`components/teachers/management/`)

- `use-teacher-management.ts` (about 480 lines): teachers, assignments, tasks, performance, permission toggles, account and task creation, CSV export.
- Sections: `management-header`, `stats-and-alerts`, `tabs-nav`, `accounts-tab`, `tasks-tab`, `performance-tab`.
- Dialogs: `activity-logs-dialog`, `create-account-dialog`, `permissions-dialog`, `assign-task-dialog`.
- `permissions.ts` (permission sections), `constants.ts`, `tabs.ts`.

## Behaviour edits (convention only)

Ten raw `fetch("/api/teachers…")` calls became `apiFetch`: the four loads, permission toggle, batch toggle, account creation, task creation, approve, delete, activity logs, and the save button in the permissions dialog. Success paths are unchanged (state updates, undo toasts with `undoId`, modal closes). Failure messages still come from the server `error` field, and the batch toggle still reloads on failure.

Difference on failure: `loadData` used to ignore a non-ok response from any of its four reads. It now shows the server message in the error banner and skips the remaining reads.

## Verified

`npm run verify -- --build`: PASS, 0 fail, 0 warn. A whitespace-insensitive line comparison with the old file shows only the three small constants gaining `export`.

## Not verified

- No signed-in run as admin: load the three tabs, search accounts, create a login, toggle single and batch permissions with undo, assign, approve and delete a task, open activity logs, export CSV.
- The teacher routes `absence`, `attendance` and `notifications` still have no undo review (open item from 3.1d).

## Review

An independent static review found no regression: hook and effect order, dependency arrays and the performance tab IIFE match HEAD, and every `apiFetch` site keeps its success path. When a route returns no `error` field, the failure text is now the HTTP status text instead of the old fallback string (cosmetic).
