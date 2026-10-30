import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/api/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { recordUndo, snapshotRows, type RestoreStep } from "@/lib/undo/journal";
import { saveEventResults } from "@/lib/sports/db-sports";
import { sportsError } from "@/lib/sports/api";

export async function POST(req: Request) {
  const gate = await requireStaff("can_manage_sports");
  if (!gate.ok) return gate.response;

  try {
    const { eventId, results } = await req.json();
    if (!eventId || !Array.isArray(results)) {
      return NextResponse.json({ success: false, error: "eventId and results array are required" }, { status: 400 });
    }

    const before = await snapshotRows(createAdminClient(), "sports_event_results", "event_id", eventId);
    const saved = await saveEventResults(eventId, results);

    // Undo puts the old rows back and removes rows this save created.
    const existed = new Set(before.map((r) => r.id));
    const created = saved.map((r) => r.id).filter((id) => !existed.has(id));
    const steps: RestoreStep[] = [
      { table: "sports_event_results", op: "upsert", rows: before },
      { table: "sports_event_results", op: "delete", column: "id", values: created },
    ];
    const undoId = await recordUndo({
      actorId: gate.auth.user?.id,
      action: "sports.results.save",
      label: "Save sports results",
      entity: "sports_events",
      entityId: eventId,
      steps,
    });
    return NextResponse.json({ success: true, message: "Results saved successfully", undoId });
  } catch (err) {
    return sportsError(err);
  }
}
