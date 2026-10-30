# Phase 0 — Baseline

Date: 2026-10-28 · Branch: `refactor/codebase-health` @ 81d4cef

## Health scorecard (`npm run health`) — **2.9 / 10 → 3.2 / 10** after Phase 0
| Area | Baseline | After Phase 0 | Score /10 |
|---|---|---|---|
| Type errors (`tsc`) | 0 | 0 | 10 |
| ESLint | 23 E · 1,712 W | same | 0 |
| `any` (eslint) | 922 | same | 0.8 |
| Duplication (jscpd ≥50 tokens) | **8.38%** · 11,144 lines · 497 clones | same | 5.5 |
| Dead code (knip) | 19 files · 266 exports/types · 5 deps | same | 0 |
| Circular imports | 2 | 2 | 8 |
| Files > 1000 lines | 39 (96 > 500) | same | 2.2 |
| npm vulns | crit 3 · high 11 | same | 0 |
| Tests | 0 | **20 tests · 27 snapshots** | 2 |
| Build | ✅ pass (128s) | not re-run (only dev deps/tests changed; tsc 0) | — |

Formula `scripts/health.mjs`-এ — প্রতিটা area 0–10, সরল গড়। একই কমান্ড প্রতিটা phase শেষে চলবে, তাই তুলনা সবসময় সমান মাপকাঠিতে।

## Phase 0 deliverables
- `npm test` — Vitest 5 + characterization tests (`tests/characterization/`): class ladder, promotion map, class sort/rank, age & Kanyashree category, Aadhaar, school ID build/parse, WBBSE grade, subject normalisation, marksheet totals, marks schemes, scholarship eligibility, document numbers, routine keys।
- `npm run health` — পুরো scorecard এক কমান্ডে (`--build` দিলে build-ও)।
- `@types/node` 20 → 22 (Node runtime 22-এর সাথে মিল; Vitest 5-এর peer)।

## Size
| Metric | Value |
|---|---|
| Source files (app + components + lib + proxy) | 429 |
| Total LOC | 159,248 |
| `eslint-disable` comments | 51 |

## ESLint breakdown
| Rule | Count |
|---|---|
| W `no-explicit-any` | 922 |
| W `no-unused-vars` | 530 |
| W `react-hooks/set-state-in-effect` | 156 |
| W `@next/next/no-img-element` | 47 |
| W `react-hooks/exhaustive-deps` | 42 |
| E `react-hooks/refs` | 10 |
| E `prefer-const` | 9 |
| E `react/no-unescaped-entities` | 2 |
| E `react-hooks/immutability`, `react-hooks/purity` | 1 + 1 |

## Top duplication (lines shared between pair)
| Lines | Files | Fix idea |
|---|---|---|
| 1,458 | `admission-form-v-ix-printable.tsx` ↔ `admission-form-xi-printable.tsx` | এক printable + class-band config |
| 853 / 760 / 471 / 429 | `generate/{pass-certificate, transfer-certificate, certificate, kanyashree}/page.tsx` | এক `CertificateGeneratorPage` + per-type config |
| 352 / 272 / 264 / 170 / 104 | `components/certificate/*-printable-view.tsx` | shared certificate layout primitives |
| 783 / 395 | `staff-create-dialog` ↔ `staff-edit-dialog` ↔ `employee-edit-form` | এক `StaffForm` (create/edit mode) |
| 761 | `admission/photo-capture-dialog` ↔ `students/photo-studio-modal` | এক photo capture component |
| 190 | `admit-student-dialog` ↔ `edit-application-dialog` | shared form sections |
| 126 | `app/login` ↔ `app/teacher/login` | shared `LoginForm` |
| 103 / 86 / 83 | `sports/print`, `attendance-register`, `tabulation` pages | shared print page shell |

## Dead code (knip)
- Unused files (sample): `edit-application-dialog.tsx`, `transfer-confirmation-dialog.tsx`, `staff-edit-dialog.tsx`, `mobile-bottom-bar.tsx`, `ui/progress.tsx`, `ui/separator.tsx`, `lib/constants/routine.ts`, `routine/actions.ts`, `ems-desk-slips-printable.tsx`, `ems-door-chart-printable.tsx`, `ems-print-suite-hub.tsx`
- Unused deps: `cmdk`, `dotenv`, `qrcode`, `@types/qrcode`
- প্রতিটা delete-এর আগে dynamic import / string reference দেখে verify করা হবে।

## Circular imports
1. `lib/utils/school-profile.ts` ↔ `lib/hooks/use-school-profile.ts`
2. `components/employees/staff-table.tsx` ↔ `staff-photo-preview-dialog.tsx`

## npm audit
low 1 · moderate 6 · high 11 · **critical 3** (`next`, `@sentry/nextjs`, `proxy-addr`). `xlsx` high — no upstream fix (SheetJS npm package abandoned; `exceljs` already a dependency → migrate)।

## 🔴 Critical security findings (Phase 1)
`proxy.ts` API route-এ redirect করে না; এই route-গুলোতে কোনো auth check নেই:

| Route | Methods | DB client | Risk |
|---|---|---|---|
| `app/api/sports/events/route.ts` | GET POST PUT **DELETE** | service role | anonymous create/delete |
| `app/api/sports/athletes/route.ts` | GET POST | service role | anonymous write |
| `app/api/sports/registrations/route.ts` | GET POST **DELETE** | service role | anonymous write/delete |
| `app/api/sports/results/route.ts` | POST | service role | anonymous write |
| `app/api/routine/subjects-order/route.ts` | GET POST | service role | anonymous write |
| `app/api/routine/generate/route.ts` | POST | solver proxy | anonymous heavy CPU (DoS) |
| `app/api/routine/diagnose/route.ts` | POST | solver proxy | same |
| `app/api/students/[id]/attendance/route.ts` | GET | cookie client (RLS) | RLS policy verify দরকার |

Intentionally public: `certificates/verify`, `invoices/verify` (QR verification)।

## Hotspots (last 90 days commits)
| File | Commits | Lines |
|---|---|---|
| `components/layout/sidebar.tsx` | 43 | |
| `components/routine/routine-subjects-tab.tsx` | 26 | 2,158 |
| `lib/supabase/db-routine.ts` | 25 | 1,817 |
| `app/(dashboard)/ems/page.tsx` | 25 | 3,800 |
| `lib/supabase/db-students.ts` | 22 | |
| `lib/types.ts` | 21 | |
| `components/routine/routine-teachers-tab.tsx` | 20 | 1,828 |
| `app/(dashboard)/generate/invoice/page.tsx` | 19 | 2,506 |

## Phase 0 status: ✅ complete
