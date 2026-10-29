# Phase 3f (part 1) — Verification gate + shared components

Date: 2026-10-28 · Branch: `refactor/codebase-health` · Score 5.8 → **5.9 / 10** · Tests 48 → **59** · Build ✅

## 1. Verification gate (new, permanent)
প্রতিটা task শেষে, commit-এর আগে — `CLAUDE.md`-এ নিয়ম হিসেবে লেখা।

| ধাপ | কী ধরে |
|---|---|
| `npm run verify` (`scripts/verify.mjs`) | TypeScript · **নতুন** lint error (পুরনোগুলো আলাদা দেখায়) · সব test · UI-র প্রতিটা `/api` call-এর route আছে কিনা (route মুছলে ধরা পড়ে) · hard-coded secret · API route-এ guard ও undo · `window.confirm`, native `<select>`, raw `fetch`, `console.log` · `--build`-এ production build |
| Independent review (`/code-review`) | Diff নতুন চোখে পড়া — logic bug, মুছে যাওয়া আচরণ, caller ভাঙা, convention |
| Smoke / browser check | পরিবর্তিত route ও UI আসলে চালিয়ে দেখা |
| Report | কী যাচাই হলো, review কী ধরল, কী যাচাই হয়নি |

### Gate প্রথম দিনেই যা ধরেছে (আমার নিজের ভুল)
| কোথায় | ভুল | এখন |
|---|---|---|
| Audit-1 fix (W2) | Teacher body-তে "IX" লিখে **অন্য class-এর ছাত্রের ID** পাঠালে marks বসাতে পারতেন — শুধু class-এর নাম যাচাই হচ্ছিল | প্রতিটা ছাত্রের আসল class DB থেকে যাচাই (`denyStudentsOutsideClasses`) + ৪টা test |
| Push toggle | Server-এ save fail হলেও browser "চালু" দেখাত; পুরনো key-র subscription কাজ করত না | Fail হলে rollback; key বদলালে নতুন subscribe |
| `teachers/absence` | Role ছাড়া login করা কেউ absence জমা দিতে পারত | `requireRole()` |
| এই phase-এর confirm dialog | Modal-এর ভেতর থেকে confirm চাইলে **Cancel চাপলে পেছনের modal-ও বন্ধ হয়ে যেত** (browser-এ reproduce করা) | Dialog/Sheet confirm চলাকালীন নিজে বন্ধ হয় না — Delete/Cancel/Escape তিনভাবেই browser-এ যাচাই |
| এই phase-এর search box | Debounce চলাকালীন "Clear filters" দিলে পুরনো লেখা ফিরে আসত | ঠিক |
| এই phase-এর confirm migration | `routine-subjects-tab`-এ hook ভুল component-এ বসেছিল | ঠিক (tsc ধরেছিল) |

## 2. Shared components
| Component | কোথায় | আগে | এখন |
|---|---|---|---|
| `FormSection` / `FormGrid` / `FormField` | `components/forms/form-layout.tsx` | ৩টা আলাদা copy, ৩ রকম style | ১টা; mobile-এ `text-base` (iPhone-এ zoom হয় না) |
| `FilterSelect` | `components/ui/filter-select.tsx` | results ও student filters-এ ২টা copy (~২২০ লাইন) | ১টা; Escape-এ বন্ধ, screen-reader label |
| `useConfirm()` | `components/ui/confirm-dialog.tsx` | ২০টা browser `confirm()` popup (১৬ file) | App-এর নিজস্ব dialog; delete-এ লাল button |
| `ChartTooltip` | `components/dashboard/chart-tooltip.tsx` | ৩টা copy | ১টা |
| `PageHeader`, `StatCard`, `EmptyState`, `SearchInput`, `Spinner` | `components/ui/` | ৭৪ / ২৭ / ৩৪ / ৩৫ / ৩৮টা হাতে লেখা copy | তৈরি; **Sports page-এ pilot** (−৩৯ +২২ লাইন) |

৭টা render test (`tests/unit/shared-ui.test.tsx`)। নিয়ম `CLAUDE.md`-এ: "shared component কখনো local-এ নতুন করে লেখা যাবে না"।

