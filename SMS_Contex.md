# Student Management System — Project Context & Decision Log (v2)

> Re-upload this file at the start of any new chat (with Claude or Antigravity) to restore full context.
> This version supersedes the earlier PROJECT_CONTEXT.md — it merges the ORIGINAL plan with the ACTUAL audited codebase state (2026-08-23) and a large new round of feature/architecture decisions made 2026-08-23.

Last updated: 2026-08-23

---

## 1. Project Summary

School Student Management System for a West Bengal school (reference: Banglar Shiksha portal style, PRD in Bangla). Solo build using Antigravity (AI vibe-coding tool), with Claude as technical architect/task sequencer.

Roles: Admin (full Aadhaar access) and Staff (masked Aadhaar). Public sign-up OFF — only pre-created accounts.

---

## 2. ACTUAL Current Codebase State (audited 2026-08-23)

`npm run build` passes — 0 TS errors, 16 routes.

### Working / Real Supabase-backed
- `/` Dashboard — stat cards, status donut, class-strength bar chart
- `/students` — filtered/paginated list, TanStack Table v8, Aadhaar masking
- `/students/add` — 9-section form (RHF, basic HTML validation, no full Zod schema yet)
- `/students/[id]` — 6-tab profile: Personal, Enrolment & Academic, Facilities & Profile, Bank Details, Identification, History
- `/students/[id]/edit` — same form, pre-filled, `schoolId` read-only
- `/students/promotion` — bulk promote/detain, real mutations via `POST /api/students/bulk`
- `/settings` — user/role management, audit log viewer (Admin only); School Profile tab is a stub
- `/login` — Supabase Auth email/password

### NOT real yet
- `/students/bulk-upload` — **UI-only skeleton.** Hardcoded mock validation/preview data, fake `setInterval` progress, no `xlsx`/`papaparse` installed, **no actual DB writes**.
- `/reports` — placeholder ("Coming in Phase 2")
- **Results/Marks module** — not started at all. No schema, no API, no UI. (Confirmed: will be a separate `student_results` table, FK → `student_id`.)

### Database (already migrated)
- `students` (~90 columns, PK `id` UUID, unique `school_id`, RLS on)
- `academic_history` (FK → students, cascade delete)
- `user_roles` (Admin/Staff)
- `audit_log` (performed_by, action, table_name, record_id, old_values/new_values JSONB, metadata)
- RLS: Admin full CRUD; Staff SELECT+UPDATE only (no INSERT/DELETE) on `students` and `academic_history`

### Known gaps to fix (priority order for next tasks)
1. **Bulk Upload real implementation** — install `xlsx`/`papaparse`, wire real parse → validate → preview → import, replace all mock data
2. **Results/Marks module** — schema + API + UI (all new, see Section 4 below)
3. Promotion page currently appends to `academicHistory` client-side then PATCHes — **needs verification** that this correctly inserts a new `academic_history` row server-side rather than mutating a column
4. Settings page calls Supabase browser client directly for user management — should move through `/api/admin/users` (service-role) instead
5. Stale dead fields in `lib/types.ts`: `bspId`, `fatherOccupation`, `motherOccupation`, `annualIncome` — remove (replaced by `annualFamilyIncome`)
6. No toast/notification system — mutations fail/succeed silently
7. No full Zod schema for the large Add/Edit form (~80 fields) — currently HTML-level validation only
8. `getDistinctClasses/Sections/Years` fetch ALL students client-side — replace with a dedicated distinct-value query
9. `middleware.ts` → rename to `proxy.ts` (Next.js 16.3.1 deprecation, non-breaking for now)
10. `Passed Out`/`Sent Up M.P.`/`C.C.H.S.` statuses exist in type system but promotion page only handles promote-to-next-class / detain — no final-year exit flow yet

