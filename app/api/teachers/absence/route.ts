import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/api/guard";
import { dispatchTeacherNotification } from "@/lib/supabase/db-teachers";
import { sendWebPushNotification } from "@/lib/push-notifications";

export async function POST(req: Request) {
  const gate = await requireRole();
  if (!gate.ok) return gate.response;

  try {
    const { user } = gate.auth;

    const body = await req.json();
    const { startDate, endDate, dates = [], reason, teacherId } = body;

    if (!startDate || !endDate) {
      return NextResponse.json({ error: "Start date and end date are required." }, { status: 400 });
    }

    const adminClient = createAdminClient();
    const { data: currentRole } = await adminClient
      .from("user_roles")
      .select("role, full_name, staff_id")
      .eq("user_id", user.id)
      .maybeSingle();

    const roleLower = (currentRole?.role || "").toLowerCase();
    const isAdmin = roleLower === "admin" || roleLower === "super admin" || roleLower === "super_admin";

    let targetTeacherId = currentRole?.staff_id;
    let teacherName = currentRole?.full_name || user.email?.split("@")[0] || "Teacher";

    if (isAdmin && teacherId) {
      targetTeacherId = teacherId;
      const { data: staff } = await adminClient
        .from("staff_profiles")
        .select("full_name")
        .eq("id", teacherId)
        .maybeSingle();
      if (staff?.full_name) teacherName = staff.full_name;
    }

    if (!targetTeacherId) {
      return NextResponse.json({ error: "No associated teaching staff profile found." }, { status: 400 });
    }

    // Format dates array: if not provided or empty, calculate all dates between start and end
    let dateList: string[] = dates;
    if (!dateList || dateList.length === 0) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const cur = new Date(start);
      dateList = [];
      while (cur <= end) {
        dateList.push(cur.toISOString().split("T")[0]);
        cur.setDate(cur.getDate() + 1);
      }
    }

    const { data: absence, error: insertError } = await adminClient
      .from("teacher_absences")
      .insert({
        teacher_id: targetTeacherId,
        user_id: user.id,
        teacher_name: teacherName,
        start_date: startDate,
        end_date: endDate,
        dates: dateList,
        reason: reason?.trim() || null,
        status: "RECORDED",
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    // Dispatch in-app notification & instant web push to all admins
    const { data: adminUsers } = await adminClient
      .from("user_roles")
      .select("user_id")
      .ilike("role", "%admin%");

    const adminIds = (adminUsers || []).map((a) => a.user_id).filter(Boolean);
    const notifTitle = `Teacher Absence: ${teacherName}`;
    const notifMsg = `${teacherName} marked absent for ${startDate === endDate ? startDate : `${startDate} to ${endDate}`}. Reason: ${reason || "Not specified"}.`;

    for (const adminId of adminIds) {
      await dispatchTeacherNotification({
        userId: adminId,
        title: notifTitle,
        message: notifMsg,
        link: "/teacher-management",
      });
    }

    // Trigger instant Web Push notification to admins
    await sendWebPushNotification({
      userIds: adminIds,
      role: "admin",
      title: notifTitle,
      body: notifMsg,
      url: "/teacher-management",
    });

    return NextResponse.json({ success: true, absence });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to record absence" }, { status: 500 });
  }
}
