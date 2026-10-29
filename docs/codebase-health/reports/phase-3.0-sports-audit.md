# Phase 3.0 — Sports module audit (report first, nothing changed yet)

Scope: `app/(dashboard)/sports/**`, `app/api/sports/**`, `components/sports/**`, `lib/sports/**` (about 4,800 lines).
Read: all 4 API routes, `db-sports.ts` in full, the enroll / results / main pages, the config and events hooks, the schema (`20261021_sports_module.sql`).

## The root problem
`db-sports.ts` wraps every query in `try { … } catch {}` and falls back to **module-level in-memory arrays** (`memoryEvents`, `memoryRegistrations`, `memoryResults`, `memoryAthletes`). It was built for offline development. In production it means:
- any DB error is swallowed and the route still answers `success: true`;
- the "saved" data lives only in the memory of one serverless instance and disappears on the next cold start or on another instance;
- the fallback invents data: preset events with ids like `event-1`, students named `Student 3fa2c1`, class `VIII`, school id `MHS/2026/101`.

Most bugs below come from this. Fixing it once (remove the memory store, let errors reach the client) fixes S1–S3 together.

## Bugs
| # | Where | What is wrong | Effect on users | Proposed fix | Risk |
|---|---|---|---|---|---|
| S1 | `lib/sports/db-sports.ts:74, 139, 192, 213, 235, 379, 516, 647, 712, 733, 771, 821` | Every catch is empty and falls back to memory | Results, enrolments, chest numbers, event edits show "saved" but are lost when the DB call fails | Delete the memory store; throw; routes return 500; client shows the error | If the sports tables are missing in production, the page shows an error instead of fake data. That is the honest outcome |
| S2 | `db-sports.ts:11-16, 31` | Empty `sports_events` table → preset events with fake ids are listed | Staff enrol students into "100m Race" (`event-1`), the insert fails (not a uuid), memory keeps it, it vanishes later | Return the real (empty) list; offer presets as a "create from template" action, saved to the DB | Low |
| S3 | `db-sports.ts:701-719` | A failed registration insert still does `count++` | "Enrolled 20 students" when some were not | Count only real inserts; return the failures | Low |
| S4 | `db-sports.ts:307-312, 575-646` | Chest numbers are picked as max+1 and then inserted. Two enrolments at the same time pick the same number. The unique index rejects one, the catch hides it, and a memory number is shown. It also runs **inside a GET** (opening the participant list writes rows) | Two printed bibs with the same number, or a number on screen that is not in the DB | Assign only on enrol, retry on unique violation (23505), never write from GET | Low |
| S5 | `db-sports.ts:725-738` | Removing a participant deletes the registration but leaves their result row in the DB | The event card's "scored" and "podium" counts include removed students | Delete the result row too, in the same action (with undo) | Low |
| S6 | `db-sports.ts:22-29` (the `year` variable is never used), `:246, 424, 577, 678, 786`; `sports-event-form-dialog.tsx` sends no year; `sports-certificate-printable.tsx:72, 199` | Events are not filtered by year. New events, chest numbers and athletes use the **calendar** year. Certificates print the calendar year | Last year's events mix with this year's. On 1 January mid-session, the athlete list empties and new chest numbers are issued | Use the academic year (`useAcademicYear` on the client, `currentYearIST` on the server, as done in A-YEAR-1) and filter by it | Existing rows keep the year they were saved with. Check that with a read-only query first |
| S7 | `lib/sports/use-sports-config.ts:81-93` | `saveConfig` ignores the HTTP status | The rules dialog says "updated" after a 401 or 500 | `apiFetch` + `res.ok` check | Low |
| S8 | `[id]/enroll/page.tsx` `isBlocked`; `api/sports/registrations` POST | The strict "max events per student" rule is checked only in the browser | Another tab or a direct request can pass the limit | Check it on the server as well | Low |
| S9 | `types.ts` / `api/sports/events` | `maxParticipants` is stored but no screen sets or enforces it | Dead field | Either enforce it at enrolment or drop it from the API | Low |
| S10 | `api/sports/events/route.ts:83-91` | `body.maxParticipants \|\| …` | A limit can never be cleared | Use `?? ` / `in body` | Low |

## Rules from CLAUDE.md not met
| # | Where | Gap | Proposed fix |
|---|---|---|---|
| C1 | all 4 routes use `requireRole()` | The default lets **every Teacher** delete events, overwrite results and change chest numbers | GET: all roles. Writes: Admin/Staff (or a new teacher permission, if sports teachers should enter results) |
| C2 | delete event, remove participant, results save, chest number | No undo. Deleting an event cascades to every registration and result | `snapshotRows` + `recordUndo` + `toastWithUndo` |
| C3 | `page.tsx:337` | Hand-made delete dialog | `useConfirm()` |
| C4 | 13 raw `fetch` calls (`page.tsx:51, 93`, `print/page.tsx:73, 84`, `enroll/page.tsx:65, 74, 84, 158, 176, 190`, `results/page.tsx:77, 177`, `sports-event-form-dialog.tsx:76`, `use-sports-events.ts:12`, `use-sports-config.ts:36, 81`) | GETs ignore `res.ok`, so a server error shows as "no participants". Failures never reach the bell | `apiFetch` |

