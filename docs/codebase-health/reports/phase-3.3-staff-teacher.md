# Phase 3.3 — Staff & Teacher (part 1)

Closes the follow-ups left by audit 2 for staff, teacher permissions, tasks and EMS saving. The teacher portal pages, the teacher dashboard and the routine-side teacher tables were not audited.

## Findings and fixes

| ID | Finding | Fix |
|---|---|---|
| ST-1 | `PATCH /api/employees/[id]` let a teacher edit **their own** profile with any column: `basic_pay`, `designation`, `status`, `unique_id`, `employee_type`, `service_type`, `primary_meta` (holds the appointed subject) | `lib/employees/self-edit.ts` allow-list. Fields outside it are dropped for a teacher, not rejected, so the existing form keeps saving. Admins unchanged. |
| ST-2 | Staff edit had no undo | Before-image of the profile and its `user_roles` link, `updated_at` guard, `undoId` + toast |
| ST-3 | Staff delete had no undo. Delete cascades into 6 tables and nulls the login link | Before-image of the profile, `user_roles.staff_id` rows and `teacher_class_assignments`, `teacher_task_assignees`, `teacher_permission_grants`, `teacher_absences`, `teacher_routine_slots`, `routine_teacher_availability`; restore order is profile first; 72 h; toast |
| ST-4 | Teacher permissions, appointed subject and temporary grants had no undo | Before-image of the `user_roles` and `staff_profiles` rows; the grant row a call created is deleted on undo; toast on the three permission screens. A password reset is not journaled (cannot be replayed). |
| ST-5 | Admin task approve/status, task delete and "clear all" had no undo | Journaled (tasks + assignees; delete and clear-all 72 h). A teacher submitting their own progress is not journaled. |
| ST-6 | A teacher with `can_manage_ems` could not save EMS rooms, allocations or routines: `POST /api/school-config` was Admin/Staff only | A teacher may write `ems_*` keys when `can_manage_ems` is on; every other key stays Admin/Staff |

Test: `tests/unit/self-edit.test.ts` (2 tests).

## Verified

`npm run verify -- --build`: PASS, 0 fail, 0 warn.

## Not verified

- No signed-in run of any of this: edit a staff profile and undo; delete a teacher with class assignments and undo, then check the assignments, the login and the routine slots are back; toggle a permission and undo; save EMS as a teacher.
- Undo of a staff delete assumes every restored table has a primary key the upsert can match (all use `id`; `user_roles` uses its own key). The `teacher_activity_logs` and `teacher_chat_messages` rows lose their link on delete (`ON DELETE SET NULL`) and are not restored.
- The teacher EMS gate is not covered by a test; route-level tests need an auth mock that does not exist yet.

## Review follow-up

The same review found: a teacher's self-edit journaled the full `user_roles` row, so a stale undo could bring back permissions an admin had revoked — self-edits now journal only the profile, and both the profile and the permission undo last 1 hour. Still open: deleting a staff profile also nulls `teacher_id` on `teacher_activity_logs`, `teacher_chat_messages`, `student_attendance` and `student_marks`, and deleting a task nulls `teacher_permission_grants.task_id`; those links are not restored by undo (snapshots could be very large). Undo also does not clear the 60 s role cache, so restored permissions can lag by up to a minute.

## Deliberately not done

- **Settings undo** (`POST /api/school-config`): school profile, class management, marks schemes and the presets are saved to localStorage first and synced to the server in the background from about ten different files. A server-side undo would leave the browser copy ahead of the database. The saves need to move to `apiFetch` with the server as the source of truth first (same pattern as the sports config). The route carries an `// undo: n/a` note with this reason.
- The route also accepts any key matching `^[a-z0-9_-]{2,100}$`, not only the listed ones. Tightening it could break the routine and preset writers; needs a list of the keys they use.
