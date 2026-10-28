import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api/guard";
import { updateChestNumber, getAllAthletesWithEvents } from "@/lib/sports/db-sports";

export async function GET(req: Request) {
  const gate = await requireRole();
  if (!gate.ok) return gate.response;

  try {
    const { searchParams } = new URL(req.url);
    const yearParam = searchParams.get("academicYear");
    const year = yearParam ? parseInt(yearParam, 10) : undefined;
    const athletes = await getAllAthletesWithEvents(year);
    return NextResponse.json({ success: true, data: athletes });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const gate = await requireRole();
  if (!gate.ok) return gate.response;

  try {
    const body = await req.json();
    const { studentId, chestNumber, academicYear } = body;
    if (!studentId || !chestNumber) {
      return NextResponse.json(
        { success: false, error: "studentId and chestNumber are required" },
        { status: 400 }
      );
    }

    const result = await updateChestNumber(studentId, chestNumber, academicYear);
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }
    return NextResponse.json({ success: true, message: "Chest number updated successfully" });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
