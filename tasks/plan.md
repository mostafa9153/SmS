# Library Module — বিস্তারিত Plan (v2, review-পরবর্তী)

Spec: [docs/ideas/school-library.md](../docs/ideas/school-library.md)। এই plan সেই spec-এর পরের সব সিদ্ধান্ত, সম্ভাব্য সমস্যা ও সমাধান, আর ধাপে ধাপে কাজের তালিকা। কোনো সিদ্ধান্ত spec-এর সঙ্গে না মিললে এই plan-টাই মানা হবে।

v2-তে কী বদলেছে: চারটা আলাদা দিক থেকে review হয়েছে (কোডের সঙ্গে মিল, নিয়মের যুক্তি, data/concurrency, ব্যবহারকারীর workflow), আর প্রতিটি সমস্যা আলাদাভাবে খণ্ডনের চেষ্টা করা হয়েছে। ৪৫টা সমস্যা টিকে গেছে, সবগুলো নিচে সমাধানসহ বসানো হয়েছে। প্রতিটি সারির শেষে `[R]` চিহ্ন মানে সারিটা review থেকে এসেছে বা review-এর পর বদলেছে।

---

## ১. মূল নকশার নীতি

1. **এক জায়গায় scan, mode বাছাই নেই।** System নিজে বোঝে code কিসের এবং কী করতে হবে।
2. **হাত scanner-এ থাকবে, mouse-এ নয়।** Scan box সবসময় focus-এ থাকবে। Shortcut হবে শুধু modifier সহ (Alt+…), কারণ খালি অক্ষর scan-এর code-এর ভেতরে চলে আসে। [R]
3. **Screen না দেখেও বোঝা যাবে।** সফলে সবুজ আলো ও বিপ, ভুলে লাল আলো ও আলাদা শব্দ।
4. **ভুল মানুষকে বই দেওয়া ঠেকানো।** Borrower-এর ছবি বড় করে দেখাবে। Scanner-এর Enter কখনো কোনো প্রশ্নের "হ্যাঁ" বোতাম চাপবে না। [R]
5. **কোনো কাজ নিঃশব্দে হারাবে না।** প্রতিটি কাজ, Undo-ও, event log-এ লেখা থাকবে। ব্যর্থ scan তালিকার উপরে আটকে থাকবে, সাময়িক toast-এ হারিয়ে যাবে না। [R]
6. **শাস্তি নয়, স্পষ্টতা।** Limit, block ও fine আগে থেকে দেখাবে, কারণসহ।
7. **নিয়ম বদলালে চলমান loan-এর শর্ত বদলাবে না।** Loan-এর সব শর্ত issue-এর সময় সংরক্ষিত থাকবে। ব্যতিক্রম দুটো: borrower-এর limit (এটা borrower-এর নীতি, loan-এর শর্ত নয়) আর ছুটির তালিকা (খোলা loan-এ নতুন ছুটি প্রযোজ্য হবে)। [R]
8. **হিসাবের সত্য একটাই জায়গায়।** কপি issued কি না তা আলাদা status-এ লেখা হবে না, খোলা loan থেকেই বোঝা যাবে। Fine কত বাকি তাও আলাদা করে রাখা হবে না, payment আর waiver থেকে হিসাব হবে। [R]

---

## ২. সম্ভাব্য সমস্যা ও সমাধান

### ক. নিরাপত্তা ও অধিকার

| # | সমস্যা | সমাধান |
|---|---|---|
| S1 | Sports module-এর RLS policy হলো `FOR ALL USING (true)`, কোনো role ছাড়া। এটা নকল করলে browser-এ থাকা public anon key দিয়েই যে কেউ fine, রসিদ বা মওকুফ বদলাতে পারবে, আর RPC সরাসরি call করতে পারবে। | **Sports-এর ধাঁচ মানা হবে না।** RLS চালু, কিন্তু anon বা authenticated-এর জন্য কোনো write policy নেই। সব write হবে server route থেকে service-role client দিয়ে। প্রতিটি `library_*` function-এ `REVOKE EXECUTE … FROM PUBLIC, anon, authenticated; GRANT … TO service_role` (`20261030_revoke_public_execute_internal_functions.sql`-এর ধাঁচে)। `library_events` ও `library_fine_payments`-এ UPDATE/DELETE বন্ধ রাখার trigger থাকবে; শুধু void column বদলানো যাবে। [R] |
| S2 | `requireStaff` Admin ও Staff-কে সবসময় ঢুকতে দেয়, তাই `can_waive_library_fines` শুধু Teacher-কে আটকায়। ফলে যেকোনো Staff যত খুশি মওকুফ করতে পারবে। | **সিদ্ধান্ত:** মওকুফ করতে পারবেন Admin, আর যে Teacher-কে `can_waive_library_fines` দেওয়া হয়েছে। Staff মওকুফ করতে পারবেন না। Waive route নিজস্ব check ব্যবহার করবে: `requireRole(["Admin","Teacher"])` আর Teacher হলে flag যাচাই। [R] |
| S3 | নতুন permission key শুধু `TeacherPermissions` type-এ যোগ করলে Teacher Management screen-এ toggle দেখা যাবে না, তাই কাউকে অধিকার দেওয়াও যাবে না। | T2-তে দুটো key যোগ হবে তিন জায়গায়: `TeacherPermissions`, `DEFAULT_TEACHER_PERMISSIONS` (false), আর `components/teachers/management/permissions.ts`-এর `PERMISSION_SECTIONS`-এ নতুন "Library" অংশ। [R] |
| S4 | "আমার বই" `requireStaff` দিয়ে চালালে flag ছাড়া teacher 403 পাবেন। Borrower id request থেকে নিলে একজন আরেকজনের loan দেখতে পারবেন। | `requireRole()` (সব signed-in user)। Borrower নির্ধারিত হবে শুধু `auth.staffId` থেকে, request থেকে কখনো নয়। `staffId` null হলে খালি তালিকা ফেরত যাবে। [R] |
| S5 | RPC service-role দিয়ে চলে, তাই ভেতরে `auth.uid()` null থাকে, আর কে কাজটা করল তা হারিয়ে যায়। | প্রতিটি RPC-তে `p_actor uuid` parameter থাকবে, `gate.auth.user.id` থেকে। Actor column-গুলো NOT NULL। [R] |

