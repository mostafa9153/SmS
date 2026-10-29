# Phase 3.1t — Marks scheme tab split

`components/settings/marks-scheme-tab.tsx`: 1,328 → 33 lines, no feature change. `MarksSchemeTab` is unchanged; its importer (`components/settings/preset-addresses-tab.tsx`) needed no edit.

## Layout (`components/settings/marks-scheme/`)

- `use-marks-scheme.ts` (381 lines): scheme list and edit-form state, subject selection state, promotion policy, load effect with the school-config sync and update listener, save, reset (via `useConfirm`) and subject add, remove and lab-toggle handlers with the routine sync calls.
- Sections: `secondary-schemes-card`, `higher-secondary-card`, `subject-bank-card`, `promotion-policy-card`, `edit-scheme-dialog`.

The page keeps the outer wrapper and the section comments in the original order.

## Behaviour edits

None. The file already used `useConfirm` and had no raw fetch.

## Verified

`npm run verify -- --build`: PASS, 0 fail, 0 warn. A whitespace-insensitive line comparison shows no missing line.

## Not verified

- No signed-in run: edit a class scheme (secondary and higher secondary), add, remove and lab-toggle subjects with the routine sync, promotion policy save, reset to defaults.

## Review

An independent static review found no regression: hook body, load effect and handlers match HEAD line for line, all four cards, the IIFE in the subject bank card and the edit dialog match HEAD, and every segment destructures what it uses.
