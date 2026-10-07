import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();
    const solverUrl = process.env.ROUTINE_SOLVER_URL || "http://127.0.0.1:8000";

    const response = await fetch(`${solverUrl}/generate-routine`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        {
          success: false,
          diagnostics: [`Python solver server error (${response.status}): ${errorText}`],
        },
        { status: 200 }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Routine API Route Proxy Error:", error);
    return NextResponse.json(
      {
        success: false,
        diagnostics: [
          `Failed to communicate with Python solver at ${process.env.ROUTINE_SOLVER_URL || "http://127.0.0.1:8000"}. Please make sure the Python server is running (npm run routine:server).`,
        ],
        diagnosticItems: [
          {
            type: "general",
            severity: "error",
            title: "Python Solver Offline",
            description: error?.message || "Connection refused to Python backend service.",
            solution: "Run `npm run routine:server` in your terminal to start the OR-Tools engine.",
          },
        ],
      },
      { status: 200 }
    );
  }
}
