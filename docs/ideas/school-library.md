# School Library (Scan-based Issue / Return / Renew)

> বিস্তারিত সিদ্ধান্ত, সম্ভাব্য সমস্যার সমাধান ও কাজের ধাপ: [tasks/plan.md](../../tasks/plan.md)। দুটোর মধ্যে অমিল হলে plan-টাই মানা হবে।

## Problem Statement
How might we একজন librarian, কম্পিউটার বা ফোন থেকে, student/teacher ও বই scan করে কয়েক সেকেন্ডে issue, return ও renew করতে পারে, আর কোন কপি কার কাছে আছে ও কত জরিমানা বাকি, তা সবসময় জানা যায়?

## Recommended Direction
প্রতিটি কপির code হবে **বইয়ের ID + `-` + কপি নম্বর** (যেমন `B0045-3`), এটাই library-র মূল ID (Accession No.)। ISBN শুধু একটা ঐচ্ছিক field: একই title-এর দ্বিতীয় কপি যোগ করার সময় সেটা scan করলে **নিজের catalog-এ** আগে থেকে থাকা title খুঁজে পাওয়া যায়। কোনো বাইরের API ব্যবহার হবে না, কারণ বেশিরভাগ বই বাংলা।

প্রতিটি কপির জন্য **একটাই sticker** থাকবে। তাতে থাকবে একটা **QR code**, যার ভেতরে শুধু Accession No., আর পাশে ছাপা লেখা: title, author, `কপি ২`, Accession No.। Sticker-এ মোট কপির সংখ্যা ("২/৫") থাকবে না, কারণ পরে নতুন কপি এলে মোট বদলে যায় আর পুরোনো sticker ভুল দেখাবে।

**Code থেকে বই কীভাবে চেনা যায়:** বই যোগ করার সময় system দুটো record বানায়। একটা হলো title-এর record (`library_books`: book_code যেমন `B0045`, title, author, publisher), আরেকটা প্রতিটি কপির record (`library_copies`: code যেমন `B0045-3`, book_id, copy_no)। Code system নিজে দেয়: ৫টা কপি যোগ করলে `B0045-1` থেকে `B0045-5` তৈরি হয়। পরে আরও কপি এলে সংখ্যা চলতে থাকে (`B0045-6`, `B0045-7`)। কোনো নম্বর আবার ব্যবহার করা হয় না, এমনকি কপি হারিয়ে গেলেও না।

Code একবার তৈরি হলে কপির record-এ **স্থায়ীভাবে লেখা** থাকবে, পরে আর হিসাব করে বদলানো হবে না। ভুল করে একই বই দুইবার যোগ হলে দুটো title এক করা (merge) যাবে, কিন্তু কপিগুলোর পুরোনো code অপরিবর্তিত থাকবে, যাতে sticker ভুল না হয়। Code-এ শুধু ইংরেজি অক্ষর ও সংখ্যা থাকবে (scanner-এর জন্য নিরাপদ)। Book ID-এর আগে শূন্য বসিয়ে ৪ অঙ্ক করা হবে, ১০,০০০-এর বেশি বই হলে নিজে থেকে ৫ অঙ্ক হবে। Scan করলে accession_no থেকে কপি, আর কপি থেকে title ও author খুঁজে বের করা হয়। Title বা author QR-এর ভেতরে রাখা হবে না, কারণ বাংলা লেখা QR-কে ঘন করে দেয়, ছোট sticker-এ scan কঠিন হয়, আর title সংশোধন করলে sticker পুরোনো হয়ে যায়। সব তথ্য database-এ থাকে, scan করলে সেখান থেকে দেখায়। Sticker-এর লেখা বাংলাতেই ছাপা হবে, ইংরেজি অক্ষরে লেখা (transliteration) হবে না। লম্বা title দুই লাইনের পর `…` দিয়ে কেটে দেওয়া হবে, আর Accession No. সবসময় পুরোটা দেখাবে। যেকোনো কম্পিউটারে একই রকম ছাপার জন্য sticker পাতায় শুধু একটা Bengali font (`next/font`-এ Noto Sans Bengali) load হবে। Sticker print-এর জন্য তিনটা বিকল্প থাকবে: একটা কপি, নির্বাচিত কপিগুলো, বা একটা title-এর সব কপি। হারানো বা ছেঁড়া sticker আবার print করা যাবে।

Student-কে চেনা যাবে ID card-এর বর্তমান Code128 barcode দিয়ে। Teacher/staff-এর ID card এখনো নেই। আপাতত নাম বা employee code দিয়ে খুঁজতে হবে, আর পরে teacher ID card এলে সেটা scan করেও চলবে। Borrower lookup শুরু থেকেই employee code-এর scan গ্রহণ করবে, তাই card এলে library-তে কিছু বদলাতে হবে না।

Scan box একটাই থাকবে, আর **কোনো নতুন library যোগ হবে না**:
- **কম্পিউটার:** 2D USB scanner। এটা keyboard-এর মতো টাইপ করে, আর QR ও Code128 দুটোই পড়ে। সস্তা 1D/laser scanner QR পড়তে পারে না, তাই কিনবেন না।
- **ফোন:** browser-এর নিজস্ব `BarcodeDetector` (Android Chrome-এ আছে, QR ও Code128 পড়ে, bundle-এ কিছু যোগ করে না)। যেখানে এটা নেই (যেমন iPhone), সেখানে বইয়ের QR পড়বে আগে থেকে থাকা `jsqr`। Student-এর Code128 card iPhone-এ পড়া না গেলে ID টাইপ করতে হবে।
- **হাতে টাইপ:** সব জায়গায় চলবে।

