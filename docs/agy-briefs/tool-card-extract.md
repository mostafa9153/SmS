# Brief: extract the generator tool card into a shared component

## Goal
`app/(dashboard)/generate/page.tsx` has the tool card (the grid item with icon, format badge, info popover, title, category label, and the "Generate Now" / "Track" footer) written inline inside `filteredModules.map(...)`. Move that card and its `CardInfoPopover` helper into a shared component so another page can reuse it. Behaviour and look must stay exactly the same.

## Files
- Read: `app/(dashboard)/generate/page.tsx` (the `GeneratorModule` type at about line 30, `CardInfoPopover` at about line 317, the card JSX at about lines 832-916).
- Create: `components/generate/tool-card.tsx`. Export `ToolCard` (takes `module: GeneratorModule`) and `GeneratorModule` type. Move `CardInfoPopover` into the same file (or a sibling file in that folder if it is large).
- Edit: `app/(dashboard)/generate/page.tsx` so it imports `ToolCard` and renders `<ToolCard key={mod.id} module={mod} />` in the map.

## Rules (from CLAUDE.md and AGENTS.md)
- Do NOT add any explanatory subtitle or helper text.
- Do not re-implement shared UI. Keep using `Badge`, `cn`, `Link`, the lucide icons, and the existing class names exactly.
- Do not change `GENERATOR_MODULES`, the category tabs, the search, the filter logic, or the print strip. Only the card moves.
- Keep `"use client"` at the top of the new file, since it uses `onClick` and `router`.
- Keep the card's `onClick={() => router.push(mod.href)}` behaviour, and keep `e.stopPropagation()` on the badge/info area and the Track link.
- No behaviour change. Props and class strings must match the original character for character.
- No new dependency. No change to `lib/`.
- Do not touch `app/(dashboard)/reports/**`.

## Done when
1. `components/generate/tool-card.tsx` exists and exports `ToolCard`.
2. `generate/page.tsx` no longer contains the card JSX, and it is shorter than before.
3. `npx tsc --noEmit` passes with no new errors.
4. `npx eslint components/generate/tool-card.tsx "app/(dashboard)/generate/page.tsx"` shows no errors.

## Report back
- The list of files changed, with line counts before and after.
- The output of the tsc and eslint commands (short).
- Anything you were unsure about. Do not guess; list it.
