## 2026-09-16T18:01:09Z

<USER_REQUEST>
You are a read-only Codebase Explorer investigating Fix 3 (Move localStorage to Database) for the Exam Management System (EMS) bug-fix sprint.

Your working directory is:
d:\Project\Vibe Codding\SMS Web App\.agents\teamwork_preview_explorer_survey_ems_2

You MUST read the authoritative request at:
d:\Project\Vibe Codding\SMS Web App\.agents\ORIGINAL_REQUEST.md
Also read:
d:\Project\Vibe Codding\SMS Web App\AGENTS.md

YOUR MISSION:
Investigate Fix 3 in depth:
1. Inspect lib/ems/room-storage.ts:
   - Understand how rooms and allocations are currently saved, loaded, deleted, or managed with localStorage keys: sms_ems_saved_allocations_v1, sms_ems_rooms_v1.
   - Map all exported functions and their consumers across the codebase.
2. Inspect existing persistence patterns in the application:
   - Inspect API routes such as /api/school-config (and any other relevant routes or db clients, prisma schema, supabase client, etc.).
   - Find out how school configurations or generic JSON blobs or dedicated tables are stored in the database.
   - Determine if there is already an API route or table suitable for EMS data (rooms and allocations), or if a new dedicated API route (or extending an existing one) is needed.
3. Design the database migration & storage flow:
   - How to save rooms and allocations to the database.
   - How to load rooms and allocations from the database.
   - How to detect existing localStorage data on first load, migrate it to the database, and clear the localStorage keys.
   - How to display user-friendly error messages/toasts if the DB call fails.

Deliver your complete findings, existing API analysis, schema analysis, and concrete implementation design in:
d:\Project\Vibe Codding\SMS Web App\.agents\teamwork_preview_explorer_survey_ems_2\handoff.md

Send a message back to the caller when done with a summary of your findings.
</USER_REQUEST>
