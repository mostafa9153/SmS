# Phase 1 — Security & Auth

Date: 2026-10-28 · Branch: `refactor/codebase-health`

## Scorecard (`npm run health`)
| Area | Phase 0 | Phase 1 | Change |
|---|---|---|---|
| **API auth** (unguarded routes, public verify excluded) | 10 routes | **0** | **−100%** |
| **npm critical vulns** | 3 | **0** | **−100%** |
| npm high vulns | 11 | 2 (`xlsx`, `zod`) | −82% |
| npm total vulns | 21 | 7 | −67% |
| Tests | 20 | 22 | +10% |
| Type errors | 0 | 0 | — |
| Build | pass | pass | — |
| **Overall score** | **2.9 / 10** | **4.8 / 10** | **+66%** |

Phase 0 score API-auth area সহ পুনরায় হিসাব করা (10 area)। Lint, duplication, dead code, file size — এই phase-এ ইচ্ছাকৃতভাবে হাত দেওয়া হয়নি (Phase 2–4)।

## Fixed
### 1. Anonymous access to service-role routes (critical)
নতুন shared gate `lib/api/guard.ts` → `requireRole(roles?)` (+ `hasCronSecret`)। লাগানো হলো:

| Route | Methods | আগে | এখন |
|---|---|---|---|
| `sports/events` | GET POST PUT DELETE | open, service role | signed-in only |
| `sports/athletes` | GET POST | open | signed-in |
| `sports/registrations` | GET POST DELETE | open | signed-in |
| `sports/results` | POST | open | signed-in |
| `routine/subjects-order` | GET POST | open, service role | signed-in |
| `routine/generate`, `routine/diagnose` | POST | open (solver DoS) | signed-in |
| `students/[id]/attendance` | GET | open (RLS only) | signed-in |
| `admission/applications` | POST | open, service role | signed-in |
| `cron/expire-permissions` | GET POST | open, service role | `CRON_SECRET` bearer **or** Admin |

Role set = Admin/Staff/Teacher — অন্য ৮১টা route যে নিয়ম মানে, ঠিক সেটাই; তাই signed-in user-দের কোনো feature বদলায়নি।

### 2. Google Drive backup hijack (critical)
`admin/backup/auth/callback` কোনো session check করত না — যে কেউ নিজের Google `code` দিয়ে callback hit করলে **স্কুলের মাসিক backup (সব student data) তার Drive-এ যেত**। এখন signed-in Admin না হলে `?error=Unauthorized`-এ redirect।

### 3. PostgREST filter injection / search bug
User input সরাসরি `.or()` filter string-এ বসত। কমা/বন্ধনী দিলে filter ভেঙে যেত বা নতুন condition যোগ হত (e.g. `"Rahman, Abdul"` search error দিত)। নতুন `lib/supabase/filters.ts` (`pgQuote`, `pgContains`) — ১০টা জায়গায় লাগানো: student search ×2, certificate search, invoice search, admission search, duplicate check ×2, next-roll, application lookup, transfer-to-active।

### 4. Dependencies
| Package | From | To | Why |
|---|---|---|---|
| `next`, `eslint-config-next` | 16.3.1 | 16.4.3 | critical RCE advisory |
| `@sentry/nextjs` | 10.74 | 10.77.1 | critical middleware bypass |
| transitive (`proxy-addr`, `undici`, `sharp`, …) | — | `npm audit fix` | critical/high |

## Verified
- `tsc` 0 errors · `vitest` 22/22 · `next build` pass
- Dev server smoke (no session): সব gated route → **401**; backup callback → `/settings/backup?error=Unauthorized`; `certificates/verify` public থাকল (400 on missing param)।
- ⚠️ Signed-in flow browser-এ চালানো হয়নি (test account নেই) — gate logic অন্য ৮১টা route-এর সাথে হুবহু এক, তবু একবার sports, routine generate, admission apply, backup connect হাতে চালিয়ে দেখা উচিত।

## Open — আপনার সিদ্ধান্ত লাগবে
| # | Finding | Risk | Recommendation |
|---|---|---|---|
| 1 | Teacher login দিয়ে admin dashboard-এর ২৮টা write route চলে (admit student, settle invoice, push/send to all, certificates, results, delete photo…) | privilege escalation | role matrix ঠিক করে `requireRole(["Admin","Staff"])` — **behaviour change**, তাই অনুমতি ছাড়া করিনি |
| 2 | `admin/users`: কোনো `user_roles` row না থাকলে যে কেউ প্রথম Admin হতে পারে | fresh install-এ takeover | first-admin setup env flag দিয়ে বন্ধ করা |
| 3 | `zod` 3 high (oversized input memory) | low (form validation) | Phase 2-তে zod 4 (৫টা file) |
| 4 | `xlsx` high, no upstream fix | parsing untrusted Excel | Phase 3.1-এ `exceljs`-এ migrate (already dependency) |
| 5 | `createAdminClient` service key না পেলে চুপচাপ anon key-এ fallback করে | silent misconfig | fail fast + `server-only` guard (Phase 2) |
| 6 | backup callback redirect host `x-forwarded-host` থেকে নেয় | open redirect (low) | `NEXT_PUBLIC_SITE_URL` ব্যবহার |
| 7 | RLS policy audit | unknown | Supabase MCP authorize করলে advisors চালানো যাবে |
