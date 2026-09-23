import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const adminClient = createAdminClient();

    // Today's date
    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];

    // 7 days ago
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 6); // today + 6 past days = 7 days trend
    const sevenDaysAgoStr = sevenDaysAgo.toISOString().split("T")[0];

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
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dStr = d.toISOString().split("T")[0];
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