সব নিয়ম ও টাকার অঙ্ক Library Settings পাতা থেকে বদলানো যাবে। জরিমানার হিসাব library-র নিজস্ব, fee module থেকে আলাদা। আপাতত সিস্টেম একটা স্কুলের জন্য। পরে multi-school করতে হলে পুরো SMS-এর migration লাগবে, শুধু library-র নয়।

## Library Settings (সব configurable)
| Setting | Student | Teacher/Staff |
|---|---|---|
| সর্বোচ্চ বই একসাথে | 2 | 5 |
| Loan days | 14 | 30 |
| সর্বোচ্চ renew সংখ্যা | 2 | 3 |
| Renew-এ বাড়তি দিন | 7 | 15 |

- Fine per day (টাকা), grace days, এক বইয়ে সর্বোচ্চ fine (cap)
- Overdue থাকলে renew দেওয়া হবে কি না
- Fine বাকি থাকলে নতুন issue বন্ধ হবে কি না, আর কত টাকার উপরে বন্ধ হবে
- TC/clearance-এ বাকি বই বা fine থাকলে block হবে কি না
- Lost-book policy ও processing fee
- Book code prefix (default `B`) ও শুরুর নম্বর
- Sticker sheet layout (label paper preset)
- Fine মওকুফের preset: পুরো, 50%, বা নিজের লেখা amount

## Lost / Damaged Book
- প্রতিটি কপিতে ঐচ্ছিক **দাম** field থাকবে (আলাদা কপির দাম আলাদা হতে পারে)।
- Lost চার্জ = দাম + processing fee। দাম না থাকলে settings-এর default lost amount + processing fee।
- বিকল্প হিসেবে "একই বই এনে replace": তখন শুধু processing fee লাগবে।
- Damaged: librarian নিজে amount লিখবে (দাম পর্যন্ত)।
- হারানো বই পরে পাওয়া গেলে Undo দিয়ে চার্জ ফেরত যাবে, আর কপি আবার Available হবে।

## MVP Scope
**ভেতরে**
- Tables: `library_books` (title, author, publisher, category, language, ISBN?), `library_copies` (accession_no, price?, status: available/issued/lost/damaged/withdrawn), `library_loans` (copy, borrower student|staff, issued_at, due_at, renew_count, returned_at), `library_fines` (loan, kind: overdue/lost/damaged, amount, paid/waived, collected_by), `library_settings`
- বই যোগ: ফর্ম (বাংলা Unicode), Excel import, একই title-এর একাধিক কপি একসাথে
- Sticker print: QR + title/author/copy no./accession; একটা কপি, নির্বাচিত কপি, বা একটা title-এর সব কপি, অথবা reprint; `PrintPreview` + `usePaperSettings`
- Stock view: প্রতিটি title-এর মোট, available, issued, lost ও damaged কপির সংখ্যা
- Issue / Return / Renew screen: scan box (scanner, `BarcodeDetector`/`jsqr` camera, typing), borrower card-এ এখন নেওয়া বই, due date ও বাকি fine
- Overdue list, fine আদায় (রসিদ print), waive: পুরো / 50% / নিজের amount, কারণসহ, permission লাগবে
- TC/clearance block
- Teacher portal: "আমার নেওয়া বই" ও নিজে renew
- Permission `can_manage_library`; সব write-এ Undo (`recordUndo`)

## Key Assumptions to Validate
- [ ] ID card barcode-এর value আর student record-এর ID হুবহু মিলে: build-এর সময় কোড দেখে নিশ্চিত করা হবে
- [ ] Camera scan সস্তা Android ফোনে ID card-এর ছোট (৫.৮mm) Code128 পড়তে পারে: একটা ফোনে test; না পারলে ID টাইপ বা Bluetooth 2D scanner
- [ ] স্কুল 2D scanner কিনবে (1D scanner QR পড়ে না)
- [ ] Sticker sheet layout স্থানীয় বাজারের label paper-এ মিলে: ২–৩টা প্রচলিত layout preset রাখা

## Not Doing (and Why)
- **ISBN online lookup:** বেশিরভাগ বই বাংলা, API ফাঁকা ফেরত দেয়
- **Reserve / waiting queue:** Phase 2। স্কুলে একই বইয়ের জন্য লাইন কম হয়, আর queue-র সঙ্গে notification লাগে
- **Stock audit (shelf scan):** Phase 2, MVP-র scan box দিয়েই করা যাবে
- **Multi-school:** পুরো SMS-এর migration, library-র কাজ নয়
- **Student self-service kiosk:** ভুল ও চুরির ঝুঁকি
- **Fine fee-invoice-এ যোগ:** user-এর সিদ্ধান্ত, library আলাদা
- **E-book / DDC classification:** স্কুল library-তে দরকার কম; category field যথেষ্ট

- **নতুন camera library (`@zxing`):** bundle ভারী হয়; `BarcodeDetector` + `jsqr` দিয়েই কাজ চলে
- **Barcode/QR/none sticker-এর বিকল্প:** একটাই QR sticker সহজ, আর scanner ও ফোন দুটোতেই চলে
- **Teacher ID card:** আলাদা feature (পরে); library শুধু employee code-এর scan গ্রহণ করে রাখবে

## Open Questions
- পুরোনো হাতে-লেখা Accession Register-এর নম্বর রাখা হবে? (Excel import-এ accession_no দিলে সেটাই থাকবে)
