# Original User Request

## Initial Request — 2026-09-16T14:50:00Z

Key Responsibilities & Requirements:
1. R1: School ID and Admission Details Bidirectional Linkage
   - School ID generation and formatting: `[SCHOOL_CODE]/[CLASS]/[ADMISSION_YEAR]/[ADMISSION_NO]` (Register No).
   - Bidirectional linkage between School ID and Admission Details:
     - Changing Class, Admission Year, or Admission No (Register No) auto-updates School ID format.
     - Changing School ID parses and auto-updates the respective fields if in format.
     - Lock/unlock mechanism for manual override of School ID when needed.
     - Consistent across Student Admission forms, Student Edit forms, and student management views.
     - Roman numeral conversion for Class where appropriate (e.g. Class 5 -> V, Class 10 -> X).
     - Accurate admission_date vs present_class_admission_date handling.
2. R2: Auto Student Profile Creation on New Admission
   - New Admission application models, tables/collections, and workflows: online, offline, AI-scan.
   - When an admission application is approved / admitted, an authentic, full Student profile must automatically be created in the student database (`students` table/collection).
   - Exact and complete field mapping from Application to Student profile:
     - Name, Gender, DOB, Blood Group
     - Father's Name, Mother's Name, Guardian details
     - Contact numbers, Email, Full Address
     - Religion, Caste / Category
     - Aadhaar Number, Kanyashree ID (if applicable)
     - Bank details (Account number, IFSC, Bank name)
     - Previous School history / Transfer Certificate details
     - Admission details: admission_no, admission_year, admission_date, present_class_admission_date, roll_no, class, section, status
     - Academic history initialization
   - Ensure synchronization and error handling so application approval never fails or leaves orphaned/half-created profiles.
3. Verification & Synchronization:
   - TypeScript build compiles with zero errors (`npm run build` or `npx tsc --noEmit`).
   - Auto-sync and approval profile creation working end-to-end.
   - Unit/integration test verification for R1 and R2.

## Follow-up — 2026-09-16T17:33:19Z

This is a bug-fix sprint on an existing Next.js school management app's Exam Management System (EMS). Fix exactly the 6 issues described below — no new features, no refactors beyond what is needed. Deploy 4 agents working in parallel — user explicitly requested 4 agents.

Working directory: d:\Project\Vibe Codding\SMS Web App
Integrity mode: development

---

## Context

The EMS is a 5-step exam seating wizard. Key files:
- `app/(dashboard)/ems/page.tsx` — 5-step wizard master file (~72KB)
- `lib/ems/allocation-engine.ts` — old Step-3 auto-allocation engine
- `lib/ems/seat-arrangement-algorithm.ts` — Step-4 engine (`arrangeRoomUnified`, `arrangeRoomInterleaved`)
- `lib/ems/room-storage.ts` — localStorage persistence layer
- `components/ems/seat-arrangement/seat-arrangement-editor.tsx` — seat editor UI
- `components/ems/seat-arrangement/column-class-assigner.tsx` — column class dropdowns
- `components/ems/rooms-manager-dialog.tsx` — room manager dialog
- `components/ems/ems-nav-tabs.tsx` — top navigation tabs

Read AGENTS.md in the project root before writing any Next.js code.

---

## Requirements

### R1. Unified Single Seating Algorithm (Remove Duplicate Engine)

Step 3 of the wizard currently calls `generateAutoAllocation()` from `allocation-engine.ts`, validates it, then Step 4 discards it and runs a completely different algorithm (`arrangeRoomUnified`). This is confusing and causes mismatches.

**Fix**: Step 3 should only gather room selections and configuration. Remove the call to `generateAutoAllocation()` from Step 3's "Proceed" button handler. Step 4's `arrangeRoomUnified` / `arrangeRoomInterleaved` is the single source of truth for seating. Remove the mismatch validation modal that was comparing the now-removed Step-3 result. The `allocation-engine.ts` file can be left as-is but must no longer be called from the wizard flow.

### R2. Fix Dead Route `/ems/rooms` (404 Error)

