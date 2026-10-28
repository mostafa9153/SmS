# Approach

## ✅ Decided
- **Phase-wise, section-by-section কাজ** — প্রতি section: Report → user approve → Fix → Verify → Commit। একসাথে পুরো codebase না। (2026-10-28)
- **Golden rule: কোনো feature/behaviour change হবে না** — শুধু internal code বদলাবে (refactor, dedupe, bug fix)। (2026-10-28)
- **লক্ষ্য: industry-level code quality**, concise ও efficient। (2026-10-28)
- **Install নিয়ম** — CLI tool (`npx knip`, `jscpd`, `dependency-cruiser`) চালানোর আগে অনুমতি নেব; claude.ai plugin user নিজে card থেকে enable করবেন। (2026-10-28)

## ❓ Open questions
- Safety net: refactor-এর আগে test (Playwright smoke + Vitest) যোগ হবে কিনা?
- "Health score" কোন metric দিয়ে মাপা হবে?
- Phase order চূড়ান্ত করা।

### Proposed structure (এখনও fixed না)
Horizontal আগে (সব module যা ব্যবহার করে), তারপর vertical module slice।

- **Phase 0 — Baseline + safety net**: metrics মাপা, test যোগ।
- **Phase 1 — Security & auth**: `proxy.ts`, `lib/supabase/middleware.ts`, `auth-helper.ts`, ১৮টা `app/api/*` group, `admin.ts` কোথায় ব্যবহার, RLS।
- **Phase 2 — Foundation**: `components/ui` + `components/layout` + `lib/utils|types|validations|constants|hooks`; shared primitive বানানো (Select/Combobox, DataTable, ConfirmDialog, FormField, PageHeader, PrintLayout)।
- **Phase 3 — Modules** (প্রতিটা = page + components + api + lib/db একসাথে):
  - 3.0 Pilot: Sports (~1.5k লাইন, আলাদা) — পদ্ধতি যাচাই
  - 3.1 Students & Admission (students, active/pending/old, admission, bulk-upload, `excel-parser.ts` 2.9k)
  - 3.2 Academic (academic-session, promotion, attendance, results, marksheet, tabulation)
  - 3.3 Staff & Teacher (employees, teacher-management, teacher, teacher portal, EMS — `ems/page.tsx` 3.8k)
  - 3.4 Routine (components/routine 14k, `db-routine.ts`, `lib/routine`, Python solver)
  - 3.5 Finance & Documents (invoice, generate/*, certificate, id-card, reports)
  - 3.6 Settings & Admin (settings, admin-hub, school-details, backup, push, cron, dashboard, profile)
- **Phase 4 — Final pass**: dead code, unused deps, strict lint/tsc, bundle size, docs।

### প্রতি section-এর loop
Audit (tools + agent) → `audit/<section>.md` report → user approve → ছোট ছোট commit-এ fix → verify (tsc, lint, build, test, browser check) → before/after metrics।

### Senior-engineer practices (proposed, এখনও fixed না)
1. Branch + PR workflow, `main`-এ সরাসরি না; GitHub Actions CI (tsc, lint, build, test)
2. Characterization test + print/PDF-এর visual regression (Playwright screenshot)
3. আলাদা staging Supabase project; migration-এর আগে backup
4. Hotspot priority: git churn × complexity
5. Strangler pattern: নতুন shared component → এক জায়গায় migrate → বাকিগুলো
6. Guardrails: ESLint rules (max-lines, `admin.ts` client-এ import নিষেধ), jscpd/knip CI threshold, pre-commit hook
7. Coding standards CLAUDE.md-তে — ভবিষ্যৎ vibe coding যেন আবার duplicate না বানায়
8. Sentry error baseline আগে/পরে তুলনা
9. Stable, কম-ছোঁয়া code-এ হাত না দেওয়া (80/20)

## ❌ Rejected
- পাঁচটা review skill একসাথে পুরো repo-তে চালানো — diff-based skill, overlap, অতিরিক্ত token খরচ।
- skipper / ultrapowers-dev plugin — অপ্রয়োজনীয় hook ও context খরচ।

## ⚠️ Conflicts / Risks
- **Test নেই** → "feature change হবে না" গ্যারান্টি দেওয়া এখন অসম্ভব; tsc/build শুধু type ধরে, behaviour না।
- "15/10" মাপার মতো লক্ষ্য না — measurable metric দরকার।

## 💰 Costs
- CLI tools: free।
- AI audit + fix: প্রতি phase-এ ৩–৫ agent; মোট খরচ বেশি, phase-wise হওয়ায় নিয়ন্ত্রণযোগ্য।
