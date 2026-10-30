# Phase 4: lint to zero, CI, guardrails (2026-10-29)

## Lint: 23 errors → 0 (whole repo, `eslint . --quiet`)
| Rule | Count | Fix |
|---|---|---|
| `react-hooks/refs` (print portals) | 9 | New `lib/hooks/use-print-portal.ts`. The portal node is kept in state instead of a ref read during render. Used by the attendance register and the class-teacher list, which had copy-pasted the same code |
| `react-hooks/refs` (teacher lounge) | 1 | The @mention click no longer touches the textarea ref; an effect does the focus |
| `prefer-const` | 8 | `eslint --fix` |
| `react/no-unescaped-entities` | 2 | `&apos;` |
| `react-hooks/immutability` | 1 | Re-admission step 2: the auto-fetch effect moved below the `fetchCandidates` declaration (same behaviour) |
| `react-hooks/purity` | 1 | Routine history "x ago": `Date.now()` is now taken when the list loads, not on every render |
| Parse error in root `patch_printable2.js` | 1 | `patch_*.js` ignored (CLAUDE.md lists them as one-off artifacts) |

`.claude/**` is now ignored too: another session's worktree under `.claude/worktrees` was being linted as if it were app code.

## Guardrails
- `npm run verify`: any lint error in a changed file now **FAILs**. The "pre-existing, Phase 4" exemption is gone, because the baseline is zero.
- **CI** (`.github/workflows/ci.yml`, runs on PRs and on pushes to `main`):
  - types
  - `eslint . --quiet`
  - unit tests
  - `verify.mjs --base origin/<base>` on the PR diff (guard, undo, secrets, client→route, conventions)
- **CI does not run `next build`:** it needs the Supabase environment. Add the env secrets to GitHub and a `next build` step later if you want it.
- The workflow only runs after the branch is pushed. Nothing has been pushed.

## Found by the gate (report only, not fixed)
Touching these files for `prefer-const` made the gate check their auth. Each carries a `// guard: custom — …` note stating its *current* state. They need a decision:

| ID | Route | Current check | Risk |
|---|---|---|---|
| A-API-1 | `POST /api/admission/re-admission/batch` | Any signed-in non-Guest | A Teacher without the admission permission can batch re-admit students through the service-role client. It writes data with no undo |
| A-API-2 | `GET /api/admission/tracker` | Any signed-in non-Guest | Any teacher can read every admission form record |
| A-API-3 | `POST /api/teachers/attendance` | `auth.getUser()` only | Any signed-in user can write attendance for any class |
| — | `GET /api/teachers/workspace-init` | `auth.getUser()` | OK: data is scoped to the caller's own `staff_id` |

**Recommended:** `requireStaff("admission")` for 1 and 2. For 3, `requireStaff` plus a check that the caller is assigned to that class.

## Verification
| Check | Result |
|---|---|
| `npm run verify -- --build` | PASS (0 fail, 0 warn) |
| `eslint . --quiet` | 0 errors |
| Self-review | Relative time was frozen at mount; fixed to refresh on each list load. Portal cleanup is safe under StrictMode double-mount (the node is removed and re-created) |

## Not verified
- The CI workflow has not run: it runs only after a push.
- Print pages and the lounge @mention were not clicked through in a browser (login required).
