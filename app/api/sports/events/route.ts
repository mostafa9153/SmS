import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api/guard";
import {
  getSportsEvents,
  createSportsEvent,
  updateSportsEvent,
  deleteSportsEvent,
} from "@/lib/sports/db-sports";

// GET /api/sports/events?academicYear=2026
export async function GET(request: Request) {
  const gate = await requireRole();
  if (!gate.ok) return gate.response;

  try {
    const { searchParams } = new URL(request.url);
    const academicYear = searchParams.get("academicYear");
    const yearNumber = academicYear ? parseInt(academicYear, 10) : undefined;

    const events = await getSportsEvents(yearNumber);
    return NextResponse.json({ success: true, data: events });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// POST /api/sports/events
export async function POST(request: Request) {
  const gate = await requireRole();
  if (!gate.ok) return gate.response;

  try {
    const body = await request.json();

    const name = body.name?.trim();
    const category = body.category;
    const gender = body.gender || "All";
    const eligibleClasses = body.eligibleClasses || body.eligible_classes || [];
    const scoringType = body.scoringType || body.scoring_type || "Metric";
    const measurementUnit = body.measurementUnit || body.measurement_unit || "Time (s)";
    const maxParticipants = body.maxParticipants || body.max_participants || null;
    const description = body.description || "";
    const academicYear = body.academicYear || body.academic_year || new Date().getFullYear();

    if (!name || !category) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: name, category" },
        { status: 400 }
      );
    }

    const newEvent = await createSportsEvent({
      academicYear,
      name,
      category,
      gender,
      eligibleClasses,
      scoringType,
      measurementUnit,
      maxParticipants,
      description,
    });

    return NextResponse.json({ success: true, data: newEvent }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// PUT /api/sports/events
export async function PUT(request: Request) {
  const gate = await requireRole();
  if (!gate.ok) return gate.response;

  try {
    const body = await request.json();
    const id = body.id;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Missing required field: id" },
        { status: 400 }
      );
    }

    const updated = await updateSportsEvent(id, {
      name: body.name?.trim(),
      category: body.category,
      gender: body.gender,
      eligibleClasses: body.eligibleClasses || body.eligible_classes,
      scoringType: body.scoringType || body.scoring_type,
      measurementUnit: body.measurementUnit || body.measurement_unit,
      maxParticipants: body.maxParticipants || body.max_participants,
      description: body.description,
    });

    if (!updated) {
      return NextResponse.json({ success: false, error: "Event not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// DELETE /api/sports/events?id=<uuid>
export async function DELETE(request: Request) {
  const gate = await requireRole();
  if (!gate.ok) return gate.response;

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Missing required query param: id" },
        { status: 400 }
      );
    }

    await deleteSportsEvent(id);
    return NextResponse.json({ success: true, message: "Event deleted successfully" });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
