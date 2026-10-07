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
import { sanitizeTeacherSubjectPeriods } from "@/lib/routine/routine-helpers";

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

export function getLocalRoutineState(): Partial<RoutineFullState> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setLocalRoutineState(state: Partial<RoutineFullState>) {
  if (typeof window === "undefined") return;
  try {
    const existing = getLocalRoutineState() || {};
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify({ ...existing, ...state }));
  } catch {}
}

function cleanSlotsForTeacher(rawAvail: any, settings: RoutineSettings): Record<number, number[]> {
  const cleanSlots: Record<number, number[]> = {};
  const days = settings.workingDays || [0, 1, 2, 3, 4, 5];
  const periods = settings.periodsPerDay || 8;

  days.forEach((d) => {
    if (rawAvail && Array.isArray(rawAvail[d])) {
      cleanSlots[d] = rawAvail[d];
    } else if (rawAvail && Array.isArray(rawAvail[String(d)])) {
      cleanSlots[d] = rawAvail[String(d)];
    } else {
      cleanSlots[d] = [];
      for (let p = 1; p <= periods; p++) {
        cleanSlots[d].push(p);
      }
    }
  });
  return cleanSlots;
}

/**
 * Loads the complete routine dataset from Supabase + Local Storage.
 */
export async function fetchRoutineFullState(): Promise<RoutineFullState> {
  const supabase = createClient();
  const local = getLocalRoutineState();

  let settings: RoutineSettings = local?.settings || DEFAULT_ROUTINE_SETTINGS;
  let rooms: RoutineRoom[] = local?.rooms || [];
  let classes: RoutineClass[] = local?.classes || [];
  let subjects: RoutineSubject[] = local?.subjects || [];
  let teachers: RoutineTeacher[] = local?.teachers || [];
  let assignments: RoutineAssignment[] = local?.assignments || [];
  let routine: GeneratedRoutine | null = local?.routine || null;

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
        halfDayPeriods: setRow.half_day_periods ?? 3,
        breaks: setRow.breaks || [4],
        tchDailyMax: setRow.tch_daily_max || 5,
        tchConsecMax: setRow.tch_consec_max ?? 2,
      };
    }

    // 2. Fetch Rooms
    const { data: roomRows, error: roomError } = await supabase
      .from("routine_rooms")
      .select("*")
      .order("name", { ascending: true });

    if (!roomError) {
      if (roomRows && roomRows.length > 0) {
        const dbRooms: RoutineRoom[] = roomRows.map((r: any) => ({
          id: r.id,
          name: r.name,
          isLab: Boolean(r.is_lab),
        }));
        rooms = dbRooms;
      } else if (roomRows && roomRows.length === 0 && !local?.rooms?.length) {
        rooms = [];
      }
      setLocalRoutineState({ rooms });
    }

    // 3. Fetch Classes
    const { data: classRows, error: classError } = await supabase
      .from("routine_classes")
      .select("*")
      .order("class_name", { ascending: true })
      .order("section", { ascending: true });

    if (!classError) {
      if (classRows && classRows.length > 0) {
        const dbClasses: RoutineClass[] = classRows.map((c: any) => ({
          id: c.id,
          className: c.class_name,
          section: c.section,
          dailyPeriods: c.daily_periods,
        }));

        // Strict deduplication by (className + section)
        const dedupedClasses: RoutineClass[] = [];
        const seenClassKeys = new Set<string>();

        const getClassKey = (c: RoutineClass) =>
          `${(c.className || "").trim().toLowerCase()}::${(c.section || "").trim().toLowerCase()}`;

        dbClasses.forEach((c) => {
          const key = getClassKey(c);
          if (!seenClassKeys.has(key)) {
            seenClassKeys.add(key);
            dedupedClasses.push(c);
          }
        });

        classes = dedupedClasses;
      } else if (classRows && classRows.length === 0 && !local?.classes?.length) {
        classes = [];
      }
      setLocalRoutineState({ classes });
    }

    // 4. Fetch Subjects
    const { data: subjRows, error: subjError } = await supabase
      .from("routine_subjects")
      .select("*")
      .order("name", { ascending: true });

    if (!subjError) {
      if (subjRows && subjRows.length > 0) {
        const dbSubjects: RoutineSubject[] = subjRows.map((s: any) => {
          const isLab = Boolean(s.is_lab);
          const totalP =
            s.periods_per_week !== undefined && s.periods_per_week !== null
              ? Number(s.periods_per_week)
              : isLab ? 6 : 5;
          const labP =
            s.lab_periods !== undefined && s.lab_periods !== null
              ? Number(s.lab_periods)
              : isLab ? 2 : 0;
          const theoryP =
            s.theory_periods !== undefined && s.theory_periods !== null
              ? Number(s.theory_periods)
              : isLab ? Math.max(0, totalP - labP) : totalP;

          return {
            id: s.id,
            name: s.name,
            className: s.class_name || s.className || null,
            classId: s.class_id || s.classId || null,
            stream: s.stream || null,
            isCommon: Boolean(s.is_common ?? s.isCommon),
            isHard: Boolean(s.is_hard),
            isLab,
            theoryPeriods: theoryP,
            labPeriods: labP,
            timePref: s.time_pref || "any",
            allowMultiplePerDay: Boolean(s.allow_multiple_per_day),
            maxPerDay:
              s.max_per_day !== undefined && s.max_per_day !== null
                ? Number(s.max_per_day)
                : Boolean(s.allow_multiple_per_day)
                ? 2
                : 1,
            periodsPerWeek: totalP,
          };
        });

        // Strict canonical deduplication to ensure zero duplicate subjects
        const dedupedSubjects: RoutineSubject[] = [];
        const seenSubjectsKey = new Set<string>();

        const getCanonicalKey = (s: RoutineSubject) => {
          const cls = (s.className || "").trim().toLowerCase();
          const normName = s.name
            .trim()
            .toLowerCase()
            .replace(/\s*\([^)]*\)/g, "")
            .replace(/\s+/g, " ")
            .trim();
          const stream = (s.stream || "general").trim().toLowerCase();
          return `${cls}::${normName}::${stream}`;
        };

        dbSubjects.forEach((sub) => {
          const key = getCanonicalKey(sub);
          if (!seenSubjectsKey.has(key)) {
            seenSubjectsKey.add(key);
            dedupedSubjects.push(sub);
          }
        });

        subjects = dedupedSubjects;
      } else if (subjRows && subjRows.length === 0 && !local?.subjects?.length) {
        subjects = [];
      }
      setLocalRoutineState({ subjects });
    }

    // 5. Fetch Teachers: staff_profiles + routine_teacher_availability + local teachers
    const { data: staffRows } = await supabase
      .from("staff_profiles")
      .select("id, full_name, employee_type, designation, status")
      .eq("employee_type", "TEACHING")
      .order("full_name", { ascending: true });

    const { data: availRows } = await supabase
      .from("routine_teacher_availability")
      .select("*");

    const availMap = new Map<string, any>();
    if (availRows) {
      availRows.forEach((a: any) => {
        if (a.teacher_id) availMap.set(a.teacher_id, a);
        if (a.id) availMap.set(a.id, a);
      });
    }

    const loadedTeachersMap = new Map<string, RoutineTeacher>();

    // Add teachers from staff_profiles
    if (staffRows && staffRows.length > 0) {
      staffRows.forEach((st: any) => {
        const customAvail = availMap.get(st.id);
        const words = (st.full_name || "").trim().split(/\s+/);
        const defaultShort =
          words.length >= 2
            ? (words[0][0] + words[1][0]).toUpperCase()
            : (st.full_name || "").slice(0, 3).toUpperCase();

        const rawAvail = customAvail?.available_slots || {};
        const qClasses = rawAvail._qualifiedClasses || rawAvail.qualifiedClasses || [];
        const cSubjects = rawAvail._classSubjects || rawAvail.classSubjects || {};
        const sSubjects = rawAvail._sectionSubjects || rawAvail.sectionSubjects || {};
        const cSections = rawAvail._classSections || rawAvail.classSections || {};
        const cPeriods = rawAvail._classPeriods || rawAvail.classPeriods || {};
        const sPeriods = rawAvail._sectionPeriods || rawAvail.sectionPeriods || {};
        const subPeriods = rawAvail._subjectPeriods || rawAvail.subjectPeriods || {};
        const primarySubject = customAvail?.primary_subject || rawAvail._primarySubject || rawAvail.primarySubject || null;
        const classTeacherOf = customAvail?.class_teacher_of || rawAvail._classTeacherOf || rawAvail.classTeacherOf || null;
        const classTeacherFirstPeriods =
          customAvail?.class_teacher_first_periods ??
          rawAvail._classTeacherFirstPeriods ??
          rawAvail.classTeacherFirstPeriods ??
          (classTeacherOf ? 3 : null);

        loadedTeachersMap.set(st.id, {
          id: st.id,
          name: st.full_name,
          shortName: customAvail?.short_name || defaultShort,
          maxPeriods: customAvail?.max_periods ?? 24,
          availableSlots: cleanSlotsForTeacher(rawAvail, settings),
          qualifiedClasses: qClasses,
          classSubjects: cSubjects,
          sectionSubjects: sSubjects,
          classSections: cSections,
          classPeriods: cPeriods,
          sectionPeriods: sPeriods,
          subjectPeriods: subPeriods,
          primarySubject: primarySubject,
          classTeacherOf: classTeacherOf,
          classTeacherFirstPeriods: classTeacherFirstPeriods,
        });
      });
    }

    // Add standalone custom teachers from routine_teacher_availability
    if (availRows && availRows.length > 0) {
      availRows.forEach((a: any) => {
        const teacherKey = a.teacher_id || a.id;
        if (teacherKey && !loadedTeachersMap.has(teacherKey)) {
          const rawAvail = a.available_slots || {};
          const qClasses = rawAvail._qualifiedClasses || rawAvail.qualifiedClasses || [];
          const cSubjects = rawAvail._classSubjects || rawAvail.classSubjects || {};
          const sSubjects = rawAvail._sectionSubjects || rawAvail.sectionSubjects || {};
          const cSections = rawAvail._classSections || rawAvail.classSections || {};
          const cPeriods = rawAvail._classPeriods || rawAvail.classPeriods || {};
          const sPeriods = rawAvail._sectionPeriods || rawAvail.sectionPeriods || {};
          const subPeriods = rawAvail._subjectPeriods || rawAvail.subjectPeriods || {};
          const primarySubject = a.primary_subject || rawAvail._primarySubject || rawAvail.primarySubject || null;
          const classTeacherOf = a.class_teacher_of || rawAvail._classTeacherOf || rawAvail.classTeacherOf || null;
          const classTeacherFirstPeriods =
            a.class_teacher_first_periods ??
            rawAvail._classTeacherFirstPeriods ??
            rawAvail.classTeacherFirstPeriods ??
            (classTeacherOf ? 3 : null);

          loadedTeachersMap.set(teacherKey, {
            id: teacherKey,
            name: a.teacher_name || "Teacher",
            shortName: a.short_name || (a.teacher_name ? a.teacher_name.slice(0, 3).toUpperCase() : "TCH"),
            maxPeriods: a.max_periods ?? 24,
            availableSlots: cleanSlotsForTeacher(rawAvail, settings),
            qualifiedClasses: qClasses,
            classSubjects: cSubjects,
            sectionSubjects: sSubjects,
            classSections: cSections,
            classPeriods: cPeriods,
            sectionPeriods: sPeriods,
            subjectPeriods: subPeriods,
            primarySubject: primarySubject,
            classTeacherOf: classTeacherOf,
            classTeacherFirstPeriods: classTeacherFirstPeriods,
          });
        }
      });
    }

    teachers = Array.from(loadedTeachersMap.values())
      .map(sanitizeTeacherSubjectPeriods)
      .sort((a, b) => a.name.localeCompare(b.name));

    // 6. Fetch Assignments
    const { data: asgRows, error: asgError } = await supabase
      .from("routine_assignments")
      .select("*");

    if (!asgError) {
      if (asgRows && asgRows.length > 0) {
        assignments = asgRows.map((a: any) => ({
          id: a.id,
          classId: a.class_id,
          subjectId: a.subject_id,
          teacherId: a.teacher_id,
          roomId: a.room_id,
          periodsPerWeek: a.periods_per_week,
        }));
      } else if (asgRows && asgRows.length === 0 && !local?.assignments?.length) {
        assignments = [];
      }
      setLocalRoutineState({ assignments });
    }

    // 7. Fetch Latest Generated Routine
    const { data: routineRow, error: routineError } = await supabase
      .from("routine_generated_cache")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!routineError && routineRow && (routineRow.grid || routineRow.generated_grid)) {
      routine = {
        id: routineRow.id,
        success: true,
        days: routineRow.metadata?.days || settings.workingDays,
        teachingPeriods: routineRow.metadata?.teachingPeriods || [],
        breaks: routineRow.metadata?.breaks || settings.breaks,
        grid: routineRow.grid || routineRow.generated_grid,
        iterations: routineRow.metadata?.iterations,
        executionTimeMs: routineRow.metadata?.executionTimeMs,
        generatedAt: routineRow.created_at,
        metadata: routineRow.metadata,
      };
    }
  } catch (err) {
    console.warn("fetchRoutineFullState fallback to local state:", err);
  }

  // Persist updated complete state to localStorage
  setLocalRoutineState({
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
  setLocalRoutineState({ settings });
  const supabase = createClient();

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
    return true;
  }
}

