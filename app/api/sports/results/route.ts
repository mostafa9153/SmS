import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api/guard";
import { saveEventResults } from "@/lib/sports/db-sports";

export async function POST(req: Request) {
  const gate = await requireRole();
  if (!gate.ok) return gate.response;

  try {
    const body = await req.json();
    const { eventId, results } = body;
    if (!eventId || !Array.isArray(results)) {
      return NextResponse.json(
        { success: false, error: "eventId and results array are required" },
        { status: 400 }
      );
    }

    await saveEventResults(eventId, results);
    return NextResponse.json({ success: true, message: "Results saved successfully" });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
