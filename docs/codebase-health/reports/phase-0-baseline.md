# Phase 0 — Baseline

Date: 2026-10-28 · Branch: `refactor/codebase-health` @ 81d4cef

## Health scorecard — **4.5 / 10**
| Area | Value | Score /10 |
|---|---|---|
| Type errors (`tsc`) | 0 | 10 |
| Build (`next build`) | ✅ pass (128s) | 10 |
| ESLint | 23 errors · 1,712 warnings | 3 |
| `any` usage (eslint) | 922 | 2 |
| Duplication (jscpd, ≥50 tokens) | **8.38%** — 11,144 lines, 497 clones | 5.5 |
| Dead code (knip) | 19 files · 174 exports · 103 types · 5 deps | 3 |
| Circular imports (madge) | 2 | 8 |
| Files > 1000 lines | 39 (96 > 500) | 2 |
| Security | 7 unauthenticated write/compute routes · 3 critical + 11 high npm vulns | 1 |
| Tests | none | 0 |

Score = 10 টা area-র সরল গড়। প্রতিটা phase শেষে একই tool দিয়ে আবার মাপা হবে।

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

## Still to do in Phase 0
- Vitest + characterization tests (promotion ladder, Roman numerals, school-id generator, excel-parser, routine helpers)
- `npm run health` script (সব metric এক কমান্ডে)
