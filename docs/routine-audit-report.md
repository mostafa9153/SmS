# Routine Maker Audit Report

তারিখ: ২০২৬-১০-২৫ · পরিধি: `python-backend/main.py`, `lib/routine/*`, `lib/supabase/db-routine.ts`, `components/routine/*`, `app/api/routine/*`, `docs` ছাড়া বাকি সব read-only।

## Fix অবস্থা (২০২৬-১০-২৫ এর পরের আপডেট)

| Finding | অবস্থা |
|---|---|
| F1 Geography afternoon | ঠিক: DB তে `any` করা হয়েছে |
| F2 consec=1 | **তোমার সিদ্ধান্ত বাকি।** engine এখন ৩ দিয়ে Phase 1 এ পাস করে (tiffin 2/1 সহ, ০ violation) |
| F3 preflight অন্ধ | ঠিক: solver এর `/diagnose` এ counting proof, Validate এ যুক্ত |
| F4 Phase 2 সব একসাথে | ঠিক: ৪ ধাপের ladder, প্রতি ধাপে শুধু দরকারি rule, ভাঙা rule এর পূর্ণ তালিকা UI তে |
| F5 INFEASIBLE বনাম timeout | ঠিক: প্রতি ধাপের status দেখায় |
| F6 CT শনাক্তকরণ | ঠিক |
| F7, F8 assignments schema, `isLab` | কোড ঠিক (fallback সহ)। **Migration `20261026_routine_assignments_parts.sql` Supabase এ চালাতে হবে** |
| F9 error গিলে ফেলা | ঠিক (assignment, delete, settings) |
| F10, F11 নাম/dedupe/demand কপি | ঠিক: `normalizeSubjectName`, `routine-domain.ts`, demand এক সূত্রে |
| F12 settings একাধিক row | কোড ঠিক (আর নতুন row বানায় না)। পুরনো stale row মুছিনি |
| F13 `\|\| 3` | ঠিক |
| F14, F15 auto-assign নিঃশব্দ সিদ্ধান্ত | ঠিক: Validate এ সতর্কতা আসে |
| F16 non-deterministic | ঠিক: seed, 8 worker, সীমা ৬০ সেকেন্ড (`ROUTINE_SOLVER_TIME_LIMIT`) |
| F17 test | ঠিক: `npm run routine:test` (`test_engine.py` + `test_groups.py`); stale TS script মুছেছি |
| F18 মন্তব্য | ঠিক |
| F19 duplicate race | ঠিক: lock + migration এ unique index |
| F20 CORS | ঠিক। (`npm run routine:server` এখনো `0.0.0.0` তে চলে, auth নেই) |
| F21 daily max নিঃশব্দে বাড়ে | ঠিক: "adjustments" এ দেখায় |
| F23 preflight subject check | ঠিক: মিথ্যা error সরানো |
| D5 stale assignments | ঠিক: `assignmentsAreCurrent` |
| নতুন: Auto-Balance group ছাড়া চলত | ঠিক: verification tab এ `groups` পাঠানো (আগে group member সহ assignment DB তে সেভ হতো) |
| নতুন: tiffin কম load এ অসম্ভব | ঠিক: teacher প্রতি tiffin minimum নিজে কমে |
| F22 ফাঁকা period | বাকি (Unproven, এখন সব class ভর্তি) |
| F24 বিশাল ফাইল | বাকি |
| D7 localStorage | বাকি |

**পদ্ধতি:** আসল DB থেকে ঠিক সেই payload বানিয়েছি যা app solver এ পাঠায় (project এর নিজের `autoBuildRoutineAssignments` ও `buildSolverGroups` ব্যবহার করে)। তারপর Python solver এর একটা কপিতে constraint একটা একটা করে বন্ধ করে (bisect) দেখেছি। সব script scratchpad এ, repo তে কিছু বদলানো হয়নি।

**সীমাবদ্ধতা:** Browser এর `localStorage` আমি দেখতে পাইনি, তাই payload শুধু DB থেকে বানানো। তোমার হাতে বানানো routine আমি দেখিনি, তাই "হাতে বানালে মেলে" অংশটা অনুমান, সেটা নিচে আলাদা করে লিখেছি।

---

## ১. এক পাতার সারসংক্ষেপ

