# Routine fix 1: subject auto-allotment, pre-generate problem list, broken rules in history

Date: 2026-10-29 · Branch: `refactor/codebase-health` · Tests 60 → **68** · Build ✅

## The bug: subjects "allotted" to teachers who were never given them
There were **five separate rules** for deciding whether a teacher teaches a subject, and none of them agreed. The auto-allotment came from these sources:

| # | Where | What happened |
|---|---|---|
| 1 | `routine-auto-assign` | If **no teacher** was given a subject, it went to the school's **least-loaded teacher** (a warning was raised, but the screen hid it) |
| 2 | `routine-auto-assign` / `isTeacherQualifiedForSubject` | A teacher with **no class** ticked, or a class with **no subject** ticked, counted as teaching **every subject** (the row also said "All classes & subjects") |
| 3 | `batchUpsertAssignmentsDb` | Auto-Balance only upserted rows and **never deleted old ones**, so after a subject was removed from a teacher, the old row **stayed** |
| 4 | Teachers tab, Setup Hub card, Verification | When saved assignments existed, load was counted **from them**, so that stale row showed up as the teacher's load |
| 5 | Teacher editor | Ticking a class whose subjects did not include the teacher's own subject **pre-ticked every subject in that class** |

Also: in a split Theory+Lab subject, when nobody had Theory, the Lab teacher was given the Theory periods.

### Fix (root cause, one rule)
- `isTeacherAssignedToSubject` → built on `getTeacherSectionSubjects`: **only a subject ticked in the Teachers tab, for that section**. No class, section or subject ticked means "does not teach it".
- Auto-assign never guesses. A subject with no teacher goes into the `unstaffed` list.
- Generate and Verification always **rebuild assignments from the Teachers tab**, so saved rows cannot put the wrong teacher in. `assignmentsAreCurrent` was removed.
- Load comes only from the setup (`calculateTeacherConfiguredLoads`), and the Teachers tab, Setup Hub and Generator share that one function.
- Auto-Balance save also deletes old rows, and reports failures.
- Ticking a class pre-ticks only the teacher's own subject. The row now says "No classes assigned" / "No subjects".

## Before generating: problem list
- When the Generate page opens (and whenever data changes), the pre-flight check **runs automatically**.
- Every subject with no teacher shows as an error: "No teacher: Class VI A - Bengali", with a fix.
- **Generate runs the check again first**; if there are errors the routine is not built (toast + list).
- Warnings used to be hidden whenever any itemized diagnostic existed. Now every warning shows (duplicates removed).

## After generating: broken rules + History
- New shared `RoutineRunIssues`: every broken rule (with each case), why the strict rule could not hold, and that run's setup warnings.
- Every History run has an amber **⚠ N** button. Clicking it opens a dialog with all the breaks of that run.
- Setup warnings are now saved with the run (`metadata.setupWarnings`).

## Other bugs fixed
| Bug | Fix |
|---|---|
| Saving a routine first deactivated the old one; if the insert then failed, **no routine was active**, yet the function returned `true` | Insert first, then deactivate the others; a failure returns `false` with a toast |
| A failed teacher save (fallback upsert) was not reported, so after a reload the subjects went back to their old state, which looked like "auto-allotment" | `false` is returned plus an error toast |

## Verification
| Check | Result |
|---|---|
| `npm run verify -- --build` | PASS (1 pre-existing lint error in a touched file, Phase 4) |
| Tests | 68/68 (+8 in `routine-assign.test.ts`: blank teacher, empty class, section isolation, theory variant, no guessing, theory is never borrowed, load, history count) |
| Code review | 6 findings, all fixed: Lab teacher given Theory, legacy section keys, cleanup error swallowed, empty list skipped cleanup, load computed again per teacher, an older pre-flight report overwriting a newer one |
| My own mistake | When the script was writing the regex its backslash was lost (`subjectBaseName`); the test caught it and it is fixed |

## Not verified
- The routine pages need a login, so they were **not seen in a browser** (build ✅, logic tests ✅).
- **Behaviour change:** any subject that has no teacher now **blocks** generation. Before, it went silently to someone else. The first time you open it, the list may be long; tick a teacher for each, or remove the subject from that class.
- Old wrong rows in the DB are cleaned up the next time Auto-Balance runs, but they no longer affect anything (nothing reads them).
