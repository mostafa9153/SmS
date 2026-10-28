# Phase 2 — Foundation

Date: 2026-10-28 · Branch: `refactor/codebase-health`

## Scorecard (`npm run health`)
| Area | Phase 1 | Phase 2 | Change |
|---|---|---|---|
| **Overall score** | **4.8 / 10** | **5.5 / 10** | **+15%** (Phase 0 থেকে **+90%**) |
| Duplication | 8.38% | **7.58%** | −9.5% |
| Total LOC | 159,806 | **157,623** | −2,183 lines |
| Source files | 431 | 421 | −10 |
| Circular imports | 2 | **0** | −100% |
| Unused packages | 5 | **0** | −100% |
| Unused files (knip) | 19 | 8* | −58% |
| npm vulns (total / high) | 7 / 2 | 6 / 1 | high −50% |
| Native `<select>` (unstyled dropdowns) | 35 | 14 | −60% |
| Tests | 26 | 26 | — |
| Type errors · build · API auth | 0 · pass · 0 unguarded | same | — |

\* বাকি ৮টা: root `patch_*.js` (৬টা, Phase 4-এ আপনার confirm নিয়ে মুছব), `public/sw.js` (string দিয়ে register হয় — false positive), একটা restore script।

## What changed
1. **Service-role client locked to server** — `lib/supabase/admin.ts` এখন `server-only` import করে (client bundle-এ ঢুকলে build fail করবে) এবং production-এ key না থাকলে চুপচাপ anon key-এ না গিয়ে স্পষ্ট error দেয়।
2. **Import cycles 0** — ২৪টা file এখন `useSchoolProfile` সরাসরি hook module থেকে নেয়; `StaffProfile` type আলাদা `staff-types.ts`-এ।
3. **zod 4** — high advisory বন্ধ; `z.record` key schema, `ZodError.issues`, form-এর input/output type ঠিক করা।
4. **Dead code removed** — ১১টা unreachable file (২,২৩৩ লাইন): পুরনো edit dialogs, mobile bottom bar, progress/separator, routine server actions, ৩টা EMS print view। ৫টা অব্যবহৃত package (`qrcode`, `cmdk`, `dotenv`, …)।
5. **One dropdown style** — staff create/edit form, staff filter, blank-pad-এর ১৫টা ব্রাউজার-default `<select>` এখন app-এর `CustomSelect`।

## Verified
`tsc` 0 · tests 26/26 · `next build` pass after every commit · madge: no cycles.
⚠️ Browser-এ login করে দেখা হয়নি: staff create/edit form-এর dropdown, staff filter bar, blank-pad toolbar।

## Deferred to Phase 3 (module-by-module, with visual check)
| Item | Count | Why deferred |
|---|---|---|
| Native `<select>` with dynamic options | 14 | বেশিরভাগ table/toolbar-এ ছোট (h-6/h-7) — `CustomSelect`-এ `size="sm"` variant লাগবে, module ধরে visual check দরকার |
| shadcn `ui/select` vs `CustomSelect` | 34 vs 42 files | দুই dropdown system; module ধরে `CustomSelect`-এ আনা |
| `window.confirm` → shared confirm dialog | 22 | প্রতিটা handler async করতে হবে — module-এর সাথে |
| Raw `fetch` in client (109) → shared `apiFetch` + error → notification bell | 109 | Notification bell requirement-এর সাথে একসাথে করা হবে |
