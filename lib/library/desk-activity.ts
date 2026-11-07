import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Today's desk actions by this librarian, rebuilt from the event log so the
 * "Today's activity" list survives a page refresh. Only desk kinds are listed.
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
}

type Named = { title?: string | null; name?: string | null };

export async function deskActivityToday(actorId: string, today: string): Promise<DeskActivityRow[]> {
  const db = createAdminClient();
  const since = `${today}T00:00:00+05:30`;
  const { data: events, error } = await db
    .from("library_events")
    .select("id, at, kind, copy_id, loan_id, student_id")
    .eq("actor", actorId)
    .gte("at", since)
    .in("kind", Object.keys(DESK_KINDS))
    .order("seq", { ascending: false })
    .limit(100);
  if (error) throw error;
  const list = events ?? [];
  if (!list.length) return [];

  const copyIds = [...new Set(list.map((e) => e.copy_id).filter((v): v is string => Boolean(v)))];
  const studentIds = [...new Set(list.map((e) => e.student_id).filter((v): v is string => Boolean(v)))];
  const [copies, students, undos] = await Promise.all([
    copyIds.length
      ? db.from("library_copies").select("id, book:library_books(title)").in("id", copyIds)
      : Promise.resolve({ data: [], error: null }),
    studentIds.length ? db.from("students").select("id, name").in("id", studentIds) : Promise.resolve({ data: [], error: null }),
    db.from("undoable_actions").select("id, restore_steps, undone_at").eq("actor_id", actorId).like("action", "library.%").gte("created_at", since),
  ]);
  if (copies.error) throw copies.error;
  if (students.error) throw students.error;
  if (undos.error) throw undos.error;

  const titleOf = new Map<string, string>();
  for (const c of (copies.data ?? []) as unknown as { id: string; book: Named | Named[] | null }[]) {
    const book = Array.isArray(c.book) ? c.book[0] : c.book;
    titleOf.set(c.id, book?.title ?? "");
  }
  const nameOf = new Map<string, string>();
  for (const s of (students.data ?? []) as unknown as { id: string; name: string | null }[]) nameOf.set(s.id, s.name ?? "");

  // Each undo entry stores the event it reverses in its first RPC step.
  const undoByEvent = new Map<string, { id: string; undone: boolean }>();
  for (const u of (undos.data ?? []) as unknown as { id: string; restore_steps: { args?: { p_event_id?: string } }[]; undone_at: string | null }[]) {
    const eventId = u.restore_steps?.[0]?.args?.p_event_id;
    if (eventId) undoByEvent.set(eventId, { id: u.id, undone: Boolean(u.undone_at) });
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
      undoId: undo?.id ?? null,
      undone: undo?.undone ?? false,
      ...(kind === "return" && e.loan_id ? { loanId: e.loan_id } : {}),
    });
  }
  return rows;
}
