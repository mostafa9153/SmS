# Phase 3b — Public Admission Link (user requirement ⭐)

Date: 2026-10-28 · Branch: `refactor/codebase-health` · Tests 30 → **38** (+8 abuse tests)

## কী তৈরি হলো
- **Public page** `/apply/<token>` — dashboard-এর বাইরে, login লাগে না। Staff-এর ব্যবহৃত একই admission form (আলাদা copy নয়)।
- **Public API** `POST /api/public/admission/<token>` — শুধু নতুন *pending* আবেদন তৈরি করতে পারে। কোনো data পড়া, বদলানো বা মোছা যায় না।
- **Settings → Admission Link** (শুধু Admin): চালু/বন্ধ, মেয়াদ, "New link" (পুরনো link সাথে সাথে বাতিল), link copy, গত ২৪ ঘণ্টার পরিসংখ্যান (accepted, duplicate, invalid, captcha failed, rate limited, bot trap)।

## ১০টা security নিয়ম — অবস্থা
| # | নিয়ম | কীভাবে |
|---|---|---|
| 1 | শুধু insert, আলাদা endpoint | নতুন route; staff API (service role, সব field) public হয়নি |
| 2 | Token, on/off, expiry, rotate | ৩২-অক্ষরের random token, constant-time তুলনা; বন্ধ/মেয়াদোত্তীর্ণ/ভুল → একই 404; "New admission" বন্ধ করলে link-ও বন্ধ |
| 3 | Bot / spam | Cloudflare Turnstile (production-এ বাধ্যতামূলক, key না থাকলে link চালুই হবে না) · লুকানো honeypot field (bot-কে ভুয়া success দেয়) · প্রতি IP ৫/ঘণ্টা · প্রতি মোবাইল ৩/দিন · মোট ৩০০/ঘণ্টা |
| 4 | Strict validation | Staff form-এর একই zod schema, `.strict()` — অজানা field (status, feePaid, applicationNo, remarks, aiExtractedData…) পেলেই 400 · প্রতি field ≤ ১০০০ অক্ষর · class শুধু V–XII |
| 5 | File upload | Public form-এ upload নেই; `photo_url`, `scanned_image_url` server-এ null করা হয় |
| 6 | DB isolation | `status = pending`, fee 0/unpaid, roll null, বছর server-এর, remarks "Submitted via public admission link" — সব server জোর করে বসায়। Staff যাচাই না করা পর্যন্ত student table-এ যায় না |
| 7 | No data leakage | Response-এ শুধু application no, নাম, class। Duplicate হলে অন্য রেকর্ডের কিছুই দেখায় না |
| 8 | Headers / size | `/apply`-এ `Referrer-Policy: no-referrer` (token ফাঁস হয় না), `X-Frame-Options: DENY`, `frame-ancestors 'none'`, `noindex`, `no-store` · body ≤ ৬৪ KB (DB ছোঁয়ার আগেই 413) |
| 9 | Audit + alert | প্রতিটা চেষ্টা log হয় — IP ও মোবাইল **salted hash**, আসল মান কখনো সংরক্ষণ হয় না · প্রথমবার throttle বা flood হলে Admin-এর bell-এ warning · প্রতিটা সফল আবেদন Admin/Staff bell-এ |
| 10 | Abuse test | নিচে |

## Abuse tests (automated, `tests/unit/public-admission.test.ts`)
| আক্রমণ | ফল |
|---|---|
| ছোট / ভুল / বন্ধ / মেয়াদোত্তীর্ণ token, admissions off | 404 (সবগুলো একই উত্তর) |
| ৭০ KB body | 413, DB ছোঁয়নি |
| Honeypot পূরণ করা bot | ভুয়া 200, কিছু save হয়নি |
| Flood (একই IP) | 429; Admin alert একবারই, দ্বিতীয়বার নয় |
| `status: admitted`, `feePaid: true`, `applicationNo`, `aiExtractedData`, `remarks` ঢোকানো | 400, কিছু save হয়নি |
| ১৫০০ অক্ষরের নাম, `presentClass: "Admin"`, ভুল মোবাইল, ভাঙা JSON | 400 |
| Duplicate আবেদন | 409, অন্য রেকর্ডের id ফাঁস হয় না |
| `<script>` নামে | Plain text হিসেবে save, React escape করে দেখায়; server-forced মানগুলো যাচাই; log-এ আসল IP/মোবাইল নেই |

Live smoke (production build): `/apply/...` login ছাড়া খোলে এবং ৫টা security header আসে · link বন্ধ → "This admission link is not available." · ৮০ KB POST → 413 · `/api/admission/public-link` session ছাড়া 401 · `/settings/admission-link` → login-এ redirect।

## Refactor on the way
- Admission form schema → `lib/validations/admission-form-schema.ts` (client form + server একই নিয়ম)।
- Application row তৈরি → `lib/admission/application-row.ts`; staff route আর public route একই function। Staff apply page-এর payload তৈরি → `lib/admission/application-payload.ts`।

## ⚠️ চালু করার আগে আপনার ৩টা কাজ
1. Supabase SQL Editor-এ চালান: `supabase/migrations/20261028_public_admission_link.sql` (আর আগেরটা `20261028_app_notifications.sql` যদি না চালিয়ে থাকেন)।
2. Cloudflare Turnstile key (বিনামূল্যে): dash.cloudflare.com → Turnstile → Add site → আপনার domain। Vercel env-এ বসান: `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY` (`.env.example`-এ যোগ করা আছে)। এগুলো ছাড়া production-এ link চালু হবে না — ইচ্ছাকৃত।
3. Settings → Admission Link → চালু করুন → link copy করে শেয়ার করুন।

## Limits / না করা
- Login করে settings card আর আসল জমা দেওয়া browser-এ চালিয়ে দেখা হয়নি (test account নেই, migration DB-তে নেই)।
- Turnstile-এর আসল verify শুধু production key দিয়েই পরীক্ষা হবে; dev-এ key না থাকলে check বাদ যায়।
- Rate limit DB-ভিত্তিক (Vercel serverless-এ memory-ভিত্তিক কাজ করে না) — প্রতি জমায় ৩টা ছোট count query।