**Phase 1 কেন fail করে:** solver প্রমাণসহ বলছে `INFEASIBLE` (0.1 থেকে 7 সেকেন্ডে)। এর পেছনে **দুটো আলাদা, স্বাধীন, সত্যিকারের অসম্ভবতা** আছে। দুটোই অঙ্ক দিয়ে প্রমাণ করা গেছে। কোনোটাই solver এর bug নয়, বরং আপনি যে rule গুলো `hard` হিসেবে সেট করেছেন সেগুলো গণিতে মেলে না।

1. **Geography (XI ও XII Arts) এর `afternoon` time preference।** ROSY BEGUM এর ১২ টা afternoon period লাগে, কিন্তু দুই class এর দিনে ৬ period সীমা থাকায় afternoon এ মাত্র ১০ টা slot আছে (সোম–শুক্র, period 5-6)। **১২ > ১০।**
2. **`Max Consecutive Periods = 1`** (২৪ অক্টোবর রাত ১৯:২৪ এ সেভ হয়েছে)। এতে একজন teacher সপ্তাহে সর্বোচ্চ **২২ period** পড়াতে পারেন। কিন্তু SOUMITRA DAS (25), RIMA SANPUI (24), PRATIK KAYAL (24) এর load এর চেয়ে কম।

আরো একটা কাঠামোগত কারণ বিষয়টাকে নাজুক করেছে: **প্রতিটা class এর demand তার capacity এর সমান (zero slack)**। ১৩ টা section ই ১০০% ভর্তি। তাই যেকোনো একটা কঠিন rule সরাসরি infeasible করে দেয়।

**মূল দুর্বলতা:** TS preflight (`validatePreconditions`) এই দুটো সমস্যার কোনোটাই ধরে না। সে `isValid: true`, `0 errors`, `0 warnings` বলে। Solver নিঃশব্দে Phase 2 তে যায়, আর Phase 2 একসাথে সব rule শিথিল করে। কোন rule কে, কেন শিথিল করতে হলো, UI সেটা বলে না। এখান থেকেই তোমার "relax কেন করতে হবে" প্রশ্নের জন্ম।

**শীর্ষ ৫ সমস্যা**

| # | সমস্যা | Severity |
|---|---|---|
| 1 | Preflight, solver যা প্রমাণ করে infeasible বলে তা ধরে না (afternoon per-teacher, consecutive ক্ষমতা, tiffin) | Blocker |
| 2 | Phase 2 সব rule একসাথে ও অকারণে শিথিল করে, কারণ জানায় না, `INFEASIBLE` আর `timeout` আলাদা করে না | High |
| 3 | Class teacher শনাক্তকরণ ভাঙা: ১৩ জন CT এর প্রায় সবাই ভুল করে একাধিক section এর CT হিসেবে ধরা হয় | High |
| 4 | DB schema (`UNIQUE(class_id, subject_id)`) আর engine এর মডেল (একই subject এ একাধিক teacher/theory+lab) পরস্পরবিরোধী, আর `isLab` DB তে নেই | High |
| 5 | একই হিসাব (নাম normalise, dedupe, load, demand) ~৪০ জায়গায় কপি করা | High |

**স্বাস্থ্য স্কোর (১০ এর মধ্যে):** Engine 6 · UI 5 · Data 7 (duplicate মুছে ফেলার পর) · Code quality 4।

---

## ২. Phase 1 বনাম Phase 2 এর মূল কারণ

### ২.১ Reproduction

আসল data: ১৩ section, ২৪ teacher, ৫৬ subject, ১৮৩ assignment, ২ group, ৪৫৯ unit। Settings (DB তে সর্বশেষ row): ৭ period/দিন, শনি half-day (৪ period), tiffin period 4, `tchDailyMax=5`, `tchConsecMax=1`, `tchMinBefore=2`, `tchMinAfter=1`।

ফলাফল: Phase 1 `INFEASIBLE` → Phase 2 `FEASIBLE` (১৫ সেকেন্ডের সীমায় থেমেছে, optimal প্রমাণিত নয়), `relaxedConstraints = [Soft time preferences, Fatigue bounds relaxed, Min tiffin periods not met for some teachers]`।

