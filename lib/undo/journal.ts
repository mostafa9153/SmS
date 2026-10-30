import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import type { AuthContext } from "@/lib/supabase/auth-helper";
import { softWrite } from "@/lib/supabase/write";

/* eslint-disable @typescript-eslint/no-explicit-any -- rows are opaque table snapshots */

export type RestoreStep =
  | { table: string; op: "upsert"; rows: Record<string, any>[] }
  | { table: string; op: "delete"; column: string; values: (string | number)[] };

interface UndoGuard {
  table: string;
  id: string;
  /** The row's updated_at right after the action; undo refuses if it changed since. */
  updated_at: string | null;
}

interface RecordUndoInput {
  actorId: string;
  action: string;
  label: string;
  entity?: string;
  entityId?: string;
  steps: RestoreStep[];
  guard?: UndoGuard;
  /** How long the action stays undoable (default 24h). */
  ttlHours?: number;
}

/** Rows of `table` where `column = value` (for before-images). */
export async function snapshotRows(supabase: SupabaseClient, table: string, column: string, value: string) {
  const { data, error } = await supabase.from(table).select("*").eq(column, value);
  if (error) {
    // Missing optional tables (e.g. a module not installed) are not fatal for a snapshot.
    if (error.code === "42P01") return [];
    throw new Error(`Snapshot of ${table} failed: ${error.message}`);
  }
  return data ?? [];
}

/**
 * Store an undo entry. Returns its id, or null if the journal is unavailable
 * (the action itself has already succeeded and must not fail because of this).
 */
export async function recordUndo(input: RecordUndoInput): Promise<string | null> {
  const steps = input.steps.filter((s) => (s.op === "upsert" ? s.rows.length : s.values.length) > 0);
  if (!steps.length) return null;
  try {
    const { data, error } = await createAdminClient()
      .from("undoable_actions")
      .insert({
        actor_id: input.actorId,
        action: input.action,
        label: input.label.slice(0, 300),
        entity: input.entity ?? null,
        entity_id: input.entityId ?? null,
        restore_steps: steps,
        guard: input.guard ?? null,
        expires_at: new Date(Date.now() + (input.ttlHours ?? 24) * 3600_000).toISOString(),
      })
      .select("id")
      .single();
    if (error) {
      console.error("[undo] record failed:", error.message);
      return null;
    }
    return data.id;
  } catch (err) {
    console.error("[undo] record failed:", err);
    return null;
  }
}

type UndoResult =
  | { ok: true; label: string }
  | { ok: false; status: 403 | 404 | 409 | 410 | 500; error: string };

/** Replay an entry's restore steps once. Only the actor or an Admin may undo. */
export async function performUndo(id: string, auth: AuthContext): Promise<UndoResult> {
  const supabase = createAdminClient();
  const { data: entry, error } = await supabase.from("undoable_actions").select("*").eq("id", id).maybeSingle();
  if (error || !entry) return { ok: false, status: 404, error: "Nothing to undo." };
  if (entry.actor_id !== auth.user?.id && auth.role !== "Admin") return { ok: false, status: 403, error: "Only the person who made this change or an Admin can undo it." };
  if (entry.undone_at) return { ok: false, status: 409, error: "This change was already undone." };
  if (new Date(entry.expires_at).getTime() < Date.now()) return { ok: false, status: 410, error: "This change can no longer be undone." };

  const guard = entry.guard as UndoGuard | null;
  if (guard) {
    const { data: current } = await supabase.from(guard.table).select("updated_at").eq("id", guard.id).maybeSingle();
    if (current && guard.updated_at && current.updated_at !== guard.updated_at) {
      return { ok: false, status: 409, error: "This record was changed again after your edit, so it can't be undone automatically." };
    }
  }

  // Claim the entry first so two clicks can't replay it twice.
  const { data: claimed } = await supabase
    .from("undoable_actions")
    .update({ undone_at: new Date().toISOString(), undone_by: auth.user?.id ?? null })
    .eq("id", id)
    .is("undone_at", null)
    .select("id");
  if (!claimed?.length) return { ok: false, status: 409, error: "This change was already undone." };

  try {
    for (const step of entry.restore_steps as RestoreStep[]) {
      const { error: stepError } =
        step.op === "upsert"
          ? await supabase.from(step.table).upsert(step.rows)
          : await supabase.from(step.table).delete().in(step.column, step.values);
      if (stepError) throw new Error(`${step.table}: ${stepError.message}`);
    }
    return { ok: true, label: entry.label };
  } catch (err) {
    // Release the claim so the user can retry after the cause is fixed.
    await softWrite(supabase.from("undoable_actions").update({ undone_at: null, undone_by: null }).eq("id", id), "undoable_actions update");
    console.error("[undo] replay failed:", err);
    return { ok: false, status: 500, error: err instanceof Error ? err.message : "Undo failed." };
  }
}
