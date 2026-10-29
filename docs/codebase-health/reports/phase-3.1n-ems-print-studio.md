# Phase 3.1n — EMS print studio split

`components/ems/print/ems-print-studio.tsx`: 1,526 → 48 lines, no feature change. `EmsPrintStudio` (`React.FC<EmsPrintStudioProps>`) and the type export are unchanged; the importer (`components/ems/master/print-step.tsx`) needed no edit.

## Layout (`components/ems/print/studio/`)

- `use-ems-print-studio.ts` (465 lines): document, room, orientation and per-page state, room popover, school profile, exam header and date helpers, effects.
- Sections: `studio-header`, `control-row`, `options-panel` (the collapsible options drawer), `preview-canvas`, `print-portal` (the body-level portal).
- `props.ts` (`EmsPrintStudioProps`).

The page keeps the outer layout wrapper, the section comments and the five section tags in the original order. The original was an arrow component; the splitter ran on a function-declaration copy and the page keeps the original arrow form.

## Behaviour edits

None. The file had no raw fetch, `alert` or `confirm`.

## Verified

`npm run verify -- --build`: PASS, 0 fail, 0 warn. A whitespace-insensitive line comparison shows only the component signature changed.

## Not verified

- No signed-in run: admit cards, bench slips, attendance sheets and gate notice in the studio, room popover, options drawer per document, preview paging, direct print through the portal.

## Review

An independent static review found no regression: hook body, defaults, effect order, JSX sections and the portal condition match HEAD. `examHeaders`, `examDates` and `onViewBlueprint` were already unused in the original JSX.
