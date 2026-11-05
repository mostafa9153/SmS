# Prompt: finish the remaining file splits autonomously

Paste everything below the line into a new Claude Code session (Sonnet 5.5, effort `high`, `/autocompact 500k`).

---

You are continuing the codebase-health work on this repo (branch `refactor/codebase-health`). Read `CLAUDE.md`, `AGENTS.md`, `docs/codebase-health/PLAN.md` and the last two reports in `docs/codebase-health/reports/` (`phase-3.1k`, `phase-3.1l`) first, to learn the pattern.

## Goal
Split the remaining UI files that are over 1,000 lines into a thin page/component plus a `use-*.ts` hook and section components, **with zero feature or behaviour change**. Do them one after another, without asking me anything. Pick the better option yourself and keep going until the list is finished or a stop condition below is hit.

## Order (re-measure with `wc -l` and a Glob first; skip any file already under 800 lines)
1. `app/(dashboard)/generate/admission-form/page.tsx`
2. `ems-print-studio.tsx`
3. `ems-print-dialog.tsx`
4. `app/(dashboard)/students/[id]/edit/page.tsx`
5. `preset-addresses-tab.tsx`
6. `app/(dashboard)/generate/blank-pad/page.tsx`
7. `app/(dashboard)/students/[id]/page.tsx`
8. `marks-scheme-tab.tsx`
9. `student-add-edit-form.tsx` (do not merge it with the student edit page; split each on its own)
10. `routine-allotment-overview-tab.tsx`
11. `app/(dashboard)/generate/marksheet/page.tsx`
12. `app/(dashboard)/students/promotion/page.tsx`
13. `teacher-lounge-drawer.tsx`
14. `routine-demand-allotment-tab.tsx`
15. `seat-arrangement-editor.tsx`

Do NOT touch `lib/**` files (data and logic; they need tests, not line splitting) and do not touch `teacher-editor-form.tsx` unless the list above is finished.

## Per-file procedure (same as phases 3.1c–3.1l)
1. Locate the file, `grep -n` its structure (imports, helpers, hook body, JSX sections). Take line ranges from `grep -n` anchors, never from memory.
2. Split into a folder next to it (e.g. `components/<area>/<name>/`): `use-<name>.ts` (state, effects, handlers; if it passes ~800 lines, compose smaller section hooks that take a `ctx` argument), section/dialog components, `props.ts`, `types.ts`, `helpers.ts`, `constants.ts`. Keep the original file path and its exports so importers need no edit. Keep hook and effect order, dependency arrays and JSX output identical.
3. Convention-only edits allowed: raw `fetch("/api…")` → `apiFetch`, `alert`/`confirm` → toast / `useConfirm()`. Note any failure-path difference in the report.
4. Gate: `node scripts/verify.mjs --build` (set `NODE_OPTIONS=--max-old-space-size=2048`). It must end with 0 fail. Fix every warning or justify it with `// guard: custom — reason` / `// undo: n/a — reason`.
5. Compare the old and new code with a whitespace-insensitive line comparison: no original line may be missing, apart from signature/`export` changes.
6. Independent read-only review of the diff (a subagent). Fix any real regression, then re-run the gate.
7. Write `docs/codebase-health/reports/phase-3.1<letter>-<name>.md` (next letters: m, n, o, …) in the same format: Layout, Behaviour edits, Verified, Not verified, Review.
8. Commit only your own files, one commit per file split:
   `refactor: split the <name> into hook, sections and dialogs (phase 3.1<letter>)`
   End with the Co-Authored-By line given in the system attribution reminder.
9. Update the status line in `docs/codebase-health/PLAN.md` after every few splits (reports covered, number of files still over 1,000 lines).

Use the mcp task list (`update_plan`) to track the files, and run `npm run health` at the end.

## Hard limits (never do these, even if it seems helpful)
- No `git push`, no force operations, no branch deletion.
- Do not delete root artifacts (`patch_*.js`, `current_diff.patch`, `routine-forge-pro.html`, `scratch/`).
- Do not commit `AGENTS.md`, `.claude/`, `research-prompt.md` or `docs/codebase-health/status-report-bn.pdf`. If a split leaves CRLF-only noise in an untouched file, restore it with `git checkout -- <file>`.
- No database writes, no browser/signed-in checks (I do those myself).
- No new features, no UI text changes, no dependency upgrades.

## Stop conditions
- The gate fails and two honest fix attempts do not solve it: revert that file's changes with `git checkout`, note it in the final message, and continue with the next file.
- All 15 files are done.

## Final message
In Bengali script (I read Bengali): which files were split (old → new line counts, commit hashes), what each review caught, any behaviour difference on failure paths, what is still unverified (the signed-in browser checks for me), and what remains in the plan.
