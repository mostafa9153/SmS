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
- No JS test framework. Ad-hoc checks: `scripts/test-routine-solver.ts`, `python-backend/test_solver.py`.

## Architecture
- `proxy.ts` (Next 16 replacement for `middleware.ts`) → `lib/supabase/middleware.ts`: session refresh + role-based redirects (`user_roles` table, 60s in-memory role cache). API routes bypass redirects and must do their own auth via `lib/supabase/auth-helper.ts` (roles: Admin / Staff / Teacher / Guest).
- Two portals: admin/staff UI in `app/(dashboard)/*`; teacher portal under `app/teacher` (login at `/teacher/login`).
- Data layer: `lib/supabase/db-*.ts` (and `lib/<module>/db-*.ts`, e.g. `lib/sports`) hold all Supabase queries. API routes in `app/api/<module>/route.ts` are thin wrappers returning `{ success, data | error }`. Client components fetch these routes via TanStack Query.
- Supabase clients: `server.ts` (cookie/RLS), `client.ts` (browser), `admin.ts` (service role, bypasses RLS — server only).
- Routine generation: `app/api/routine/generate` proxies to the Python solver at `ROUTINE_SOLVER_URL` (default `http://127.0.0.1:8000`); TS helpers in `lib/routine/`.
- Sports module (`lib/sports/db-sports.ts`) falls back to in-memory stores when tables are empty/unavailable.
- Classes use Roman numerals (V–X secondary, XI–XII higher secondary); promotion logic in `lib/supabase/db-academic-session.ts`.
- DB schema changes: add a dated SQL file in `supabase/migrations/` (`YYYYMMDD_description.sql`).
- Vercel cron: `/api/backup/cron` monthly (`vercel.json`).

## Ignore
Root `patch_*.js`, `current_diff.patch`, `routine-forge-pro.html`, `scratch/` are one-off artifacts, not app code.