### খ. Data ও concurrency

| # | সমস্যা | সমাধান |
|---|---|---|
| D1 | একই কপি একসাথে দুইজনকে issue | RPC `library_issue_copy()` কপির row lock (`FOR UPDATE`) নেবে। Database-এ partial unique index: `library_loans(copy_id) WHERE returned_on IS NULL AND cancelled_at IS NULL`। |
| D2 | একসাথে দুটো issue হওয়ায় borrower limit পেরিয়ে যাওয়া | একই RPC borrower-এর advisory lock নিয়ে খোলা loan গুনবে। |
| D3 | কপির নম্বর `max(copy_no)+1` থেকে নিলে কপি মুছলে বা "কপি যোগ" undo করলে নম্বর আবার ব্যবহার হয়। দুটো sticker-এ একই code চলে আসে। | `library_books.next_copy_no` counter থাকবে। বইয়ের row lock নিয়ে শুধু বাড়বে, কখনো কমবে না। Undo বা মুছে ফেলায় নম্বর ফেরত যায় না। [R] |
| D4 | Book code পুনরায় ব্যবহার | Postgres `SEQUENCE`। |
| D5 | দুটো জায়গায় একই সত্য: `copy.status = issued` আর খোলা loan। Undo মাঝপথে ব্যর্থ হলে দুটো আলাদা কথা বলবে। | কপির status শুধু `available / lost / withdrawn`। "Issued" হলো খোলা loan থাকা, আলাদা করে লেখা হয় না। "Damaged" কপির অবস্থা নয়, এটা fine-এর ধরন। [R] |
| D6 | Undo-র নিয়ম: বিদ্যমান `performUndo` row-by-row upsert/delete চালায়, transaction ছাড়া আর এক row-এর guard দিয়ে। এতে loan মুছলে event-এর FK ভাঙে, ফেরত undo করলে partial unique index ভাঙে, payment থাকা fine মুছতে গিয়ে রসিদ হারায়, আর event log-এ undo-র কোনো চিহ্ন থাকে না। | **Loan কখনো মোছা হবে না।** Library-র undo চলবে transactional RPC `library_undo(event_id, p_actor)` দিয়ে। এটা lock নিয়ে বর্তমান অবস্থা যাচাই করে (কপি অন্য কাউকে দেওয়া হয়নি, fine-এ payment নেই), issue হলে loan-এ `cancelled_at` বসায় আর return হলে loan আবার খোলে, তারপর একটা "undone" event লেখে। শর্ত না মিললে বাংলায় পরিষ্কার কারণ ফেরত দেয় (যেমন "আগে রসিদ বাতিল করুন")। এর জন্য shared `lib/undo/journal.ts`-এর `RestoreStep`-এ নতুন ধরন যোগ হবে: `{ op: "rpc", fn, args }`, যাতে পুরো project-এর Undo toast আর journal আগের মতোই কাজ করে। [R] |
| D7 | Undo guard `updated_at` দেখে, কিন্তু কয়েকটা টেবিলে column নেই আর কোনো trigger নেই। ফলে guard চুপচাপ বাদ পড়ে। | সব library টেবিলে `created_at`, `updated_at` আর `BEFORE UPDATE` trigger। RPC লেখার পরের `updated_at` ফেরত দেবে, যা guard-এ যাবে। [R] |
| D8 | নেট ধীর হলে librarian আবার scan করেন। `request_id` idempotency-র কথা বলা হয়েছিল, কিন্তু তা রাখার জায়গা ছিল না। | `library_requests(request_id PK, actor, kind, result jsonb, created_at)`। প্রতিটি desk RPC আর pay/waive শুরুতে `INSERT … ON CONFLICT DO NOTHING` করে। Conflict হলে আগের ফলাফলই ফেরত দেয়, সব একই transaction-এ। [R] |
| D9 | রসিদ নম্বর আলাদা RPC থেকে নিলে ব্যর্থ insert-এ নম্বরে ফাঁক পড়ে, আর ক্রম এলোমেলো হয়। | `library_record_payment(fine_id, amount, p_actor, request_id)` একটা transaction-এ fine-এর row lock নেবে, বাকি টাকা যাচাই করবে, counter row থেকে রসিদ নম্বর দেবে (SEQUENCE নয়, কারণ rollback-এ সেটাও ফাঁক রাখে), তারপর payment লিখবে। [R] |
| D10 | Payment আর মওকুফ একসাথে হলে মোট fine-এর চেয়ে বেশি হয়ে যায়। একটাই `waived_amount` থাকায় দ্বিতীয়বার মওকুফে আগের কারণ ও কর্তা মুছে যায়। | Waiver আলাদা টেবিলে (`library_fine_waivers`), payment-এর মতো। Pay, waive, void আর refund সব RPC-তে fine-এর row lock নিয়ে চলবে, CHECK: মওকুফ + payment − refund ≤ fine। Status সংরক্ষিত হবে না, হিসাব থেকে আসবে (view `library_fine_balances`)। [R] |
| D11 | Fine ও event-এ একটা অস্পষ্ট `borrower` column, যাতে FK বা index বসানো যায় না। | Loan-এর মতোই `student_id / staff_id` + "ঠিক একটা থাকবে" CHECK। Index: খোলা loan ও fine-এ borrower অনুযায়ী, `library_fine_payments(fine_id)`, `library_events(copy_id, at)`। [R] |
| D12 | হিসাবের নিয়ম TypeScript-এ, কিন্তু যে check একসাথে হতে হবে সেগুলো SQL-এ। কে কী হিসাব করে তা স্পষ্ট না হলে দুটো আলাদা বাস্তবায়ন সময়ের সঙ্গে আলাদা হয়ে যাবে। | **ভাগ:** তারিখ ও fine-এর সব হিসাব শুধু TypeScript-এ (`lib/library/rules.ts`, unit-tested)। TS due date, নতুন due আর জমা fine হিসাব করে RPC-তে argument হিসেবে পাঠায়। RPC শুধু সেই নিয়মগুলো lock-এর ভেতরে আবার যাচাই করে যা কঠোর হতে হবে: limit সংখ্যা, এক কপির একটাই খোলা loan, payment-এর সীমা। Fine-এর threshold (block) একটা নরম নিয়ম, TS-এর হিসাবেই চলবে। [R] |

