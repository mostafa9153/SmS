# UI & UX Design Standards & Clean Interface Rules

1. **Zero Text Clutter & Minimalist Design**:
   - UI-তে কোনো অপ্রয়োজনীয় বা পুনরাবৃত্তিমূলক বড় টেক্সট/প্যারাগ্রাফ রাখা যাবে না।
   - শুধুমাত্র প্রয়োজনীয় ও কার্যকরী লেবেল এবং কন্ট্রোল প্রদর্শন করুন।

2. **Progressive Disclosure via Icons**:
   - যদি কোনো হেল্পার টেক্সট, অতিরিক্ত বিবরণ বা নির্দেশিকা দিতে হয়, তবে তা সরাসরি পৃষ্ঠায় না দেখিয়ে একটি সুন্দর আইকন (যেমন: ⓘ `Info`, ⚙ `Settings`, বা Tooltip) দিয়ে রাখুন। ইউজার যখন আইকনে ক্লিক বা হোভার করবেন, কেবল তখনই টেক্সট দৃশ্যমান হবে।

3. **Design System & Theme Consistency**:
   - ডিজাইন সবসময় মূল Web App-এর ডিজাইনের সাথে ১০০% সঙ্গতিপূর্ণ হতে হবে (Tailwind tokens: `bg-card`, `border-border`, `text-foreground`, `ring-primary`, ইত্যাদি)।
   - আকর্ষক ও প্রিমিয়াম লুকের জন্য সূক্ষ্ম মাইক্রো-অ্যানিমেশন (`transition-all`, `hover:scale-[1.01]`, `animate-in fade-in duration-150`) ব্যবহার করুন।
