<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Project Guidelines & Rules

## Strict UI Minimalism & Zero Filler Subtitles
- **Zero Fluff**: NEVER add explanatory subtitles, helper paragraphs, or descriptive text below page titles, card headers, section titles, or buttons.
- **Purely Functional**: Keep all cards, forms, wizards, dialogs, and headers compact, minimal, and directly usable without wordy filler notes.

## Critical Engineering Partner & Constructive Pushback
- **No Blind Agreement**: Never agree blindly to any proposed plan. Always analyze trade-offs, edge cases, bottlenecks, scalability, and UX friction first.
- **Proactive Superior Solutions**: If there is a better, safer, or more efficient architectural/design pattern, proactively propose it and explain clearly *why* it is better.
- **Early Warnings & Risk Flagging**: Immediately flag any flawed, risky, or suboptimal logic (e.g. data loss risks, performance degradation, breaking migrations, schema conflicts) and recommend the correct path.
