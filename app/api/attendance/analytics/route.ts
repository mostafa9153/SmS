import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api/guard";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { todayIST } from "@/lib/utils/date";

export async function GET(req: Request) {
  try {
    const gate = await requireRole();
    if (!gate.ok) return gate.response;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const adminClient = createAdminClient();

    // School days follow IST; the UTC date is still "yesterday" until 05:30.
    const todayStr = todayIST();
    const dayBack = (n: number) => {
      const d = new Date(`${todayStr}T00:00:00Z`);
      d.setUTCDate(d.getUTCDate() - n);
      return d.toISOString().split("T")[0];
    };
    const sevenDaysAgoStr = dayBack(6); // today + 6 past days = 7 days trend

    // Fetch all attendance for the last 7 days
    const { data: attendanceData, error } = await adminClient
      .from("student_attendance")
      .select("attendance_date, status")
      .gte("attendance_date", sevenDaysAgoStr)
      .lte("attendance_date", todayStr);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Process Today's Stats
    const todayRecords = (attendanceData || []).filter((r: any) => r.attendance_date === todayStr);
    const todayPresent = todayRecords.filter((r: any) => r.status === "PRESENT").length;
    const todayAbsent = todayRecords.filter((r: any) => r.status === "ABSENT").length;
    const todayLate = todayRecords.filter((r: any) => r.status === "LATE").length;
    const totalToday = todayPresent + todayAbsent + todayLate;
    const todayAttendanceRate = totalToday > 0 ? Math.round(((todayPresent + todayLate) / totalToday) * 100) : 0;

    // Process 7-day trend
    const trendMap = new Map<string, { present: number; absent: number; date: string }>();
    
    // Initialize map with last 7 days
    for (let i = 6; i >= 0; i--) {
      const dStr = dayBack(i);
      trendMap.set(dStr, { date: dStr, present: 0, absent: 0 });
    }

    (attendanceData || []).forEach((r: any) => {
      const dayData = trendMap.get(r.attendance_date);
      if (dayData) {
        if (r.status === "PRESENT" || r.status === "LATE") {
          dayData.present++;
        } else if (r.status === "ABSENT") {
          dayData.absent++;
        }
      }
    });

    const trend = Array.from(trendMap.values());

    return NextResponse.json({
      success: true,
      today: {
        rate: todayAttendanceRate,
        present: todayPresent,
        absent: todayAbsent,
        late: todayLate,
        total: totalToday,
      },
      trend
    });

  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to load attendance analytics" }, { status: 500 });
  }
}