## Speed
| # | Where | Now | Fix |
|---|---|---|---|
| P1 | `getSportsEvents` `:33-44` | Loads **every** registration and result row of every year just to count them | Filter by the year's event ids, or one SQL view with counts |
| P2 | `enrollStudentsInEvent` | 3–4 sequential queries per student (40 students → about 150 round trips) | One query for existing chest numbers, one bulk athlete insert, one bulk registration upsert |
| P3 | `saveEventResults` | One upsert per row | One bulk upsert |
| P4 | `getEventParticipants` `:307-312` | Chest numbers created one by one inside the read | Goes away with S4 |

## Structure (the Phase 3 refactor)
- `db-sports.ts` (843 lines): about 300 lines are memory fallback, and the row → object mapping is copied 4 times. After S1 it should be about 400 lines.
- `enroll/page.tsx` (560) and `results/page.tsx` (525) would each split into a list section and a hook, after the bugs are fixed.
- Print pages already pass the PrintPreview check in the gate.

## Proposed order (one commit each, gate before each)
1. **S1–S5 + P2–P4**: remove the memory store and rewrite the writes. This is the biggest win and touches only `db-sports.ts` and the routes.
2. **S6**: academic year everywhere. Needs a read-only SQL check first (how many events and athletes per `academic_year`).
3. **C1 + C2 + C3 + S7–S10**: roles, undo, confirm, server-side limit.
4. **C4 + P1 + structure**: `apiFetch`, counts query, page split.

**Your decisions needed:**
- **C1**: should Teachers be able to enter results? If yes, I will add a `can_manage_sports` permission; if no, writes become Admin/Staff only.
- **S9**: enforce `maxParticipants`, or drop it?
- **The rest**: confirm the order above, or tell me which items to skip.

## Done (2026-10-29)
Owner's decisions: Teachers may manage sports with a new permission; `maxParticipants` is enforced.

| Item | Change |
|---|---|
| S1–S3 | Memory store removed. Every query throws on error; routes answer 400 (rule broken) or 500. Empty table → empty list, plus an **Add standard events** button that saves the presets for the year |
| S4 | Chest numbers are assigned only at enrolment, in one bulk insert, lowest free number from 101. A unique-index clash (another enrolment at the same moment) retries with fresh data, up to 3 tries. The participants GET no longer writes |
| S5 | Removing a participant also removes their result. Event counts ignore results of students who are no longer registered (old orphan rows) |
| S6 | Events, athletes, counts and chest numbers use the academic year (`useAcademicYear` on the client; the event's own year on the server). Certificates print the session label (`2026-27`) |
| S7 | Rules are saved to the server first and only then applied locally; the dialog shows an error when the save fails |
| S8, S9, S10 | The server enforces the event's participant limit and the strict per-student limit. The event form has a **Max entries** field, and a limit can be cleared |
| C1 | New teacher permission `can_manage_sports` (Teacher Management → Results & Exam). Reads stay open to every role; all writes use `requireStaff("can_manage_sports")` |
| C2 | Undo on event edit and delete (with its registrations and results), participant removal, results save (old rows back, new rows removed) and chest number change |
| C3 | Delete uses `useConfirm()` |
| C4 | All 15 client calls use `apiFetch`. One shared set of hooks and query keys (`lib/sports/use-sports-events.ts`), so moving between sports pages reuses the cache |

**Speed:**
- **Event list:** loads only this year's registrations and results, through two parallel queries.
- **Participant list:** two round trips, where it used to take four or more, plus one write per missing chest number.
- **Enrolling 40 students:** about 6 queries, down from about 150.
- **Results save:** one upsert instead of one per row.
- **Athlete list:** no long id list in the URL.

**Verified:**
- `npm run verify -- --build` passed.
- 6 new unit tests in `tests/unit/db-sports.test.ts`: participant limit, strict limit, chest-number clash retry, a failed write reaching the caller, orphan results not counted, a DB error not turning into fake events.
- Smoke test: all 10 sports API calls return 401 without a session, and the pages redirect to login.

**Not verified:** nothing was run signed in, so enrolment, results, undo and the new permission have not been tried in the app.

**Check before relying on the year filter (read-only):**
```sql
select academic_year, count(*) from sports_events group by 1 order by 1;
select academic_year, count(*) from sports_athletes group by 1 order by 1;
```
Events were saved with the calendar year. If the school's current academic year in admission settings is a different number, those events will not show until the setting or the rows agree.

**Not done yet:** splitting `enroll/page.tsx` and `results/page.tsx` into smaller parts. That is pure structure, with no change in behaviour.