/**
 * Upsert Room
 */
export async function upsertRoomDb(room: { id?: string; name: string; isLab?: boolean }): Promise<string> {
  const id = room.id || crypto.randomUUID();
  const isLab = Boolean(room.isLab);

  // Update local storage immediately
  const local = getLocalRoutineState() || {};
  const currentRooms = local.rooms || [];
  const updated: RoutineRoom = { id, name: room.name, isLab };
  const idx = currentRooms.findIndex((r) => r.id === id);
  let nextRooms: RoutineRoom[];
  if (idx > -1) {
    nextRooms = [...currentRooms];
    nextRooms[idx] = updated;
  } else {
    nextRooms = [...currentRooms, updated];
  }
  setLocalRoutineState({ rooms: nextRooms });

  const supabase = createClient();
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
  const local = getLocalRoutineState() || {};
  if (local.rooms) {
    setLocalRoutineState({ rooms: local.rooms.filter((r) => r.id !== id) });
  }

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
  const local = getLocalRoutineState() || {};
  const currentClasses = local.classes || [];

  const normClass = cls.className.trim().toLowerCase();
  const normSec = cls.section.trim().toLowerCase();

  const existingIdx = currentClasses.findIndex(
    (c) =>
      (cls.id && c.id === cls.id) ||
      (c.className.trim().toLowerCase() === normClass && c.section.trim().toLowerCase() === normSec)
  );

  const id = cls.id || (existingIdx > -1 ? currentClasses[existingIdx].id : crypto.randomUUID());

  // Update local storage immediately
  const updated: RoutineClass = {
    id,
    className: cls.className,
    section: cls.section,
    dailyPeriods: cls.dailyPeriods || null,
  };

  let nextClasses: RoutineClass[];
  if (existingIdx > -1) {
    nextClasses = [...currentClasses];
    nextClasses[existingIdx] = updated;
  } else {
    nextClasses = [...currentClasses, updated];
  }
  setLocalRoutineState({ classes: nextClasses });

  const supabase = createClient();
  try {
    await supabase.from("routine_classes").upsert(
      {
        id,
        class_name: cls.className,
        section: cls.section,
        daily_periods: cls.dailyPeriods || null,
      },
      { onConflict: "class_name,section" }
    );
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
  const local = getLocalRoutineState() || {};
  const currentClasses: RoutineClass[] = [...(local.classes || [])];

  const processedList: RoutineClass[] = classesList.map((cls) => {
    const normClass = cls.className.trim().toLowerCase();
    const normSec = cls.section.trim().toLowerCase();
    const existing = currentClasses.find(
      (c) =>
        (cls.id && c.id === cls.id) ||
        (c.className.trim().toLowerCase() === normClass && c.section.trim().toLowerCase() === normSec)
    );
    const id = cls.id || existing?.id || crypto.randomUUID();
    return {
      id,
      className: cls.className,
      section: cls.section,
      dailyPeriods: cls.dailyPeriods || null,
    };
  });

  processedList.forEach((cls) => {
    const normClass = cls.className.trim().toLowerCase();
    const normSec = cls.section.trim().toLowerCase();
    const idx = currentClasses.findIndex(
      (c) =>
        c.id === cls.id ||
        (c.className.trim().toLowerCase() === normClass && c.section.trim().toLowerCase() === normSec)
    );
    if (idx > -1) {
      currentClasses[idx] = cls;
    } else {
      currentClasses.push(cls);
    }
  });
  setLocalRoutineState({ classes: currentClasses });

  const supabase = createClient();
  const rows = processedList.map((c) => ({
    id: c.id,
    class_name: c.className,
    section: c.section,
    daily_periods: c.dailyPeriods || null,
  }));

  try {
    const { data, error } = await supabase
      .from("routine_classes")
      .upsert(rows, { onConflict: "class_name,section" })
      .select();

    if (!error && data) {
      data.forEach((r: any) => {
        const normClass = r.class_name.trim().toLowerCase();
        const normSec = r.section.trim().toLowerCase();
        const idx = currentClasses.findIndex(
          (c) => c.className.trim().toLowerCase() === normClass && c.section.trim().toLowerCase() === normSec
        );
        if (idx > -1) {
          currentClasses[idx] = {
            id: r.id,
            className: r.class_name,
            section: r.section,
            dailyPeriods: r.daily_periods,
          };
        }
      });
      setLocalRoutineState({ classes: currentClasses });
    }
  } catch (err) {
    console.warn("batchUpsertClassesDb:", err);
  }

  return currentClasses;
}

/**
 * Delete Class
 */
export async function deleteClassDb(id: string): Promise<boolean> {
  const local = getLocalRoutineState() || {};
  if (local.classes) {
    setLocalRoutineState({ classes: local.classes.filter((c) => c.id !== id) });
  }

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
  stream?: string | null;
  isCommon?: boolean;
  isHard?: boolean;
  isLab?: boolean;
  timePref?: "any" | "morning" | "afternoon";
  allowMultiplePerDay?: boolean;
  maxPerDay?: number | null;
  periodsPerWeek?: number | null;
  sortOrder?: number | null;
}): Promise<string> {
  const local = getLocalRoutineState() || {};
  const currentSubjects: RoutineSubject[] = local.subjects || [];

  const canonicalName = subj.name
    .trim()
    .toLowerCase()
    .replace(/\s*\([^)]*\)/g, "")
    .replace(/\s+/g, " ")
    .trim();
  const normalizedClass = (subj.className || "").trim().toLowerCase();
  const normalizedStream = (subj.stream || "general").trim().toLowerCase();

  const existingIdx = currentSubjects.findIndex((s) => {
    if (subj.id && s.id === subj.id) return true;
    const sCanonical = s.name
      .trim()
      .toLowerCase()
      .replace(/\s*\([^)]*\)/g, "")
      .replace(/\s+/g, " ")
      .trim();
    const sClass = (s.className || "").trim().toLowerCase();
    const sStream = (s.stream || "general").trim().toLowerCase();

    return sCanonical === canonicalName && sClass === normalizedClass && sStream === normalizedStream;
  });

  const id = subj.id || (existingIdx > -1 ? currentSubjects[existingIdx].id : crypto.randomUUID());

  // 1. Immediately update localStorage
  const isLab = Boolean(subj.isLab);
  const totalP =
    subj.periodsPerWeek !== undefined && subj.periodsPerWeek !== null
      ? Number(subj.periodsPerWeek)
      : isLab ? 6 : 5;
  const labP =
    subj.labPeriods !== undefined && subj.labPeriods !== null
      ? Number(subj.labPeriods)
      : isLab ? 2 : 0;
  const theoryP =
    subj.theoryPeriods !== undefined && subj.theoryPeriods !== null
      ? Number(subj.theoryPeriods)
      : isLab ? Math.max(0, totalP - labP) : totalP;

  const subjectObj: RoutineSubject = {
    id,
    name: subj.name.trim(),
    className: subj.className || null,
    classId: subj.classId || null,
    stream: subj.stream || null,
    isCommon: Boolean(subj.isCommon),
    isHard: Boolean(subj.isHard),
    isLab,
    theoryPeriods: theoryP,
    labPeriods: labP,
    timePref: subj.timePref || "any",
    allowMultiplePerDay: Boolean(subj.allowMultiplePerDay),
    maxPerDay:
      subj.maxPerDay !== undefined && subj.maxPerDay !== null
        ? Number(subj.maxPerDay)
        : Boolean(subj.allowMultiplePerDay)
        ? 2
        : 1,
    periodsPerWeek: totalP,
    sortOrder: subj.sortOrder !== undefined ? subj.sortOrder : null,
  };

  let nextSubjects: RoutineSubject[];
  if (existingIdx > -1) {
    nextSubjects = [...currentSubjects];
    nextSubjects[existingIdx] = subjectObj;
  } else {
    nextSubjects = [...currentSubjects, subjectObj];
  }
  setLocalRoutineState({ subjects: nextSubjects });

  // 2. Persist to Supabase
  const supabase = createClient();
  try {
    const payload: Record<string, any> = {
      id,
      name: subj.name.trim(),
      is_hard: Boolean(subj.isHard),
      is_lab: Boolean(subj.isLab),
      time_pref: subj.timePref || "any",
      allow_multiple_per_day: Boolean(subj.allowMultiplePerDay),
    };
    if (subj.className !== undefined) payload.class_name = subj.className;
    if (subj.classId !== undefined) payload.class_id = subj.classId;
    if (subj.stream !== undefined) payload.stream = subj.stream;
    if (subj.isCommon !== undefined) payload.is_common = Boolean(subj.isCommon);
    if (subj.maxPerDay !== undefined) payload.max_per_day = subj.maxPerDay;
    if (subj.periodsPerWeek !== undefined) payload.periods_per_week = subj.periodsPerWeek;
    if (subj.sortOrder !== undefined) payload.sort_order = subj.sortOrder;

    const { error } = await supabase.from("routine_subjects").upsert(payload);
    if (error) {
      console.warn("upsertSubjectDb primary payload error, trying base fallback:", error);
      await supabase.from("routine_subjects").upsert({
        id,
        name: subj.name.trim(),
        is_hard: Boolean(subj.isHard),
        is_lab: Boolean(subj.isLab),
        time_pref: subj.timePref || "any",
        allow_multiple_per_day: Boolean(subj.allowMultiplePerDay),
      });
    }
  } catch (err) {
    console.warn("upsertSubjectDb catch:", err);
  }
  return id;
}