### গ. Scan ও code চেনা

| # | সমস্যা | সমাধান |
|---|---|---|
| C1 | Student card-এর code | **সিদ্ধান্ত (user):** card-এ থাকবে **School ID** অথবা **PEN** (`students.pen`)। Lookup ক্রম: কপির code → `students.school_id` (case-insensitive, হুবহু মিল) → `students.pen` (হুবহু মিল) → `staff_profiles.unique_id`। একাধিক মিল হলে issue হবে না, তালিকা থেকে বাছতে হবে। `legacy_no` scan-এ খোঁজা হবে না, শুধু search box-এ (কারণ এটা প্রায়ই শুধু সংখ্যা, PEN-এর সঙ্গে মিলে যেতে পারে)। [R] |
| C2 | School ID-তে `/` আছে, আর scanner ভুল keyboard layout-এ `/` বা `-` অন্য অক্ষরে টাইপ করে। PEN-এর শুরুতে শূন্য থাকতে পারে। | Trim, uppercase, CR/LF মুছে normalize। PEN সবসময় লেখা (text) হিসেবে মেলানো হবে, সংখ্যায় রূপান্তর নয়। Settings-এ **"Scanner test"**: School ID ও PEN-এর জন্য দুটো ঘর। প্রতিটিতে দেখাবে scanner কী টাইপ করল, normalize হয়ে কী দাঁড়াল, কোন student মিলল, না মিললে কেন। |
| C3 | Scan box-এর বাইরে focus থাকলে scanner অন্য কোথাও টাইপ করে | Global listener: খুব দ্রুত আসা অক্ষর আর শেষে Enter মানেই scanner-এর burst। এটা scan box-এ যাবে, যদি না librarian নিজে অন্য কোনো input-এ লিখছেন। |
| C4 | খালি-অক্ষরের shortcut (`/` = search, `R` = renew) scan-এর মাঝখানে চালু হয়ে যায়, কারণ School ID-তে `/` আছে। | Shortcut শুধু modifier সহ: Alt+S = search, Alt+R = renew, Alt+I = issue, Esc = panel বন্ধ। Test: scanner-এর গতিতে `/`-যুক্ত School ID পাঠালে পুরোটা এক code হিসেবে আসে। [R] |
| C5 | Scanner দুইবার বিপ করে, একই code দুইবার | একই code ২ সেকেন্ডের মধ্যে আবার এলে উপেক্ষা হবে। |
| C6 | ফোনের camera http-এ চলে না | Production HTTPS, সমস্যা নেই। http-এ camera বোতাম disabled থাকবে, tooltip-এ "HTTPS লাগবে"। আলাদা ব্যাখ্যামূলক লেখা থাকবে না। [R] |
| C7 | নতুন camera scanner বানালে একই কাজ দুইবার হয় (CLAUDE.md অনুযায়ী shared code বাড়াতে হবে, নকল নয়) | বিদ্যমান `components/certificate/qr-scanner-modal.tsx` (`QRScannerModal`) বাড়ানো হবে: `BarcodeDetector` থাকলে সেটা (QR + Code128), না থাকলে `jsqr`। দুই module একই component ব্যবহার করবে। [R] |
| C8 | Book code prefix বদলালে | শুধু নতুন বইয়ে লাগবে। মান বদলালে সেই ঘরের নিচে validation বার্তা দেখাবে, স্থায়ী সতর্কবাণী থাকবে না। [R] |

### ঘ. তারিখ, renew ও fine-এর নিয়ম (T1-এর test-এর ভিত্তি)

