# Phase 3.1q — Preset addresses (settings presets) tab split

`components/settings/preset-addresses-tab.tsx`: 1,394 → 77 lines, no feature change. `PresetAddressesTab` is unchanged; its one importer (`app/(dashboard)/settings/presets/page.tsx`) needed no edit.

## Layout (`components/settings/presets/`)

- `use-preset-addresses.ts` (401 lines): active section with URL sync, student entry defaults, address, bank, school and AI presets, load effect, save and reset handlers (confirm dialogs via `useConfirm`).
- Sections: `presets-header`, `presets-nav`, `defaults-section`, `address-section`, `bank-section`, `school-section`, `ai-section` (each keeps its `activeSection === "..."` check).
- `constants.ts` (section ids and the academic and system preset lists), `info-tooltip.tsx`.

The page keeps the loading skeleton, the `TooltipProvider`, and the three small sections that only render `ClassManagementTab`, `MarksSchemeTab` and `FeePresetManager`.

## Behaviour edits

None. The file already used `useConfirm` and had no raw fetch.

## Verified

`npm run verify -- --build`: PASS, 0 fail, 0 warn. A whitespace-insensitive line comparison shows only `export` keywords added to the moved constants and the tooltip.

## Not verified

- No signed-in run: switch each section (URL sync), save student entry defaults, add, remove and reset address, bank, school and AI presets, the embedded class, marks scheme and fee tabs.

## Review

An independent static review found no regression: hook body, effect and handlers, every JSX section and the section order match HEAD. Cosmetic leftovers only: the odd closing indentation of the page (as in HEAD) and two `lucide-react` import lines in two files.
