# Audit 1 — Fixes (W1–W6)

Date: 2026-10-28 · Branch: `refactor/codebase-health` · Score 5.7 → **5.8 / 10** · Tests 45 → **48** · Build ✅

User instruction: "next phase — decide as a senior developer". Decisions below follow from the audit-1 report.

## What was fixed
| # | Problem | Decision | Fix |
|---|---|---|---|
| **W2** 🔒 | Teacher could enter/overwrite marks for **any class** | Fix (security) | New `denyOutsideClasses()` in `lib/api/guard.ts`; enforced in `/api/results` POST, `subject-batch`, `calculate-ranks`. `/results` page shows a Teacher only their allowed classes (server-side, `force-dynamic`). Unused `/api/teachers/marks` deleted. 3 unit tests. |
| **W1** 🔔 | Push notifications never reached any device | Fix (feature broken) | Bell panel: device-notification toggle (`BellRing`/`BellOff`). `lib/push/client.ts` registers `/sw.js`, subscribes with the VAPID key, saves via `/api/push/subscribe` (now `requireRole` + zod, https endpoint only). |
| W1+ 🔒 | **VAPID private key hard-coded** in `lib/push-notifications.ts` | Fix (secret in git) | Keys only from env; without them push is off and the bell still works. New key pair generated into `.env.local` (git-ignored). |
| **W3** | UI said "Assign from Class Mapping tab" — that tab **does not exist** | Build the UI (data model + teacher workspace already use it) | `components/teachers/class-scope-panel.tsx` in Teacher Management → Configure: assign class/section/role/subject, remove. Both **undoable**. Route rewritten: `requireRole(["Admin"])`, zod, duplicate check. |
| **W4/W5** | 6 handlers with no caller | Delete (attack surface) | Deleted: `teachers/metadata`, `teachers/routine`, `admission/counter`, `applications/[id]` PATCH, `teachers/absence` GET, `admin/users` PUT alias. |
| **W6** 🔒 (new) | `/api/cron/expire-permissions` was **never scheduled** → temporary teacher permissions never expired | Fix | Added to `vercel.json`: daily 18:30 UTC (00:30 BD). |

## Verification
| Check | Result |
|---|---|
| tsc / build | ✅ |
| Tests | 48/48 |
| Smoke (`next start`, signed out) | changed routes 401; deleted routes 404/405; `/results` → login |
| Unguarded API routes | 0 |

## ⚠️ Your actions
1. **Vercel → Environment Variables**: add `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` (copy from `.env.local`), and make sure `CRON_SECRET` is set. Redeploy.
2. Signed in, test: bell → bell icon → allow → a backup failure/teacher task should arrive on the device. Teacher with Class IX only → `/results` shows only IX. Teacher Management → Configure → Assign / ✕ / Undo.

## Not verified
Signed-in flows (no test account); real push delivery needs the Vercel env keys.