### ২.২ Bisect (Phase 1, constraint একটা একটা বন্ধ করে)

| কী বন্ধ | ফল |
|---|---|
| কিছুই না | INFEASIBLE |
| শুধু timepref | INFEASIBLE |
| শুধু consec | INFEASIBLE |
| শুধু subjdaily / tchdaily / tiffin | INFEASIBLE |
| timepref + consec | INFEASIBLE |
| timepref + consec + subjdaily | FEASIBLE |
| সব বন্ধ | FEASIBLE |

`consec` এর মান 4 আর tiffin বন্ধ করলে ছবিটা সবচেয়ে পরিষ্কার হয়:

| কী বন্ধ (consec=4, tiffin 0/0) | ফল |
|---|---|
| কিছুই না | INFEASIBLE |
| **শুধু timepref** | **FEASIBLE** |
| শুধু subjdaily / tchdaily | INFEASIBLE |

**অর্থাৎ consec ঢিলে করলে একমাত্র বাধা হলো timepref।** এটাই একক binding constraint।

### ২.৩ প্রমাণ (গণনা)

**(ক) ROSY BEGUM, afternoon:** XI ও XII Arts এর Geography, দুটোতেই `afternoon`, ৬ p/wk করে (৪ single + ১ double)। Afternoon মানে period > 4। দুই class এর দৈনিক সীমা ৬, তাই afternoon এ শুধু period 5 ও 6, সোম–শুক্র = **১০ slot**। চাহিদা **১২**। **১২ > ১০, অসম্ভব।**

**(খ) `tchConsecMax=1`:** একজন teacher এর এক দিনে tiffin এর আগে (period 1-4) সর্বোচ্চ ২টা আর পরে (period 5-7) সর্বোচ্চ ২টা, মোট ৪। শনিবার (period 1-4) ২টা। সপ্তাহে সর্বোচ্চ `5×4 + 2 = 22`। কিন্তু ৩ জন teacher এর load ২২ এর বেশি। `consec=2` এ সীমা ২৮, `consec=3` এ ৩৩, তখন কোনো teacher সীমা ছাড়ায় না।

### ২.৪ শ্রেণীবিভাগ

| কারণ | ধরন |
|---|---|
| Geography afternoon ১২ > ১০ | **৩ (সত্যিকারের infeasible)** যদি rule টা `must` হয়। **১ (modeling)** যদি rule টা আসলে preference হয়, কারণ engine একে hard ধরছে |
| `consec=1` এ ৩ জন teacher ২২ এর বেশি | **৩ (সত্যিকারের infeasible)** |
| Preflight এগুলো ধরে না | **৪ (UI/engine mismatch)** |
| Phase 2 সবকিছু একসাথে ছাড়ে | **২ (engine design)** |

### ২.৫ "হাতে বানালে হয়" এর ব্যাখ্যা (Likely, প্রমাণিত নয়)

হাতে বানানো routine সম্ভবত ঠিক এই দুটো rule ভেঙেছে: Rosy এর Geography afternoon এ সব বসেনি, আর teacher রা পরপর period পড়াচ্ছেন। তোমার মাথায় ওগুলো "preference", কিন্তু engine এ `Phase 1` এ `hard`। তোমার routine একবার validator এ দিলে নিশ্চিত হবে (সুপারিশ ৮.৩ দেখো)।

---

## ৩. UI ↔ Engine mismatch matrix