/**
 * Batch Upsert Subjects
 */
export async function batchUpsertSubjectsDb(
  subjectsList: {
    id?: string;
    name: string;
    className?: string | null;
    classId?: string | null;
    stream?: string | null;
    isCommon?: boolean;
    isHard?: boolean;
    isLab?: boolean;
    timePref?: "any" | "morning" | "afternoon";
    allowMultiplePerDay?: boolean;
    maxPerDay?: number | null;
    periodsPerWeek?: number | null;
    sortOrder?: number | null;
  }[]
): Promise<RoutineSubject[]> {
  const local = getLocalRoutineState() || {};
  const currentSubjects: RoutineSubject[] = [...(local.subjects || [])];

  const processedList: RoutineSubject[] = subjectsList.map((s) => {
    const normalizedName = s.name.trim().toLowerCase();
    const normalizedClass = (s.className || "").trim().toLowerCase();
    const normalizedStream = (s.stream || "").trim().toLowerCase();

    const existingMatch = currentSubjects.find(
      (existing) =>
        (s.id && existing.id === s.id) ||
        (existing.name.trim().toLowerCase() === normalizedName &&
          (existing.className || "").trim().toLowerCase() === normalizedClass &&
          (existing.stream || "").trim().toLowerCase() === normalizedStream)
    );

    const id = s.id || (existingMatch ? existingMatch.id : crypto.randomUUID());

    const isLab = Boolean(s.isLab);
    const totalP =
      s.periodsPerWeek !== undefined && s.periodsPerWeek !== null
        ? Number(s.periodsPerWeek)
        : isLab ? 6 : 5;
    const labP =
      s.labPeriods !== undefined && s.labPeriods !== null
        ? Number(s.labPeriods)
        : isLab ? 2 : 0;
    const theoryP =
      s.theoryPeriods !== undefined && s.theoryPeriods !== null
        ? Number(s.theoryPeriods)
        : isLab ? Math.max(0, totalP - labP) : totalP;

    return {
      id,
      name: s.name.trim(),
      className: s.className || null,
      classId: s.classId || null,
      stream: s.stream || null,
      isCommon: Boolean(s.isCommon),
      isHard: Boolean(s.isHard),
      isLab,
      theoryPeriods: theoryP,
      labPeriods: labP,
      timePref: s.timePref || "any",
      allowMultiplePerDay: Boolean(s.allowMultiplePerDay),
      maxPerDay:
        s.maxPerDay !== undefined && s.maxPerDay !== null
          ? Number(s.maxPerDay)
          : Boolean(s.allowMultiplePerDay)
          ? 2
          : 1,
      periodsPerWeek: totalP,
      sortOrder: s.sortOrder !== undefined ? s.sortOrder : null,
    };
  });

  processedList.forEach((sub) => {
    const idx = currentSubjects.findIndex(
      (s) =>
        s.id === sub.id ||
        (s.name.trim().toLowerCase() === sub.name.toLowerCase() &&
          (s.className || "").trim().toLowerCase() === (sub.className || "").toLowerCase() &&
          (s.stream || "").trim().toLowerCase() === (sub.stream || "").toLowerCase())
    );
    if (idx > -1) {
      currentSubjects[idx] = sub;
    } else {
      currentSubjects.push(sub);
    }
  });
  setLocalRoutineState({ subjects: currentSubjects });

  const supabase = createClient();
  const rows = processedList.map((s) => ({
    id: s.id,
    name: s.name,
    class_name: s.className,
    class_id: s.classId,
    stream: s.stream,
    is_common: s.isCommon,
    is_hard: s.isHard,
    is_lab: s.isLab,
    time_pref: s.timePref,
    allow_multiple_per_day: s.allowMultiplePerDay,
    max_per_day: s.maxPerDay,
    periods_per_week: s.periodsPerWeek,
    sort_order: s.sortOrder,
  }));

  try {
    const { error } = await supabase.from("routine_subjects").upsert(rows);
    if (error) {
      console.warn("batchUpsertSubjectsDb error, trying base columns:", error);
      const baseRows = processedList.map((s) => ({
        id: s.id,
        name: s.name,
        is_hard: s.isHard,
        is_lab: s.isLab,
        time_pref: s.timePref,
        allow_multiple_per_day: s.allowMultiplePerDay,
      }));
      await supabase.from("routine_subjects").upsert(baseRows);
    }
  } catch (err) {
    console.warn("batchUpsertSubjectsDb catch:", err);
  }

  return currentSubjects;
}

