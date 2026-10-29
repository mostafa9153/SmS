import { NextResponse } from "next/server";
import { requireRole, requireStaff } from "@/lib/api/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { recordUndo } from "@/lib/undo/journal";
import {
  enrollStudentsInEvent,
  getEventParticipants,
  getStudentRegistrationCounts,
  removeStudentFromEvent,
} from "@/lib/sports/db-sports";
import { sportsError, yearParam } from "@/lib/sports/api";

// GET ?eventId=<uuid> → participants · ?studentCounts=true&academicYear=2026 → events per student
export async function GET(req: Request) {
  const gate = await requireRole();
  if (!gate.ok) return gate.response;

  try {
    const { searchParams } = new URL(req.url);
    if (searchParams.get("studentCounts") === "true") {
      const counts = await getStudentRegistrationCounts(yearParam(searchParams.get("academicYear")));
      return NextResponse.json({ success: true, data: counts });
    }

    const eventId = searchParams.get("eventId");
    if (!eventId) {
      return NextResponse.json({ success: false, error: "eventId is required" }, { status: 400 });
    }
    return NextResponse.json({ success: true, data: await getEventParticipants(eventId) });
  } catch (err) {
    return sportsError(err);
  }
}

// undo: n/a — creates registrations; removing a participant is the reverse action
export async function POST(req: Request) {
  const gate = await requireStaff("can_manage_sports");
  if (!gate.ok) return gate.response;

  try {
    const { eventId, studentIds } = await req.json();
    if (!eventId || !Array.isArray(studentIds) || studentIds.length === 0) {
      return NextResponse.json({ success: false, error: "eventId and array of studentIds are required" }, { status: 400 });
    }
    return NextResponse.json({ success: true, data: await enrollStudentsInEvent(eventId, studentIds) });
  } catch (err) {
    return sportsError(err);
  }
}

export async function DELETE(req: Request) {
  const gate = await requireStaff("can_manage_sports");
  if (!gate.ok) return gate.response;

  try {
    const { searchParams } = new URL(req.url);
    const eventId = searchParams.get("eventId");
    const studentId = searchParams.get("studentId");
    if (!eventId || !studentId) {
      return NextResponse.json({ success: false, error: "eventId and studentId are required" }, { status: 400 });
    }

    const admin = createAdminClient();
    const pick = (table: string) => admin.from(table).select("*").eq("event_id", eventId).eq("student_id", studentId);
    const [reg, res] = await Promise.all([pick("sports_event_registrations"), pick("sports_event_results")]);
    if (reg.error || res.error) throw new Error(`Snapshot failed: ${(reg.error ?? res.error)!.message}`);

    await removeStudentFromEvent(eventId, studentId);
    const undoId = await recordUndo({
      actorId: gate.auth.user?.id,
      action: "sports.participant.remove",
      label: "Remove participant",
      entity: "sports_event_registrations",
      entityId: eventId,
      steps: [
        { table: "sports_event_registrations", op: "upsert", rows: reg.data ?? [] },
        { table: "sports_event_results", op: "upsert", rows: res.data ?? [] },
      ],
    });
    return NextResponse.json({ success: true, message: "Participant removed successfully", undoId });
  } catch (err) {
    return sportsError(err);
  }
}
