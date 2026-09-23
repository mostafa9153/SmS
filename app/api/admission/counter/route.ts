import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthenticatedUserRole } from "@/lib/supabase/auth-helper";

export async function POST(req: Request) {
  try {
    const auth = await getAuthenticatedUserRole();
    if (auth.role === "Guest") {
      return NextResponse.json({ error: "Unauthorized: Please log in." }, { status: 401 });
    }

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
