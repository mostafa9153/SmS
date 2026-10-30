# Phase 3.1za — Seat arrangement editor split

`components/ems/seat-arrangement/seat-arrangement-editor.tsx`: 1,071 → 46 lines, no feature change. `SeatArrangementEditor` is unchanged; its importer (`components/ems/master/seat-arrangement-step.tsx`) needed no edit.

## Layout (`components/ems/seat-arrangement/editor/`)

- `use-seat-arrangement-editor.ts` (782 lines): effective rooms, pattern and column class assignment, auto allocation per room, manual swaps, undo and redo stacks with the keyboard listener, missing roll report, mid-fill class prompt state.
- Sections: `room-config-panel`, `room-tab-bar`, `blueprint-area`, `step-navigation`.
- `props.ts` (`SeatArrangementEditorProps`).

The page keeps the wrapper, the section comments and the mid-fill class prompt. The hook receives the props object and destructures it exactly as the component did (`initialRoomClassMap = {}` default). The existing `pattern-selector`, `column-class-assigner` and `mid-fill-class-prompt` files were not touched.

## Behaviour edits

None. The file had no raw fetch, `alert` or `confirm`.

## Verified

`npm run verify -- --build`: PASS, 0 fail, 0 warn. A whitespace-insensitive line comparison shows only the component signature changed and `export` added to the props interface.

## Not verified

- No signed-in run: EMS seat arrangement step with real rooms and classes: pattern choice, column class assignment, auto allocation, click-to-swap on the blueprint, undo and redo shortcuts, missing roll popover, mid-fill prompt, continue and back.

## Review

An independent static review found no regression: a whitespace-normalised diff of the hook body against HEAD is empty, the four sections match HEAD, the render order and the prompt wiring are unchanged, and the relative imports resolve.
