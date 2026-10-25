import { NextRequest, NextResponse } from "next/server";

// Proxies the solver's fast counting checks (no solving). Same payload as /api/routine/generate.
export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();
    const solverUrl = process.env.ROUTINE_SOLVER_URL || "http://127.0.0.1:8000";
    const response = await fetch(`${solverUrl}/diagnose`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      return NextResponse.json({ success: false, reasons: [], adjustments: [], error: `Solver error (${response.status})` });
    }
    return NextResponse.json(await response.json());
  } catch (error: any) {
    return NextResponse.json({ success: false, reasons: [], adjustments: [], error: error?.message || "Solver offline" });
  }
}
