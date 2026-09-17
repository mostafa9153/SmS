# Bug-Fix Sprint Plan: EMS (4 Fixes Only)

## Overview & Scope
Authoritative Request: `d:\Project\Vibe Codding\SMS Web App\.agents\ORIGINAL_REQUEST.md`

### Hard Boundaries
- Fix 1: Remove old Step-3 engine call (`app/(dashboard)/ems/page.tsx`)
- Fix 2: Remove `/ems/rooms` nav tab (`components/ems/ems-nav-tabs.tsx`, do NOT create any page for it)
- Fix 3: Move localStorage to Database (`lib/ems/room-storage.ts`, persistence route, migration on first load, graceful error handling)
- Fix 4: Accurate student count (find where `rollTo - rollFrom + 1` is used, replace with actual count of student records returned from the API)
- CRITICAL: Keep Engine 2 (`arrangeRoomUnified` / `arrangeRoomInterleaved` in `seat-arrangement-algorithm.ts`, used in `seat-arrangement-editor.tsx`) UNTOUCHED. Step 4 UI must remain completely unchanged.
- Do NOT implement R3 or R6 from the previous brief.
- Ensure TypeScript builds clean (`npx tsc --noEmit` or build check).

## Phases
1. **Phase 0: Survey & Codebase Technical Investigation**
   - Agent 1 (Explorer): Technical inspection of Fix 1 (`app/(dashboard)/ems/page.tsx` line 627-662, `handleExecuteAllocation`, `generateAutoAllocation`, `MismatchModal`, Step 4 UI dependencies) & Fix 2 (`components/ems/ems-nav-tabs.tsx`).
   - Agent 2 (Explorer): Technical inspection of Fix 3 (API routes like `/api/school-config`, Supabase / DB tables, `lib/ems/room-storage.ts`, migration pattern, error handling).
   - Agent 3 (Spec Miner): Technical inspection of Fix 4 (`rollTo - rollFrom + 1` usage, `/api/students` return values and count logic) + Baseline TypeScript health check (`npx tsc --noEmit`).
2. **Phase 1: Milestone Plan & Interface Contracts**
   - Consolidate survey findings and confirm exact lines and interfaces.
3. **Phase 2: Implementation & Verification Loop**
   - Milestone 1: Fix 1 & Fix 2 (Remove Step-3 engine call, simplify handleExecuteAllocation, remove /ems/rooms nav tab).
   - Milestone 2: Fix 4 (Accurate student count based on active API records).
   - Milestone 3: Fix 3 (Database persistence for rooms and allocations, migration, graceful error handling).
   - Each milestone: Worker -> Reviewer(s) -> Challenger(s) -> Forensic Auditor -> Gate.
4. **Phase 3: Final Verification & Gate Passing**
   - Full TypeScript zero-error compile check.
   - Comprehensive audit & claim victory to Sentinel.
