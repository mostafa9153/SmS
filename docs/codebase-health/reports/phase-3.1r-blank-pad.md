# Phase 3.1r — Blank pad generator split

`app/(dashboard)/generate/blank-pad/page.tsx`: 1,351 → 160 lines, no feature change. The default export `BlankPadGeneratorPage` (with its `Suspense` fallback) is unchanged.

## Layout (`components/generate/blank-pad/`)

- `use-blank-pad-generator.ts` (235 lines): pad data, font style, letter mode, structured letter, body size and alignment, paper settings, reference number and date, print and reset handlers, effects.
- Sections: `studio-header`, `paper-format-card`, `header-elements-card`, `letter-mode-header` (the card header with the mode switcher), `structured-composer`, `freeform-composer`.

The page keeps the layout wrappers, the letter card shell with the structured or freeform choice, the print preview and the hidden print canvas, and the `<style jsx global>` print stylesheet.

## Behaviour edits

None. The file had no raw fetch, `alert` or `confirm`.

## Verified

`npm run verify -- --build`: PASS, 0 fail, 0 warn. A whitespace-insensitive line comparison shows no missing line.

## Not verified

- No signed-in run: paper and border settings, header elements, structured letter fields, freeform body, mode switch and Clear All, reference number sequence, print and reset.

## Review

An independent static review found no regression: hook body and effect order, every JSX section, the card nesting and the print canvas data match HEAD.