| UI তে যা দেখা/সেট করা যায় | Engine এ আসলে যা হয় | সমস্যা | প্রমাণ |
|---|---|---|---|
| Max Daily Periods / Teacher | `max(tchDailyMax, load থেকে হিসাব করা মান)`, অর্থাৎ নিঃশব্দে বাড়ে। Phase 2 তে আরো +1 | UI এর সীমা "সীমা" নয় | `main.py:294-303` |
| Max Consecutive Periods | Tiffin এ block ভাগ করে window গোনে। Phase 2 তে +1 | মান ১ হলে teacher এর ক্ষমতা ২২ p/wk, কিন্তু UI কোনো সতর্কতা দেয় না | `main.py:313-336` |
| Min Periods Before/After Tiffin | Phase 1 এ hard (প্রতি teaching দিনে), Phase 2 তে penalty | Phase 2 তে ভাঙা হয়, UI কোন teacher কোন দিন সেটা শুধু warning string এ দেখায় | `main.py:343-369`, `752-778` |
| Subject Time Preference (morning/afternoon) | Phase 1 এ `hard` slot ফিল্টার, Phase 2 তে penalty | UI তে "Preference" (নরম শব্দ), engine এ শর্ত | `main.py:207-220`, `424-441` |
| Teacher `maxPeriods` | Solver এ কখনো ব্যবহৃত হয় না। শুধু TS preflight এ error | সঠিক হলেও দুই জায়গায় দুই অর্থ | `main.py:68` (শুধু field), `routineGenerator.ts:258` |
| Subject "Max N/Day" (Daily Policy) | Engine নিজে `auto_max_daily` দিয়ে বাড়ায় | UI তে "Max 1/Day" দেখা গেলেও engine ২ দেয় | `main.py:535-543` |
| Preflight subject-daily check | শুধু configured মান ধরে, engine এর auto-বাড়ানো ধরে না | Preflight false error দিতে পারে (এই data তে ঘটেনি, শুধু কোড পড়ে পাওয়া) | `routineGenerator.ts:317-336` |
| Class Teacher | নিচে ৪.২ দেখো | ভাঙা | `main.py:513-528` |
| Settings সেভ | `|| 3` / `|| 5` দিয়ে 0 বা খালি ঘর জোর করে ৩/৫ হয়ে যায় | ব্যবহারকারী 0 লিখতে পারে না | `routine-settings-tab.tsx:165,182` |

**"শুধু DB তে সেভ, কিন্তু solver এ যায় না" ধরনের মান:** `Teacher.maxPeriods` (উপরে), `sortOrder` (শুধু আদেশের জন্য, ঠিক আছে)।

---

## ৪. একই হিসাব একাধিক জায়গায় (Duplicated-computation register)

| হিসাব | কোথায় কোথায় | কপি মিলছে? |
|---|---|---|
| Subject নামের normalise (`replace(/\s*\(...\)/…)`) | `routine-teachers-tab` (10), `routine-helpers` (8), `routine-subjects-tab` (7), `routine-allotment-overview` (4), `db-routine` (3), `routine-auto-assign` (3), `routine-sync` (3), `routine-demand-allotment` (2), `routine-verification` (1)। মোট ≈ ৪০ | না। কোনোটা `(…)` কাটে, কোনোটা কাটে না; কিছুতে stream যোগ হয় |
| Dedupe key | `db-routine` load, `routine-subjects-tab`, `routine-auto-assign`, `routine-sync`, `routine-helpers` | না। (আজ ঠিক করা হয়েছে শুধু subjects tab ও load এ) |
| Section load / class demand | `routine-subjects-tab`, `routine-helpers` (`calculateTotalSchoolSectionDemand`), `routine-teachers-tab`, `teacher-editor-form` | **Likely না**। subjects-tab এ আজকের group-aware ঠিক করা হয়েছে, helpers এর সংস্করণ আলাদা। দুই জায়গায় মোট demand আলাদা দেখাতে পারে (যাচাই করিনি) |
| `isHsClass` | একটাই (`routine-helpers.ts:492`) | ঠিক আছে |
| Teacher এর group load | `teacherGroupLoad` (`routine-groups.ts:67`) আর `calculateTotalTeacherAllottedWorkload` এর ভেতরের `groupLoadForTeacher` | একই সূত্র, কিন্তু দুই কপি |

**সবচেয়ে বেশি bug কমানোর একক পরিবর্তন:** একটা `routine-domain` module, যাতে `normalizeName`, `dedupeSubjects`, `sectionLoad`, `classDemand`, `teacherLoad` থাকবে। UI আর solver এর payload builder দুটোই সেটা ব্যবহার করবে।

---

## ৫. Data integrity

**ভালো খবর:** class-subject এর মোট period (teacher এর ভাগের যোগফল) subject এর p/wk এর সাথে **০ টা mismatch**। কোনো subject বাদ পড়েনি, কোনো unqualified teacher বসেনি, duplicate teacher নাম নেই। Group এর subject দুবার গোনা হচ্ছে না (class demand = capacity, ঠিক)।

