# Phase 4.4 — settings undo (group D)

## Layout
- `app/api/school-config` POST: `snapshotRows` on `system_config`, `recordUndo` (upsert old row, or delete the key when it did not exist), returns `undoId`. The `// undo: n/a` line is gone. GET accepts `fresh=1` to skip the 60 s cache (used right after an undo).
- `saveSchoolConfig(key, value, { label, mirror, localFirst? })` in `lib/utils/school-config-client.ts`: POST, then mirror to localStorage + event, then `toastWithUndo`; on undo it reloads config with `fresh=1` and rewrites the mirror.
- Converted: marks schemes, promotion policy, class management (hook and school-details stream sync), school presets, bank presets, address presets, student entry presets, school profile.

## Behaviour edits
- The five `save…ToDb` functions are now server-first: the browser copy is written only after the server accepts the value. A rejected save shows an error toast and returns false (before: localStorage kept, failure silent or "Saved Locally").
- The four sync savers (marks, promotion, classes ×2) keep their local-first write; failure is now visible as a toast.
- Saves that land in the `audit_log` fallback (system_config unavailable) are not undoable (`undoId: null`).
- Undoing a first-ever save (key did not exist) deletes the row, but the browser copy stays until the next refresh.
- Saving four preset groups at once shows four toasts.

## Verified
`verify.mjs --build` 0 fail. Unit tests: `tests/unit/save-school-config.test.ts` (success, rejection, local-first) and `tests/unit/school-config-route.test.ts` (snapshot, delete-on-undo, no undo on failure) with mocked admin client.

## Not verified
Real undo round trip against Supabase, signed-in settings screens.
