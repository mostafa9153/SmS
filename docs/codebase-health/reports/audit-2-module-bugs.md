# Audit 2: module bugs and logic risks (report only, nothing fixed)

Date: 2026-10-29 · Branch `refactor/codebase-health` · Method: repo-wide sweeps (auth, unchecked writes, dates and time zones, hard-coded years, browser-only data, uniqueness), then reading the code behind each hit.

Nothing in this file has been changed in code. Each item needs your **yes / no / later**. IDs are for replying ("A-SEC-1 yes, A-DATA-2 later").

## Severity summary
| Sev | ID | One line |
|---|---|---|
| 🔴 High | A-SEC-1 | Drive backup OAuth callback does not check `state`. One crafted link clicked by a signed-in admin sends all school backups to an attacker's Google Drive |
| 🔴 High | A-SEC-2 | First-admin bootstrap fails *open*: if the `user_roles` count query errors, a non-admin passes the Admin check (`admin/users` GET and POST) |
| 🔴 High | A-API-1 | `POST /api/admission/re-admission/batch`: any signed-in non-Guest (any teacher) can batch re-admit through the service-role client |
| 🟠 Med-High | A-DATA-1 | Re-admission admit `upsert`s the invoice on `invoice_number`. Typing a receipt number that is already used **overwrites another student's invoice** without any message |
| 🟠 Med-High | A-DATA-2 | EMS exam routines, seat allocations and start time live **only in one browser's localStorage**. Other devices and staff never see them, and clearing the browser loses them |
| 🟠 Med-High | A-ERR-1 | 104 Supabase writes never read `error`. A failed step in a multi-step flow (admit, promotion undo, status action, routine save, data wipe) reports success and leaves half-written data |
| 🟠 Medium | A-API-2 | `GET /api/admission/tracker`: any teacher can read every admission record |
| 🟠 Medium | A-API-3 | `POST /api/teachers/attendance`: any signed-in user can write attendance for any class |
| 🟠 Medium | A-SEC-3 | 6 routes check only `auth.getUser()` (no role). If **Supabase email sign-up is enabled** on the project, anyone can create an account and read student results, metadata, dashboard stats and attendance analytics, and post in teacher chat |
| 🟠 Medium | A-TIME-1 | Server code formats time without `timeZone`. On Vercel (UTC), invoice `issue_time` and the "reverted on" dates are 5h30m behind IST |
| 🟡 Medium | A-TIME-2 | 27 places use `new Date().toISOString().slice(0,10)` as "today". This is the UTC date, so it is still yesterday in IST between 00:00 and 05:30. Affects attendance date, admission and TC dates, certificate and invoice dates |
| 🟡 Medium | A-YEAR-1 | 72 hard-coded years ("2026", "2025", "2027" dropdowns, `|| "2026"` defaults, `APP-2026-` numbers). On 1 Jan 2027, defaults and filters silently point at the wrong session |
| 🟡 Medium | A-DATA-3 | Roll numbers: `next-roll` takes max+1 with no unique constraint on (year, class, section, roll). Two staff admitting at the same time can give the same roll |
| 🟡 Low-Med | A-CRON-1 | `expire-permissions` cron falls back to an Admin session when `CRON_SECRET` is missing. Vercel cron sends no session, so it gets 401 every night and **temporary teacher permissions never expire** (only visible in Vercel logs) |
| 🟢 Low | A-DATA-4 | Data wipeout deletes table by table without a transaction or error checks. A mid-way failure leaves a partial wipe while counts say otherwise |

---

## Details and recommended fixes

### A-SEC-1: OAuth `state` not verified (backup)
`app/api/admin/backup/auth/callback/route.ts` checks that the caller is an Admin, which is good. But `code` can come from *anyone's* Google consent. An attacker gets their own `code` and sends the admin the link `/api/admin/backup/auth/callback?code=…`. The admin's cookie passes `verifyAdminUser`, and the school Drive binding switches to the attacker's account. Monthly backups (all student PII) then upload there.
- **Fix:** generate a random nonce in `/backup/auth`, store it in an httpOnly cookie, pass it as `state`, and compare it in the callback.
- Also build `redirectUri` from a configured `APP_URL`, not the `Host` header.

### A-SEC-2: bootstrap fail-open
`if (count && count > 0) return 403`. When the count query errors, `count` is `null`, so there is no 403 and a non-admin lists users (GET) or **creates an Admin** (POST).
- **Fix:** deny on error (`if (error || count !== 0) return 403`).
- Better: drop the runtime bootstrap and create the first admin with a one-off SQL or CLI step.