/**
 * Delete Subject
 */
export async function deleteSubjectDb(id: string): Promise<boolean> {
  const local = getLocalRoutineState() || {};
  if (local.subjects) {
    setLocalRoutineState({ subjects: local.subjects.filter((s) => s.id !== id) });
  }

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
  const local = getLocalRoutineState() || {};
  const current = local.teachers || [];
  const idx = current.findIndex((t) => t.id === teacher.id);
  let next: RoutineTeacher[];
  if (idx > -1) {
    next = [...current];
    next[idx] = teacher;
  } else {
    next = [...current, teacher];
  }
  setLocalRoutineState({ teachers: next });

  const supabase = createClient();
  try {
    const isUuid = teacher.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(teacher.id);

    const payload: Record<string, any> = {
      teacher_name: teacher.name,
      short_name: teacher.shortName,
      max_periods: teacher.maxPeriods,
      available_slots: {
        ...teacher.availableSlots,
        _qualifiedClasses: teacher.qualifiedClasses || [],
        _classSubjects: teacher.classSubjects || {},
        _sectionSubjects: teacher.sectionSubjects || {},
        _classSections: teacher.classSections || {},
        _classPeriods: teacher.classPeriods || {},
        _sectionPeriods: teacher.sectionPeriods || {},
        _subjectPeriods: teacher.subjectPeriods || {},
        _primarySubject: teacher.primarySubject || null,
        _classTeacherOf: teacher.classTeacherOf || null,
        _classTeacherFirstPeriods: teacher.classTeacherFirstPeriods ?? (teacher.classTeacherOf ? 3 : null),
      },
      updated_at: new Date().toISOString(),
    };

    if (isUuid) {
      payload.teacher_id = teacher.id;
    }

    // Attempt upsert with teacher_id
    const { error } = await supabase.from("routine_teacher_availability").upsert(
      payload,
      { onConflict: isUuid ? "teacher_id" : "id" }
    );

    // If foreign key failed (custom teacher not in staff_profiles), omit teacher_id and upsert with id
    if (error) {
      delete payload.teacher_id;
      if (isUuid) payload.id = teacher.id;
      await supabase.from("routine_teacher_availability").upsert(payload);
    }
    return true;
  } catch (err) {
    console.warn("upsertTeacherAvailabilityDb:", err);
    return false;
  }
}

