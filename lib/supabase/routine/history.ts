import { createClient } from "@/lib/supabase/client";
import { GeneratedRoutine } from "@/lib/routine/types";
import { mustWrite } from "@/lib/supabase/write";
import { setLocalRoutineState } from "@/lib/supabase/routine/local-state";

export interface RoutineHistoryEntry {
  id: string;
  createdAt: string;
  title: string;
  isActive: boolean;
  days: number[];
  teachingPeriods: number[];
  breaks: number[];
  iterations?: number;
  executionTimeMs?: number;
  totalUnits?: number;
  placedUnits?: number;
  phase?: number;
  relaxedConstraints?: string[];
  grid: Record<string, any>;
  metadata?: Record<string, any>;
}

/**
 * Automatically delete routines older than the most recent `keepCount` (default: 10)
 */
async function pruneOldGeneratedRoutinesDb(keepCount: number = 10): Promise<boolean> {
  const supabase = createClient();
  try {
    const { data, error } = await supabase
      .from("routine_generated_cache")
      .select("id, created_at")
      .order("created_at", { ascending: false });

    if (error || !data) return false;

    if (data.length > keepCount) {
      const idsToDelete = data.slice(keepCount).map((row) => row.id);
      if (idsToDelete.length > 0) {
        const { error: delError } = await supabase
          .from("routine_generated_cache")
          .delete()
          .in("id", idsToDelete);

        if (delError) {
          console.warn("pruneOldGeneratedRoutinesDb error:", delError);
          return false;
        }
      }
    }
    return true;
  } catch (err) {
    console.warn("pruneOldGeneratedRoutinesDb failed:", err);
    return false;
  }
}

/**
 * Save Generated Routine in Cache and prune older than 10
 */
export async function saveGeneratedRoutineDb(routine: GeneratedRoutine): Promise<boolean> {
  setLocalRoutineState({ routine });
  const supabase = createClient();

  try {
    // 1. Insert the new routine first, so a failed insert never leaves the school without an active routine
    const { data: inserted, error } = await supabase.from("routine_generated_cache").insert({
      title: "Main Academic Routine",
      is_active: true,
      grid: routine.grid,
      metadata: {
        days: routine.days,
        teachingPeriods: routine.teachingPeriods,
        breaks: routine.breaks,
        iterations: routine.iterations,
        executionTimeMs: routine.executionTimeMs,
        stats: routine.stats,
        phase: routine.stats?.phase || routine.metadata?.phase,
        relaxedConstraints: routine.stats?.relaxedConstraints || routine.metadata?.relaxedConstraints,
        ...(routine.metadata || {}),
      },
    }).select("id").single();
    if (error || !inserted) {
      console.warn("saveGeneratedRoutineDb:", error);
      return false;
    }

    // 2. Then it becomes the only active one
    await mustWrite(supabase.from("routine_generated_cache").update({ is_active: false }).neq("id", inserted.id), "routine_generated_cache update");

    // 3. Auto-remove older routines beyond last 10
    await pruneOldGeneratedRoutinesDb(10);

    return true;
  } catch (err) {
    console.warn("saveGeneratedRoutineDb:", err);
    return false;
  }
}

/**
 * Fetch last 10 generated routine runs for the history list
 */
export async function fetchGeneratedRoutineHistoryDb(limit: number = 10): Promise<RoutineHistoryEntry[]> {
  const supabase = createClient();
  try {
    // Ensure pruning of anything beyond limit
    await pruneOldGeneratedRoutinesDb(limit);

    const { data, error } = await supabase
      .from("routine_generated_cache")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error || !data) return [];

    return data.map((row: any) => ({
      id: row.id,
      createdAt: row.created_at || row.generated_at,
      title: row.title || "Main Academic Routine",
      isActive: Boolean(row.is_active),
      days: row.metadata?.days || [],
      teachingPeriods: row.metadata?.teachingPeriods || [],
      breaks: row.metadata?.breaks || [],
      iterations: row.metadata?.iterations ?? row.metadata?.stats?.iterations,
      executionTimeMs: row.metadata?.executionTimeMs ?? row.metadata?.stats?.executionTimeMs,
      totalUnits: row.metadata?.stats?.totalUnits,
      placedUnits: row.metadata?.stats?.placedUnits,
      phase: row.metadata?.phase ?? row.metadata?.stats?.phase,
      relaxedConstraints: row.metadata?.relaxedConstraints ?? row.metadata?.stats?.relaxedConstraints,
      grid: row.grid || row.generated_grid || {},
      metadata: row.metadata || {},
    }));
  } catch (err) {
    console.warn("fetchGeneratedRoutineHistoryDb error:", err);
    return [];
  }
}

/**
 * Activate a past routine from history as current active routine
 */
export async function activateGeneratedRoutineDb(id: string): Promise<GeneratedRoutine | null> {
  const supabase = createClient();
  try {
    const { data: target, error } = await supabase
      .from("routine_generated_cache")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error || !target) return null;

    // Set target active, others inactive
    await mustWrite(supabase.from("routine_generated_cache").update({ is_active: false }).neq("id", id), "routine_generated_cache update");
    await mustWrite(supabase.from("routine_generated_cache").update({ is_active: true }).eq("id", id), "routine_generated_cache update");

    const generated: GeneratedRoutine = {
      id: target.id,
      success: true,
      days: target.metadata?.days || [],
      teachingPeriods: target.metadata?.teachingPeriods || [],
      breaks: target.metadata?.breaks || [],
      grid: target.grid || target.generated_grid || {},
      iterations: target.metadata?.iterations ?? target.metadata?.stats?.iterations,
      executionTimeMs: target.metadata?.executionTimeMs ?? target.metadata?.stats?.executionTimeMs,
      generatedAt: target.created_at,
      metadata: target.metadata,
      stats: target.metadata?.stats,
    };

    setLocalRoutineState({ routine: generated });

    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("sms_routine_state_updated"));
    }

    return generated;
  } catch (err) {
    console.warn("activateGeneratedRoutineDb error:", err);
    return null;
  }
}

/**
 * Manually delete a specific routine from history
 */
export async function deleteGeneratedRoutineHistoryDb(id: string): Promise<boolean> {
  const supabase = createClient();
  try {
    const { error } = await supabase
      .from("routine_generated_cache")
      .delete()
      .eq("id", id);

    if (error) {
      console.warn("deleteGeneratedRoutineHistoryDb error:", error);
      return false;
    }

    // If deleted, ensure at least one routine is marked active if available
    const { data: remaining } = await supabase
      .from("routine_generated_cache")
      .select("id, is_active")
      .order("created_at", { ascending: false })
      .limit(1);

    if (remaining && remaining.length > 0 && !remaining[0].is_active) {
      await mustWrite(supabase
        .from("routine_generated_cache")
        .update({ is_active: true })
        .eq("id", remaining[0].id), "routine_generated_cache update");
    }

    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("sms_routine_state_updated"));
    }

    return true;
  } catch (err) {
    console.warn("deleteGeneratedRoutineHistoryDb error:", err);
    return false;
  }
}