`app/(dashboard)/ems/rooms/` directory exists but is empty — clicking the "Rooms" tab in `ems-nav-tabs.tsx` causes a Next.js 404.

**Fix**: Create `app/(dashboard)/ems/rooms/page.tsx` that renders the existing `RoomsManagerDialog` component contents (or redirects to the main EMS wizard `/ems` with the rooms manager dialog pre-opened). The nav tab must no longer 404.

### R3. Non-Destructive Pattern-Based Auto-Arrangement

Currently, changing a column class dropdown in `seat-arrangement-editor.tsx` calls `runCascadeAllocationAcrossRooms()`, which wipes ALL manual seat customisations across all rooms.

**Fix**: The two patterns (INTERLEAVED and FIXED_U) should auto-arrange seats when first applied or when the user explicitly clicks a "Re-arrange" / "Apply Pattern" button. Changing a column's class assignment dropdown must NOT trigger a full cascade regeneration. The user must be able to manually adjust column classes freely after the initial auto-arrangement without losing all data. Add a clearly labelled "Apply Pattern & Re-arrange" button that the user can click intentionally when they want to regenerate, with a confirmation dialog warning that it will reset manual changes.

### R4. Move EMS Persistence from localStorage to Database

Currently EMS room configs and allocations are saved to browser `localStorage` (`sms_ems_saved_allocations_v1`, `sms_ems_rooms_v1` keys). This hits the 5 MB browser quota and is lost if the browser cache is cleared or a different device is used.

**Fix**: Move EMS room configuration and allocation persistence to the existing Supabase/database backend. Inspect the existing `school-config` API route and database schema to understand the persistence pattern already in use. Store EMS rooms and allocations via the existing API or a new dedicated API route. The `room-storage.ts` file should be updated to read/write from the database instead of localStorage. Maintain backward-compatibility: on first load, if old localStorage data exists, migrate it to the database and clear the localStorage keys.

### R5. Fix Student Count — Handle Non-Contiguous Roll Numbers

The wizard currently computes the student count for a class selection as `rollTo - rollFrom + 1`, assuming all roll numbers between `rollFrom` and `rollTo` are active. In reality, some students may have dropped out or have absent/irregular status. This over-counts students.

**Fix**: When fetching students from `/api/students`, count only the actual records returned for the selected class/section/academic-year — do not rely on `rollTo - rollFrom + 1` arithmetic. The displayed student count should reflect the true number of active student records, not a range calculation.

### R6. Manual Column Manipulation Must Work Alongside Auto-Patterns

The user wants to: (a) choose a seating pattern (INTERLEAVED or FIXED_U), (b) have seats auto-arranged, and then (c) freely adjust individual column class assignments manually — all without the system wiping their manual changes.

**Fix** (closely related to R3): After a pattern is applied and seats are arranged, the column class dropdowns in `column-class-assigner.tsx` must update the column's class assignment in local state only — they must not trigger cascade regeneration. The visual seat map must re-colour/re-label seats for that column to reflect the new class, but must not reassign students in other columns. This ensures the preset pattern and manual column control coexist.

---

## Acceptance Criteria

### R1 — Single Algorithm
- [ ] Clicking "Proceed to Seat Arrangement" in Step 3 does NOT call `generateAutoAllocation` or show a mismatch modal.
- [ ] Step 4 opens and uses only `arrangeRoomUnified` / `arrangeRoomInterleaved` as the seating engine.
- [ ] The mismatch validation modal is removed or unreachable from the normal flow.

### R2 — Dead Route Fix
- [ ] Navigating to `/ems/rooms` does not return a 404.
- [ ] The Rooms tab in `ems-nav-tabs.tsx` loads a functional page.

### R3 & R6 — Non-Destructive Column Editing
- [ ] Changing a column class dropdown does NOT trigger `runCascadeAllocationAcrossRooms`.
- [ ] A clearly labelled re-arrange / apply-pattern button exists and shows a confirmation before regenerating.
- [ ] Manual column class changes are reflected in the visual seat map for that column only, without disturbing other columns.

