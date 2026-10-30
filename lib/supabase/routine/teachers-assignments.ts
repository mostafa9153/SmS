import { createClient } from "@/lib/supabase/client";
import { RoutineTeacher, RoutineAssignment } from "@/lib/routine/types";
import { mustWrite } from "@/lib/supabase/write";
import { getLocalRoutineState, setLocalRoutineState } from "@/lib/supabase/routine/local-state";

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
      const retry = await supabase.from("routine_teacher_availability").upsert(payload);
      if (retry.error) {
        console.warn("upsertTeacherAvailabilityDb:", retry.error.message);
        return false;
      }
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
    await mustWrite(supabase.from("routine_teacher_availability").delete().eq("teacher_id", id), "routine_teacher_availability delete");
    await mustWrite(supabase.from("routine_teacher_availability").delete().eq("id", id), "routine_teacher_availability delete");
    await mustWrite(supabase.from("routine_assignments").delete().eq("teacher_id", id), "routine_assignments delete");
    return true;
  } catch (err) {
    console.warn("deleteTeacherDb:", err);
    return false;
  }
}

type AssignmentRow = {
  id: string;
  class_id: string;
  subject_id: string;
  teacher_id: string;
  room_id: string | null;
  periods_per_week: number;
  is_lab: boolean;
};

/**
 * Writes assignment parts. Uses the part-aware key (needs the 20261026 migration); if the database is
 * still on the old schema it falls back to the legacy shape, which cannot hold split parts.
 */
async function writeAssignmentRows(rows: AssignmentRow[]): Promise<string | null> {
  const supabase = createClient();
  const modern = await supabase
    .from("routine_assignments")
    .upsert(rows, { onConflict: "class_id,subject_id,teacher_id,is_lab" });
  if (!modern.error) return null;

  const legacy = await supabase
    .from("routine_assignments")
    .upsert(
      rows.map(({ is_lab: _isLab, ...rest }) => rest),
      { onConflict: "class_id,subject_id" }
    );
  return legacy.error ? legacy.error.message : null;
}

/**
 * Upsert Assignment
 */
async function upsertAssignmentDb(asg: {
  id?: string;
  classId: string;
  subjectId: string;
  teacherId: string;
  roomId?: string | null;
  periodsPerWeek: number;
  isLab?: boolean;
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
    isLab: asg.isLab,
  };
  // A class-subject can have several parts (teachers / theory+lab): match on the whole part
  const idx = current.findIndex(
    (a) =>
      a.id === id ||
      (a.classId === asg.classId &&
        a.subjectId === asg.subjectId &&
        a.teacherId === asg.teacherId &&
        Boolean(a.isLab) === Boolean(asg.isLab))
  );
  let next: RoutineAssignment[];
  if (idx > -1) {
    next = [...current];
    next[idx] = updated;
  } else {
    next = [...current, updated];
  }
  setLocalRoutineState({ assignments: next });

  try {
    const failure = await writeAssignmentRows([
      {
        id,
        class_id: asg.classId,
        subject_id: asg.subjectId,
        teacher_id: asg.teacherId,
        room_id: asg.roomId || null,
        periods_per_week: asg.periodsPerWeek,
        is_lab: Boolean(asg.isLab),
      },
    ]);
    if (failure) console.warn("upsertAssignmentDb failed:", failure);
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

  const rows: AssignmentRow[] = validAsgList.map((asg) => ({
    id: asg.id,
    class_id: asg.classId,
    subject_id: asg.subjectId,
    teacher_id: asg.teacherId,
    room_id: asg.roomId || null,
    periods_per_week: asg.periodsPerWeek,
    is_lab: Boolean(asg.isLab),
  }));

  try {
    const failure = rows.length > 0 ? await writeAssignmentRows(rows) : null;
    if (failure) {
      console.warn("batchUpsertAssignmentsDb error:", failure);
      return false;
    }
    // The list replaces the old one: rows for a teacher who no longer has the subject must go,
    // otherwise they keep showing that teacher on it.
    const supabase = createClient();
    const keep = new Set(rows.map((r) => r.id));
    const { data: existing, error: listError } = await supabase.from("routine_assignments").select("id");
    if (listError) {
      console.warn("batchUpsertAssignmentsDb stale lookup:", listError.message);
      return false;
    }
    const stale = (existing || []).map((r: { id: string }) => r.id).filter((id) => !keep.has(id));
    for (let i = 0; i < stale.length; i += 100) {
      const { error } = await supabase.from("routine_assignments").delete().in("id", stale.slice(i, i + 100));
      if (error) {
        console.warn("batchUpsertAssignmentsDb stale delete:", error.message);
        return false;
      }
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
async function deleteAssignmentDb(id: string): Promise<boolean> {
  const local = getLocalRoutineState() || {};
  if (local.assignments) {
    setLocalRoutineState({ assignments: local.assignments.filter((a) => a.id !== id) });
  }

  const supabase = createClient();
  try {
    const { error } = await supabase.from("routine_assignments").delete().eq("id", id);
    if (error) {
      console.warn("deleteAssignmentDb failed:", error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn("deleteAssignmentDb:", err);
    return false;
  }
}
