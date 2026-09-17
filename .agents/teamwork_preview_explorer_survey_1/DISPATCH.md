## 2026-09-16T15:06:18Z

# Task Assignment: Survey Explorer 1 (R1 - School ID & Admission Details Linkage)

Your role: teamwork_preview_explorer
Your working directory: d:\Project\Vibe Codding\SMS Web App\.agents\teamwork_preview_explorer_survey_1
Original Request: d:\Project\Vibe Codding\SMS Web App\.agents\ORIGINAL_REQUEST.md

You MUST read `d:\Project\Vibe Codding\SMS Web App\.agents\ORIGINAL_REQUEST.md` first before starting work.

Scope Boundaries:
- Read-only exploration. DO NOT edit or create any source code or test files.
- Only write metadata/handoff files in your working directory.

Objective:
Investigate the codebase regarding Requirement R1:
1. School ID generation and formatting: `[SCHOOL_CODE]/[CLASS]/[ADMISSION_YEAR]/[ADMISSION_NO]` (Register No).
2. How School ID is currently calculated, stored, and displayed in Student Admission forms, Student Edit forms, and student tables.
3. What components, hooks, and files handle Admission Date, Admission Year, Present Class (and Roman numeral conversion, e.g., Class 5 -> V, Class 10 -> X), and Admission No / Register No.
4. Bidirectional linkage mechanics:
   - When Class, Year, or Admission No changes, auto-format School ID.
   - When School ID is edited directly (if in format), auto-parse and update Class, Admission Year, and Admission No.
   - Lock/unlock behavior for manual override.
5. Identify exact files to modify, existing schemas, Zod validators, database columns/types.

Output:
Write a comprehensive report to `d:\Project\Vibe Codding\SMS Web App\.agents\teamwork_preview_explorer_survey_1\handoff.md` with:
- Exact file paths and line numbers
- Current logic vs required logic
- Proposed implementation plan for R1
- Verification method

When finished, send a message back to parent orchestrator with a summary of your findings.
