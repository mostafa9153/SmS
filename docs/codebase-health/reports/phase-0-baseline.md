# Phase 0 — Baseline (partial)

Date: 2026-10-28 · Branch: `refactor/codebase-health` @ 81d4cef

## Measured
| Metric | Value |
|---|---|
| Source files (app + components + lib + proxy) | 429 |
| Total LOC | 159,248 |
| Files > 500 lines | 96 |
| Files > 1000 lines | 39 |
| `any` occurrences | 776 |
| `eslint-disable` comments | 51 |
| `console.log` | 0 |
| API route files | 93 |
| Files importing `supabase/admin` (service role) | 69 |

## Pending (blocked: machine out of memory — commit limit ~100 MB free, `vmmem` holds 3 GB)
- `tsc --noEmit` error count
- ESLint errors / warnings
- jscpd duplication %
- knip unused files/exports/deps
- madge circular imports
- `npm audit`
- `next build`

## 🔴 Critical security findings (fix in Phase 1)
`proxy.ts` API route-এ redirect করে না; নিচের route-গুলোতে কোনো auth check নেই:

| Route | Methods | DB client | Risk |
|---|---|---|---|
| `app/api/sports/events/route.ts` | GET POST PUT **DELETE** | service role (RLS bypass) | ইন্টারনেটের যে কেউ event তৈরি/মুছতে পারে |
| `app/api/sports/athletes/route.ts` | GET POST | service role | anonymous write |
| `app/api/sports/registrations/route.ts` | GET POST **DELETE** | service role | anonymous write/delete |
| `app/api/sports/results/route.ts` | POST | service role | anonymous write |
| `app/api/routine/subjects-order/route.ts` | GET POST | service role | anonymous write |
| `app/api/routine/generate/route.ts` | POST | — (solver proxy) | heavy CPU job anonymous ভাবে চালানো যায় (DoS) |
| `app/api/routine/diagnose/route.ts` | POST | — (solver proxy) | একই |
| `app/api/students/[id]/attendance/route.ts` | GET | cookie client (RLS) | RLS policy-র উপর নির্ভর — verify দরকার |

Intentionally public (ঠিক আছে, তবু rate-limit review): `certificates/verify`, `invoices/verify`।

## Hotspots (last 90 days commits × size)
| File | Commits | Notes |
|---|---|---|
| `components/layout/sidebar.tsx` | 43 | |
| `components/routine/routine-subjects-tab.tsx` | 26 | 2,158 lines |
| `lib/supabase/db-routine.ts` | 25 | 1,817 lines |
| `app/(dashboard)/ems/page.tsx` | 25 | 3,800 lines — largest file |
| `lib/supabase/db-students.ts` | 22 | |
| `lib/types.ts` | 21 | |
| `components/routine/routine-teachers-tab.tsx` | 20 | 1,828 lines |
| `app/(dashboard)/generate/invoice/page.tsx` | 19 | 2,506 lines |
