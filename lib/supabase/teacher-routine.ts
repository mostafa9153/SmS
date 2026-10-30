import { SupabaseClient } from "@supabase/supabase-js";

const DAY_NAMES = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

function getPeriodTimeLabel(periodNum: number): string {
  const times: Record<number, string> = {
    1: "10:45 AM - 11:30 AM",
    2: "11:30 AM - 12:15 PM",
    3: "12:15 PM - 01:00 PM",
    4: "01:00 PM - 01:40 PM",
    5: "02:15 PM - 02:55 PM",
    6: "02:55 PM - 03:35 PM",
    7: "03:35 PM - 04:15 PM",
    8: "04:15 PM - 04:50 PM",
  };
  return times[periodNum] || `Period ${periodNum}`;
}

interface TeacherRoutineDataResult {
  activeRoutine: {
    id: string;
    title: string;
    generatedAt: string;
  } | null;
  teacher: {
    staffId: string;
    name: string;
    designation?: string;
  };
  periodsByDay: Record<string, any[]>;
  todaySlots: any[];
  totalWeeklyPeriods: number;
  assignedDuties: any[];
}

export async function fetchTeacherRoutineData(
  adminClient: SupabaseClient,
  effectiveStaffId: string,
  fallbackTeacherName?: string
): Promise<TeacherRoutineDataResult> {
  const [
    { data: activeRoutine },
    { data: classRows },
    { data: subjectRows },
    { data: roomRows },
    { data: availRows },
    { data: staffRow },
    { data: assignmentRows },
    { data: settingsRow },
  ] = await Promise.all([
    adminClient
      .from("routine_generated_cache")
      .select("id, title, is_active, grid, metadata, created_at")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    adminClient.from("routine_classes").select("id, class_name, section"),
    adminClient.from("routine_subjects").select("id, name, is_lab"),
    adminClient.from("routine_rooms").select("id, name"),
    adminClient
      .from("routine_teacher_availability")
      .select("id, teacher_id, teacher_name, short_name, class_teacher_of, available_slots, primary_subject"),
    adminClient
      .from("staff_profiles")
      .select("id, full_name, designation")
      .eq("id", effectiveStaffId)
      .maybeSingle(),
    adminClient
      .from("routine_assignments")
      .select("id, class_id, subject_id, teacher_id, periods_per_week"),
    adminClient
      .from("routine_settings")
      .select("working_days")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const workingDays: number[] =
    Array.isArray(settingsRow?.working_days) && settingsRow.working_days.length > 0
      ? settingsRow.working_days
      : [0, 1, 2, 3, 4, 5];

  const classMap = new Map<string, { className: string; section: string }>();
  (classRows || []).forEach((c) => {
    classMap.set(c.id, { className: c.class_name, section: c.section });
  });

  const subjectMap = new Map<string, { name: string; isLab: boolean }>();
  (subjectRows || []).forEach((s) => {
    subjectMap.set(s.id, { name: s.name, isLab: Boolean(s.is_lab) });
  });

  const roomMap = new Map<string, string>();
  (roomRows || []).forEach((r) => {
    roomMap.set(r.id, r.name);
  });

  const targetTeacherIds = new Set<string>([effectiveStaffId]);
  let teacherAvail: any = null;
  (availRows || []).forEach((a) => {
    if (a.teacher_id === effectiveStaffId || a.id === effectiveStaffId) {
      targetTeacherIds.add(a.id);
      if (a.teacher_id) targetTeacherIds.add(a.teacher_id);
      teacherAvail = a;
    }
  });

  const rawSlots = teacherAvail?.available_slots || {};
  const classTeacherOf =
    teacherAvail?.class_teacher_of ||
    rawSlots._classTeacherOf ||
    rawSlots.classTeacherOf ||
    null;

  const assignedDuties: any[] = [];
  if (classTeacherOf) {
    let ctClass = classTeacherOf;
    let ctSec = "ALL";
    if (classTeacherOf.includes("-")) {
      const parts = classTeacherOf.split("-");
      ctClass = parts[0].trim();
      ctSec = parts[1].trim();
    } else if (classTeacherOf.includes(" ")) {
      const parts = classTeacherOf.split(" ");
      ctClass = parts.slice(0, -1).join(" ").trim();
      ctSec = parts[parts.length - 1].trim();
    }
    assignedDuties.push({
      id: `ct-${classTeacherOf}`,
      roleType: "CLASS_TEACHER",
      className: ctClass.replace(/^Class\s+/i, ""),
      section: ctSec,
      subject: "Class In-Charge",
    });
  }

  const dutyMap = new Map<string, { className: string; section: string; subject: string; periodsPerWeek: number }>();

  (assignmentRows || []).forEach((asg: any) => {
    if (targetTeacherIds.has(asg.teacher_id)) {
      const clsInfo = classMap.get(asg.class_id) || { className: "Class", section: "ALL" };
      const subjInfo = subjectMap.get(asg.subject_id) || { name: "Subject", isLab: false };
      const key = `${clsInfo.className}__${clsInfo.section}__${subjInfo.name}`;
      dutyMap.set(key, {
        className: clsInfo.className,
        section: clsInfo.section,
        subject: subjInfo.name,
        periodsPerWeek: asg.periods_per_week || 4,
      });
    }
  });

  const periodsByDay: Record<string, any[]> = {
    Monday: [],
    Tuesday: [],
    Wednesday: [],
    Thursday: [],
    Friday: [],
    Saturday: [],
  };

  let totalWeeklyPeriods = 0;

  if (activeRoutine?.grid && typeof activeRoutine.grid === "object") {
    const grid = activeRoutine.grid as Record<string, Record<string | number, Record<string | number, any>>>;
    const countedGroupUnits = new Set<string>();

    for (const [classId, daySchedule] of Object.entries(grid)) {
      if (!daySchedule || typeof daySchedule !== "object") continue;

      const clsInfo = classMap.get(classId) || { className: "Class", section: "A" };

      for (const [dayKey, periodSchedule] of Object.entries(daySchedule)) {
        const dayPos = parseInt(String(dayKey), 10);
        if (isNaN(dayPos) || dayPos < 0 || dayPos >= workingDays.length) continue;
        const dayAbs = workingDays[dayPos];
        if (dayAbs < 0 || dayAbs >= DAY_NAMES.length) continue;
        const dayName = DAY_NAMES[dayAbs];
        if (!periodsByDay[dayName]) continue;

        if (!periodSchedule || typeof periodSchedule !== "object") continue;

        for (const [periodKey, cell] of Object.entries(periodSchedule)) {
          if (!cell) continue;

          const opts: Array<{ sid: string; tid: string; rid?: string | null }> =
            Array.isArray(cell.opts) && cell.opts.length > 0
              ? cell.opts
              : cell.tid
              ? [{ sid: cell.sid, tid: cell.tid, rid: cell.rid ?? null }]
              : [];
          const matchedOpt = opts.find((o) => o.tid && targetTeacherIds.has(o.tid));
          if (!matchedOpt) continue;

          if (cell.gid) {
            const unitKey = `${cell.gid}_${dayKey}_${periodKey}_${matchedOpt.tid}`;
            if (countedGroupUnits.has(unitKey)) continue;
            countedGroupUnits.add(unitKey);
          }

          const periodIdx = parseInt(String(periodKey), 10);
          const periodNum = periodIdx + 1;
          const subjInfo = subjectMap.get(matchedOpt.sid) || { name: "Class Activity", isLab: false };
          const roomName = matchedOpt.rid ? roomMap.get(matchedOpt.rid) || "Assigned Room" : null;

          periodsByDay[dayName].push({
            periodNumber: periodNum,
            period: `Period ${periodNum}`,
            time: getPeriodTimeLabel(periodNum),
            cls: clsInfo.className,
            sec: clsInfo.section,
            subj: subjInfo.name,
            room: roomName,
            isLab: Boolean(cell.lab || subjInfo.isLab),
            isGroup: Boolean(cell.gid),
            isFirst: periodNum === 1,
          });

          totalWeeklyPeriods++;

          const key = `${clsInfo.className}__${clsInfo.section}__${subjInfo.name}`;
          const existing = dutyMap.get(key);
          if (existing) {
            existing.periodsPerWeek = (existing.periodsPerWeek || 0) + 1;
          } else {
            dutyMap.set(key, {
              className: clsInfo.className,
              section: clsInfo.section,
              subject: subjInfo.name,
              periodsPerWeek: 1,
            });
          }
        }
      }
    }
  }

  for (const day of Object.keys(periodsByDay)) {
    periodsByDay[day].sort((a, b) => a.periodNumber - b.periodNumber);
  }

  for (const [key, d] of dutyMap.entries()) {
    assignedDuties.push({
      id: `st-${key}`,
      roleType: "SUBJECT_TEACHER",
      className: d.className.replace(/^Class\s+/i, ""),
      section: d.section,
      subject: d.subject,
      periodsPerWeek: d.periodsPerWeek,
    });
  }

  const dayNamesList = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const currentDayName = dayNamesList[new Date().getDay()];
  const todaySlots = periodsByDay[currentDayName] || [];

  return {
    activeRoutine: activeRoutine
      ? {
          id: activeRoutine.id,
          title: activeRoutine.title,
          generatedAt: activeRoutine.created_at,
        }
      : null,
    teacher: {
      staffId: effectiveStaffId,
      name: staffRow?.full_name || fallbackTeacherName || "Teacher",
      designation: staffRow?.designation,
    },
    periodsByDay,
    todaySlots,
    totalWeeklyPeriods,
    assignedDuties,
  };
}
