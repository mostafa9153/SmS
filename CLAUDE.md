# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Stack
School Management System: Next.js 16 (App Router, Turbopack) + React 19, Supabase (auth + Postgres), TanStack Query/Table, Tailwind v4 + shadcn (`components/ui`), Sentry. Python FastAPI + OR-Tools backend for class-routine solving.

## Commands
- `npm run dev` — dev server on 0.0.0.0:3000 (LAN/mobile testing; origins in `next.config.ts` `allowedDevOrigins`)
- `npm run routine:server` — Python solver on :8000 (needs `python-backend/venv`, see `python-backend/setup.bat`)
- `npm run build` — also the typecheck; `npx tsc --noEmit` for a faster check
- `npm run lint`
- `npm test` — vitest unit tests in `tests/unit/`. Ad-hoc checks: `scripts/test-routine-solver.ts`, `python-backend/test_solver.py`.

## Architecture
- `proxy.ts` (Next 16 replacement for `middleware.ts`) → `lib/supabase/middleware.ts`: session refresh + role-based redirects (`user_roles` table, 60s in-memory role cache). API routes bypass redirects and must do their own auth via `lib/supabase/auth-helper.ts` (roles: Admin / Staff / Teacher / Guest).
- Two portals: admin/staff UI in `app/(dashboard)/*`; teacher portal under `app/teacher` (login at `/teacher/login`).
- Data layer: `lib/supabase/db-*.ts` (and `lib/<module>/db-*.ts`, e.g. `lib/sports`) hold all Supabase queries. API routes in `app/api/<module>/route.ts` are thin wrappers returning `{ success, data | error }`. Client components fetch these routes via TanStack Query.
- Supabase clients: `server.ts` (cookie/RLS), `client.ts` (browser), `admin.ts` (service role, bypasses RLS — server only).
- Routine generation: `app/api/routine/generate` proxies to the Python solver at `ROUTINE_SOLVER_URL` (default `http://127.0.0.1:8000`); TS helpers in `lib/routine/`.
- Sports (`lib/sports/db-sports.ts`) reads and writes Supabase only; a missing table is an error, never a memory fallback. Writes need `can_manage_sports`.
- Classes use Roman numerals (V–X secondary, XI–XII higher secondary); promotion logic in `lib/supabase/db-academic-session.ts`.
- DB schema changes: add a dated SQL file in `supabase/migrations/` (`YYYYMMDD_description.sql`).
- Vercel cron: `/api/backup/cron` monthly (`vercel.json`).

## Conventions (every new or changed feature)
- **Auth**: every `app/api/**/route.ts` handler starts with `requireRole()` / `requireStaff(...teacherPerms)` from `lib/api/guard.ts` (proxy does not protect /api). Public endpoints live under `app/api/public/` and must be insert-only with rate limiting (see `lib/admission/public-link.ts`).
- **Undo**: any user action that edits or deletes data must be undoable. Before writing, take before-images with `snapshotRows()` (include child tables that cascade), then `recordUndo()` (`lib/undo/journal.ts`) and return `undoId` in the response; the client shows `toastWithUndo()` (`lib/undo/client.tsx`). Actions that cannot be undone (push, external APIs) need a confirm step instead.
- **Notifications**: important server events and failures call `notify()` / `notifyAdminsOfError()` (`lib/notifications/notify.ts`). Client requests use `apiFetch()` (`lib/api/client.ts`) inside TanStack Query so failures reach the bell automatically.
- **Toasts**: `toast` from `sonner` (mounted in `app/layout.tsx`).
- **Drafts**: forms that must survive a refresh use a scoped key (`lib/admission/form-draft.ts` pattern), never a shared localStorage key.
- **UI**: one dropdown (`components/ui/custom-select`), route-level `loading.tsx` skeletons (`components/ui/page-skeletons`), heavy libraries (exceljs, xlsx, docx, recharts, jsqr) loaded with dynamic `import()` / `next/dynamic`.
- **Shared UI (never re-implement locally)**: `PageHeader`, `StatCard`, `EmptyState`, `Spinner`, `SearchInput`, `FilterSelect` (toolbar pills) in `components/ui/`; `useConfirm()` (`components/ui/confirm-dialog`, mounted in `app/layout.tsx`) instead of `window.confirm`; `FormSection`/`FormGrid`/`FormField` in `components/forms/form-layout`; `ChartTooltip` in `components/dashboard/chart-tooltip`. Extend a shared component with a prop rather than copying it.
- **Print pages**: every print/preview page uses `PrintPreview` (zoom, drag, fit) and `PrintPageStyle` from `components/print/print-preview`, paper state from `usePaperSettings("<page>-paper-settings", defaults)` and the `PaperSettingsPanel` card. Each page sets only its own defaults (paper, orientation, margins) and options (`papers` — A5/A4/A3 by default, narrow it to what the layout can print; `orientations`; `lockMargins` for fixed-size layouts like ID cards). Margin presets (None / Narrow / Normal) come with the panel. In dialogs/studios use `<PrintPreview fill>`; the panel takes `variant="card" | "section" | "bare"`. The preview is hidden in print, so the page renders its own print copy (portal or `hidden print:block`). Layouts drawn for a fixed grid (EMS admit cards / bench slips, ID cards, marksheets) keep a fixed `@page` and get no margin setting. Types and sizes live in `lib/print/paper.ts`. No hand-written `@page` or zoom viewer.
- **Verification gate (every task, before commit)**:
  1. `npm run verify` (add `-- --build` for UI/route changes): types, lint errors, tests, every client `/api` call resolves to a route, no hard-coded secrets, guard + undo on API routes, convention slips. FAIL blocks the commit; a WARN is fixed or justified with `// guard: custom — reason` / `// undo: n/a — reason`.
  2. Independent review of the diff (`/code-review`); fix real findings and re-run step 1.
  3. Smoke-test changed routes/pages (`next start` on :3100, then stop it).
  4. The report states what was verified, what review caught, and what is still unverified.
- **Structure**: a page file wires things together and stays under ~300 lines. State and handlers go in a `use-*.ts` hook beside the components; each wizard step, dialog or large section is its own component that takes the hook's state (`components/students/bulk-upload/`, `components/admission/invoice-queue/`, `lib/sports/`). `max-lines` (800) warns; the service-role client (`@/lib/supabase/admin`) is an ESLint error inside `components/`, `lib/hooks/` and `lib/stores/`; `no-explicit-any` is an error in the paths listed in `eslint.config.mjs` (add a path once it is clean).
- **Health**: `npm run health` for the scorecard; plan and reports in `docs/codebase-health/`.

## Ignore
Root `patch_*.js`, `current_diff.patch`, `routine-forge-pro.html`, `scratch/` are one-off artifacts, not app code.