| # | নিয়ম |
|---|---|
| R1 | **"আজ":** বিদ্যমান `todayIST()` (`lib/utils/date.ts`) ব্যবহার হবে। `lib/library/dates.ts` শুধু কাজের দিন ও ছুটির হিসাব যোগ করবে। `due_on` একটা `DATE`। [R] |
| R2 | **Due date:** issue_on + loan_days। রবিবার বা ছুটির দিনে পড়লে পরের কাজের দিনে সরবে। |
| R3 | **Fine-এর দিন:** (due_on, ফেরতের দিন]-এর মধ্যে যত **কাজের দিন** (রবিবার ও ছুটি বাদ)। প্রথম `grace_days` কাজের দিন মাফ, শুধু তার পরের দিনগুলোর fine। Fine = দিন × fine_per_day, সর্বোচ্চ `fine_cap`। [R] |
| R4 | **Fine কখন লেখা হয়:** বই ফেরত দিলে (বা overdue অবস্থায় renew হলে), সেদিনের হিসাবে fine row-এ সংরক্ষিত হয়। খোলা loan-এর জমা fine পাতা খোলার সময় একই function দিয়ে হিসাব হয়। ছুটির তালিকা বদলালে শুধু খোলা loan-এ প্রভাব পড়ে। [R] |
| R5 | **"বাকি" (balance) একটাই সংজ্ঞা:** সংরক্ষিত fine-এর বাকি + খোলা loan-এর জমা fine। একটাই function `borrowerBalance()` এটা হিসাব করবে, আর issue, renew, borrower panel, TC check, clearance আর teacher portal সবাই এটাই ব্যবহার করবে। [R] |
| R6 | **Issue বা renew বন্ধ হবে যদি:** borrower inactive হন, অথবা balance threshold-এর বেশি হয়। Issue-এর ক্ষেত্রে limit পূর্ণ হলেও বন্ধ। Renew-এ limit প্রযোজ্য নয়, কারণ বইয়ের সংখ্যা বাড়ে না। Return ও fine আদায় সবসময় চালু। [R] |
| R7 | **Loan-এর শর্তের snapshot** (issue-এর সময় `loans.rules`-এ লেখা): loan_days, fine_per_day, grace_days, fine_cap, renew_days, max_renews, renew_when_overdue, renew_window_days, lost_policy, processing_fee, default_lost_amount। Rules function শুধু এই snapshot নেয়। Limit আর ছুটি live থাকে। [R] |
| R8 | **Renew-এর নতুন due:** `new_due = max(old_due, min(max(আজ, old_due) + renew_days, আজ + loan_days))`, তারপর রবিবার বা ছুটির shift। `new_due ≤ old_due` হলে renew প্রত্যাখ্যাত হবে, renew সংখ্যা খরচ না করে। [R] |
| R9 | **Renew-এর সময়সীমা:** due-এর `renew_window_days` (default ৩) দিনের মধ্যে থাকলে তবেই renew করা যাবে। আগাম renew করে renew-এর সুযোগ নষ্ট হবে না। Renew বোতামে আগে থেকে দেখাবে "নতুন due: <তারিখ>"। [R] |
| R10 | **Overdue অবস্থায় renew** (setting চালু থাকলে): জমা fine একই transaction-এ fine row হিসেবে লেখা হবে, তারপর due বদলাবে। `fine_cap` পুরো loan-এর মোট overdue fine-এ প্রযোজ্য। Grace শুধু প্রথম due-তে। [R] |
| R11 | **Lost:** overdue fine হারানোর ঘোষণার দিন পর্যন্ত গোনা হয়। Lost charge = দাম (না থাকলে default_lost_amount) + processing fee, আলাদা row-এ। `fine_cap` শুধু overdue fine-এ প্রযোজ্য, lost charge-এ নয়। [R] |
| R12 | **পাওয়া গেছে:** কোথা থেকে পাওয়া গেল তা বলতে হবে। (ক) Borrower ফেরত দিলে overdue fine পাওয়ার দিন পর্যন্ত আবার হিসাব হবে (cap সহ), যাতে "lost ঘোষণা করে fine থামানো" কৌশল কাজ না করে। (খ) Library-তেই পাওয়া গেলে overdue lost-এর দিন পর্যন্ত থাকবে। দুই ক্ষেত্রেই lost charge বাতিল হবে। আগে আদায় হয়ে থাকলে "ফেরত দিন / রেখে দিন" প্রশ্ন আসবে। [R] |
| R13 | **ফেরত (refund) আর বাতিল (void) আলাদা:** Void মানে ভুল এন্ট্রি, ওই রসিদ কখনো সত্যি ছিল না। Refund মানে পরের দিন নতুন করে টাকা ফেরত দেওয়া, নিজস্ব রসিদ নম্বর, তারিখ ও কর্তাসহ (`library_fine_payments.kind = payment / refund`)। দৈনিক report-এ আদায়, বাতিল ও ফেরত আলাদা দেখাবে, যাতে আগের দিনের হিসাব বদলে না যায়। [R] |
| R14 | **মওকুফ:** পুরো, 50%, বা নিজের amount। 50% মানে **বাকির** 50%, মূল fine-এর নয়। কারণ বাধ্যতামূলক। প্রতিটি মওকুফ আলাদা row-এ, তারিখসহ, তাই মাসিক report-এ কে কত মওকুফ করেছেন দেখা যাবে। [R] |
| R15 | **Damaged:** Return সবসময় সঙ্গে সঙ্গে হয়। ক্ষতি চিহ্নিত করতে ফেরত হওয়া সারিতে (বা Book detail-এ) [ক্ষতিগ্রস্ত] বোতাম থাকবে। Amount-এর সীমা = দাম, দাম না থাকলে default_lost_amount। Overdue ও damaged আলাদা row। কপি ব্যবহারযোগ্য থাকবে, নাকি withdrawn হবে, তা বাছতে হবে। [R] |

