# Phase 4.6 — dependencies, dead code, cleanup (group F)

## Done
- `uuid` pinned to 11.1.1 through `overrides` (it only comes from `exceljs`); exceljs write/read round trip, 145 tests and `next build` pass. Advisories 7 → 5.
- 144 exports used only inside their own file lost the `export` keyword (88 files; shadcn `components/ui`, route/page files and `scripts/` skipped). Five exports that `scratch/` or a type re-export still import were put back.
- Removed `patch_*.js` (6), `current_diff.patch`, `routine-forge-pro.html` and their entries in `knip.json`, `eslint.config.mjs`, `CLAUDE.md`. `scratch/` is git-ignored and untracked, so it was left alone.

## Deferred
- **`xlsx` → `exceljs`**: `exceljs` cannot read legacy `.xls` files, and `parseExcelFile` relies on `xlsx`'s formatted-text conversion (`raw: false`) for dates and numbers. Government portal exports are often `.xls`. No test can show these are matched, so `xlsx` stays; its two advisories (prototype pollution, ReDoS) have no upstream fix and only affect files staff upload themselves.
- **37 symbols unused everywhere** (about 30 are dead helpers or type aliases): an automated deletion broke `lib/data/*` and `lib/ems/*`, so it was reverted; they need file-by-file removal.

## Scorecard (7.6 → 8.0)
Dead exports 253 → 97, circular imports 1 → 0, advisories 7 → 5, no file over 1,000 lines, 145 tests, `verify.mjs --build` 0 fail / 0 warn.

## Not verified
Signed-in browser flows, live Supabase writes and undo round trips, the solver on real data.
