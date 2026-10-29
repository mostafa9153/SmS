# Audit 3: unused code and unreachable features (report only, nothing deleted)

Date: 2026-10-29 · Method: export scan across `lib/` and `components/`. An export counts as used if its name appears as a word in any other file under `app`, `components`, `lib`, `tests`, `scripts` or root `proxy.ts`. Then route→caller tracing.

Nothing has been deleted. Some "unused" code is **finished backend work that the UI never calls**. That needs a decision (wire it or drop it), not a quiet delete.

## 1. Unreachable features (route exists, no screen calls it) ⚠️ decide first
The only caller of each route below is a wrapper in `lib/data/*` that **nothing imports**.

| Feature | Route | Dead wrapper | Note |
|---|---|---|---|
| Academic session rollover (readiness check + transition) | `GET /api/academic-session/readiness`, `POST /api/academic-session/transition` | `getSessionReadiness`, `executeSessionTransition` (`lib/data/students.ts`) | The Academic Session page only saves settings. The year-end rollover the backend supports has **no button** |
| Revert an admitted application to pending | `POST /api/admission/applications/[id]/revert` | `revertAdmissionApplication` | |
| Edit / delete an application | `PATCH`/`DELETE /api/admission/applications/[id]` | `editAdmissionApplication`, `deleteAdmissionApplication` | |
| Move applications to active students | `POST /api/admission/applications/transfer-to-active` | `transferApplicationsToActive` | |
| Batch re-admission | `POST /api/admission/re-admission/batch` | `executeBatchReAdmission` | This is the route in **Audit 2 A-API-1** (no role check). Since no UI uses it, the safest fix is to **delete the route** unless you plan a batch screen |
| Bulk student update | `POST /api/students/bulk` | `bulkUpdateStudents` | |
| Distinct admission years / old-student years | (wrappers) | `getDistinctAdmissionYears`, `getOldStudentYears` | Pages build year lists themselves; this ties in with Audit 2 A-YEAR-1 |

Also: `POST /api/push/send` has no in-app caller. It may be meant for server-to-server use; confirm.

## 2. Dead functions (safe to delete once section 1 is decided)
| File | Unused |
|---|---|
| `lib/routine/routine-helpers.ts` | `PRESET_STREAMS`, `toClassSubjectKey`, `getTeacherSectionPeriod`, `filterSubjectsForClassStream`, `calculateClassGroupPeriods` |
| `lib/routine/routine-sync.ts` | `syncRemoveRoutineSubjectFromMarksSchemes`, `syncAllSubjectsBidirectional` |
| `lib/routine/routine-groups.ts` | `filterOutGroupedSubjects` |
| `lib/supabase/db-routine.ts` | `saveRoutineGeneratedDb` (superseded by `saveGeneratedRoutineDb`) |
| `lib/ems/*` | `getRoomById`, `arrangeRoomUu`, type `SeatArrangementMetadata` |
| `lib/backup/*` | `deleteDriveBackup`, `KNOWN_BACKUP_TABLES` |
| `lib/utils/*-presets.ts`, `school-profile.ts`, `preset-addresses.ts` | `saveBankPresets`, `saveSchoolPresets`, `saveStudentEntryPresets`, `saveSchoolProfile`, `saveAddressPresetsConfig`. Settings now save through the API, so these localStorage savers are leftovers |
| `lib/utils/certificate-registry.ts` | `buildTransferCertInsert` |
| `lib/constants/student-options.ts` | `RELIGION_OPTIONS` |
| Types | 10 in `lib/types/teacher.ts`, 5 in `lib/routine/types.ts`, 3 in `lib/validations/student-schema.ts`, `SportsResultEntry` |

False positive checked: `lib/supabase/middleware.ts#updateSession` is used by root `proxy.ts`.

## 3. Over-exported (used only inside their own file)
228 names in 105 files are exported but only used inside their own file. Examples:
- Unused shadcn sub-parts (`DropdownMenuSub*`, `SelectScroll*`, `CardFooter`)
- Internal helpers in `excel-parser`, `marksheet-calc` and `fee-config`

This is harmless (no runtime cost) and low priority. Dropping the `export` keyword would shrink the public surface, but shadcn files should stay as generated.

## Recommendation
1. **Decide on section 1, feature by feature:**
   - Academic session rollover is real year-end functionality and most likely needs a screen.
   - Batch re-admission: delete it, because it is also a security risk.
   - Application revert / edit / delete: wire into the Applications page if staff need them.
2. After that, one cleanup commit deletes the section 2 code (about 30 functions plus types) with the gate run. Rough diff: about −600 lines.
3. Add the two scans to `npm run health`: unused exports, and routes with no caller (a route→client "wiring" check, the reverse of the existing client→route check).

Scan scripts (re-runnable): `unused-exports.js` and `orphan-routes.js` in this session's scratchpad. They can move to `scripts/` with step 3.

## Done (2026-10-29)
- **Batch re-admission route:** already removed in Audit 2 (A-API-1); nothing left to do.
- **Section 2 deleted:** re-scanned first (the list had drifted since the audit), then removed every export no file mentions, in three passes because deleting a type can orphan the types it used (`TaskType`, `TaskStatus`, `TeacherTaskAssignee`, `UuArrangeResult` …). 21 files, about 740 lines, plus the imports that became unused. Declarations were removed through the TypeScript AST, not by hand.
- **Health scan:** `npm run health` now reports `orphanRoutes` (API routes no client code calls). Unused exports were already counted by knip there.
- **Verified:** `npm run verify` passed (types, lint, tests, client→route, conventions) and `next build` passed. Removed names were also searched in `python-backend/`, `scripts/` and `supabase/`: no hits. No smoke test: only unreferenced code was removed, so no route or page behaves differently.

## Still waiting on a decision (nothing deleted)
| Item | Recommendation |
|---|---|
| Academic session rollover (`readiness`, `transition`) | Build a screen: it is the year-end rollover. Feature work, so it needs your go-ahead |
| Application revert / edit / delete / transfer-to-active | Wire into the Applications page if staff need them, else delete |
| `POST /api/students/bulk`, `getDistinctAdmissionYears`, `getOldStudentYears` | Delete unless a screen is planned |
| `POST /api/push/send` | The only route `orphanRoutes` still lists. Delete unless something outside the app calls it |
| Section 3 (228 over-exported names) | Leave: no runtime cost |
