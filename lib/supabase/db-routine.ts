import { createClient } from "@/lib/supabase/client";
import {
  RoutineSettings,
  RoutineRoom,
  RoutineClass,
  RoutineSubject,
  RoutineTeacher,
  RoutineAssignment,
  GeneratedRoutine,
  DEFAULT_ROUTINE_SETTINGS,
} from "@/lib/routine/types";

export interface RoutineFullState {
  settings: RoutineSettings;
  rooms: RoutineRoom[];
  classes: RoutineClass[];
  subjects: RoutineSubject[];
  teachers: RoutineTeacher[];
  assignments: RoutineAssignment[];
  routine: GeneratedRoutine | null;
}

const LOCAL_STORAGE_KEY = "routine_forge_pro_local_state_v1";

function getLocalState(): Partial<RoutineFullState> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function setLocalState(state: Partial<RoutineFullState>) {
  if (typeof window === "undefined") return;
  try {
    const existing = getLocalState() || {};
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify({ ...existing, ...state }));
  } catch {}
}

/**
 * Loads the complete routine dataset from Supabase (with automatic teacher sync from staff_profiles).
 */
export async function fetchRoutineFullState(): Promise<RoutineFullState> {
  const supabase = createClient();
  const local = getLocalState();

  let settings: RoutineSettings = DEFAULT_ROUTINE_SETTINGS;
  let rooms: RoutineRoom[] = [];
  let classes: RoutineClass[] = [];
  let subjects: RoutineSubject[] = [];
  let teachers: RoutineTeacher[] = [];
  let assignments: RoutineAssignment[] = [];
  let routine: GeneratedRoutine | null = null;

  try {
    // 1. Fetch Settings
    const { data: setRow, error: setError } = await supabase
      .from("routine_settings")
      .select("*")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!setError && setRow) {
      settings = {
        id: setRow.id,
        workingDays: setRow.working_days || [0, 1, 2, 3, 4, 5],
        periodsPerDay: setRow.periods_per_day || 8,
        halfDays: setRow.half_days || [5],
        halfDayPeriods: setRow.half_day_periods || 4,
        breaks: setRow.breaks || [4],
        tchDailyMax: setRow.tch_daily_max || 5,
        tchConsecMax: setRow.tch_consec_max || 3,
      };
    } else if (local?.settings) {
      settings = local.settings;
    }

    // 2. Fetch Rooms
    const { data: roomRows, error: roomError } = await supabase
      .from("routine_rooms")
      .select("*")
      .order("name", { ascending: true });

    if (!roomError && roomRows && roomRows.length > 0) {
      rooms = roomRows.map((r: any) => ({
        id: r.id,
        name: r.name,
        isLab: Boolean(r.is_lab),
      }));
    } else if (local?.rooms && local.rooms.length > 0) {
      rooms = local.rooms;
    }

    // 3. Fetch Classes
    const { data: classRows, error: classError } = await supabase
      .from("routine_classes")
      .select("*")
      .order("class_name", { ascending: true })
      .order("section", { ascending: true });

    if (!classError && classRows && classRows.length > 0) {
      classes = classRows.map((c: any) => ({
        id: c.id,
        className: c.class_name,
        section: c.section,
        dailyPeriods: c.daily_periods,
      }));
    } else if (local?.classes && local.classes.length > 0) {
      classes = local.classes;
    }

    // 4. Fetch Subjects
    const { data: subjRows, error: subjError } = await supabase
      .from("routine_subjects")
      .select("*")
      .order("name", { ascending: true });

    if (!subjError && subjRows && subjRows.length > 0) {
      subjects = subjRows.map((s: any) => ({
        id: s.id,
        name: s.name,
        className: s.class_name || s.className || null,
        classId: s.class_id || s.classId || null,
        isHard: Boolean(s.is_hard),
        isLab: Boolean(s.is_lab),
        timePref: s.time_pref || "any",
        allowMultiplePerDay: Boolean(s.allow_multiple_per_day),
        maxPerDay:
          s.max_per_day !== undefined && s.max_per_day !== null
            ? Number(s.max_per_day)
            : Boolean(s.allow_multiple_per_day)
            ? 2
            : 1,
        periodsPerWeek:
          s.periods_per_week !== undefined && s.periods_per_week !== null
            ? Number(s.periods_per_week)
            : 5,
      }));
    } else if (local?.subjects && local.subjects.length > 0) {
      subjects = local.subjects;
    }

    // 5. Fetch Teachers from staff_profiles and sync with routine_teacher_availability
    const { data: staffRows, error: staffError } = await supabase
      .from("staff_profiles")
      .select("id, full_name, employee_type, designation, status")
      .eq("employee_type", "TEACHING")
      .order("full_name", { ascending: true });

    const { data: availRows } = await supabase
      .from("routine_teacher_availability")
      .select("*");

    const availMap = new Map<string, any>();
    if (availRows) {
      availRows.forEach((a: any) => availMap.set(a.teacher_id, a));
    }

    if (!staffError && staffRows && staffRows.length > 0) {
      const defaultAvailSlots: Record<number, number[]> = {};
      settings.workingDays.forEach((d) => {
        defaultAvailSlots[d] = [];
        for (let p = 1; p <= settings.periodsPerDay; p++) {
          defaultAvailSlots[d].push(p);
        }
      });

      teachers = staffRows.map((st: any) => {
        const customAvail = availMap.get(st.id);
        const words = (st.full_name || "").trim().split(/\s+/);
        const defaultShort =
          words.length >= 2
            ? (words[0][0] + words[1][0]).toUpperCase()
            : (st.full_name || "").slice(0, 3).toUpperCase();

        const rawAvail = customAvail?.available_slots || {};
        const qClasses = rawAvail._qualifiedClasses || rawAvail.qualifiedClasses || [];
        const cSubjects = rawAvail._classSubjects || rawAvail.classSubjects || {};

        const cleanSlots: Record<number, number[]> = {};
        settings.workingDays.forEach((d) => {
          if (Array.isArray(rawAvail[d])) {
            cleanSlots[d] = rawAvail[d];
          } else if (Array.isArray(rawAvail[String(d)])) {
            cleanSlots[d] = rawAvail[String(d)];
          } else {
            cleanSlots[d] = [];
            for (let p = 1; p <= settings.periodsPerDay; p++) {
              cleanSlots[d].push(p);
            }
          }
        });

        return {
          id: st.id,
          name: st.full_name,
          shortName: customAvail?.short_name || defaultShort,
          maxPeriods: customAvail?.max_periods ?? 24,
          availableSlots: cleanSlots,
          qualifiedClasses: qClasses,
          classSubjects: cSubjects,
        };
      });
    } else if (local?.teachers && local.teachers.length > 0) {
      teachers = local.teachers;
    }

    // 6. Fetch Assignments
    const { data: asgRows, error: asgError } = await supabase
      .from("routine_assignments")
      .select("*");

    if (!asgError && asgRows && asgRows.length > 0) {
      assignments = asgRows.map((a: any) => ({
        id: a.id,
        classId: a.class_id,
        subjectId: a.subject_id,
        teacherId: a.teacher_id,
        roomId: a.room_id,
        periodsPerWeek: a.periods_per_week,
      }));
    } else if (local?.assignments && local.assignments.length > 0) {
      assignments = local.assignments;
    }

    // 7. Fetch Latest Generated Routine
    const { data: routineRow, error: routineError } = await supabase
      .from("routine_generated_cache")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!routineError && routineRow && routineRow.generated_grid) {
      routine = {
        id: routineRow.id,
        success: true,
        days: routineRow.metadata?.days || settings.workingDays,
        teachingPeriods: routineRow.metadata?.teachingPeriods || [],
        breaks: routineRow.metadata?.breaks || settings.breaks,
        grid: routineRow.generated_grid,
        iterations: routineRow.metadata?.iterations,
        executionTimeMs: routineRow.metadata?.executionTimeMs,
        generatedAt: routineRow.created_at,
        metadata: routineRow.metadata,
      };
    } else if (local?.routine) {
      routine = local.routine;
    }
  } catch (err) {
    console.warn("fetchRoutineFullState fallback to local state:", err);
    if (local) {
      return {
        settings: local.settings || DEFAULT_ROUTINE_SETTINGS,
        rooms: local.rooms || [],
        classes: local.classes || [],
        subjects: local.subjects || [],
        teachers: local.teachers || [],
        assignments: local.assignments || [],
        routine: local.routine || null,
      };
    }
  }

  // Backup to localStorage
  setLocalState({
    settings,
    rooms,
    classes,
    subjects,
    teachers,
    assignments,
    routine,
  });

  return {
    settings,
    rooms,
    classes,
    subjects,
    teachers,
    assignments,
    routine,
  };
}

