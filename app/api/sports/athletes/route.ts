import { NextResponse } from "next/server";
import { requireRole, requireStaff } from "@/lib/api/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { recordUndo, type RestoreStep } from "@/lib/undo/journal";
import { getAllAthletesWithEvents, updateChestNumber } from "@/lib/sports/db-sports";
import { sportsError, yearParam } from "@/lib/sports/api";
import { currentYearIST } from "@/lib/utils/academic-year";

export async function GET(req: Request) {
  const gate = await requireRole();
  if (!gate.ok) return gate.response;

  try {
    const year = yearParam(new URL(req.url).searchParams.get("academicYear"));
    return NextResponse.json({ success: true, data: await getAllAthletesWithEvents(year) });
  } catch (err) {
    return sportsError(err);
  }
}

// POST { studentId, chestNumber, academicYear } — change a chest number
export async function POST(req: Request) {
  const gate = await requireStaff("can_manage_sports");
  if (!gate.ok) return gate.response;

  try {
    const body = await req.json();
    const { studentId, chestNumber } = body;
    if (!studentId || !chestNumber) {
      return NextResponse.json({ success: false, error: "studentId and chestNumber are required" }, { status: 400 });
    }
    const year = yearParam(body.academicYear) ?? currentYearIST();

    const admin = createAdminClient();
    const row = () => admin.from("sports_athletes").select("*").eq("student_id", studentId).eq("academic_year", year).maybeSingle();
    const before = await row();
    if (before.error) throw new Error(`sports_athletes select: ${before.error.message}`);

    await updateChestNumber(studentId, String(chestNumber), year);

    const after = before.data ? null : (await row()).data;
    const steps: RestoreStep[] = before.data
      ? [{ table: "sports_athletes", op: "upsert", rows: [before.data] }]
      : [{ table: "sports_athletes", op: "delete", column: "id", values: after ? [after.id] : [] }];
    const undoId = await recordUndo({
      actorId: gate.auth.user?.id,
      action: "sports.chest.update",
      label: `Chest number ${chestNumber}`,
      entity: "sports_athletes",
      entityId: studentId,
      steps,
    });
    return NextResponse.json({ success: true, message: "Chest number updated successfully", undoId });
  } catch (err) {
    return sportsError(err);
  }
}
