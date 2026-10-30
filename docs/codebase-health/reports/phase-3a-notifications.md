# Phase 3a — Notification Bell (user requirement ⭐)

Date: 2026-10-28 · Branch: `refactor/codebase-health` · Score: 5.5 → **5.6 / 10** · Tests 26 → **30**

## আগে vs এখন
| | আগে | এখন |
|---|---|---|
| সংরক্ষণ | শুধু browser memory — reload দিলেই মুছে যেত | Database (`app_notifications`) — reload, অন্য device, অন্য browser-এ থাকে |
| কে notification পাঠায় | শুধু bulk-upload page (৬টা call) | ৯টা server event + সব API error + আগের bulk-upload |
| API error | bell-এ আসত না | যেকোনো data load / action fail → **System Alerts** (৩০ সেকেন্ডে একই error একবার; 401/403 বাদ) |
| Read / Clear | এক tab-এ, reload-এ হারায় | প্রতি user-এর জন্য server-এ সংরক্ষিত |
| Role-wide alert | — | একবার store হয়, Admin/Staff সবাই দেখে; প্রত্যেকের read state আলাদা |
| Push | আলাদা system | গুরুতর event-এ (`push: true`) web push-ও যায় |
| Bell UI | ২ রঙ | severity অনুযায়ী ৪ রঙ (info/success/warning/error), click করলে সংশ্লিষ্ট page খোলে, unread system alert থাকলে সরাসরি System tab-এ খোলে |
| Refresh | — | প্রতি ৬০ সেকেন্ড + window focus-এ |

## Server events wired
| Event | কে পাবে | Severity |
|---|---|---|
| Scheduled backup সফল / ব্যর্থ / Drive connected না থাকায় skip | Admin | success / error (+push) / warning |
| Backup file বা Google Drive থেকে restore — সফল / ব্যর্থ | Admin | warning (+push) / error |
| Academic session transition — সফল / ব্যর্থ | Admin+Staff / Admin | success / error |
| Promotion — সফল / আংশিক ব্যর্থ / ব্যর্থ | Admin+Staff / Admin | success / warning / error |
| Promotion undo | Admin+Staff | warning |
| Data wipeout — সফল / ব্যর্থ | Admin | warning (+push) / error |
| Teacher permission মেয়াদ শেষ (cron) | Admin | info |
| নতুন admission application | Admin+Staff | info |

নতুন event যোগ করা এক লাইনে: `await notify({ roles: ["Admin"], title, message, link })` (`lib/notifications/notify.ts`) — কখনো throw করে না, তাই মূল কাজ ভাঙে না।

## Bug fixed on the way
`lib/push-notifications.ts`: নির্দিষ্ট role-এ push পাঠালে আর সেই role-এ কেউ না থাকলে filter খালি থেকে **সব device-এ broadcast** হয়ে যেত। এখন targeted send-এ কেউ না মিললে কিছুই পাঠায় না।

## Also
- Empty-state-এর filler লেখা সরানো (AGENTS.md zero-filler rule)।
- Login page-এ bell আর API call করে না।
- নতুন `apiFetch()` (`lib/api/client.ts`) — পরের module-গুলোতে raw `fetch`-এর জায়গায় এটা বসবে, তাহলে সব error নিজে থেকেই bell-এ আসবে।

## ⚠️ আপনাকে একটা কাজ করতে হবে
Database-এ নতুন table এখনও তৈরি হয়নি — আমি production DB-তে লিখি না। Supabase Dashboard → SQL Editor-এ চালান:

`supabase/migrations/20261028_app_notifications.sql`

না চালানো পর্যন্ত bell আগের মতোই কাজ করবে (এই tab-এ local), কিছু ভাঙবে না — API table না পেলে খালি তালিকা দেয়।

## Verified
`tsc` 0 · tests **30/30** (+4: notify recipients/category/truncation/never-throws, apiFetch errors) · `next build` pass · prod server: `/api/notifications` 401 without session, login page renders with no bell request.
⚠️ Login করে bell চালিয়ে দেখা হয়নি (test account নেই, table এখনো DB-তে নেই)।
