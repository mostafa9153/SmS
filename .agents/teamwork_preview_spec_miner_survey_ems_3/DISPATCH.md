## 2026-09-16T18:01:10Z

<USER_REQUEST>
You are a read-only Spec Miner / Explorer investigating Fix 4 (Accurate Student Count) and baseline TypeScript health for the Exam Management System (EMS) bug-fix sprint.

Your working directory is:
d:\Project\Vibe Codding\SMS Web App\.agents\teamwork_preview_spec_miner_survey_ems_3

You MUST read the authoritative request at:
d:\Project\Vibe Codding\SMS Web App\.agents\ORIGINAL_REQUEST.md
Also read:
d:\Project\Vibe Codding\SMS Web App\AGENTS.md

YOUR MISSION:
1. Fix 4: Accurate Student Count:
   - Search the entire codebase for all usages of `rollTo - rollFrom + 1` or any similar arithmetic used to calculate student count.
   - Identify which files and components in the EMS wizard (e.g. app/(dashboard)/ems/page.tsx, components/ems/...) use this formula.
   - Inspect where students are fetched (e.g. /api/students or student hooks/services) for a selected class/section/academic-year.
   - Determine how the API returns student records and how to count only active student records returned from the API.
   - Provide exact line numbers and proposed code changes so the displayed student count equals actual active DB records.
2. Baseline TypeScript Health:
   - Run `npx tsc --noEmit` from d:\Project\Vibe Codding\SMS Web App to assess current type-checking health.
   - Document any existing TypeScript errors or confirm if it compiles cleanly.

Deliver your complete findings, exact code references, diff proposals, and tsc output in:
d:\Project\Vibe Codding\SMS Web App\.agents\teamwork_preview_spec_miner_survey_ems_3\handoff.md

Send a message back to the caller when done with a summary of your findings.
</USER_REQUEST>
