## 2026-09-16T15:14:21Z

# Task Assignment: Spec Miner Survey 3 (Codebase Architecture, Build & Test Infra)

Your role: teamwork_preview_spec_miner
Your working directory: d:\Project\Vibe Codding\SMS Web App\.agents\teamwork_preview_spec_miner_survey_3
Original Request: d:\Project\Vibe Codding\SMS Web App\.agents\ORIGINAL_REQUEST.md

Objective:
Investigate the codebase architecture, environment, and verification infrastructure:
- Inspect package.json, tsconfig.json, Next.js configuration, AGENTS.md rules.
- Identify the build command, typecheck command, test runners (Jest, Vitest, Playwright, etc.), or scripts.
- Check current TypeScript typecheck status (run `npm run build` or `npm run typecheck` or `npx tsc --noEmit` and report any current errors or if it's clean).
- Identify project structure: directory layout (app router vs pages router, prisma/db client, actions, components, utils).
- School code configuration (where SCHOOL_CODE is stored: env, settings, db, constants).

Output:
Write a comprehensive report to `d:\Project\Vibe Codding\SMS Web App\.agents\teamwork_preview_spec_miner_survey_3\handoff.md` with:
- Project structure overview
- Commands for typechecking, building, and running tests
- School code source of truth
- Next.js version and architectural constraints
- Current build/typecheck health check
