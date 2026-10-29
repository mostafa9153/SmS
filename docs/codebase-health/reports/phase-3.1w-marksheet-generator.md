# Phase 3.1w — Marksheet generator page split

`app/(dashboard)/generate/marksheet/page.tsx`: 1,217 → 88 lines, no feature change. The default export `MarksheetGeneratorPage` (with its `Suspense` fallback) is unchanged.

## Layout (`components/generate/marksheet/`)

- `use-marksheet-generator.ts` (544 lines): school profile, student search and selection, single marksheet state, bulk class roster and marksheets, result loading, effects, handlers.
- Sections: `studio-header`, `single-mode-section`, `bulk-mode-section` (each keeps its `generatorMode === "..."` check).
- `constants.ts` (`STANDARD_CLASSES`).

The page keeps the print stylesheet (with its fixed A4 landscape `@page`, as the marksheet is a fixed-grid layout), the print container, and the section comments.

## Behaviour edits

None. The file had no raw fetch, `alert` or `confirm`.

## Verified

`npm run verify -- --build`: PASS, 0 fail, 0 warn. A whitespace-insensitive line comparison shows only the `export` keyword added to the constant.

## Not verified

- No signed-in run: single student search and marksheet, fill sample data and clear marks, digital signature toggle, class batch mode with preview paging, print.

## Review

An independent static review found no regression: hook state, effect order and dependencies, handlers and memos match HEAD, the three sections match their HEAD ranges, and the print stylesheet and container are unchanged. Three loading flags that were unused in the original JSX are no longer returned from the hook.