### R4 — Database Persistence
- [ ] EMS room configs and allocations are saved to and loaded from the database (not localStorage).
- [ ] If localStorage data exists on first load, it is migrated to the database automatically.
- [ ] The app does not crash if the database call fails — show a user-friendly error.

### R5 — Accurate Student Count
- [ ] The displayed student count for a class selection equals the actual number of active student records returned by the API, not `rollTo - rollFrom + 1`.

## Follow-up — 2026-09-16T17:49:39Z

Requirements have been updated and clarified by the user. Please restart with ONLY the following 4 fixes. Do NOT implement R3 or R6 from the previous brief.

Working directory: d:\Project\Vibe Codding\SMS Web App

Read AGENTS.md in the project root before writing any Next.js code.

---

## UPDATED REQUIREMENTS — Only 4 fixes

Clarification from user: They want to KEEP Engine 2 (arrangeRoomUnified / arrangeRoomInterleaved in seat-arrangement-algorithm.ts, used in seat-arrangement-editor.tsx). This is the engine that powers their INTERLEAVED and FIXED_U pattern UI shown in the image — DO NOT touch this at all.

What to REMOVE is Engine 1: the call to `generateAutoAllocation()` from `allocation-engine.ts` that happens in `page.tsx` at line 642 inside `handleExecuteAllocation()`. This old engine runs in Step 3 and its result is immediately discarded when Step 4 loads.

Confirmed task list (4 fixes only):

**Fix 1 — Remove old Step-3 engine call (page.tsx)**
- In `app/(dashboard)/ems/page.tsx`, inside `handleExecuteAllocation()` (around line 627-662):
  - Remove the call to `generateAutoAllocation()` at line 642
  - Remove the mismatch modal logic (`setMismatchModalOpen`, `setMismatchReport`, `setPendingAllocation`)
  - Simplify: just validate that rooms are selected, then call `finishAllocation()` directly to advance to Step 4
  - Remove the import of `generateAutoAllocation` from line 24
  - Keep `finishAllocation()` function as-is
  - Keep `MismatchModal` component only if it is used elsewhere; if only used here, remove it
- Step 4 UI (seat-arrangement-editor.tsx) must remain completely unchanged

**Fix 2 — Remove /ems/rooms nav tab**
- In `components/ems/ems-nav-tabs.tsx`, remove the tab/link that navigates to `/ems/rooms`
- Do NOT create any page for it

**Fix 3 — Move localStorage to Database**
- Inspect existing API routes (look at `/api/school-config` or similar) to understand the persistence pattern
- Update `lib/ems/room-storage.ts` to save/load rooms and allocations from the database instead of localStorage
- On first load, if localStorage keys `sms_ems_saved_allocations_v1` or `sms_ems_rooms_v1` exist, migrate them to DB then clear localStorage
- Show a user-friendly error if DB call fails

**Fix 4 — Accurate Student Count**
- Find where `rollTo - rollFrom + 1` is used for student count calculation
- Replace with actual count of student records returned from the API
- The displayed student count must equal actual active DB records

---

## Acceptance Criteria

### R1 — Single Algorithm
- [ ] Clicking "Proceed to Seat Arrangement" in Step 3 does NOT call `generateAutoAllocation`.
- [ ] No mismatch modal appears in the normal flow.
- [ ] Step 4 UI looks exactly the same as before (column dropdowns, pattern buttons, seat visual map all intact).

### R2 — Nav Tab Removed
- [ ] The Rooms nav tab is gone from `ems-nav-tabs.tsx`.
- [ ] No broken link to `/ems/rooms` exists in the UI.

### R3 — Database Persistence
- [ ] EMS room configs and allocations are saved to and loaded from the database.
- [ ] Old localStorage data is auto-migrated on first load.
- [ ] A user-friendly error is shown if the DB call fails.

### R4 — Accurate Student Count
- [ ] The displayed student count equals the actual number of active student records from the API.

After completing all fixes, provide a summary of every file changed and what was done.
