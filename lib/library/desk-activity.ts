import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Today's desk actions by every librarian (the library belongs to the whole school), rebuilt
 * from the event log so the "Today's activity" list survives a page refresh. Only desk kinds
 * are listed. A row carries an undo id only for the viewer's own actions, or any action for an Admin
 * (the undo route enforces the same rule).
 */
const DESK_KINDS: Record<string, "issue" | "return" | "renew" | "found" | "damaged"> = {
  issue: "issue",
  return: "return",
  return_to_renew: "renew",
  renew: "renew",
  found: "found",
  damaged: "damaged",
};

export interface DeskActivityRow {
  id: string;
  at: string;
  kind: "issue" | "return" | "renew" | "found" | "damaged";
  label: string;
  undoId: string | null;
  undone: boolean;
  loanId?: string;
  /** Who did it, set only for another user's action (the viewer's own are obvious). */
  by?: string;
}

type Named = { title?: string | null; name?: string | null };

export async function deskActivityToday(viewerId: string, today: string, canUndoAll = false): Promise<DeskActivityRow[]> {
  const db = createAdminClient();
  const since = `${today}T00:00:00+05:30`;
  const { data: events, error } = await db
    .from("library_events")
    .select("id, at, actor, kind, copy_id, loan_id, student_id")
    .gte("at", since)
    .in("kind", Object.keys(DESK_KINDS))
    .order("seq", { ascending: false })
    .limit(100);
  if (error) throw error;
  const list = events ?? [];
  if (!list.length) return [];

  const copyIds = [...new Set(list.map((e) => e.copy_id).filter((v): v is string => Boolean(v)))];
  const studentIds = [...new Set(list.map((e) => e.student_id).filter((v): v is string => Boolean(v)))];
  const otherActors = [...new Set(list.map((e) => e.actor as string).filter((a) => a && a !== viewerId))];
  const [copies, students, undos, people] = await Promise.all([
    copyIds.length
      ? db.from("library_copies").select("id, book:library_books(title)").in("id", copyIds)
      : Promise.resolve({ data: [], error: null }),
    studentIds.length ? db.from("students").select("id, name").in("id", studentIds) : Promise.resolve({ data: [], error: null }),
    db.from("undoable_actions").select("id, actor_id, restore_steps, undone_at").like("action", "library.%").gte("created_at", since),
    otherActors.length ? db.from("user_roles").select("user_id, full_name").in("user_id", otherActors) : Promise.resolve({ data: [], error: null }),
  ]);
  if (copies.error) throw copies.error;
  if (students.error) throw students.error;
  if (undos.error) throw undos.error;
  if (people.error) throw people.error;
  const nameOfUser = new Map<string, string>();
  for (const u of (people.data ?? []) as unknown as { user_id: string; full_name: string | null }[]) nameOfUser.set(u.user_id, u.full_name ?? "");

  const titleOf = new Map<string, string>();
  for (const c of (copies.data ?? []) as unknown as { id: string; book: Named | Named[] | null }[]) {
    const book = Array.isArray(c.book) ? c.book[0] : c.book;
    titleOf.set(c.id, book?.title ?? "");
  }
  const nameOf = new Map<string, string>();
  for (const s of (students.data ?? []) as unknown as { id: string; name: string | null }[]) nameOf.set(s.id, s.name ?? "");

  // Each undo entry stores the event it reverses in its first RPC step.
  const undoByEvent = new Map<string, { id: string; undone: boolean; mine: boolean }>();
  for (const u of (undos.data ?? []) as unknown as { id: string; actor_id: string; restore_steps: { args?: { p_event_id?: string } }[]; undone_at: string | null }[]) {
    const eventId = u.restore_steps?.[0]?.args?.p_event_id;
    if (eventId) undoByEvent.set(eventId, { id: u.id, undone: Boolean(u.undone_at), mine: u.actor_id === viewerId });
  }

  const rows: DeskActivityRow[] = [];
  for (const e of list) {
    const kind = DESK_KINDS[e.kind];
    if (!kind) continue;
    const title = e.copy_id ? titleOf.get(e.copy_id) ?? "" : "";
    const who = e.student_id ? nameOf.get(e.student_id) ?? "" : "";
    const label =
      kind === "return" ? `${title}${who ? ` ← ${who}` : ""}` : `${title}${who ? ` → ${who}` : ""}`;
    const undo = undoByEvent.get(e.id);
    rows.push({
      id: e.id,
      at: e.at,
      kind,
      label,
      undoId: undo && (undo.mine || canUndoAll) ? undo.id : null,
      undone: undo?.undone ?? false,
      ...(kind === "return" && e.loan_id ? { loanId: e.loan_id } : {}),
      ...(e.actor !== viewerId ? { by: nameOfUser.get(e.actor as string) || "Another user" } : {}),
    });
  }
  return rows;
}