/**
 * Batch Upsert All Teachers Availability & Qualifications to Supabase
 */
export async function batchSaveTeachersAvailabilityDb(teachersList: RoutineTeacher[]): Promise<boolean> {
  const supabase = createClient();
  try {
    const rows = teachersList.map((t) => {
      const isUuid = t.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(t.id);
      const row: Record<string, any> = {
        teacher_name: t.name,
        short_name: t.shortName,
        max_periods: t.maxPeriods,
        available_slots: {
          ...t.availableSlots,
          _qualifiedClasses: t.qualifiedClasses || [],
          _classSubjects: t.classSubjects || {},
          _sectionSubjects: t.sectionSubjects || {},
          _classSections: t.classSections || {},
          _classPeriods: t.classPeriods || {},
          _sectionPeriods: t.sectionPeriods || {},
          _subjectPeriods: t.subjectPeriods || {},
          _primarySubject: t.primarySubject || null,
          _classTeacherOf: t.classTeacherOf || null,
          _classTeacherFirstPeriods: t.classTeacherFirstPeriods ?? (t.classTeacherOf ? 3 : null),
        },
        updated_at: new Date().toISOString(),
      };
      if (isUuid) {
        row.teacher_id = t.id;
      } else {
        row.id = t.id;
      }
      return row;
    });

    setLocalRoutineState({ teachers: teachersList });

    const { error } = await supabase
      .from("routine_teacher_availability")
      .upsert(rows, { onConflict: "teacher_id" });

    if (error) {
      console.warn("batchSaveTeachersAvailabilityDb onConflict failed, running individual upserts:", error);
      for (const t of teachersList) {
        await upsertTeacherAvailabilityDb(t);
      }
    }
    return true;
  } catch (err) {
    console.error("batchSaveTeachersAvailabilityDb error:", err);
    return false;
  }
}

