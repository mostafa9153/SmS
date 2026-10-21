import { NextResponse } from "next/server";
import {
  getEventParticipants,
  enrollStudentsInEvent,
  removeStudentFromEvent,
  getStudentRegistrationCounts,
} from "@/lib/sports/db-sports";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const getCounts = searchParams.get("studentCounts");
    if (getCounts === "true") {
      const counts = await getStudentRegistrationCounts();
      return NextResponse.json({ success: true, data: counts });
    }

    const eventId = searchParams.get("eventId");
    if (!eventId) {
      return NextResponse.json({ success: false, error: "eventId is required" }, { status: 400 });
    }

    const participants = await getEventParticipants(eventId);
    return NextResponse.json({ success: true, data: participants });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { eventId, studentIds, academicYear } = body;
    if (!eventId || !Array.isArray(studentIds) || studentIds.length === 0) {
      return NextResponse.json(
        { success: false, error: "eventId and array of studentIds are required" },
        { status: 400 }
      );
    }

    const result = await enrollStudentsInEvent(eventId, studentIds, academicYear);
    return NextResponse.json({ success: true, data: result });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const eventId = searchParams.get("eventId");
    const studentId = searchParams.get("studentId");
    if (!eventId || !studentId) {
      return NextResponse.json(
        { success: false, error: "eventId and studentId are required" },
        { status: 400 }
      );
    }

    await removeStudentFromEvent(eventId, studentId);
    return NextResponse.json({ success: true, message: "Participant removed successfully" });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