### A-API-1 / 2 / 3: routes without a role check
Each carries a `// guard: custom — … awaiting decision` note.
- 1 and 2: `requireStaff("admission")`.
- 3: `requireStaff` plus "caller teaches this class" (the `teacherClassGuard` pattern already in `lib/api/guard.ts`).

### A-SEC-3: routes that accept any authenticated user
- `results/student/[id]`
- `students/metadata`
- `dashboard/stats`
- `attendance/analytics`
- `teachers/chat` (GET and POST: any user can read and post)
- `teachers/notifications` (scoped to the caller, fine)

**First check (yours, in the Supabase dashboard):** Auth → Providers → Email → "Allow new users to sign up" should be **off**. If it is off, the risk is low. Either way, `requireRole(["Admin","Staff","Teacher"])` on these routes makes the code safe whatever the setting.

### A-DATA-1: invoice overwrite
Re-admission admit (and `applications/[id]/admit`) call `upsert(..., { onConflict: "invoice_number" })`. This is meant to fill a pre-printed blank slip. But nothing checks that the existing row is blank (`is_blank = true`) or belongs to the same student.
- **Fix:** if the row exists and is not blank, reject with "Receipt X already used for <name>". Read the upsert `error` too.

### A-DATA-2: EMS data only in the browser
- Writes from `app/(dashboard)/ems/page.tsx` and reads from `ems-admit-card-printable.tsx` go only to localStorage. Keys:
  - `sms_ems_exam_routines`
  - `sms_ems_saved_allocations_v1`
  - `sms_ems_exam_start_time`
  - `sms_ems_section_orders`
- The `useState` initialiser reads localStorage, so server HTML and client differ (hydration mismatch).
- **Fix:** a table (`ems_exam_routines`, keyed by session and exam) plus an API route with undo; keep localStorage only as a draft cache.

Same pattern, lower risk (also stored in the DB):
- `sms_class_management`
- `sms_marks_distribution_schemes`
- `sms_promotion_pass_policy`

These are caches of DB settings and can go stale on other devices until a reload.

### A-ERR-1: unchecked writes (104)
The heaviest files:

| File | Unchecked writes |
|---|---|
| `lib/supabase/db-routine.ts` | 15 |
| `app/api/admin/data-wipeout/route.ts` | 14 |
| `app/api/teachers/tasks/route.ts` | 7 |
| `lib/supabase/db-bulk-upload.ts` | 6 |
| `app/api/admission/re-admission/admit/route.ts` | 6 |
| `lib/sports/db-sports.ts` | 5 |
| `app/api/students/status-action/route.ts` | 5 |

The full list comes from `scratchpad/unchecked-writes.js` (re-runnable; I can add it to `npm run health`).
- **Fix pattern:** `const { error } = await …; if (error) throw error;` inside the existing try/catch, so the route returns 500 and the bell gets the error.
- Multi-step flows such as admit and promotion undo should become a Postgres function (one transaction).

### A-TIME-1 / A-TIME-2: dates and time zones
- **Fix:** a single `lib/utils/date.ts` with:
  - `todayIST()`, which returns `YYYY-MM-DD` using `Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" })`
  - `nowTimeIST()`
- Replace the 27 "today" sites and the 3 server `toLocale*` calls with these.

### A-YEAR-1: hard-coded years
- **Fix:** one source, `useAcademicSession()` (reads `admission_settings.current_academic_year`, which already exists), plus `sessionOptions(current)` for dropdowns (current−1 … current+1). Then replace the 72 literals.

### A-DATA-3: duplicate rolls
- **Fix:** migration with a unique index on `students(academic_year, present_class, present_section, present_roll)` where `status = 'Continuing'`. Check existing duplicates first; I can write the query.
- Then make next-roll plus admit retry on conflict.

### A-CRON-1: expire-permissions
- **Fix (config, yours):** set `CRON_SECRET` in Vercel. Vercel then sends `Authorization: Bearer <secret>` automatically.
- **Code:** have the cron call `notifyAdminsOfError` when it is refused, so a missing secret shows in the bell instead of only in the logs.

### A-DATA-4: data wipeout
- **Fix:** one Postgres function (transaction), or at least an error check after each delete.

---

## Not covered by this audit
- Python solver (`python-backend/`).
- RLS policies in the DB: I can't see the live DB, only the migration files.
- Browser-only behaviour (login required).

## Suggested order if you approve everything
1. A-SEC-1
2. A-SEC-2
3. A-API-1/2/3, then A-SEC-3 (all small, code only)
4. A-DATA-1
5. A-CRON-1: your env setting, plus a small code change
6. A-TIME-1/2: one helper and a mechanical swap
7. A-ERR-1, by module
8. A-YEAR-1
9. A-DATA-2: needs a migration
10. A-DATA-3: needs a migration and a duplicate check
11. A-DATA-4
