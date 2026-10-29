# Phase 3.1y — Teacher lounge drawer split

`components/teacher/teacher-lounge-drawer.tsx`: 1,183 → 99 lines, no feature change. `TeacherLoungeDrawer` and the type re-exports (`TeacherChatMessage`, `FacultyMember`, `ParsedReply`) are unchanged; the importer (`app/(dashboard)/teacher/page.tsx`) needed no edit.

## Layout (`components/teacher/lounge/`)

- `use-lounge-drawer.tsx` (about 545 lines; `.tsx` because the mention renderer returns JSX): open and animation state, messages and faculty, realtime subscription, send, edit, delete, search, reply, mention autocomplete, sound toggle, unread count.
- Sections: `lounge-fab`, `lounge-header`, `search-overlay`, `chat-wall`, `mention-dropdown`, `reply-preview-bar`, `input-bar`.
- `types.ts`, `chime.ts` (notification sound), `constants.ts` (quick tags, sender colours), `helpers.ts` (initials, colour, message parsing).

The page keeps the early return, the portal, the backdrop, the panel wrapper and the scroll-to-bottom button.

## Behaviour edits (convention only)

Four raw `fetch("/api/teachers/chat…")` calls became `apiFetch`: load, send, edit and delete. Success paths are unchanged (state updates, input reset, scroll, optimistic edit and delete). Send failure still shows the "Send Failed" toast for server errors.

Failure-path differences:
- Load, edit and delete failures now land in the existing `catch` and log to the console; before they did nothing. There is still no toast for them.
- A failed send without a server `error` text now shows the HTTP status text instead of "Could not send message."
- A non-JSON error body on send now shows the toast; before it only logged.

## Verified

`npm run verify -- --build`: PASS, 0 fail, 0 warn. A whitespace-insensitive line comparison shows only `export` keywords on the moved helpers and types and the component signature.

## Not verified

- No signed-in run as a teacher: open and close the drawer, load messages, send, reply with a quote, @mention, edit and delete, search, sound toggle, unread badge, realtime arrival.

## Review

An independent static review found no regression: the hook body matches HEAD apart from the four `apiFetch` edits, the success paths match the route responses, every segment matches its HEAD range and no hook runs after the early return.