## যাচাই
| Check | ফল |
|---|---|
| `npm run verify -- --build` | PASS (০ fail; ২টা পুরনো lint error touched file-এ — Phase 4) |
| Tests | 59/59 |
| Browser | Confirm-inside-modal: Delete ✅ Cancel ✅ Escape ✅; guard ছাড়া bug reproduce ✅ |
| Code review | ৬ finding → ৪ fixed, ২ রাখা (Spinner এখনো ব্যবহার হয়নি — module migration-এ হবে; gate-এর lint একটু ধীর) |

## যাচাই হয়নি
Login লাগে এমন page (student/employee edit form-এর নতুন layout, results/student filter, settings-এর confirm) চোখে দেখা হয়নি — test account নেই। Style একটু বদলেছে (uniform), কাজ বদলায়নি।

## পরের ধাপ
বাকি copy-গুলো (PageHeader ৭৩, EmptyState ৩৩, SearchInput ৩৪, StatCard ২৬, Spinner ৩৮, DataTable ৩৯, Pagination ১৯, PrintShell ~২৯, dropdown ৯৩) module ধরে ধরে migrate — Phase 3.0–3.6-এর সাথে।

---

# Phase 3f part 2 — Module migration (2026-10-29)

| Shared component | Replaced | How |
|---|---|---|
| `Spinner` | 118 hand-made spinners (Loader2 / RefreshCw `animate-spin`) | codemod; bare icon, decorative (`aria-hidden`) |
| `SearchInput` | 25 search boxes (incl. 9 with their own clear button) | brace-aware JSX codemod; `size="sm"` for dialogs/tables |
| `PageHeader` | 24 page headers | TypeScript-AST codemod; new `back` + `badge` props; `BackButton` split into its own client file so server pages can pass icons |
| `EmptyState` | 12 "No … found" blocks | AST codemod |
| Unused imports/vars left by codemods | 118 removed | AST cleanup driven by ESLint output (identifiers, not text) |

### Verification
| Check | Result |
|---|---|
| `npm run verify` (+ `next build`) | PASS |
| Tests | 60/60 (+1 PageHeader actions test) |
| Code review | 3 findings, all fixed: single action block shrank on mobile · long titles truncated on mobile · 118 spinners were live regions |
| Browser (production build, 375px + desktop) | full-width action grid ✅ title wraps ✅ no horizontal scroll ✅ no hydration/console errors ✅ |

Mistakes the process caught along the way: grep escaping (2×), duplicate import, header codemod walked one AST level too high (dry-run converted 0 → fixed before writing), server pages passing icons to a client PageHeader, identifier counter matching placeholder text.

Note: a running `next dev` on :3000 served a stale PageHeader after the edits (hot-reload cache), which showed up as a hydration warning; a fresh production build has none. Restart `npm run dev` to pick up the changes.

### Left for module phases (hand work, varied markup)
StatCard (26), search pickers with keyboard/dropdown (9), headers with subtitles or custom layouts (~30), EmptyStates with icons/actions (~20), DataTable (39), Pagination (19), PrintShell (~29), dropdown unification (93).

---

# Phase 3f part 3: StatCard hand migration (2026-10-29)

`StatCard` gained props instead of local copies: `valueClassName`, `hint` (a data line, never filler), and `onClick` + `active`. With `onClick` the tile renders as a real `<button aria-pressed>`, so filter tiles now work from the keyboard (before they were `div onClick`).

| Page / component | Tiles |
|---|---|
| Students → Promotion (filter tiles) | 6 |
| Certificate tracker (filter tiles) | 5 |
| Teacher dashboard | 5 |
| Teacher management (overview + performance KPIs) | 8 |
| New admission dashboard | 4 |
| Bulk upload result | 4 |
| Backup & restore | 3 |
| Routine allotment overview | 4 |
| Staff stats cards | 4 |
| **Total** | **43** |

Filler sub-lines removed under AGENTS.md ("Registered employees", "Verified fee collections", …). Data sub-lines kept as `hint` or in the label ("Top Collector · ₹X", "% of staff").

**Kept as they are, on purpose:** these are rich panels, not stat tiles; forcing them into StatCard would drop data.
- Main dashboard `StatCards`: bento hero, demographic pills.
- Re-admission dashboard: previous-year comparison.
- Admission form tracker: online/offline breakdown.
- Invoice tracker modal: progress bars.
- Invoices page: has a session dropdown inside.
- Admission page: progress breakdown.

