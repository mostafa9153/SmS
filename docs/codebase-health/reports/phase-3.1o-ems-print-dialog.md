# Phase 3.1o — EMS print dialog split

`components/ems/print/ems-print-dialog.tsx`: 1,502 → 85 lines, no feature change. `EmsPrintDialog` (`React.FC<EmsPrintDialogProps>`) and the type export are unchanged; the importer (`components/ems/master/ems-dialogs.tsx`) needed no edit.

## Layout (`components/ems/print/dialog/`)

- `use-ems-print-dialog.ts` (444 lines): document, room, orientation, per-page, exam half, issue date and signature state, class subject config, effects and handlers.
- Sections: `dialog-header`, `doc-type-switcher`, `room-filter`, `options-section`, `summary-and-print`, `preview-toolbar`, `preview-canvas`, `print-portal` (body-level portal, rendered after the dialog).
- `props.ts` (`EmsPrintDialogProps`).

The page keeps the `Dialog` and `DialogContent` wrappers, the left sidebar and right pane layout divs, and the section order. Same function-declaration-copy approach as 3.1n for the arrow component.

## Behaviour edits

None. The file had no raw fetch, `alert` or `confirm`.

## Verified

`npm run verify -- --build`: PASS, 0 fail, 0 warn. A whitespace-insensitive line comparison shows only the component signature changed.

## Not verified

- No signed-in run: print dialog from the EMS master page for each document type, room filter chips, options per document, issue date, exam half, preview, direct print through the portal.

## Review

An independent static review found no regression: the hook body is identical to HEAD (checked with `diff`), every JSX section matches its HEAD range, the nesting and the portal condition are unchanged.