### ঙ. Desk-এর workflow (ভিড়ের সময় মাথায় রেখে)

| # | সমস্যা | সমাধান |
|---|---|---|
| W1 | আগের নিয়মে অন্য borrower-এর panel খোলা থাকলে ফেরত আসা বইয়ে আটকে যাওয়ার মতো সতর্কবাণী দেখাত। দুপুরের লাইনে প্রতি দ্বিতীয় ফেরতে একটা বাড়তি click লাগত, অথচ হাতে থাকা বই ফেরত নেওয়া সবসময়ই ঠিক। | **Issue হওয়া কপি scan করলে সবসময় সঙ্গে সঙ্গে ফেরত হবে**, যার panel-ই খোলা থাকুক। Panel জানে সে card দিয়ে খুলেছে নাকি ফেরত দিয়ে। ফেরত দিয়ে খোলা panel-এ কোনো সতর্কবাণী নেই, শুধু নতুন holder-এ বদলায়। Card দিয়ে খোলা panel-এ অন্য কারও বই এলে শুধু হালকা হলুদ বার্তা: "A-এর বই ফেরত হলো", সঙ্গে [B-কে দিন] বোতাম (বন্ধুকে হাতবদলের ক্ষেত্রে)। কিছু আটকায় না। [R] |
| W2 | আগে কোনো panel খোলা না থাকলে scan করা বই ৩০ সেকেন্ড ধরে রাখা হতো, আর পরের card-এর নামে নিঃশব্দে issue হতো। এতে ভুল student-এর নামে বই চলে যেতে পারত। | ৩০ সেকেন্ডের নিঃশব্দ issue বাদ। Panel ছাড়া বই scan করলে বইয়ের তথ্য দেখাবে। পরের card scan হলে panel-এ ওই বইটা একটা "chip" হিসেবে থাকবে, আর issue হবে শুধু [দিন] click বা Alt+I চাপলে। Scanner-এর Enter এটা চালু করবে না। [R] |
| W3 | ফেরতের বদলে renew চাইলে: renew করতে আসা student-এর বই scan করলে সেটা ফেরত হয়ে যায়। | প্রতিটি ফেরতের সারিতে [বরং Renew] বোতাম (Alt+R)। একটা RPC loan আবার খোলে আর renew করে, কোনো fine ছাড়া। Panel-এ হাতে থাকা বই keyboard-এর তীর দিয়ে বাছা যাবে, তারপর Alt+R। [R] |
| W4 | `useConfirm` dialog-এর confirm বোতাম নিজে focus পায়। পরের scan-এর শেষের Enter সেটা চেপে দেয়, আর librarian যা চাননি সেই কাজ হয়ে যায়। | Desk-এ auto-focus করা confirm dialog থাকবে না। প্রশ্ন আসবে panel-এর ভেতরে (inline)। নতুন scan এলে প্রশ্ন বাতিল হয়ে নতুন scan স্বাভাবিকভাবে চলে। নিশ্চিত করতে click বা Alt-shortcut লাগবে। Test: প্রশ্ন খোলা অবস্থায় scanner burst এলে প্রশ্ন বাতিল হয়, নিশ্চিত হয় না। [R] |
| W5 | ৬০ সেকেন্ডে panel বন্ধ হলে টাকা নেওয়া বা কারণ লেখার মাঝপথে সব হারিয়ে যায়। | Panel-এ যেকোনো key বা mouse নড়াচড়ায় timer আবার শুরু হয়। কোনো input-এ লেখা চললে বা অসংরক্ষিত লেখা থাকলে timer থেমে থাকে। শেষ ১০ সেকেন্ডে একটা পাতলা countdown বার দেখায়। [R] |
| W6 | নেট বিভ্রাটে ব্যর্থ scan একটা toast-এ হারিয়ে যায়, অথচ বই হাতে দেওয়া হয়ে গেছে। | ব্যর্থ বা অসংরক্ষিত scan আজকের তালিকার উপরে লাল চিহ্নসহ আটকে থাকবে, সঙ্গে [আবার চেষ্টা] বোতাম, একই `request_id` দিয়ে। Desk ছেড়ে গেলে browser সতর্ক করবে। [R] |
| W7 | ভুল borrower-এর নামে issue | ছবি বড়, নতুন card scan করলে সঙ্গে সঙ্গে borrower বদলায়, আর issue-এর Undo চালু থাকে। |
| W8 | Inactive borrower | Issue বন্ধ, কারণসহ। Return ও fine আদায় চালু। |
| W9 | Issue করা নেই এমন বই ফেরত আনা | "এই কপি কারও নামে নেই", সঙ্গে [Available করো] বোতাম। Lost কপি হলে "পাওয়া গেছে" প্রবাহ (R12)। |

### চ. Catalog, import ও sticker