/**
 * Saves Routine Settings to Supabase & Local Cache.
 */
export async function saveRoutineSettingsDb(settings: RoutineSettings): Promise<boolean> {
  const supabase = createClient();
  setLocalState({ settings });

  try {
    const payload = {
      working_days: settings.workingDays,
      periods_per_day: settings.periodsPerDay,
      half_days: settings.halfDays,
      half_day_periods: settings.halfDayPeriods,
      breaks: settings.breaks,
      tch_daily_max: settings.tchDailyMax,
      tch_consec_max: settings.tchConsecMax,
      updated_at: new Date().toISOString(),
    };

    if (settings.id) {
      const { error } = await supabase
        .from("routine_settings")
        .update(payload)
        .eq("id", settings.id);
      if (!error) return true;
    }

    const { error: insErr } = await supabase.from("routine_settings").insert(payload);
    return !insErr;
  } catch (err) {
    console.warn("saveRoutineSettingsDb warning:", err);
    return true; // local saved
  }
}

/**
 * Upsert Room
 */
export async function upsertRoomDb(room: { id?: string; name: string; isLab?: boolean }): Promise<string> {
  const supabase = createClient();
  const id = room.id || crypto.randomUUID();
  const isLab = Boolean(room.isLab);

  try {
    await supabase.from("routine_rooms").upsert({
      id,
      name: room.name,
      is_lab: isLab,
    });
  } catch (err) {
    console.warn("upsertRoomDb:", err);
  }
  return id;
}