### Verification
| Check | Result |
|---|---|
| `npm run verify -- --build` | PASS (0 fail, 0 warn) |
| Tests | 70/70 (+1: plain tile vs `aria-pressed` toggle button, `hint`) |
| Code review | 6 findings, 5 fixed: long values overflowing on mobile, `div` inside `button`, bulk-upload status tint lost, certificate ring weight, positional tuples changed to named objects. 1 kept: hover border is primary rather than the tile's colour (cosmetic) |

### Not verified
Not looked at in a browser: the pages need a login. The look is uniform now (icon on the left, number + label). Behaviour is unchanged: the filter tiles set the same filter values as before.

---

# Phase 3f part 4: Pagination + EmptyState hand migration (2026-10-29)

**Pagination:** a new shared `components/ui/pagination.tsx`.
- Shows "a–b of N", or "Page x of y".
- Hides itself on a single page unless `alwaysShow` is set.
- Takes `disabled`.
- Real `<nav aria-label>` with labelled buttons.
- Replaced all 4 hand-made bars: admission form tracker, archived students, pending students, invoice tracker.
- The earlier estimate of "19" counted printable page-splitters, which are not pagination.

**EmptyState:** replaced 18 hand-made "No … found" blocks. Data stays in the title ("No active students in Class VI (A)", "No archived students for 2025"). Under AGENTS.md, the explanatory second lines were dropped.

| Where | Count |
|---|---|
| Teacher dashboard (notifications, leave, attendance roster) | 3 |
| Invoice tracker (registry, keeps the "Clear All Filters" action, and settlement) | 2 |
| Archived students (cards and table) | 2 |
| Routine tabs (classes, rooms, groups, allotment) | 4 |
| Applications, attendance, bulk-upload history, promotion, online admission step, pending students, print history | 7 |

The unused imports these left behind (and a few that were already unused in the same import lines) are removed.

### Verification
| Check | Result |
|---|---|
| `npm run verify -- --build` | PASS (1 warn: pre-existing lint errors in touched files, Phase 4) |
| Tests | +1 Pagination test (single page hidden, range, labelled buttons) |
| Review | 3 findings: 28px tap targets → 32px (fixed), "1–0 of 0" with an empty total (fixed), footer wording changed from count to range (kept, same information) |

### Process slip (caught and fixed)
A `git stash --keep-index` briefly took the uncommitted `AGENTS.md` edit, which is the user's file and is never committed by me. It was restored from the stash right away, and the stash was dropped. `git diff AGENTS.md` matches what it was before.

### Not verified
Not looked at in a browser (login required).

---

# Phase 3f part 5: PageHeader hand migration (2026-10-29)

15 hand-made page headers moved to `PageHeader`.
- **Admission:** portal, AI scan, offline.
- **Generate:** hub, bonafide, blank pad, certificate tracker.
- **Profile / admin:** admin hub, profile, employee profile.
- **Students:** attendance, add, edit, old-students archive.

Back links became `back`. The count, status and ID chips became `badge`. Each page's own action buttons are unchanged.

**Subtitles dropped under AGENTS.md:**
- "Record and track daily attendance"
- "Fill in the comprehensive student details below"
- The two offline tab descriptions
- "Online applications • Document verification • …"

Where a subtitle carried data, it was kept:
- "Edit Student: *name*" moves into the title.
- "ID: …" moves into the employee badge.

**Kept as they are, on purpose:**
| Header | Why kept |
|---|---|
| Student profile hero card | Many chips and actions |
| Admission form generator | Has an embedded mode with no title |
| Presets hub | Custom `SettingsBackButton` and live "Active: …" |
| The two wizards | Headers inside a card with a step bar |
| "Profile Not Linked" | Error screen |
| Public `/apply` pages | Print and receipt pages |
| Print-only headers | Not screen headers |

### Verification
| Check | Result |
|---|---|
| `npm run verify -- --build` | PASS (1 warn: pre-existing lint errors, Phase 4) |
| Review | 2 notes, no change needed: the offline header becomes a row from 640px instead of 768px; "Back to Profile" becomes the shared icon back button (same `router.back()`) |
| Unused imports or `router` left by the change | removed |

### Process slips (caught before commit)
- The header script counted self-closing `<div />` twice, so the profile page cut too early. Caught by the line count; the file was reverted and redone.
- Two off-by-one action-line starts. Caught by `tsc`; the employee page was reverted and redone.

### Not verified
Not looked at in a browser (login required).
