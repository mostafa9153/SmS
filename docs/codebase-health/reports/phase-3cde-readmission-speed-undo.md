# Phase 3c · 3d · 3e — Re-admission state, Speed, Undo (user requirements ⭐)

Date: 2026-10-28 · Branch: `refactor/codebase-health` · Score 5.6 → **5.7 / 10** · Tests 38 → **45**

## 3c — Re-admission state bug ✅
**Root cause (৩টা):**
1. সব admission form একই localStorage key (`sms_admission_apply_draft`) ব্যবহার করত → এক ছাত্রের তথ্য অন্য ছাত্রের form-এ, এমনকি new admission-এ চলে আসত।
2. Re-admission review-এ `initialData` থাকলে draft restore হত না → refresh দিলে edit হারিয়ে যেত।
3. Wizard state কোনো মেয়াদ ছাড়াই থাকত → page ছেড়ে পরে (এমনকি কয়েকদিন পর) ফিরলে চুপচাপ পুরনো ছাত্রকে খুলত।

**Fix:**
| আচরণ | এখন |
|---|---|
| কাজের মাঝে refresh | ঠিক যেখানে ছিলেন সেখানে ফেরে — step, ছাত্র, review-এর edit সব |
| Page ছেড়ে পরে ফেরা | উপরে banner: "Unfinished re-admission: <নাম>" → **Continue** / **Start new** (চুপচাপ পুরনো ছাত্র খোলে না) |
| অন্য ছাত্র বাছা | প্রতিটা ছাত্রের draft আলাদা (`readmission:<id>`), মিশে যায় না |
| মেয়াদ | Wizard ১২ ঘণ্টা, form draft ২৪ ঘণ্টা; পুরনো shared key স্বয়ংক্রিয় মুছে যায় |
| শেষ / Reset | draft পরিষ্কার |

Reload বনাম নতুন visit আলাদা করা হয় `sessionStorage` flag দিয়ে (reload-এ থাকে, অন্য page-এ গেলে মুছে যায়)।

## 3d — Speed + loading animation ✅ (আংশিক — নিচে সীমা)
| পরিবর্তন | প্রভাব |
|---|---|
| Middleware ও প্রতিটা API-র login যাচাই `getUser()` → `getClaims()` | Supabase-এ **asymmetric JWT signing key** চালু থাকলে প্রতিটা page/API-তে Auth server-এ যাওয়া-আসা বাদ (সাধারণত ১০০–৩০০ms/request)। পুরনো HS256 key থাকলে আগের মতোই কাজ করে — কোনো ক্ষতি নেই |
| ExcelJS (~৯০০ KB) শুধু routine export করার সময় load | Routine viewer tab হালকা |
| QR scanner (jsQR) শুধু খুললে load | `/generate` page client JS **৮১৭ → ৬৮৩ KB (−১৬%)** |
| `app/(dashboard)/loading.tsx` | ৭১টা page-এর মধ্যে আগে মাত্র ৪টায় loading screen ছিল — এখন **সব page-এ** click করার সাথে সাথে shimmer skeleton (dark mode-এ ঠিকমতো) |

**⚠️ সবচেয়ে বড় লাভ পেতে আপনার একটা কাজ:** Supabase Dashboard → Project Settings → JWT Keys → "Migrate to JWT signing keys" (asymmetric)। এটা না করলে `getClaims()` আগের মতোই network call করবে।

**সীমা:** Login করে আসল page-load সময় মাপা যায়নি (test account নেই)। বাকি ধীরগতির বড় কারণ — ১০৯টা raw `fetch` (cache নেই, প্রতিবার নতুন করে আনে) — module-by-module phase-এ `apiFetch` + TanStack Query cache-এ আনা হবে।