/**
 * Delete Room
 */
export async function deleteRoomDb(id: string): Promise<boolean> {
  const supabase = createClient();
  try {
    await supabase.from("routine_rooms").delete().eq("id", id);
    return true;
  } catch (err) {
    console.warn("deleteRoomDb:", err);
    return false;
  }
}

/**
 * Upsert Class
 */
export async function upsertClassDb(cls: { id?: string; className: string; section: string; dailyPeriods?: number | null }): Promise<string> {
  const supabase = createClient();
  const id = cls.id || crypto.randomUUID();

  try {
    await supabase.from("routine_classes").upsert({
      id,
      class_name: cls.className,
      section: cls.section,
      daily_periods: cls.dailyPeriods || null,
    });
  } catch (err) {
    console.warn("upsertClassDb:", err);
  }
  return id;
}

/**
 * Batch Upsert Classes
 */
export async function batchUpsertClassesDb(
  classesList: { id?: string; className: string; section: string; dailyPeriods?: number | null }[]
): Promise<RoutineClass[]> {
  const supabase = createClient();
  const rows = classesList.map((c) => ({
    id: c.id || crypto.randomUUID(),
    class_name: c.className,
    section: c.section,
    daily_periods: c.dailyPeriods || null,
  }));

  try {
    const { data, error } = await supabase
      .from("routine_classes")
      .upsert(rows)
      .select();

    if (!error && data) {
      return data.map((r: any) => ({
        id: r.id,
        className: r.class_name,
        section: r.section,
        dailyPeriods: r.daily_periods,
      }));
    }
  } catch (err) {
    console.warn("batchUpsertClassesDb:", err);
  }

  return rows.map((r) => ({
    id: r.id,
    className: r.class_name,
    section: r.section,
    dailyPeriods: r.daily_periods,
  }));
}

/**
 * Delete Class
 */
export async function deleteClassDb(id: string): Promise<boolean> {
  const supabase = createClient();
  try {
    await supabase.from("routine_classes").delete().eq("id", id);
    return true;
  } catch (err) {
    console.warn("deleteClassDb:", err);
    return false;
  }
}

/**
 * Upsert Subject
 */
export async function upsertSubjectDb(subj: {
  id?: string;
  name: string;
  className?: string | null;
  classId?: string | null;
  isHard?: boolean;
  isLab?: boolean;
  timePref?: "any" | "morning" | "afternoon";
  allowMultiplePerDay?: boolean;
  maxPerDay?: number | null;
  periodsPerWeek?: number | null;
}): Promise<string> {
  const supabase = createClient();
  const id = subj.id || crypto.randomUUID();

  try {
    const payload: Record<string, any> = {
      id,
      name: subj.name,
      is_hard: Boolean(subj.isHard),
      is_lab: Boolean(subj.isLab),
      time_pref: subj.timePref || "any",
      allow_multiple_per_day: Boolean(subj.allowMultiplePerDay),
    };
    if (subj.className !== undefined) payload.class_name = subj.className;
    if (subj.classId !== undefined) payload.class_id = subj.classId;
    if (subj.maxPerDay !== undefined) payload.max_per_day = subj.maxPerDay;
    if (subj.periodsPerWeek !== undefined) payload.periods_per_week = subj.periodsPerWeek;

    const { error } = await supabase.from("routine_subjects").upsert(payload);
    if (error) {
      await supabase.from("routine_subjects").upsert({
        id,
        name: subj.name,
        is_hard: Boolean(subj.isHard),
        is_lab: Boolean(subj.isLab),
        time_pref: subj.timePref || "any",
        allow_multiple_per_day: Boolean(subj.allowMultiplePerDay),
      });
    }
  } catch (err) {
    console.warn("upsertSubjectDb:", err);
  }
  return id;
}

