import { createClient } from "@/lib/supabase/client";
import { RoutineSettings, RoutineRoom, RoutineClass, RoutineSubject } from "@/lib/routine/types";
import { normalizeSubjectName } from "@/lib/routine/routine-helpers";
import { mustWrite } from "@/lib/supabase/write";
import { getLocalRoutineState, setLocalRoutineState } from "@/lib/supabase/routine/local-state";

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
      tch_min_before: settings.tchMinBefore ?? 0,
      tch_min_after: settings.tchMinAfter ?? 0,
      updated_at: new Date().toISOString(),
    };

    // Settings are a single logical row: always update the row the loader reads (latest updated_at),
    // and only insert when none exists. A failed update must not spawn a second row.
    let targetId = settings.id;
    if (!targetId) {
      const { data: latest } = await supabase
        .from("routine_settings")
        .select("id")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      targetId = latest?.id;
    }

    if (targetId) {
      const { error } = await supabase.from("routine_settings").update(payload).eq("id", targetId);
      if (error) console.warn("saveRoutineSettingsDb update failed:", error.message);
      return !error;
    }

    const { error: insErr } = await supabase.from("routine_settings").insert(payload);
    if (insErr) console.warn("saveRoutineSettingsDb insert failed:", insErr.message);
    return !insErr;
  } catch (err) {
    console.warn("saveRoutineSettingsDb warning:", err);
    return false;
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
    await mustWrite(supabase.from("routine_rooms").upsert({
      id,
      name: room.name,
      is_lab: isLab,
    }), "routine_rooms upsert");
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
    await mustWrite(supabase.from("routine_rooms").delete().eq("id", id), "routine_rooms delete");
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
    await mustWrite(supabase.from("routine_classes").upsert(
      {
        id,
        class_name: cls.className,
        section: cls.section,
        daily_periods: cls.dailyPeriods || null,
      },
      { onConflict: "class_name,section" }
    ), "routine_classes upsert");
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
    await mustWrite(supabase.from("routine_classes").delete().eq("id", id), "routine_classes delete");
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
  theoryPeriods?: number | null;
  labPeriods?: number | null;
  timePref?: "any" | "morning" | "afternoon";
  allowMultiplePerDay?: boolean;
  maxPerDay?: number | null;
  periodsPerWeek?: number | null;
  sortOrder?: number | null;
}): Promise<string> {
  const local = getLocalRoutineState() || {};
  const currentSubjects: RoutineSubject[] = local.subjects || [];

  const canonicalName = normalizeSubjectName(subj.name);
  const normalizedClass = (subj.className || "").trim().toLowerCase();
  const normalizedStream = (subj.stream || "general").trim().toLowerCase();

  const existingIdx = currentSubjects.findIndex((s) => {
    if (subj.id && s.id === subj.id) return true;
    const sCanonical = normalizeSubjectName(s.name);
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
    if (subj.theoryPeriods !== undefined) payload.theory_periods = subj.theoryPeriods;
    if (subj.labPeriods !== undefined) payload.lab_periods = subj.labPeriods;

    const { error } = await supabase.from("routine_subjects").upsert(payload);
    if (error) {
      console.warn("upsertSubjectDb primary payload error, trying base fallback:", error);
      await mustWrite(supabase.from("routine_subjects").upsert({
        id,
        name: subj.name.trim(),
        class_name: subj.className || null,
        class_id: subj.classId || null,
        stream: subj.stream || null,
        is_common: Boolean(subj.isCommon),
        is_hard: Boolean(subj.isHard),
        is_lab: Boolean(subj.isLab),
        time_pref: subj.timePref || "any",
        allow_multiple_per_day: Boolean(subj.allowMultiplePerDay),
        max_per_day: subj.maxPerDay ?? 1,
        periods_per_week: subj.periodsPerWeek ?? 5,
        theory_periods: subj.theoryPeriods ?? (Boolean(subj.isLab) ? 4 : 5),
        lab_periods: subj.labPeriods ?? (Boolean(subj.isLab) ? 2 : 0),
      }), "routine_subjects upsert");
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
    theoryPeriods?: number | null;
    labPeriods?: number | null;
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
    theory_periods: s.theoryPeriods,
    lab_periods: s.labPeriods,
  }));

  try {
    const { error } = await supabase.from("routine_subjects").upsert(rows);
    if (error) {
      console.warn("batchUpsertSubjectsDb error, trying base columns:", error);
      const baseRows = processedList.map((s) => ({
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
      }));
      await mustWrite(supabase.from("routine_subjects").upsert(baseRows), "routine_subjects upsert");
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
    await mustWrite(supabase.from("routine_subjects").delete().eq("id", id), "routine_subjects delete");
    return true;
  } catch (err) {
    console.warn("deleteSubjectDb:", err);
    return false;
  }
}