## 3e — Undo system ✅ (infrastructure + প্রথম ৩টা কাজ)
**Research → সিদ্ধান্ত:**
| Pattern | কেন নয় / কেন হ্যাঁ |
|---|---|
| Soft delete (`deleted_at`) সব table-এ | ❌ কয়েকশো query-তে filter লাগবে, unique index বদলাতে হবে — ঝুঁকিপূর্ণ |
| DB trigger audit | ❌ একটা user action-কে একসাথে ধরে না, service-role bulk কাজও ধরে ফেলে |
| **Server-side action journal** (before-image + restore steps) | ✅ বর্তমান table-এ schema পরিবর্তন লাগে না, একটা কাজ = একটা undo, child table সহ |

**কীভাবে কাজ করে:** কাজের আগে সংশ্লিষ্ট সব row-এর snapshot → `undoable_actions`-এ জমা → response-এ `undoId` → screen-এ ১০ সেকেন্ডের **Undo** button। Undo শুধু যিনি কাজটা করেছেন বা Admin পারবেন, একবারই, মেয়াদের মধ্যে। কাজের পরে কেউ আবার record বদলালে undo সেটা মুছে দেয় না — জানিয়ে দেয়।

**এখন undo করা যায়:**
| কাজ | মেয়াদ | যা ফেরে |
|---|---|---|
| ছাত্রের profile edit | ২৪ ঘণ্টা | আগের সব তথ্য |
| ছাত্র delete | ৭২ ঘণ্টা | ছাত্র + academic history + result + marks + attendance + sports (৮টা table) |
| Admission application delete | ৭২ ঘণ্টা | পুরো application |

আগে থেকে আছে: promotion undo, bulk-upload rollback, backup restore।

**ভবিষ্যতের জন্য:** `CLAUDE.md`-এ নিয়ম যোগ — প্রতিটা নতুন edit/delete feature-এ `snapshotRows()` + `recordUndo()` + `toastWithUndo()` বাধ্যতামূলক; যা undo করা অসম্ভব (push, বাইরের system) তাতে আগে confirm।

## Bonus bug fixed
**২১টা file `sonner` থেকে toast দেখাত, কিন্তু app-এ কোথাও `<Toaster />` বসানো ছিল না** → admission apply-এর "সফলভাবে জমা হয়েছে", বিভিন্ন error message — কোনোটাই কেউ কখনো দেখেননি। এখন mounted।

## ⚠️ একটা সতর্কতা
Undo commit করার সময় `app/(dashboard)/students/[id]/edit/page.tsx`-এ **আমার নয় এমন একটা পরিবর্তন** disk-এ ছিল (page-এর `FormSection`/`FormField` সরিয়ে অস্তিত্বহীন `components/forms/form-layout` import) — সেটা commit-এ ঢুকে type error দিচ্ছিল। আলাদা commit-এ শুধু ওই অংশ ফিরিয়ে দিয়েছি, undo পরিবর্তন রেখেছি। অন্য কোনো session/tool যদি shared form-layout বানাচ্ছিল, সেটা এই branch-এ নেই।

## ⚠️ আপনার কাজ
1. Supabase SQL Editor: `supabase/migrations/20261028_undoable_actions.sql` (আগের দুটো না চালালে সেগুলোও)।
2. Supabase JWT signing keys migrate (speed)।
3. Login করে দেখুন: re-admission-এ refresh / back-forth, ছাত্র edit → Undo, ছাত্র delete → Undo।

Sources (undo research): [OneUptime — Soft deletes in PostgreSQL](https://oneuptime.com/blog/post/2026-01-21-postgresql-soft-deletes/markdown) · [pulse.support — Database auditing](https://pulse.support/kb/database-auditing) · [Soft deletes vs journal tables](https://levelup.gitconnected.com/soft-deletes-vs-journal-tables-in-postgresql-why-i-chose-journaling-and-how-i-automated-it-74fb3c9857d7) · [Supabase — Postgres auditing in 150 lines of SQL](https://supabase.com/blog/audit) · [pgMemento docs](https://pgxn.org/dist/pgmemento/doc/pgmemento-docs-0.7.4/Home.html)
