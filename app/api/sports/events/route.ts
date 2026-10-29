import { NextResponse } from "next/server";
import { requireRole, requireStaff } from "@/lib/api/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { recordUndo, snapshotRows, type RestoreStep } from "@/lib/undo/journal";
import {
  addPresetEvents,
  createSportsEvent,
  deleteSportsEvent,
  getSportsEventRow,
  getSportsEvents,
  updateSportsEvent,
} from "@/lib/sports/db-sports";
import { sportsError, yearParam } from "@/lib/sports/api";
import { currentYearIST } from "@/lib/utils/academic-year";

// GET /api/sports/events?academicYear=2026
export async function GET(request: Request) {
  const gate = await requireRole();
  if (!gate.ok) return gate.response;

  try {
    const { searchParams } = new URL(request.url);
    const events = await getSportsEvents(yearParam(searchParams.get("academicYear")));
    return NextResponse.json({ success: true, data: events });
  } catch (err) {
    return sportsError(err);
  }
}

// POST /api/sports/events — one event, or { preset: true, academicYear } for the standard set
// undo: n/a — creates rows; deleting the event is the reverse action
export async function POST(request: Request) {
  const gate = await requireStaff("can_manage_sports");
  if (!gate.ok) return gate.response;

  try {
    const body = await request.json();
    const academicYear = yearParam(body.academicYear ?? body.academic_year) ?? currentYearIST();

    if (body.preset === true) {
      const added = await addPresetEvents(academicYear);
      return NextResponse.json({ success: true, data: { added } }, { status: 201 });
    }

    const name = body.name?.trim();
    if (!name || !body.category) {
      return NextResponse.json({ success: false, error: "Missing required fields: name, category" }, { status: 400 });
    }

    const newEvent = await createSportsEvent({
      academicYear,
      name,
      category: body.category,
      gender: body.gender || "All",
      eligibleClasses: body.eligibleClasses || body.eligible_classes || [],
      scoringType: body.scoringType || body.scoring_type || "Metric",
      measurementUnit: body.measurementUnit || body.measurement_unit || "Time (s)",
      maxParticipants: body.maxParticipants || body.max_participants || null,
      description: body.description || "",
    });
    return NextResponse.json({ success: true, data: newEvent }, { status: 201 });
  } catch (err) {
    return sportsError(err);
  }
}

// PUT /api/sports/events
export async function PUT(request: Request) {
  const gate = await requireStaff("can_manage_sports");
  if (!gate.ok) return gate.response;

  try {
    const body = await request.json();
    const id = body.id;
    if (!id) {
      return NextResponse.json({ success: false, error: "Missing required field: id" }, { status: 400 });
    }

    const before = await getSportsEventRow(id);
    if (!before) return NextResponse.json({ success: false, error: "Event not found" }, { status: 404 });

    // `in` so a limit can be cleared (null) as well as set.
    const limit = "maxParticipants" in body ? body.maxParticipants : body.max_participants;
    const updated = await updateSportsEvent(id, {
      name: body.name?.trim(),
      category: body.category,
      gender: body.gender,
      eligibleClasses: body.eligibleClasses || body.eligible_classes,
      scoringType: body.scoringType || body.scoring_type,
      measurementUnit: body.measurementUnit || body.measurement_unit,
      maxParticipants: limit === undefined ? undefined : Number(limit) || null,
      description: body.description,
    });
    if (!updated) return NextResponse.json({ success: false, error: "Event not found" }, { status: 404 });

    const after = await getSportsEventRow(id);
    const undoId = await recordUndo({
      actorId: gate.auth.user?.id,
      action: "sports.event.update",
      label: `Edit ${before.name}`,
      entity: "sports_events",
      entityId: id,
      steps: [{ table: "sports_events", op: "upsert", rows: [before] }],
      guard: { table: "sports_events", id, updated_at: after?.updated_at ?? null },
    });
    // No `data` key: apiFetch would unwrap it and drop undoId.
    return NextResponse.json({ success: true, event: updated, undoId });
  } catch (err) {
    return sportsError(err);
  }
}

// DELETE /api/sports/events?id=<uuid>
export async function DELETE(request: Request) {
  const gate = await requireStaff("can_manage_sports");
  if (!gate.ok) return gate.response;

  try {
    const id = new URL(request.url).searchParams.get("id");
    if (!id) {
      return NextResponse.json({ success: false, error: "Missing required query param: id" }, { status: 400 });
    }

    // Registrations and results are removed by ON DELETE CASCADE; restore parent first.
    const admin = createAdminClient();
    const event = await getSportsEventRow(id);
    if (!event) return NextResponse.json({ success: false, error: "Event not found" }, { status: 404 });
    const steps: RestoreStep[] = [
      { table: "sports_events", op: "upsert", rows: [event] },
      { table: "sports_event_registrations", op: "upsert", rows: await snapshotRows(admin, "sports_event_registrations", "event_id", id) },
      { table: "sports_event_results", op: "upsert", rows: await snapshotRows(admin, "sports_event_results", "event_id", id) },
    ];

    await deleteSportsEvent(id);
    const undoId = await recordUndo({
      actorId: gate.auth.user?.id,
      action: "sports.event.delete",
      label: `Delete ${event.name}`,
      entity: "sports_events",
      entityId: id,
      steps,
      ttlHours: 72,
    });
    return NextResponse.json({ success: true, message: "Event deleted successfully", undoId });
  } catch (err) {
    return sportsError(err);
  }
}