| # | সমস্যা | প্রমাণ |
|---|---|---|
| D1 | `routine_settings` এ ২টা row। loader সর্বশেষ `updated_at` টা নেয়। `saveRoutineSettingsDb` update ব্যর্থ হলে নতুন row insert করে, তাই row বাড়তে থাকে | `db-routine.ts:85-90`, `495` |
| D2 | `routine_assignments` এ `UNIQUE(class_id, subject_id)`, অথচ engine এর মডেলে ৭০ টা class-subject এ একাধিক teacher এর ভাগ আছে, আর theory+lab এ একই subject এ দুটো row। Upsert `onConflict: "class_id,subject_id"` এ ভাগগুলো একটা আরেকটাকে মুছবে | `20260928_routine_system.sql:86`, `db-routine.ts:1185-1195` |
| D3 | Assignment সেভে supabase এর `error` দেখা হয় না (শুধু `catch`, কিন্তু supabase throw করে না), তাই ব্যর্থতা নিঃশব্দে হারায় | `db-routine.ts:1185-1198` |
| D4 | `routine_assignments` এ `is_lab` column নেই, আর load এ `isLab` map হয় না। সেভ ও reload হলে theory/lab ভাগ হারাতে পারে (শুধু কোড পড়ে পাওয়া, DB খালি বলে ঘটেনি) | `db-routine.ts:393-400` |
| D5 | `routine_assignments` এ এখন ০ row। প্রতিবার generate এ in-memory তৈরি হয়। অর্থাৎ কেউ একবার সেভ করলে পরে subject/teacher বদলালে পুরনো assignment stale থাকবে (`generate/page.tsx:89-92` সেভ করা থাকলে ওটাই ব্যবহার করে, rebuild করে না) | `routine/generate/page.tsx:89-92` |
| D6 | Subject duplicate তৈরির race (আজ ঠিক করা, ৪ টা row মুছেছি)। DB তে কোনো natural-key unique constraint নেই, তাই আবার ঘটতে পারে | `routine-sync.ts` |
| D7 | `localStorage` DB এর পাশাপাশি "state" হিসেবে ব্যবহৃত, তাই দুই device এ আলাদা চিত্র দেখা যেতে পারে | `db-routine.ts` জুড়ে `getLocalRoutineState` |

---

## ৬. Code quality

**Engine**
- **Class Teacher শনাক্তকরণ ভাঙা (`main.py:513-528`):** teacher এর `classTeacherOf` লেখা থাকে `"Class VII - Section A"` ধরনে, কিন্তু engine এ তৈরি label `"class vii - a"`। exact match কখনো মেলে না, তাই শেষ শর্ত `cls_name in teacher_ct` এ পড়ে। এতে `"class v"` যেকোনো `"class vii…"` এ পাওয়া যায়, `"class x"` পাওয়া যায় `"class xi…"`/`"class xii…"` এ। আসল data তে: ANIMESH GHOSH (VIII A) ৮ section এর, RIMA SANPUI (VII B) ৬ section এর, TRIDIB DAS (XII A) তিন class এর CT হিসেবে ধরা পড়ে। এটা শুধু objective (nরম) কিন্তু ভুল section এর ১ম period এ ভুল teacher কে টানে।
- **`INFEASIBLE` আর `UNKNOWN` (timeout) আলাদা না:** `status in (OPTIMAL, FEASIBLE)` নাহলেই Phase 2 (`main.py:449-451`)। Phase 1 ধীর হলে সেটাও Phase 2 তে চলে যায়।
- **Phase 2 এর ফল optimal নয়:** `max_time_in_seconds = 15`, `FEASIBLE` পেলেই ফেরত। seed/worker ঠিক করা নেই, তাই দুবার চালালে ভিন্ন routine আসতে পারে। (`main.py:447`)
- **ব্যর্থতার বার্তা অকেজো:** "could not find a feasible schedule even with relaxed constraints" (`main.py:806`)। কোন class/teacher/constraint দায়ী তা নেই। CP-SAT এর `assumptions` দিয়ে infeasibility core বের করা যায়।
- Class এর খালি period compact করার কোনো objective নেই। Demand < capacity হলে মাঝখানে ফাঁকা period পড়বে (এখন সব class ভর্তি তাই দেখা যায় না, Unproven)।
- Phase 2 তে `tch_cap += 1`, `consec_max + 1`, সব timepref, tiffin একসাথে, কিন্তু প্রতিটার দাম আলাদা না।