| # | সমস্যা | সমাধান |
|---|---|---|
| K1 | একই বই দুইবার যোগ | NFC normalize ও trim। মিলে যাওয়া বই দেখাবে: "আগে থেকে আছে, কপি যোগ করবেন?"। |
| K2 | Excel import-এ ভুল সারি | দুই ধাপ: preview (নতুন / আগে থেকে আছে / ভুল), তারপর নিশ্চিত করলে এক transaction-এ। |
| K3 | পুরোনো Accession Register | `legacy_no`, শুধু search box-এ খোঁজা যাবে (C1)। |
| K4 | কোন sticker print হয়নি | `sticker_printed_at`; "Print বাকি (২৭)" বোতাম; print-এর পর নিশ্চিত করলে তবেই চিহ্নিত। |
| K5 | **A4 sticker sheet (user-এর সিদ্ধান্ত)** | Layout-এর default: ৩ কলাম × ৮ সারি = ২৪টা, প্রতিটি ৭০ × ৩৭ mm। কলাম, সারি ও মাপ `library_settings`-এ বদলানো যাবে। "কোন ঘর থেকে শুরু" বাছাই করা যাবে, যাতে অর্ধেক ব্যবহার করা sheet নষ্ট না হয়। `PaperSettingsPanel`-এ `papers={["A4"]}` ও `lockMargins`। Print copy হবে 1:1 মাপে, `@page A4` আর margin ছাড়া। Zoom করা fixed-sheet helper ব্যবহার হবে না, কারণ সেটা mm-নির্ভুল অবস্থান সরিয়ে দেয়। [R] |
| K6 | Printer ১–২ mm সরে ছাপে, আর প্রতিটি printer আলাদা | X/Y offset রাখা হবে **প্রতিটি কম্পিউটারে আলাদা** (`usePaperSettings`-এর localStorage key `library-sticker-paper-settings`), shared settings-এ নয়। "সাধারণ কাগজে test print" বোতাম থাকবে। [R] |
| K7 | A4-এর কিনারায় printer ছাপতে পারে না (৩–৫ mm), ফলে বাইরের sticker-এর QR কেটে যায় | প্রতিটি sticker-এর ভেতরে ৪ mm নিরাপদ ফাঁকা জায়গা, QR ও লেখা তার ভেতরে। Layout unit test-এ এটা যাচাই হবে। Test print দিয়ে কিনারার sticker মিলিয়ে দেখা হবে। [R] |
| K8 | QR খুব ছোট হলে পড়া যায় না | QR কমপক্ষে ১৫ mm, চারপাশে quiet zone সহ। |
| K9 | Title মুছলে ইতিহাস হারায় | Hard delete নেই। কোনো loan না থাকলে মোছা যাবে (Undo সহ, নম্বর ফেরত যায় না, D3), নইলে শুধু Withdrawn। |

### ছ. Teacher, TC, promotion ও reminder

| # | সমস্যা | সমাধান |
|---|---|---|
| T-a | Teacher-দের ID card নেই | `staff_profiles.unique_id` দিয়ে খোঁজা ও scan। পরে card এলে কিছু বদলাতে হবে না। |
| T-b | **TC-র check শুধু UI-তে থাকলে এড়ানো যায়।** কোডে TC Out হয় `app/api/students/status-action/route.ts`-এর bulk `tc_out` দিয়ে, যেটা `can_edit_student_profile` থাকলেই চলে (Staff সবসময় পারেন)। Certificate পাতা শুধু print করে। | Check বসবে **server-এ, `status-action`-এর `tc_out`-এ**। প্রতিটি student-এর খোলা বই ও balance গোনা হবে। বাকি থাকলে 409 ফেরত যাবে student-ভিত্তিক তালিকাসহ, যদি না override-এর কারণ পাঠানো হয়। **Override শুধু Admin পারবেন।** Override হলে `library_events`-এ লেখা হবে। `IssueTcDialog` তালিকা দেখাবে, আর TC certificate পাতায় শুধু সতর্কবাণী থাকবে। Settings: সতর্কবাণী / override-সহ block / বন্ধ। [R] |
| T-c | Class promotion-এর পর clearance slip ভুল class teacher-এর কাছে যায়, আর পাস-আউট student-রা তালিকা থেকে বাদ পড়ে | Issue-এর সময় loan-এ class, section ও session লেখা থাকবে। Clearance-এ "issue-এর সময়ের class / এখনকার class" filter থাকবে, আর inactive borrower-রাও থাকবেন। Promotion / session-close পাতায় বাকি বইয়ের সংখ্যা সতর্কবাণী হিসেবে দেখাবে। [R] |
| T-d | Notification bell-এ reminder যাবে বলা হয়েছিল, কিন্তু কোনো trigger ছিল না (cron নেই) | Bell-এর দাবি বাদ। Teacher portal খুললে সেখানেই overdue badge ও banner দেখাবে। Student-দের জন্য class-ভিত্তিক slip print। [R] |

---

## ৩. Database (migration `supabase/migrations/2026MMDD_library_module.sql`)

সব টেবিলে `created_at`, `updated_at` + `BEFORE UPDATE` trigger (D7)।

