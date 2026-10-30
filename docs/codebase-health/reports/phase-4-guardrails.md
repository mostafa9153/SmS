# Phase 4 — Guardrails and scorecard (first pass)

## Done

| Item | Result |
|---|---|
| ESLint `max-lines` | warns above 800 lines (blank lines and comments skipped) |
| Service-role client in UI | `@/lib/supabase/admin` is an **error** inside `components/`, `lib/hooks/`, `lib/stores/`. No current violations. |
| `no-explicit-any` ratchet | error in `lib/undo`, `lib/academic`, `lib/employees`, `lib/api`, `lib/notifications`, `lib/supabase/write.ts`, `components/sports` (all currently clean). Add a path once it is clean; the global rule stays a warning because 861 existing uses remain. |
| `CLAUDE.md` | stale lines fixed (there is a test framework; sports no longer falls back to memory); new "Structure" convention: page ≈ wiring, state in a `use-*` hook, one component per step/section, the three guardrails above |
| CI | already runs types, lint errors on the whole repo, unit tests, and the convention gate on pull requests |

## Scorecard (`npm run health`, 2026-10-29)

| Metric | Value |
|---|---|
| Score | 6.5 / 10 (types 10, circular 10, tests 10, API auth 10, vulns 9, duplication 7.5, big files 3.4, lint 3.7, `any` 1.4, dead code 0) |
| Tests | 133 passing (128 at the start of this phase) |
| Type errors / lint errors | 0 / 0 |
| Lint warnings, `any` count | 1,615 / 861 |
| Files over 500 / over 1,000 lines | 91 / 33 |
| Duplication | 6.0 % |
| Unguarded API routes | 0 |

The dead-code figure (756 files) looks inflated; the scorecard script has not been checked against `.claude/worktrees` and other non-app folders. Treat that row as unverified.

## Not done, and why

- **Removing root artifacts** (`patch_*.js`, `current_diff.patch`, `routine-forge-pro.html`, `scratch/`): deletion needs your OK. The lint config already ignores them.
- **Dependency vulnerabilities** (`npm audit --omit=dev`: 3, down to the ones with no safe fix): `xlsx` (high, no fixed version on npm — the usual route is the vendor's own tarball, a supply-chain choice for you) and `uuid` through `exceljs` (moderate, the fix is a breaking `exceljs@3.4.0`). `npm audit fix` was not run.
- **CI build step and duplication threshold**: a `next build` in CI needs the Supabase environment variables, and I cannot run CI here to confirm placeholder values are enough; a wrong guess would turn every PR red. Add it once you can see a run.
- **Flipping `no-explicit-any` to error globally** or enforcing `max-lines` as an error: 861 `any` and 33 files over 1,000 lines would fail the build today.
- The 33 files over 1,000 lines are the main remaining size debt: `ems/page.tsx` (3,772), `generate/invoice/page.tsx` (2,499), `routine-viewer-tab.tsx` (2,473), `teacher/page.tsx` (2,304), `invoice-tracker-modal.tsx` (2,289), `admission-application-form.tsx` (2,188), `routine-subjects-tab.tsx` (2,140), `results-client.tsx` (1,906) and others.

## Verified

`eslint` on the guarded paths and on `components/`, `lib/hooks/`, `lib/stores/`: 0 errors. Full gate run with the other changes of this session.
