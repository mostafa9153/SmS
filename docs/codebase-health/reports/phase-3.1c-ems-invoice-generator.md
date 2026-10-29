# Phase 3.1c — EMS page and invoice generator split

Two of the largest pages were split by responsibility, with no feature change.

| Page | Before | After |
|---|---|---|
| `app/(dashboard)/ems/page.tsx` | 3,772 lines | 98 lines (stepper, header, five step components, dialogs) |
| `app/(dashboard)/generate/invoice/page.tsx` | 2,499 lines | 64 lines |

## Layout

- `components/ems/master/`: `use-ems-master.ts` (all state and handlers), `session-step`, `classes-step`, `rooms-step`, `seat-arrangement-step`, `print-step`, `ems-dialogs`, `class-groups.ts` (pure class/section helpers and types, no longer exported from a page file), `missing-rolls-warning-button`, `ems-class-multi-select`.
- `components/invoice/generator/`: `use-invoice-generator.ts`, `generator-header`, `single-invoice-panel`, `bulk-invoice-panel`, `invoice-print-styles` (the `<style jsx global>` block), `constants.ts`.

The split was scripted from the TypeScript AST (hook body, JSX segments, used identifiers and imports computed per file), not retyped. A whitespace-insensitive line comparison of old and new files shows only the intended differences (`export` keywords, step wrappers, import lists).

## Behaviour edits (only the ones the conventions require)

- EMS: three `alert()` validation messages became `toast.error()`.
- Invoice generator: four raw `fetch("/api/…")` calls became `apiFetch`: next serial, undo of the last print batch, queued-admission count, and the registered-invoice lookup. The fall-through paths are unchanged (a failure still ends in the local fallback), and failures now reach the notification bell. The queued count query used to return `{ count: 0 }` on an HTTP error; it now fails the query and the badge shows 0.

## Scorecard

- `knip.json` added. The "dead files" figure of 756 was 748 files under `.claude/worktrees`; the real count is 1 (`scripts/restore-class-10-students.mjs`, a one-off script).

## Verified

`npm run verify -- --build`: PASS, 0 fail, 1 warn. `next start` on :3100: `/ems` and `/generate/invoice` redirect to `/login` (auth gate), then the server was stopped.

## Justified warning

`invoice-print-styles.tsx` carries a hand-written `@page` (A5 landscape single slip, A4 four-up). It moved with the code unchanged. The layout is drawn for a fixed sheet, and moving it to `PrintPageStyle` changes print output, which is outside a no-behaviour-change refactor.

## Not verified

- No signed-in run. Walk through EMS steps 1–5 (session, class selection with roster dialog and missing-roll warnings, rooms, auto and manual allocation, seat editor, print studio) and the invoice generator (single and bulk, print, batch undo, tracker and history dialogs).
- `use-ems-master.ts` (about 1,600 lines) and `use-invoice-generator.ts` (about 1,000) are still above the 800-line lint warning. They are the next split (allocation logic, roster/exclusion handling, fee editor) once a signed-in check can compare behaviour.

## Review

An independent read-only review found no bugs: hook order in the EMS page is unchanged (the hook runs before the `mounted` skeleton), the print canvases keep their DOM position, `<style jsx global>` compiles in its own component, and the four `apiFetch` calls resolve the same fields as before. One intended change was confirmed: a 500 from the queued-count route now reaches the bell once (add `meta: { silent: true }` to the query if that is unwanted).
