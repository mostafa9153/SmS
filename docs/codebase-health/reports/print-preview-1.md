# Print preview + paper settings as shared components (pilot)

Date: 2026-10-29 · Branch: `feat/shared-print-preview` (worktree, off `refactor/codebase-health` a872f53)

## Why
Every print page wrote its own zoom preview wrapper, paper/orientation/margin state, localStorage load/save, "Paper & Margin" card and `@page` CSS: 11 pages, about 80 lines each. A new print page copied all of it again.

## What is shared now
| Piece | File | What a page still decides |
|---|---|---|
| `PrintPreview` | `components/print/print-preview.tsx` | `resetKey` (what refits the view) |
| `PrintPageStyle` (`@page` size + margins) | same | — |
| `usePaperSettings(key, defaults)` | `components/print/use-paper-settings.ts` | storage key, default paper / orientation / margins, supported `papers` |
| `PaperSettingsPanel` | `components/print/paper-settings-panel.tsx` | `orientations`, `lockMargins` (fixed-size layouts such as ID cards and marksheets) |
| Sizes and types | `lib/print/paper.ts` | — |

The preview's behaviour (zoom by wheel, pinch or buttons, drag, double-tap, fit) and its look come from one place. Margins, paper and orientation stay configurable per page, and each page keeps its own saved settings.

**Old saved settings survive.** The hook reads both shapes the pages stored (`paper` or `paperSize`), and writes both. A saved size the page cannot print (e.g. A3 on an A5/A4 layout) is ignored.

**Guardrails for new pages:**
- `CLAUDE.md` has a "Print pages" rule.
- `npm run verify` warns on a hand-written `@page`, and on a `ZoomPanViewport` / `PinchZoomViewer` used outside `components/print/`.

### Template defaults (update)
- **Paper:** A5, A4 and A3 are all available by default. A page narrows the list to what its layout can actually print. Bonafide keeps A5/A4, because its print CSS has no A3 sizes.
- **Orientation:** the portrait/landscape switch is opt-in per page (`orientations`). Only layouts drawn for both should turn it on.
- **Margins:** each page keeps its own default. The panel adds three one-click presets, and the preset that matches the current margins is highlighted. Typing a custom value still works.
  - None: 0 mm
  - Narrow: 5 mm
  - Normal: 10 mm
- These presets are the two margins the pages already used (the attendance register uses 5 mm; the certificates use 10 mm). Word's 12.7 / 25.4 mm presets would eat too much of an A5 certificate.

## Pilot: Bonafide certificate
- 110 lines removed, 9 added.
- Same defaults (A5, 0 mm margins), same storage key `bonafide-paper-settings`, same preview size and position.
- New: Save shows a toast; the size buttons have `aria-pressed`.

## Rollout to every print page (update)
| Area | Page | Preview | Paper / margin |
|---|---|---|---|
| Generate | Bonafide | shared | A5/A4, margins + presets |
| Generate | Character certificate, Kanyashree, Pass, TC | shared | A5/A4/A3, orientation, margins (same keys as before) |
| Generate | Attendance register, Tabulation | shared | A5/A4/A3, orientation, margins |
| Generate | Class-teacher list | shared | A5/A4/A3, orientation, margins. **New:** settings can now be saved (`class-teacher-list-paper-settings`) |
| Generate | Blank pad | shared | A4/A5, margins. The size buttons moved into the panel; a content reset keeps the saved size |
| Generate | ID card, Marksheet, Admission form, Invoice | shared | fixed `@page` (physical sizes), no margin setting |
| Sports | Print studio | shared | A5/A4/A3, orientation, margins. **New:** can be saved (`sports-print-paper-settings`) |
| EMS | Print dialog, Print studio | shared (old zoom buttons removed; the preview has its own) | no margin setting: admit cards (21/20 per A4) and bench slips (57/56) are fixed grids |
| Routine | Timetable | (prints the live grid) | **New** "A3 Landscape" button next to Print: A3/A4, orientation, margins. Default stays A3 landscape, 0 mm |
| Admission | Invoice batch dialog, Application form dialog | shared, with a separate hidden print copy | — |

- **Not moved:** the EMS room blueprint keeps `PinchZoomViewer`. It is an interactive seat map, not a print preview.
- **Removed:** about 600 lines of per-page paper state, panels and `@page` rules.

**Mistake caught during the rollout:** the first migration script cut `@page` rules at the `}` inside `${pageW}`. That left broken CSS in four certificate pages; I found it in the diff and fixed it before commit, and the script now treats `${…}` as one unit.

## Verification
| Check | Result |
|---|---|
| `npm run verify` | PASS (0 fail; 1 warn = pre-existing lint error in bonafide line 455, Phase 4) |
| Tests | +3 (`print-paper.test.tsx`): landscape size and `@page` text; old saved shapes, junk, and an unsupported size; panel with and without margins |
| `next build` | **Not run with Turbopack.** The worktree's `node_modules` is a link to the main checkout's, and Turbopack refuses it. A webpack build compiled; its type check stopped on two pre-existing route exports (`RE_ADMISSION_CANDIDATE_STATUSES`, `invalidateDashboardStatsCache`) that Turbopack builds accept. Run `npm run verify -- --build` after merging into the main checkout. |
| Self-review | 1 fix: a saved size the page does not support could desync the preview from the print size |

## Not verified
- **Printing has not been checked by eye.** Please open Generate → Bonafide, change paper and margins, Save, reload, then print-preview (Ctrl+P). Compare with before.
- The other 10 pages (certificate, kanyashree, pass-certificate, TC, attendance register, class-teacher list, blank pad, tabulation, ID card, marksheet …) are **not migrated yet**. Each one goes after you approve the pilot.
- `PinchZoomViewer` (5 places: admission invoices, application form dialog, EMS print dialog/studio, room blueprint) is still a second zoom component; it should be merged into `PrintPreview` in the next step.