**Auto-assign (`routine-auto-assign.ts`)**
- Teacher এর `classPeriods` (class এর ডিফল্ট) subject এর `periodsPerWeek` কে ছাপিয়ে যায় (`368-381`)। এক teacher এর class-সংখ্যা সব subject এর load হয়ে যেতে পারে।
- একাধিক explicit teacher এ প্রত্যেককে নিজের `periods` দেওয়া হয়, যোগফল subject এর p/wk এর সাথে মেলানো হয় না (`301-316`, আজ এই data তে মিলেছে)।
- কোনো qualified teacher না থাকলে সবচেয়ে কম load এর **যেকোনো** teacher কে বসায় (`348-353`), নিঃশব্দে। এই data তে ঘটেনি (০ টা), কিন্তু ভবিষ্যতে ঘটলে কোনো সতর্কতা নেই।

**Solver দ্বৈততা ও মৃত কোড**
- `routineGenerator.ts` এর শুরুর মন্তব্য বলে "Backtracking Solver with MRV…", কিন্তু ভেতরে শুধু validation আর HTTP কল। ফাইলের নামও বিভ্রান্তিকর।
- `scripts/test-routine-solver.ts` চালানোর কোনো runner নেই (`tsx`/`ts-node` নেই), আর সে `generateRoutine` কে call করে যা `/api/routine/generate` এ relative `fetch` করে। Node এ সরাসরি চলবে না। **আসলে কোনো test চলে না।**
- `python-backend/test_solver.py` (৩৬ লাইন), `test_groups.py` (২৩৫ লাইন) আছে, কিন্তু CI/script এ যুক্ত নেই।

**Type safety, error handling**
- ৪৬ টা `any`, ১৮ টা খালি `catch {}` (আনুমানিক, grep এর ভিত্তিতে), ৪৫ টা `console.warn` যা ব্যবহারকারীকে কিছু জানায় না।

**ফাইলের আকার (ঝুঁকি লুকিয়ে রাখার জায়গা):** `routine-viewer-tab.tsx` ২৩৫৮, `routine-subjects-tab.tsx` ২২৬৬, `routine-teachers-tab.tsx` ১৭৮৫, `db-routine.ts` ১৭৬৯, `routine-allotment-overview-tab.tsx` ১১৬০, `routine-demand-allotment-tab.tsx` ১০৯০ লাইন।

**নিরাপত্তা:** Python solver এ `allow_origins=["*"]` সাথে `allow_credentials=True`, কোনো auth নেই (`main.py:16-22`)। শুধু local এ চললে ঠিক আছে, deploy করলে ঝুঁকি। (Low)

**Performance:** Phase 1 `INFEASIBLE` প্রমাণ ০.১ থেকে ৭ সেকেন্ড, Phase 2 এ ১৫ সেকেন্ড সীমা। Python এ `class_subj_total` প্রতি assignment এ পুরো তালিকা ঘুরে (`main.py:530-533`), ১৮৩ টায় অসুবিধা নেই, কিন্তু বড় হলে O(n²)।

---

## ৭. সম্পূর্ণ findings table

