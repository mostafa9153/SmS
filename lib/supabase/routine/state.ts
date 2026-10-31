import { createClient } from "@/lib/supabase/client";
import { RoutineSettings, RoutineRoom, RoutineClass, RoutineSubject, RoutineTeacher, RoutineAssignment, RoutineSubjectGroup, GeneratedRoutine, DEFAULT_ROUTINE_SETTINGS } from "@/lib/routine/types";
import { sanitizeTeacherSubjectPeriods, isHsClass, normalizeSubjectName } from "@/lib/routine/routine-helpers";
import { withDerivedGroupSettings } from "@/lib/routine/routine-groups";
import { fetchSubjectGroupsDb } from "@/lib/supabase/routine/groups";
import { RoutineFullState, getLocalRoutineState, setLocalRoutineState } from "@/lib/supabase/routine/local-state";

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
  let groups: RoutineSubjectGroup[] = local?.groups || [];
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
        halfDayPeriods: setRow.half_day_periods ?? 4,
        breaks: setRow.breaks || [4],
        tchDailyMax: setRow.tch_daily_max ?? 5,
        tchConsecMax: setRow.tch_consec_max ?? 3,
        tchMinBefore: setRow.tch_min_before ?? 0,
        tchMinAfter: setRow.tch_min_after ?? 0,
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
      .not("class_name", "is", null)
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
            allowedSlots: s.allowed_slots ?? null,
          };
        });

        // Strict canonical deduplication to ensure zero duplicate subjects
        const dedupedSubjects: RoutineSubject[] = [];
        const seenSubjectsKey = new Set<string>();

        const getCanonicalKey = (s: RoutineSubject) => {
          const cls = (s.className || "").trim().toLowerCase();
          const normName = normalizeSubjectName(s.name);
          // Streams only exist in HS classes; elsewhere a stray stream value must not split a subject
          const stream = isHsClass(s.className || "") ? (s.stream || "general").trim().toLowerCase() : "general";
          return `${cls}::${normName}::${stream}`;
        };

        dbSubjects.forEach((sub) => {
          const key = getCanonicalKey(sub);
          if (!seenSubjectsKey.has(key)) {
            seenSubjectsKey.add(key);
            dedupedSubjects.push(sub);
          }
        });

        // Hydrate sortOrder from locally saved subject ordering if present
        if (typeof window !== "undefined") {
          try {
            const rawOrder = localStorage.getItem("sms_routine_subjects_order");
            if (rawOrder) {
              const orderMap = JSON.parse(rawOrder) as Record<string, string[]>;
              dedupedSubjects.forEach((sub) => {
                const cls = sub.className || "";
                const stream = sub.stream || "all";
                const keys = [`${cls}::${stream}`, `${cls}::all`, `${cls}::Common`];
                for (const k of keys) {
                  const list = orderMap[k];
                  if (list && Array.isArray(list)) {
                    const idx = list.findIndex(
                      (item) =>
                        item === sub.id ||
                        item.trim().toLowerCase() === sub.name.trim().toLowerCase()
                    );
                    if (idx !== -1) {
                      sub.sortOrder = idx;
                      break;
                    }
                  }
                }
              });
            }
          } catch {}
        }

        subjects = dedupedSubjects.sort((a, b) => (a.sortOrder ?? 9999) - (b.sortOrder ?? 9999));
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
          // is_lab exists only after the 20261026 migration; absent means "unknown", not "theory"
          isLab: a.is_lab === undefined || a.is_lab === null ? undefined : Boolean(a.is_lab),
        }));
      } else if (asgRows && asgRows.length === 0 && !local?.assignments?.length) {
        assignments = [];
      }
      setLocalRoutineState({ assignments });
    }

    // 7. Fetch Latest / Active Generated Routine
    const { data: routineRow, error: routineError } = await supabase
      .from("routine_generated_cache")
      .select("*")
      .order("is_active", { ascending: false })
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

    // Fetch Subject Groups (header + sections + options)
    try {
      const loaded = await fetchSubjectGroupsDb(classes);
      groups = loaded;
    } catch (gErr) {
      console.warn("fetchSubjectGroupsDb warning:", gErr);
    }
  } catch (err) {
    console.warn("fetchRoutineFullState fallback to local state:", err);
  }

  groups = withDerivedGroupSettings(groups, subjects);

  // Persist updated complete state to localStorage
  setLocalRoutineState({
    settings,
    rooms,
    classes,
    subjects,
    teachers,
    assignments,
    groups,
    routine,
  });

  return {
    settings,
    rooms,
    classes,
    subjects,
    teachers,
    assignments,
    groups,
    routine,
  };
}