```
library_settings      single row (id=1): JSONB rules — student/staff: max_books, loan_days, renew_days,
                      max_renews, renew_window_days; fine_per_day, grace_days, fine_cap,
                      renew_when_overdue, block_threshold, holidays[{from,to,label}], lost_policy,
                      processing_fee, default_lost_amount, tc_mode, code_prefix,
                      sticker layout (cols, rows, w, h, gaps; offset NOT here — per device)
library_books         id, book_code UNIQUE (SEQUENCE), next_copy_no int, title, author, publisher,
                      category, language, isbn, edition, legacy_no, status active|withdrawn
library_copies        id, book_id FK, copy_no, code UNIQUE, price, status available|lost|withdrawn,
                      legacy_no, sticker_printed_at; UNIQUE(book_id, copy_no)
library_loans         id, copy_id FK, student_id FK | staff_id FK (CHECK exactly one),
                      class_at_issue, section_at_issue, session_at_issue,
                      issued_on, due_on, renew_count, returned_on, cancelled_at,
                      outcome returned|lost, rules JSONB (R7 snapshot), issued_by, returned_by
                      partial UNIQUE(copy_id) WHERE returned_on IS NULL AND cancelled_at IS NULL
library_fines         id, loan_id FK (ON DELETE RESTRICT), student_id | staff_id (CHECK),
                      kind overdue|lost|damaged, amount, cancelled_at, cancel_reason
library_fine_payments id, fine_id FK, kind payment|refund, amount, receipt_no UNIQUE, paid_on,
                      collected_by, voided_at, void_reason, voided_by          (no UPDATE except void, no DELETE)
library_fine_waivers  id, fine_id FK, amount, reason NOT NULL, waived_by, waived_at, voided_at
library_counters      name PK, value  (receipt numbers; updated in the same transaction)
library_requests      request_id PK, actor, kind, result JSONB, created_at   (idempotency, D8)
library_events        id, at, actor NOT NULL, kind, copy_id, loan_id, student_id | staff_id,
                      ref_event_id (undo), details JSONB                       (append-only)
view library_fine_balances   fine → amount − waived − paid + refunded (non-voided rows)
```

**RPC** (প্রতিটিতে `p_actor`, `p_request_id`; একটাই transaction; lock সহ; শুধু `service_role` চালাতে পারে):
`library_add_copies`, `library_issue_copy`, `library_return_copy`, `library_renew_loan`, `library_return_to_renew`, `library_mark_lost`, `library_mark_found`, `library_mark_damaged`, `library_record_payment`, `library_record_refund`, `library_void_payment`, `library_waive`, `library_undo`।

**Index:** খোলা loan-এ `student_id`, `staff_id` ও `due_on` অনুযায়ী (partial); fine-এ borrower অনুযায়ী; `library_fine_payments(fine_id)`; `library_events(copy_id, at)`; title ও author-এ trigram।

---

## ৪. পাতা ও workflow

| পাতা | কী থাকবে |
|---|---|
| **Library Desk** `/library` | Scan box, camera বোতাম (`QRScannerModal`)। Borrower panel: ছবি, নাম, class, হাতে থাকা বই (সবুজ / হলুদ: ২ দিনের মধ্যে / লাল: overdue), balance, "আর কয়টা নিতে পারবে"। আজকের লেনদেনের তালিকা: Undo, [বরং Renew], [ক্ষতিগ্রস্ত], আর ব্যর্থগুলো উপরে আটকে থাকে। |
| **Catalog** `/library/books` | Search (বাংলা/ইংরেজি, code, legacy no.), stock সংখ্যা, বই যোগ, কপি যোগ, Excel import, "Print বাকি sticker"। |
| **Book detail** | কপি ও তার অবস্থা, ইতিহাস, Lost / পাওয়া গেছে / withdrawn / ক্ষতিগ্রস্ত। |
| **Overdue / Clearance** | Class অনুযায়ী (issue-এর সময়ের বা এখনকার), slip print, inactive সহ। |
| **Fines** | Balance, আদায়, মওকুফ, ফেরত, বাতিল, রসিদ print, দৈনিক report (আদায় / বাতিল / ফেরত আলাদা)। |
| **Reports** | সবচেয়ে বেশি পড়া বই, সক্রিয় পাঠক, কখনো না-নেওয়া বই, মাসিক মওকুফ। |
| **Settings** | সব নিয়ম, ছুটির পরিসর, sticker layout, Scanner test (School ID + PEN)। |
| **Teacher portal "আমার বই"** | Due, overdue banner, renew (সময়সীমার মধ্যে, নতুন due আগে দেখিয়ে), balance। |

**Desk-এর scan যুক্তি** (`decideScanAction()`: একটা pure function, প্রতিটি শাখার test):

```
scan (normalize; একই code ২ সেকেন্ডের মধ্যে আবার এলে উপেক্ষা; খোলা inline প্রশ্ন বাতিল)
├─ কপির code
│   ├─ খোলা loan আছে → সঙ্গে সঙ্গে RETURN
│   │     panel যেটাই খোলা থাকুক; panel-এ holder দেখায়
│   │     card দিয়ে খোলা panel আর অন্য holder হলে → হলুদ বার্তা + [B-কে দিন] (কিছু আটকায় না)
│   │     সারিতে: [বরং Renew] (Alt+R), [ক্ষতিগ্রস্ত], Undo
│   ├─ ১০ সেকেন্ডের মধ্যে issue বা ফেরত হওয়া কপি আবার scan → উপেক্ষা (দ্বিতীয় বিপ)
│   ├─ available, card দিয়ে খোলা panel → ISSUE (inactive / limit / balance যাচাই; বন্ধ হলে কারণ)
│   ├─ available, card panel নেই (panel নেই বা ফেরত দিয়ে খোলা) → বইয়ের তথ্য; শুধু পরের
│   │     card-এর panel-এ chip, [দিন] / Alt+I দিয়ে issue; সেই card-এর পর chip আর এগোয় না
│   └─ lost / withdrawn → inline বার্তা + বিকল্প (W9, R12)
├─ School ID / PEN / staff unique_id → borrower panel (আগেরটা বদলায়, chip থাকলে দেখায়)
├─ একাধিক মিল → তালিকা থেকে বাছাই
└─ কিছুই মেলেনি → লাল + "চেনা যায়নি: <code>"
```

