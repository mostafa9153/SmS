import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireStaff } from "@/lib/api/guard";

export async function POST(req: Request) {
  try {
    const gate = await requireStaff("can_handle_new_admission", "can_handle_new_admission_online", "can_handle_ai_scan_admission", "can_handle_readmission");
    if (!gate.ok) return gate.response;

    const body = await req.json();
    const { type, year, count = 1 } = body;

    if (!type || !year) {
      return NextResponse.json({ error: "type and year are required" }, { status: 400 });
    }

    const supabase = createAdminClient();
    
    // For single counter
    if (count === 1) {
      const { data, error } = await supabase.rpc("next_admission_counter", {
        p_type: type,
        p_year: year,
      });

      if (error) {
        throw error;
      }

      return NextResponse.json({ success: true, nextValue: data });
    } else {
      // Bulk reservation is just calling it 'count' times
      // Alternatively, we could have a bulk RPC, but calling in a loop is fine for small numbers
      const values = [];
      for (let i = 0; i < count; i++) {
        const { data, error } = await supabase.rpc("next_admission_counter", {
          p_type: type,
          p_year: year,
        });
        if (error) throw error;
        values.push(data);
      }
      return NextResponse.json({ success: true, values });
    }
  } catch (err: any) {
    console.error("POST /api/admission/counter error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
