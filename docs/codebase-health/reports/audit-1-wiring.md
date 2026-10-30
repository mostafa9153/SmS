# Audit 1 — UI ↔ Backend wiring (report only, nothing fixed)

Date: 2026-10-28 · Rule: report first, fix only what you confirm.

## Method
Route map: every `fetch` / `apiFetch` / `window.location` URL + method in `app/`, `components/`, `lib/` (173 calls) vs every exported handler in `app/api/**/route.ts` (97 files, 149 handlers), diffed both ways, then each hit checked by hand (variable URLs, `uploadEndpoint` props, method chosen at runtime).

## Summary
| Check | Result |
|---|---|
| UI calls a route that doesn't exist | **0** |
| UI calls a route with a method it doesn't have | **0** |
| Route handlers stubbed (TODO / not implemented / fake `setTimeout` save) | **0** found in routes; UI `setTimeout`s are message auto-hide only |
| Backend with no UI caller (after manual check) | **9 real**, rest were false positives (called via variable URL / prop) |

## Findings — please confirm which to fix
| # | Type | Where | What's wrong | User impact | Proposed fix | Risk |
|---|---|---|---|---|---|---|
| W1 | Backend without UI (feature broken) | `app/(dashboard)/teacher/page.tsx:259` · `app/api/push/subscribe/route.ts` · `public/sw.js` | Service worker is registered but the browser is **never subscribed** (no `pushManager.subscribe`, nothing calls `/api/push/subscribe`). | Phone/desktop **push notifications never arrive for anyone**, including the new bell's `push: true` alerts (backup failed, wipeout, restore). | Add "Enable notifications" toggle (bell panel + teacher workspace): subscribe with VAPID public key, POST to `/api/push/subscribe`, unsubscribe on toggle off; show state. Needs `NEXT_PUBLIC_VAPID_PUBLIC_KEY` env check. | Low |
| W2 | Logic / security | `app/(dashboard)/teacher/page.tsx:1067` → `/results` · `app/api/results/route.ts` POST · unused `app/api/teachers/marks/route.ts` | Teacher "Marks Entry" opens the admin `/results` page. `/api/teachers/marks` (which enforces the teacher's `allowed_classes`) has no caller; `/api/results` only checks `can_enter_results`. | A teacher allowed to enter marks for Class IX can enter/overwrite marks for **any class**. | Enforce `allowed_classes` for Teachers inside `/api/results` POST, `subject-batch`, `calculate-ranks` (one shared check), then delete the unused `/api/teachers/marks`. | Medium |
| W3 | Backend without UI | `app/api/teachers/classes/route.ts` POST, DELETE | Endpoints to assign/remove a teacher's class/section exist; Teacher Management only reads them. | Class-teacher / subject-teacher assignment can't be managed from the UI (only via routine or DB). Needs your answer: is it done somewhere else? | Either add an assign/remove panel in Teacher Management, or delete the two handlers. | Low |
| W4 | Dead backend | `app/api/teachers/metadata/route.ts` GET · `app/api/teachers/routine/route.ts` GET | No caller; teacher workspace uses `/api/teachers/workspace-init` instead. | None (unused code, attack surface). | Delete. | Low |
| W5 | Dead backend | `app/api/admission/counter/route.ts` POST · `app/api/admission/applications/[id]/route.ts` PATCH · `app/api/teachers/absence/route.ts` GET · `app/api/admin/users/route.ts` PUT (alias of PATCH) | No caller. | None. | Delete (keep the alias only if an external tool uses it). | Low |

False positives cleared by hand: backup export (`window.location`), sports events POST/PUT (method picked at runtime), student/staff photo upload (`uploadEndpoint` prop), notifications (generic `apiFetch<T>`), employees/students `[id]` GET (matched a sibling route in the script).

## Next audits (same format, module by module)
2. Bugs — UI and logic, per module (starting with the module you choose).
3. `db-*` functions and server code with no caller (knip exports: 278 unused exports/types to review).

**Reply with the numbers to fix (e.g. "W1, W2, W4"), or "all".**