Shortcut: Alt+R = renew, Alt+I = issue chip, Alt+S = search, Esc = panel বন্ধ, তীর = হাতে থাকা বই বাছাই।

---

## ৫. কাজের ধাপ (প্রতিটি আলাদা commit; প্রতিটিতে CLAUDE.md-এর verification gate: `npm run verify -- --build`, `/code-review`, `next start :3100` smoke test)

| # | কাজ | কী হলে শেষ (acceptance) | Test |
|---|---|---|---|
| T1 | **নিয়মের pure logic**: `lib/library/rules.ts`, `dates.ts` (`todayIST`-এর উপর), `scan-code.ts`, `decide-scan.ts` | R1–R15, C1, C2, C4, W1–W4-এর সব নিয়ম | প্রথমে vitest (TDD)। আলাদা করে: ছুটিতে সরানো loan-এ renew; overdue → renew → আবার overdue; lost → borrower-এর কাছে পাওয়া; grace-এর সীমা; `/`-যুক্ত School ID; PEN-এর শুরুতে শূন্য; দ্বৈত মিল; প্রশ্ন খোলা অবস্থায় scan |
| T2 | **Migration** + RPC + permission | §৩ পুরোটা; S1 (RLS, REVOKE, append-only trigger); S3 (তিন জায়গায় permission) | `scripts/test-library-rpc.ts`: একসাথে দুটো issue (একটা ব্যর্থ), একই `request_id` দুইবার, anon key দিয়ে লেখা ব্যর্থ, payment + waive একসাথে সীমা ছাড়ায় না |
| T3 | **Data layer + API + undo**: `lib/library/db-library.ts`, `app/api/library/*`; `RestoreStep`-এ `op: "rpc"` | প্রতিটি route-এ guard (S2, S4 অনুযায়ী); প্রতিটি write-এ Undo `library_undo` দিয়ে; রসিদ void-এ `// undo: n/a` + confirm; `p_actor` | Journal-এর নতুন step-এর unit test; verify gate-এর guard + undo চেক পাস |
| T4 | **Catalog UI** | K1, K3, K9, stock সংখ্যা | Normalize ও duplicate-মেলানোর test |
| T5 | **Excel import** | K2; `exceljs` dynamic import | Parser test (বাংলা, ফাঁকা সারি, duplicate) |
| T6 | **Sticker print** | K4–K8 | Layout test: প্রতি পাতায় সংখ্যা, অবস্থান, ৪ mm নিরাপদ জায়গা, শুরুর ঘর |
| T7 | **Desk** | §৪-এর scan যুক্তি, W1–W9, C3–C7, শব্দ ও রঙ | `decideScanAction` ও scanner hook-এর test (burst, debounce, modifier shortcut) |
| T8 | **Fine** | R11–R15, D9, D10; আদায় / মওকুফ / ফেরত / বাতিল / রসিদ | Balance ও মওকুফের সীমার test |
| T9 | **Overdue, clearance, slip, reports** | T-c; issue-এর সময়ের class | Query helper test |
| T10 | **Settings + Scanner test** | সব নিয়ম, ছুটি, layout; prefix-এর inline validation | Settings zod test |
| T11 | **Teacher portal "আমার বই"** | S4, R9, T-d | Route-এর অধিকার test (অন্যের loan দেখা যায় না; staffId null-এ খালি) |
| T12 | **TC ও promotion integration** | T-b (server-side, Admin override), T-c-এর promotion সতর্কবাণী | `status-action`-এর tc_out: বাকি থাকলে 409, Admin override-এ সফল + event, Staff override-এ 403 |

**ক্রম:** T1 → T2 → T3 আগে, কারণ বাকি সব এদের উপর নির্ভর করে। এরপর T4–T6 আর T7–T8 আলাদাভাবে চলতে পারে। শেষে T9–T12।

---

## ৬. যা করা হচ্ছে না (এই version-এ)

- Reserve বা waiting queue, shelf audit scan: Phase 2
- Offline mode (ব্যর্থ scan আটকে থাকে, W6; কাজ জমা রেখে পরে sync হয় না)
- ISBN online lookup, `@zxing`, multi-school
- Fine fee-invoice-এ যোগ
- নতুন cron ও notification bell reminder (T-d)

## ৭. সিদ্ধান্ত হয়ে গেছে

- Student card-এর code: School ID বা PEN (card user ঠিক করবেন) (C1)
- Scanner যাচাই: Settings-এর "Scanner test", School ID ও PEN দুটোই (C2)
- Sticker: A4, default ২৪টা (৩ × ৮), কম্পিউটার-ভিত্তিক offset (K5–K7)
- মওকুফ: Admin আর flag-পাওয়া Teacher; Staff নয় (S2)
- TC override: শুধু Admin (T-b)