/**
 * Delete Subject
 */
export async function deleteSubjectDb(id: string): Promise<boolean> {
  const supabase = createClient();
  try {
    await supabase.from("routine_subjects").delete().eq("id", id);
    return true;
  } catch (err) {
    console.warn("deleteSubjectDb:", err);
    return false;
  }
}

/**
 * Upsert Teacher Availability & Class/Subject Qualifications
 */
export async function upsertTeacherAvailabilityDb(teacher: RoutineTeacher): Promise<boolean> {
  const supabase = createClient();
  try {
    const isUuid = teacher.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(teacher.id);
    const teacherId = isUuid ? teacher.id : null;

    const payload = {
      ...(isUuid ? { teacher_id: teacherId } : {}),
      teacher_name: teacher.name,
      short_name: teacher.shortName,
      max_periods: teacher.maxPeriods,
      available_slots: {
        ...teacher.availableSlots,
        _qualifiedClasses: teacher.qualifiedClasses || [],
        _classSubjects: teacher.classSubjects || {},
      },
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase.from("routine_teacher_availability").upsert(
      payload,
      { onConflict: isUuid ? "teacher_id" : "id" }
    );
    return !error;
  } catch (err) {
    console.warn("upsertTeacherAvailabilityDb:", err);
    return false;
  }
}

/**
 * Delete Teacher from Routine
 */
export async function deleteTeacherDb(id: string): Promise<boolean> {
  const supabase = createClient();
  try {
    await supabase.from("routine_teacher_availability").delete().eq("teacher_id", id);
    await supabase.from("routine_teacher_availability").delete().eq("id", id);
    await supabase.from("routine_assignments").delete().eq("teacher_id", id);
    return true;
  } catch (err) {
    console.warn("deleteTeacherDb:", err);
    return false;
  }
}

/**
 * Upsert Assignment
 */
export async function upsertAssignmentDb(asg: {
  id?: string;
  classId: string;
  subjectId: string;
  teacherId: string;
  roomId?: string | null;
  periodsPerWeek: number;
}): Promise<string> {
  const supabase = createClient();
  const id = asg.id || crypto.randomUUID();

  try {
    await supabase.from("routine_assignments").upsert(
      {
        id,
        class_id: asg.classId,
        subject_id: asg.subjectId,
        teacher_id: asg.teacherId,
        room_id: asg.roomId || null,
        periods_per_week: asg.periodsPerWeek,
      },
      { onConflict: "class_id,subject_id" }
    );
  } catch (err) {
    console.warn("upsertAssignmentDb:", err);
  }
  return id;
}

/**
 * Batch Upsert Assignments
 */
export async function batchUpsertAssignmentsDb(
  asgList: RoutineAssignment[]
): Promise<boolean> {
  const supabase = createClient();
  if (!asgList || asgList.length === 0) return true;

  const rows = asgList.map((asg) => ({
    id: asg.id || crypto.randomUUID(),
    class_id: asg.classId,
    subject_id: asg.subjectId,
    teacher_id: asg.teacherId,
    room_id: asg.roomId || null,
    periods_per_week: asg.periodsPerWeek,
  }));

  try {
    const { error } = await supabase
      .from("routine_assignments")
      .upsert(rows, { onConflict: "class_id,subject_id" });
    if (error) {
      console.warn("batchUpsertAssignmentsDb error:", error);
      return false;
    }
    return true;
  } catch (err) {
    console.warn("batchUpsertAssignmentsDb catch:", err);
    return false;
  }
}

/**
 * Delete Assignment
 */
export async function deleteAssignmentDb(id: string): Promise<boolean> {
  const supabase = createClient();
  try {
    await supabase.from("routine_assignments").delete().eq("id", id);
    return true;
  } catch (err) {
    console.warn("deleteAssignmentDb:", err);
    return false;
  }
}

/**
 * Save Generated Routine in Cache
 */
export async function saveGeneratedRoutineDb(routine: GeneratedRoutine): Promise<boolean> {
  const supabase = createClient();
  setLocalState({ routine });

  try {
    const { error } = await supabase.from("routine_generated_cache").insert({
      generated_grid: routine.grid,
      metadata: {
        days: routine.days,
        teachingPeriods: routine.teachingPeriods,
        breaks: routine.breaks,
        iterations: routine.iterations,
        executionTimeMs: routine.executionTimeMs,
        ...(routine.metadata || {}),
      },
    });
    return !error;
  } catch (err) {
    console.warn("saveGeneratedRoutineDb:", err);
    return true;
  }
}