/**
 * Delete Teacher from Routine
 */
export async function deleteTeacherDb(id: string): Promise<boolean> {
  const local = getLocalRoutineState() || {};
  if (local.teachers) {
    setLocalRoutineState({
      teachers: local.teachers.filter((t) => t.id !== id),
      assignments: (local.assignments || []).filter((a) => a.teacherId !== id),
    });
  }

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
  const isUuid = (str?: string) =>
    str ? /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str) : false;
  const id = isUuid(asg.id) ? asg.id! : crypto.randomUUID();

  const local = getLocalRoutineState() || {};
  const current = local.assignments || [];
  const updated: RoutineAssignment = {
    id,
    classId: asg.classId,
    subjectId: asg.subjectId,
    teacherId: asg.teacherId,
    roomId: asg.roomId || null,
    periodsPerWeek: asg.periodsPerWeek,
  };
  const idx = current.findIndex((a) => a.id === id || (a.classId === asg.classId && a.subjectId === asg.subjectId));
  let next: RoutineAssignment[];
  if (idx > -1) {
    next = [...current];
    next[idx] = updated;
  } else {
    next = [...current, updated];
  }
  setLocalRoutineState({ assignments: next });

  const supabase = createClient();
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
  const isUuid = (str?: string) =>
    str ? /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str) : false;

  const validAsgList: RoutineAssignment[] = asgList.map((asg) => ({
    ...asg,
    id: isUuid(asg.id) ? asg.id : crypto.randomUUID(),
  }));

  setLocalRoutineState({ assignments: validAsgList });

  if (!validAsgList || validAsgList.length === 0) return true;

  const supabase = createClient();
  const rows = validAsgList.map((asg) => ({
    id: asg.id,
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
  const local = getLocalRoutineState() || {};
  if (local.assignments) {
    setLocalRoutineState({ assignments: local.assignments.filter((a) => a.id !== id) });
  }

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
  setLocalRoutineState({ routine });
  const supabase = createClient();

  try {
    const { error } = await supabase.from("routine_generated_cache").insert({
      grid: routine.grid,
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

export const saveRoutineGeneratedDb = saveGeneratedRoutineDb;
