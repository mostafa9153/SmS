# Phase 4.2 — shared-component migration (group B)

## Layout
- Native `<select>` → `CustomSelect` in 8 files (14 uses). Empty-value options pass `placeholder` so the label stays ("All Designations"); the routine subject table no longer clips the dropdown.
- Raw `fetch("/api…")` → `apiFetch` in about 35 calls across components and app pages (backup tab, users tab, student attendance, employee signature/create/delete/edit, admission steps, profile, print history, settings tabs).
- Pagination: the four lists (pending/old students, admission tracker, invoice tracker) already use `components/ui/pagination.tsx`; nothing left to migrate.

## Deferred (with reason)
- `lib/data/students.ts` (20 calls) and `lib/data/admission.ts` (15): responses mix `data`-wrapped and flat shapes, and apiFetch unwraps `data`; a per-route test pass is needed first.
- Other lib/ callers (`lib/ems/*`, `lib/routine/routine-sync.ts`, invoice/certificate registry).
- `generate/page.tsx`, `generate/certificate-tracker/page.tsx` (certificate list wraps the array in `data`), `layout/topbar.tsx` and `layout/sidebar.tsx` (fall back to the Supabase user when the profile call fails).
- DataTable: no three tables share markup without changes; not created.

## Behaviour edits (failure paths only)
- Errors now surface through `ApiError` (message from `error`/`message`, else status text). Example: users-tab PATCH with an empty error body shows "500 Internal Server Error" instead of "Failed to update user (500)".
- Backup restore preview call keeps raw `fetch` (needs the `preview` object from a non-OK body).

## Verified
`verify.mjs --build` 0 fail / 0 warn. Every migrated route checked for a top-level `data` key (none).

## Not verified
Signed-in browser flows, live Supabase.

## Review
Independent subagent: no apiFetch regressions. Two CustomSelect defects found and fixed (lost empty-option labels; clipped dropdown).
