# Codebase Health Upgrade — Master Plan

Branch: `refactor/codebase-health` · Started: 2026-10-28 · Owner: Mostafa (approve), Claude (execute)

## Mission
School Management System-কে industry-grade codebase-এ নেওয়া: concise, efficient, secure, consistent — **কোনো user-facing feature বা behaviour change ছাড়া**। Internal structure যত খুশি বদলাতে পারে।

## Non-negotiable rules
1. **Feature parity**: প্রতিটা screen, API response shape, print layout, DB data আগের মতো থাকবে। Bug fix ব্যতিক্রম — প্রতিটা report-এ আলাদা করে লেখা হবে।
2. **Production DB-তে কিছু লেখা হবে না।** Migration file লেখা যাবে, apply হবে user-এর অনুমতিতে।
3. **ছোট commit**, প্রতিটা commit build-able। কোনো commit push হবে না অনুমতি ছাড়া।
4. প্রতিটা phase শেষে **verify gate** পাস না করলে পরের phase শুরু হবে না।
5. প্রতিটা phase শেষে **report** (`docs/codebase-health/reports/phase-N.md`) — before/after metrics, % change, কী বদলাল, ঝুঁকি।

## Metrics (health scorecard)
| Metric | Tool | Target |
|---|---|---|
| Type errors | `tsc --noEmit` | 0 |
| Lint errors / warnings | `eslint` | 0 / ↓ ৮০% |
| `any` usage | eslint `no-explicit-any` count | ↓ ৯০% |
| Duplicated lines % | `jscpd` (min 50 tokens) | < 3% |
| Unused files / exports / deps | `knip` | 0 |
| Circular imports | `madge --circular` | 0 |
| Files > 500 lines | line count | ↓ ৭০% |
| Total LOC (app+components+lib) | line count | ↓ (concise) |
| API routes without auth check | custom grep audit | 0 |
| Client-side `admin.ts` import | eslint rule | 0 |
| Vulnerable deps (high/critical) | `npm audit` | 0 |
| Build | `next build` | pass |
| Test coverage of critical logic | vitest | promotion, routine helpers, id gen, parsers covered |

Score = প্রতিটা metric-কে 0–10 normalise করে গড়। Phase 0 baseline, প্রতিটা phase-এ আপডেট।

## Phases

### Phase 0 — Baseline & Safety Net
- Metrics মাপা (উপরের সব)।
- Hotspot analysis: `git log` churn × file size।
- **Vitest** setup + characterization test: promotion class ladder, Roman numeral, school-id generator, excel-parser, routine TS helpers।
- **Playwright** smoke: login page render, main dashboard route গুলো 200/redirect (auth ছাড়া চলে এমন অংশ)। Auth-dependent flow পরে test account সহ।
- Guardrail script: `npm run health` → সব metric এক কমান্ডে।
- Gate: tests green, build pass।

### Phase 1 — Security & Auth
- `proxy.ts` + `lib/supabase/middleware.ts` review।
- প্রতিটা `app/api/**/route.ts`: auth + role check আছে কিনা, input validation (zod), error leak।
- `lib/supabase/admin.ts` (service role) — শুধু server-এ, শুধু যেখানে দরকার।
- Shared `withAuth(handler, roles)` wrapper + `apiOk/apiError` helper → সব route এক pattern-এ।
- RLS: migrations পড়ে policy gap লিস্ট (Supabase MCP auth হলে advisors)।
- Gate: auth-less route = 0, build pass, smoke pass।

### Phase 2 — Foundation (shared layer)
- `components/ui` audit; duplicate primitive merge (select/dropdown, dialog, table, form field, date picker, page header, empty/loading state, print layout)।
- `lib/utils`, `lib/types`, `lib/constants`, `lib/validations`: duplicate helper merge, single source of truth (class list, Roman numerals, sections, roles)।
- Data fetching: shared query keys + fetch helper (`apiFetch`), shared mutation toast pattern।
- Gate: jscpd ↓, build, tests।

### Phase 3 — Modules (vertical slices, প্রতিটা আলাদা sub-report)
| # | Module | Scope |
|---|---|---|
| 3.0 | Sports (pilot) | page, components/sports, lib/sports, api/sports |
| 3.1 | Students & Admission | students/*, admission*, bulk-upload, excel-parser |
| 3.2 | Academic | academic-session, promotion, attendance, results, marksheet, tabulation |
| 3.3 | Staff & Teacher | employees, teacher-management, teacher, teacher portal, EMS |
| 3.4 | Routine | components/routine, db-routine, lib/routine, python-backend |
| 3.5 | Finance & Documents | invoice, generate/*, certificate, id-card, reports |
| 3.6 | Settings & Admin | settings, admin-hub, school-details, backup, push, cron, dashboard, profile |

প্রতি module-এ: বড় file ভাঙা (page → container + sections + hooks), Phase 2 primitive-এ migrate, db query dedupe, N+1/over-fetch fix, dead code delete, bug fix।

### Phase 4 — Hardening & Guardrails
- Root-এর one-off artifact (`patch_*.js`, `current_diff.patch`, `scratch/`) সরানো (user confirm)।
- knip clean, unused deps remove, `npm audit` fix।
- ESLint guardrails: `max-lines`, `no-restricted-imports` (admin.ts client-এ), `no-explicit-any` → error।
- CI: GitHub Actions (tsc, lint, test, build, jscpd threshold)।
- `CLAUDE.md`-তে coding standards — কোন primitive কোথায়, API pattern, file size limit।
- Final scorecard report।

## Verify gate (প্রতি phase)
1. `npx tsc --noEmit` — 0 নতুন error
2. `npm run lint` — 0 নতুন error
3. `npm test` — green
4. `npm run build` — pass
5. Browser-এ affected route manual check
6. Metrics re-run → report

## Risks
| Risk | Mitigation |
|---|---|
| Test নেই → silent behaviour change | Phase 0 characterization test, ছোট commit, browser check |
| Print layout regress | print component-এ হাত দেওয়ার আগে screenshot baseline |
| Production DB | কোনো write নয়; migration শুধু file |
| Machine memory কম (8GB) | heavy tool একটা একটা করে চালানো |
| Python solver behaviour | `python-backend/test_solver.py` আগে-পরে চালানো |

## Status
| Phase | Status |
|---|---|
| 0 | ✅ Done (2.9 → 3.2) |
| 1 | 🟡 Next |
| 1–4 | ⏳ |
