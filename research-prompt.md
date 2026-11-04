# Research Prompt

আমি একটা School Management System (SMS) তৈরি করেছি। এটাকে SaaS হিসেবে ভারতের স্কুলগুলোর কাছে লঞ্চ করতে চাই। আমি একদম beginner, তাই সহজ ভাষায় (বাংলা অক্ষরে, technical শব্দ English-এ) পুরো research করে একটা রিপোর্ট দাও। রিপোর্টে টেবিল থাকবে, ভিজ্যুয়াল কম।

## আমার অ্যাপ
- Next.js 16 (App Router) + React 19
- Supabase (Auth + Postgres)
- Python FastAPI + OR-Tools (class routine solver, আলাদা সার্ভার লাগে)
- এখন Vercel-এ চলছে, কিন্তু অ্যাপ single-tenant (একটাই স্কুলের জন্য, tenant column নেই)

## মূল প্রশ্ন
**Supabase থাকবেই, এটা বদলাব না।** Supabase রেখে সবচেয়ে **cheapest** উপায়ে কীভাবে লঞ্চ করব?
- আমি ভাবছিলাম VPS কিনে সেখানে app host করব, আর Supabase database হিসেবে রাখব।
- কেউ বলেছে Supabase এখানে ভালো চলবে না। এটা কি সত্যি? কেন? দুইটা অপশনের খরচ, ঝুঁকি আর পরিশ্রম তুলনা করো:
  - Supabase cloud (Free/Pro, কোন region ভারতের কাছে) + app VPS-এ বা Vercel-এ
  - Supabase নিজে VPS-এ self-host (কত RAM/CPU লাগে, backup/update কে করবে)
- App hosting-এর সস্তা অপশন কী (Vercel, VPS যেমন Hetzner/DigitalOcean/Hostinger/AWS Lightsail Mumbai, Coolify/Dokploy দিয়ে)? Supabase-এর সাথে কোনটা সবচেয়ে ভালো চলে?
- Industry-তে অন্যরা এটা কীভাবে চালায়?

## Competitor deep research
ভারতের School ERP/SMS competitor-দের (Teachmint, Entab CampusCare, Camu, Fedena, MyClassboard, Edunext, NextOS, Classe365 ইত্যাদি, আর বিশ্বের PowerSchool, Toddle) নিয়ে বিস্তারিত research:
- **Tech stack:** কোন framework, database, cloud ব্যবহার করে (job posting, StackShare, BuiltWith, engineering blog থেকে)।
- **Pricing:** per-student বা বার্ষিক কত, কোন plan-এ কী থাকে, setup ফি, লুকানো খরচ।
- **Features:** কোন module আছে, mobile app, parent app, timetable/routine generator আছে কি না।
- **Business model:** কীভাবে বিক্রি করে (sales team, demo, reseller, self-signup), onboarding, support, আয়ের উৎস (SMS credit, fee-collection commission ইত্যাদি)।
- **কাস্টমার রিভিউ:** স্কুলগুলো কী পছন্দ করে আর কী নিয়ে অভিযোগ করে (G2, Capterra, Google Play রিভিউ)।

তারপর আমার অ্যাপের সাথে **feature-by-feature, price-by-price তুলনা টেবিল** বানাও, আর বলো:
- কোন competitor-এর কোন জিনিস সবচেয়ে ভালো, আমি কোনটা অনুসরণ করব।
- আমার কোথায় ঘাটতি, লঞ্চের আগে কী যোগ বা ঠিক করা উচিত।
- আমার কী সুবিধা আছে যা ওদের নেই, সেটা দিয়ে কীভাবে বিক্রি করব।
- আমার price কত রাখা উচিত।

## স্কেল-খরচ
৫ / ১০ / ৫০ / ১০০ স্কুলে মাসিক খরচ কত হবে (INR আর USD), আর প্রতি ধাপে কোন platform লাগবে? ৫টা স্কুল দিয়ে শুরু করলে কী করব, কখন কী বদলাতে হবে?

## আরও যা জানতে চাই
1. Python solver কোথায় হোস্ট করব (Vercel-এ চলে না)।
2. Multi-tenancy: shared DB + `school_id` + RLS বনাম প্রতি স্কুলে আলাদা DB/deploy। Industry কোনটা করে, আমার ক্ষেত্রে কোনটা ভালো।
3. বড় প্লেয়ারদের (Teachmint, Entab, Camu, PowerSchool ইত্যাদি) business model আর process, আমার সাথে তুলনা। কীভাবে বিক্রি করে, onboarding, support, আয়ের উৎস।
4. ভারতে School ERP pricing benchmark (per-student, বার্ষিক subscription)।
5. Payment ও subscription billing: Razorpay, Cashfree, ফি, GST।
6. Legal: DPDP Act 2023, শিশুদের ডেটা, privacy policy, terms।
7. Backup, security, monitoring।

## আউটপুট
- শেষে একটা পরিষ্কার "cheapest path" সুপারিশ, ধাপে ধাপে।
- প্রতিটা খরচের সংখ্যার পাশে সোর্স আর তারিখ।
- যেখানে নিশ্চিত না, সেটা স্পষ্ট লিখবে।
