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

### ⭐ User rule — Bug & wiring audit: report first, fix after confirm (added 2026-10-28, via forked session)
প্রতিটা phase / module-এ **আগে report**, user যেগুলো confirm করবেন **শুধু সেগুলো fix**। এই নিয়ম আগের "যা খুশি করো" অনুমতির উপরে প্রাধান্য পাবে।

Report-এ থাকবে:
1. **Bugs** — UI (কাজ না করা button, ভুল state, layout/print সমস্যা, error handling, dead link) এবং code/logic (ভুল হিসাব, race condition, unhandled error, data bug)।
2. **UI আছে, backend নেই** — button/form/page এমন API call করে যার route নেই, ভুল shape ফেরত দেয়, বা handler stub/no-op/fake (শুধু local state, `setTimeout` দিয়ে ভুয়া save, TODO)।
3. **Backend আছে, UI নেই** — API route, `db-*` function, server action যাদের UI-তে কোনো caller নেই (knip + `fetch("/api/...")` grep বনাম `app/api` route list)।

Method: route map বানানো — app/components/lib-এর প্রতিটা fetch/useQuery URL + method বনাম প্রতিটা `app/api/**/route.ts`-এর exported method; দুই দিকেই diff; তারপর module ধরে হাতে যাচাই।
প্রতিটা finding: `file:line` · কী ভুল · user-এর উপর প্রভাব · প্রস্তাবিত fix · ঝুঁকি — table আকারে। User confirm না করা পর্যন্ত code বদলানো হবে না।

### ⭐ User requirement — Shared component consolidation (added 2026-10-28, via forked session)
User-এর কথা: শুধু dropdown নয় — **যেকোনো বারবার লেখা UI একটাই shared component হবে**। ভালো করার জন্য বিদ্যমান code ভেঙে নতুন করে লেখা অনুমোদিত; UI এক রকম (uniform) হয়ে যাওয়া গ্রহণযোগ্য।

Inventory (current tree, files with their own copy):
| Pattern | Copies | Target shared component |
|---|---|---|
| Page header (h1 + actions) | 74 | `PageHeader` |
| Raw `<table>` | 39 | `DataTable` (TanStack Table, already a dep) |
| Loading spinner (`Loader2 animate-spin`) | 38 | `Spinner` / route `loading.tsx` skeletons |
| Search input with icon | 35 | `SearchInput` |
| Dropdown — 3 systems: CustomSelect 45 · shadcn `ui/select` 34 · native `<select>` 14 | 93 | one `AppSelect` with size variants (`sm` for toolbars/table cells) |
| Empty state ("No … found" / Inbox) | 34 | `EmptyState` |
| Print page + toolbar (`window.print` 29, `@media print` 23) | ~29 | `PrintShell` |
| Stat card (big number + label) | 27 | `StatCard` |
| Pagination | 19 | `Pagination` |
| Confirm (`window.confirm` 8 + hand-made dialogs) | 8+ | `ConfirmDialog` / `useConfirm()` |
| Raw `await fetch` | 44 | `apiFetch` (errors → notification bell) |
| Local `FormSection`/`FormGrid`/`FormField` (students edit page, student-add-edit-form, employee-edit-form) | 3 | `components/forms/form-layout.tsx` (`text-base` mobile, `sm:text-sm` — avoids iOS zoom) |
| `CustomTooltip` in dashboard charts | 3 | shared chart tooltip |
| `FilterSelect` (results-client, student-filters) | 2 | `AppSelect` |

Module-level duplicates (merge into one implementation):
- `students/[id]/edit/page.tsx` ↔ `student-add-edit-form.tsx` (~1,000 identical lines) → edit page reuses the form
- 4 certificate pages (pass / transfer / character / kanyashree) + their printable views
- Staff create / edit dialog + employee edit form
- 2 photo capture components
- 2 login pages (`/login`, `/teacher/login`)
- Admission printable V–IX ↔ XI

Execution: **Phase 3f** — build the shared components first (each with a test or visual check), then migrate module by module inside Phase 3.0–3.6; every module report shows copies removed and lines saved. Rule added to `CLAUDE.md` conventions once the components exist.

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

### ⭐ User requirement — Notification bell must really work (added 2026-10-28)
User চান bell button সব সমস্যা ও গুরুত্বপূর্ণ ঘটনা জানাবে, আর যা যা করার কথা সব ঠিকমতো করবে।

এখনকার অবস্থা (audit):
- `lib/stores/notification-store.tsx` — শুধু React state; page reload বা অন্য device-এ সব হারিয়ে যায়।
- Producer মাত্র ১টা page: `students/bulk-upload` (৬টা call)। বাকি কোনো error/success bell-এ আসে না।
- Server-side ঘটনা (backup fail, cron, permission expiry, teacher task/chat, push) bell-এ আসে না।
- `activity` / `system` tab আছে, কিন্তু system tab প্রায় সবসময় ফাঁকা।

Target (Phase 3.6-এর সাথে, বা আগে চাইলে আলাদা):
1. Persisted notifications table (`notifications`: user_id/role scope, type, severity, title, body, link, read_at) + migration + RLS।
2. `/api/notifications` (list, mark read, mark all, clear) — `requireRole`।
3. Server helper `notify()` — backup/cron/permission-expiry/admission/promotion/bulk ops-এ ব্যবহার।
4. Client: TanStack Query + poll/realtime; global API error → bell-এ "system" entry (TanStack `QueryCache`/`MutationCache` `onError`)।
5. Existing web-push (`lib/push-notifications.ts`) একই `notify()` থেকে fan-out।
6. Bell: unread badge, deep link, severity color, empty state।

