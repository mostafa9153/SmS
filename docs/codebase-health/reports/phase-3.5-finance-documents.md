# Phase 3.4–3.6 — Routine, Finance & Documents, Settings (first pass)

A guard, permission and undo pass over the API routes of these modules. Not a line-by-line audit: the generator pages, ID-card and report code, the Python solver and the dashboard were not read.

## Routine (3.4)

`routine/*` routes are guarded; `subjects-order` goes through `requireRole`. No change.

## Finance & documents (3.5)

| ID | Finding | Fix |
|---|---|---|
| FD-1 | `POST /api/invoices` refused a teacher only when `permissions.can_generate_invoices === false`. A teacher whose stored permissions lacked the key passed and could create invoices | `requireStaff("can_generate_invoices")`; the route notes that the Admin batch undo is its reverse |
| FD-2 | `POST /api/invoices/settle` (marks invoices paid or cancelled, sets the amount) had no undo | Before-image of the invoices, `undoId`, toast in the invoice tracker |
| FD-3 | `PATCH /api/certificates/[id]` (cancel / re-validate) accepted the view-only permission `can_view_certificate_tracker`, so a viewer could cancel certificates | Generation permissions only |
| FD-4 | The same route had no undo, and the tracker page ignored the response status: a 403 or 500 still flipped the row in the UI | Before-image, `undoId`, `apiFetch` (errors now show a toast and leave the row alone) |

## Settings & admin (3.6)

Backup, cron, push subscribe and dashboard routes were already guarded and annotated in earlier phases. `POST /api/school-config` is covered in the phase 3.3 report (settings undo deferred; teacher EMS saving added).

## Verified

`npm run verify -- --build`: PASS, 0 fail, 0 warn.

## Not verified

- No signed-in run: settle invoices then Undo; cancel a certificate then Undo; call `POST /api/invoices` as a teacher with and without the permission.
- The settle undo restores `admission_invoices` rows by their own primary key; the local-ledger fallback in the tracker modal (used when the API is down) is not journaled.

## Open

- `/api/push/send` has no caller anywhere in the repo (health scorecard lists it as an orphan). It lets any Admin/Staff broadcast a push to chosen users or a role. Left in place in case something outside the repo calls it; remove it if nothing does.
- Invoice creation is not class-scoped for teachers (a teacher with the invoice permission can create an invoice for a student in any class).
- Print/document pages, ID-card and report generators, dashboard stats, and the routine UI are unaudited.