| ID | শিরোনাম | Severity | Confidence | Effort | অবস্থান |
|---|---|---|---|---|---|
| F1 | Geography XI/XII afternoon: Rosy ১২ > ১০ slot | Blocker | Proven | S (সিদ্ধান্ত) | `main.py:207-220`; data |
| F2 | `tchConsecMax=1` → ৩ জন teacher ২২ এর বেশি | Blocker | Proven | S (সিদ্ধান্ত) | settings row `11acd7bc`; `main.py:313-336` |
| F3 | Preflight উপরের দুটো ধরে না (isValid true) | Blocker | Proven | M | `routineGenerator.ts:98-384` |
| F4 | Phase 2 সব rule একসাথে শিথিল, কারণ অজানা | High | Proven | M | `main.py:691-698`, `752` |
| F5 | `INFEASIBLE` ও timeout আলাদা নয় | High | Proven | S | `main.py:449-451` |
| F6 | CT শনাক্তকরণ ভাঙা (substring + format mismatch) | High | Proven | S | `main.py:513-528` |
| F7 | `UNIQUE(class_id,subject_id)` বনাম multi-teacher/theory+lab | High | Proven (schema) | M | `20260928_routine_system.sql:86` |
| F8 | `isLab` assignment এ নেই | High | Likely | M | `db-routine.ts:393-400` |
| F9 | Assignment সেভে error গিলে ফেলা | Medium | Proven | S | `db-routine.ts:1185-1198` |
| F10 | নাম normalise ~৪০ কপি | High | Proven | L | বিভিন্ন |
| F11 | Demand/load ≥৩ জায়গায় আলাদা সূত্র | Medium | Likely | M | `routine-helpers.ts`, `routine-subjects-tab.tsx` |
| F12 | `routine_settings` এ একাধিক row | Medium | Proven | S | `db-routine.ts:85-90,495` |
| F13 | `parseInt(...) \|\| 3` শূন্য মান আটকায় | Low | Proven | S | `routine-settings-tab.tsx:165,182` |
| F14 | `classPeriods` subject এর p/wk ছাপায় | Medium | Likely | S | `routine-auto-assign.ts:368-381` |
| F15 | Unqualified teacher নিঃশব্দে বসানো | Medium | Likely (এখন ০) | S | `routine-auto-assign.ts:348-353` |
| F16 | Phase 2 non-optimal, seed ঠিক নেই | Medium | Proven | S | `main.py:447` |
| F17 | কোনো চালু test নেই, stale script | High | Proven | M | `scripts/test-routine-solver.ts` |
| F18 | `routineGenerator.ts` এর বিভ্রান্তিকর শিরোনাম/মন্তব্য | Low | Proven | S | `routineGenerator.ts:1-7` |
| F19 | Subject duplicate এর race (আজ ঠিক), DB constraint নেই | Medium | Proven | S | `routine-sync.ts` |
| F20 | CORS `*` + credentials | Low | Proven | S | `main.py:16-22` |
| F21 | দৈনিক সীমা `tchDailyMax` নিঃশব্দে বাড়ে | Medium | Proven | S | `main.py:294-303` |
| F22 | Class এ ফাঁকা period compact করার objective নেই | Low | Unproven | M | `main.py` objective |
| F23 | Preflight এর subject daily check engine এর সাথে মেলে না | Low | Likely (কোড পড়ে) | S | `routineGenerator.ts:317-336` |
| F24 | বিশাল ফাইল (>১০০০ লাইন × ৬) | Medium | Proven | L | উপরে |

---

## ৮. Fix roadmap

### Batch 0: সিদ্ধান্ত (কোড নয়, এখনই)
1. **`Max Consecutive Periods = 1` কি ইচ্ছাকৃত?** না হলে ৩ এ ফেরাও। ১ রাখলে ৩ জন teacher এর load ২২ এর নিচে নামাতেই হবে।
2. **Geography XI/XII afternoon কি অবশ্যই (must), নাকি ইচ্ছা (preference)?** প্রস্তাবিত: preference। অথবা Rosy এর ১২ কে ১০ এর মধ্যে আনো, অথবা দিনের সীমা ৭ করো।
3. **Min tiffin 2/1 কি কড়া নিয়ম?** প্রস্তাবিত: soft।

### Batch 1: দ্রুত জয় (প্রায় ১ দিন, ঝুঁকি কম)
- `INFEASIBLE` আর `UNKNOWN` আলাদা করে ফেরত দেওয়া। (F5)
- CT শনাক্তকরণ ঠিক: `"Class X - Section A"` পার্স করে exact class+section মেলানো। (F6)
- `|| 3` / `|| 5` সরানো। (F13)
- `routine_settings` কে একটা row তে বাঁধা (singleton)। (F12)
- Assignment সেভে `error` পরীক্ষা করে ব্যবহারকারীকে জানানো। (F9)
- **যাচাই:** `bis.py` ধরনের script আবার চালিয়ে দেখা Phase 1 অবস্থা।