### Tech stack — actual installed versions
Next.js 16.3.1 (App Router), React 19.2.8, TypeScript 5, Tailwind 4, shadcn/ui, `@supabase/supabase-js` 2.112.3 + `@supabase/ssr`, TanStack Query 5, **TanStack Table v8 (pinned — v9 breaks TS build)**, React Hook Form 7 + Zod 3, Recharts 3, lucide-react, date-fns.
**Missing:** `xlsx` / `papaparse` (needed for real bulk upload).

---

## 3. NEW Feature Plan — decided 2026-08-23 (not yet built)

### A. Student Directory upgrade
- New DB fields needed: `religion` (may already exist — audit shows it in Student interface, confirm it's on `students` table), `aikyashree`, `shikshashree`, `kanyashree_k1` (bool), `kanyashree_k2` (bool/status), `cwsn` (already exists as `is_cwsn`), `sarathi`
- New filters: active/dropout status, gender, class, section, caste, religion, Kanyashree K1/K2, Aikyashree/Shikshashree, CWSN, Sarathi
- Universal search across the directory
- All data editable inline; data can be added directly from the directory
- Sort: alphabetical, by Result (total marks/percentage), ascending/descending
- Dedicated "Result" button per row
- Report Download: column-selector checkbox UI (choose which fields to include) → Excel/CSV export (needs `xlsx`)
- New field: promotion/detention status
- "Personal Information / Enrolment Information / Facility Profile" = the 3 tabs in Add/Edit form (**already matches actual 6-tab profile built** — reconcile naming)

### B. Results / Marks Module (net new)
- **Rank is based ONLY on Total Marks** (not percentage) — sort descending, assign rank. Percentage still shown as a column but does not drive rank.
- Rank needed in TWO forms, both stored: `rank_in_section` (class+section) and `rank_in_class` (whole class, all sections) — toggle in UI
- Needs an **Exam Config** concept: per-class, per-year, subject list + full marks per subject (required to validate entered marks and compute percentage, and to block entries exceeding full marks)
- Result entry screen (`Add → Result`): class selection **mandatory**, default class pre-selected, filters by class/section/roll/Student ID
- Table columns: Student ID, PEN, Name, Class, Section, Total Marks, Marks Obtained, Percentage, Rank
- View historical results (2025/2024/2023...) from Student Profile, filterable by year — ties into `academic_history`/new `student_results` table

### C. Bulk Upload — full logic (net new, replaces current mock)
- **Matching priority for existing students:** School ID → PEN → Aadhaar → BSP ID. Never match by name (case/spacing unreliable). Name mismatch when ID matches = warning shown to admin in Preview, not auto-block.
- New students with no School ID yet (fresh BSP/UDISE import): match by PEN/Aadhaar/BSP ID; no match = treated as new admission, triggers School ID auto-generation
- **Column Mapping step**: source Excel headers auto-suggested (fuzzy match) against DB fields, admin confirms/corrects via dropdown, mapping saved as a reusable **Template** (e.g. "BSP Template", "UDISE Template") for future uploads from the same source — no need to re-map next time
- **Blank/missing field rule** (applies everywhere, including promotion-related uploads): if a column is absent from the source file OR a cell is blank, the **existing DB value is preserved** — never wiped. Only a genuine non-blank incoming value triggers an update, and that update is logged in `audit_log` (old_value → new_value). Single rule everywhere: "blank or absent = no change."
- **Import Rollback**: every bulk upload tagged with a batch/import ID; admin can undo an entire batch in one click if something goes wrong
- **In-file duplicate check**: flag rows within the same uploaded file sharing PEN/Aadhaar, in addition to DB-matching
- **DOB vs Class mismatch flag**: validation warning if a student's age doesn't fit their class (typo catcher, e.g. Class V with age 16)
- Rejected/out of scope: "coming soon 18" alert list

### D. New Academic Session workflow (net new)
- Explicit **"Start New Academic Session"** action (not silent/automatic) — sets a `current_academic_year` value in a settings table
- After triggering, any subsequent promotion/bulk-upload/result-entry is treated as the new year; on update, the outgoing class/section/roll is first snapshotted into `academic_history`, then the current record is updated (snapshot-then-update, not raw overwrite) — this is the pattern the current Promotion page needs to be verified against (see gap #3 above). This must happen in one transaction per student to avoid inconsistent data on partial failure.
- Students not yet touched by the new session simply continue showing old data — no forced mass-migration, which reduces risk of errors

### E. Kanyashree K2 eligibility flag
- **MVP scope confirmed: Age 18+ only**, computed live from DOB (not stored). Can be extended later with marital status / prior-K1 criteria if needed.

### F. Student Profile page
- **Confirmed: full page, own URL** (`/students/[schoolId]` — already exists in the actual build as `/students/[id]`, reconcile ID scheme: currently keyed by UUID `id`, plan discussion assumed `schoolId` — decide which is the public-facing URL key)
- Opens from anywhere a student is referenced: Directory table, Search results, Result entry table
- Structure:
  - **Header**: Name, School ID, Photo (future), current Class-Section-Roll, color-coded Status badge (Continuing/Drop Out/etc.)
  - **Tab 1 — Personal Information**: DOB, Gender, Aadhaar (role-based masked/full), Contact, Guardian Contact, Religion, Social Category, etc.
  - **Tab 2 — Enrolment Information**: PEN, BSP ID, admission-related details
  - **Tab 3 — Facility Profile**: Kanyashree K1/K2, Aikyashree, Shikshashree, CWSN, Sarathi — shown as color-coded badges (received/not received)
  - **Tab 4 — Academic History**: year-wise Class/Section/Roll table
  - **Tab 5 — Result History**: year-wise Total Marks/Percentage/Rank + a small trend chart (percentage over years)
  - Each tab supports inline edit per role permissions
  - Admin-only Audit Log section: who changed what field and when
- Already substantially built (6 tabs in the actual codebase) — mainly needs Results History added as a 7th tab, plus Facility/welfare badges per Section A/B above

### G. Add Student (confirmed, matches original plan)
- 3 tabs: Personal / Enrolment / Facility Profile, both Excel and form input options
- School ID auto-generated in real-time Asia/Kolkata format, e.g. `MHS/2026/01/V/A/001` = School code / Admission year / Session identifier / Class / Section / yearly serial number
- **Serial number generation must be server-side** (atomic increment in a Route Handler) — never client-side, to avoid duplicate IDs when two staff add students concurrently

### H. Design/UI direction (deferred)
- Overall goal: modern, fast, minimal-colorful, stylish UI with animation, very user-friendly
- Explicitly deferred until the feature/data model is finalized, to avoid rebuilding the UI twice — will be tackled as a dedicated pass once schema + core logic are in place

---

## 4. Open reconciliation items (plan vs actual — resolve first)
- [ ] Actual profile route uses `/students/[id]` (UUID) — confirm whether to keep UUID or switch to School ID in the URL
- [ ] Confirm `religion` field already exists on real `students` table (appears in TS interface per audit — verify DB column)
- [ ] Actual build has 6 profile tabs (Personal / Enrolment & Academic / Facilities & Profile / Bank Details / Identification / History) vs plan's "3 tabs" — 6-tab version is more granular and should be kept; just need Results History added as a 7th tab
- [ ] Verify `dbUpdateStudent`'s handling of `academic_history` on promotion (append vs overwrite) — Gap #3

## 5. Immediate Next Task (once resumed)
Start with **Bulk Upload real implementation** (Gap #1) since it's the biggest functional hole and blocks the BSP/UDISE workflows — install `xlsx`, build column-mapping step, wire matching/blank-skip/rollback logic from Section 3-C above.

---

## 6. Change Log
| Date | Change |
|---|---|
| 2026-08-19 | Initial context file — frontend plan, tech stack, architecture decisions |
| 2026-08-23 | Major update: merged real codebase audit (16 routes, DB schema, gaps) with large new feature-planning round (Results module, Bulk Upload full logic, New Session workflow, Directory upgrade, Kanyashree K2 MVP, Profile page confirmed full-page) |