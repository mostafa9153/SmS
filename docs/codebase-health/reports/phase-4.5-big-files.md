# Phase 4.5 — big lib/ and Python files (group E)

## Layout (originals are barrels: `export * from …`, no importer changed)
| File (lines) | New modules |
|---|---|
| `lib/utils/marksheet-calc.ts` (1,207) | `lib/utils/marksheet/` types, grading, default-subjects, sample, build, promotion |
| `lib/reports/classic-strength-report.ts` (1,261) | `lib/reports/classic-strength/` types, compute, excel, word, csv |
| `lib/utils/excel/fields.ts` (1,283) | `lib/utils/excel/field-tables/` types, core, people, academic (fields.ts composes `TARGET_FIELDS` in the same order) |
| `lib/supabase/db-academic-session.ts` (1,016) | `lib/supabase/academic-session/` types, secondary, higher-secondary |
| `lib/supabase/db-students.ts` (1,244) | `lib/supabase/students/` mappers, queries, mutations, old-students |
| `lib/supabase/db-bulk-upload.ts` (1,238) | `lib/supabase/bulk-upload/` students, results, batches |
| `lib/supabase/db-routine.ts` (1,836) | `lib/supabase/routine/` local-state, state, structure, teachers-assignments, history, groups |
| `python-backend/main.py` (1,338) | `routine_models`, `routine_plan`, `routine_phase`, `routine_diagnostics`, `routine_schedule`; `main.py` keeps the app, CORS and the two routes |

Largest new module: `marksheet/promotion.ts` (669 lines, one 600-line function that was moved, not rewritten).

## Behaviour edits
None. Three mechanical edits outside pure moves: the two mid-file imports of `db-students.ts` were hoisted to the top; `./` imports in `db-bulk-upload.ts` became `@/lib/supabase/…`; `DEFAULT_CLASS_IX_SUBJECTS` got its own module and `_day_name` moved into `routine_models.py`, both to avoid import cycles.

## Verified
- Whitespace-insensitive line comparison original vs. new modules (imports/comments excluded): 0 missing, 0 extra for every file.
- `tsc`, ESLint (no new warnings), 145 vitest tests, `madge` (0 cycles), `verify.mjs --build` 0 fail.
- New tests: fingerprint of `TARGET_FIELDS` (91 entries, SHA-1 of the JSON), unique keys.
- Python: `test_engine.py` and `test_groups.py` output identical; `test_solver.py` produces one of the two outputs the original also produces (OR-Tools multi-worker variation, confirmed by running the original 6 times).

## Not verified
Live DB calls through the split modules, the solver on real data, `scripts/test-routine-solver.ts` (needs the server).