### ⭐ User requirement — Public admission link must be hacker-proof (added 2026-10-28)
User চান admission-এর link public করলে বাইরের কেউ সেটা দিয়ে কোনো ক্ষতি করতে পারবে না।

এখনকার অবস্থা (audit):
- কোনো public admission page নেই। "Online" form (`/admission/new/apply`) dashboard-এর ভেতরে, login লাগে।
- `POST /api/admission/applications` service-role client দিয়ে লেখে; Phase 1b-এ admission permission ছাড়া বন্ধ করা হয়েছে। তাই এই endpoint public করা **যাবে না** — public form-এর জন্য আলাদা, সীমিত endpoint লাগবে।
- Middleware শুধু `/login`, `/auth` বাদ দেয়; public route বানাতে explicit allowlist লাগবে।

Design (public form বানানোর সময় সব বাধ্যতামূলক):
1. **আলাদা route** `/apply/[token]` (dashboard-এর বাইরে) + `POST /api/public/admission` — শুধু *insert*, কোনো read/update/delete নয়। Response-এ শুধু application no।
2. **Link token**: settings থেকে on/off, মেয়াদ, rotate করা যায়; বন্ধ বা ভুল token → 404।
3. **Bot/spam**: Cloudflare Turnstile CAPTCHA (server-side verify) + honeypot field + per-IP ও per-mobile rate limit (e.g. ৫/ঘণ্টা) + duplicate check।
4. **Strict validation**: আলাদা zod schema (`.strict()`), প্রতিটা field-এ length limit, enum whitelist, server-side class/session যাচাই; client-এর পাঠানো status/fee/roll/admin field কখনো গ্রহণ নয়।
5. **File upload** (photo/documents): শুধু JPEG/PNG/PDF, size cap, magic-byte check, random নাম, private bucket + signed URL; public bucket নয়।
6. **DB isolation**: `status = 'pending_online'`, staff review না করা পর্যন্ত student table-এ যাবে না; সম্ভব হলে service role নয় — insert-only RPC/RLS policy।
7. **No data leakage**: duplicate/error message-এ অন্য ছাত্রের তথ্য দেখাবে না; generic error।
8. **Headers**: CSP, `X-Frame-Options`, body size limit।
9. **Audit + alert**: প্রতিটা submission log; rate-limit/CAPTCHA fail → notification bell-এ "system" alert।
10. **Test**: abuse test (oversized body, extra fields, script injection, flood) চালিয়ে report।

### ⭐ User requirement — Re-admission state bug (added 2026-10-28) → Phase 3c
Re-admission-এ একজন ছাত্র select করে back গিয়ে আবার ঢুকলে আগের ছাত্রই দেখায় এবং ঠিকমতো কাজ করে না। উদ্দেশ্য ছিল: কাজের মাঝে হঠাৎ refresh হলে progress যেন না হারায়। Root cause খুঁজে ঠিক করা — draft শুধু একই কাজ চলাকালীন টিকে থাকবে, শেষ/বাতিল/অন্য ছাত্র বাছলে পরিষ্কার হবে, আর restore হলে data server থেকে আবার যাচাই হবে।

### ⭐ User requirement — Speed + loading animation (added 2026-10-28) → Phase 3d
"Page খুলতে অনেক সময় লাগে।" আগে মাপা (route-wise JS size, server response time, waterfall fetch), তারপর ঠিক করা: route-level `loading.tsx` skeleton, বড় client bundle ভাঙা (`next/dynamic`), duplicate/serial fetch কমানো, cache (TanStack staleTime / server `unstable_cache`), DB index। একটাই সুন্দর shared loading animation (top bar + skeleton) সব page-এ।

### ⭐ User requirement — Undo after any action (added 2026-10-28) → Phase 3e + standard for all future work
যেকোনো কাজের পর undo করা যাবে। আগে research করে সঠিক pattern ঠিক করা, তারপর shared infrastructure, তারপর বিদ্যমান কাজগুলোতে লাগানো, এবং `CLAUDE.md`-তে নিয়ম যাতে ভবিষ্যতের প্রতিটা নতুন feature-এ undo থাকে।
- ছোট edit/delete: toast-এ "Undo" (কয়েক সেকেন্ড) — soft delete / আগের মান ফিরিয়ে দেওয়া।
- বড় batch কাজ (promotion, bulk upload, wipeout, session transition): server-side action log + restore (promotion undo আর bulk-upload rollback ইতিমধ্যে আছে — একই pattern-এ আনা)।
- যা undo করা অসম্ভব (push পাঠানো, বাইরের system) — আগে confirm।

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
| 1 | ✅ Done (2.9 → 4.8) + 1b teacher permissions |
| 2 | ✅ Done (4.8 → 5.5) |
| 3 | 🟡 In progress — 3a bell ✅ · 3b public link ✅ · 3c re-admission ✅ · 3d speed ✅ (partial) · 3e undo ✅ (infra + 3 actions) · audit 1 ✅ fixed W1–W6 (5.8) · verification gate ✅ · 3f part 1 ✅ shared components (5.9) |
| 1–4 | ⏳ |