### Batch 2: Preflight ও diagnosis (২-৩ দিন)
- TS preflight এ যোগ: per-teacher afternoon/morning slot গণনা, per-teacher consecutive ক্ষমতা (`n - floor(n/(c+1))` সূত্র), tiffin সম্ভাব্যতা। প্রতিটা সমস্যা teacher/class এর নাম দিয়ে বাংলায়/সাধারণ ভাষায়। (F3)
- Generate এর পর "কোন rule কে শিথিল করেছে" তালিকা, প্রতিটার কারণসহ। (F4)
- **ঝুঁকি:** কম। শুধু বার্তা বাড়ে।

### Batch 3: Engine এর কাঠামো (৩-৫ দিন, মাঝারি ঝুঁকি)
- দুই-phase এর বদলে **একটা model**, যেখানে timepref/consec/tiffin এর প্রতিটা `soft` (penalty), আর penalty সংখ্যা দিয়ে "কতটা ভাঙা হলো" জানানো। পাশাপাশি কিছু rule `hard` রাখার বিকল্প (Batch 0 এর সিদ্ধান্ত অনুযায়ী)। (F4, F16)
- Infeasibility core (`AddAssumptions`) দিয়ে "কোন ৩ টা rule মিলে অসম্ভব" বলা। (F4)
- `random_seed`, `num_workers`, সময়সীমা প্যারামিটার, `UNKNOWN` সততার সাথে জানানো। (F16)
- **Rollback:** পুরনো `run_solver_phase` রাখা, feature flag এ নতুনটা।

### Batch 4: Data model (২-৩ দিন, migration লাগবে)
- `routine_assignments`: unique কে `(class_id, subject_id, teacher_id)` করা (অথবা `part` কলাম), `is_lab` যোগ, loader ঠিক। (F7, F8)
- `routine_subjects` এ natural-key unique (`class_name`, canonical নাম) যাতে race এ আর duplicate না হয়। (F19)
- **ঝুঁকি:** migration। আগে `routine_assignments` এ ০ row, তাই এখন নিরাপদ।

### Batch 5: `routine-domain` module (৩-৫ দিন)
- নাম normalise, dedupe, section load, class demand, teacher load এক জায়গায়। UI ও payload builder ওটা ব্যবহার করবে, ~৪০ কপি মুছে। (F10, F11)
- **যাচাই:** আগে আজকের সংখ্যাগুলো (৫৬ subject, ৪৫৯ unit, class demand = capacity) snapshot test এ বাঁধো, refactor এর পরেও একই থাকতে হবে।

### Batch 6: Test ও কাঠামো পরিষ্কার (সমান্তরাল)
- Vitest যোগ করা, আর আজকের payload (anonymised) fixture হিসেবে রাখা। (F17)
- আজকের validator script কে স্থায়ী invariant test বানানো: "solver এর output প্রতিটা hard rule মানে", "demand = capacity মেলে", "group member দুবার গোনা হয় না"।
- `scripts/test-routine-solver.ts` মুছে বা নতুন করে লেখা। `routineGenerator.ts` এর নাম/মন্তব্য ঠিক। (F17, F18)
- ছয়টা বিশাল ফাইল ভাঙা (viewer, subjects, teachers…)। (F24)

---

## ৯. মালিকের কাছে প্রশ্ন (শুধু যা কোড বলতে পারে না)

1. `Max Consecutive Periods = 1` কি ইচ্ছাকৃত? *(প্রস্তাব: ৩)*
2. XI/XII Geography afternoon কি অবশ্যই, নাকি পছন্দ? *(প্রস্তাব: পছন্দ)*
3. Min tiffin (2 আগে, 1 পরে) কি কড়া নিয়ম? *(প্রস্তাব: নরম)*
4. Phase 2 (শিথিল) routine কি কখনোই গ্রহণযোগ্য, নাকি সবসময় ম্যানুয়ালি ঠিক করতে চাও? *(প্রস্তাব: গ্রহণযোগ্য, কিন্তু কোন rule ভেঙেছে স্পষ্ট দেখিয়ে)*
5. তোমার হাতে বানানো routine এর ফাইল/ছবি দেওয়া যায়? তাহলে validator দিয়ে নিশ্চিত করব কোন rule ভাঙা হয়েছে। *(প্রস্তাব: হ্যাঁ, এটাই সবচেয়ে সরাসরি প্রমাণ)*
