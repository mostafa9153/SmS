"use server";

import {
  fetchRoutineFullState,
  saveRoutineSettingsDb,
  upsertRoomDb,
  deleteRoomDb,
  upsertClassDb,
  deleteClassDb,
  upsertSubjectDb,
  deleteSubjectDb,
  upsertTeacherAvailabilityDb,
  upsertAssignmentDb,
  deleteAssignmentDb,
  saveGeneratedRoutineDb,
  RoutineFullState,
} from "@/lib/supabase/db-routine";
import {
  RoutineSettings,
  RoutineRoom,
  RoutineClass,
  RoutineSubject,
  RoutineTeacher,
  RoutineAssignment,
  GeneratedRoutine,
  ValidationReport,
} from "@/lib/routine/types";
import { generateRoutine, validateRoutineData } from "@/lib/routine/routineGenerator";

export async function getRoutineInitialData(): Promise<RoutineFullState> {
  return await fetchRoutineFullState();
}

export async function saveRoutineSettingsAction(settings: RoutineSettings) {
  return await saveRoutineSettingsDb(settings);
}

export async function saveRoomAction(room: { id?: string; name: string; isLab?: boolean }) {
  return await upsertRoomDb(room);
}

export async function deleteRoomAction(id: string) {
  return await deleteRoomDb(id);
}

export async function saveClassAction(cls: { id?: string; className: string; section: string; dailyPeriods?: number | null }) {
  return await upsertClassDb(cls);
}

export async function deleteClassAction(id: string) {
  return await deleteClassDb(id);
}

export async function saveSubjectAction(subj: {
  id?: string;
  name: string;
  isHard?: boolean;
  isLab?: boolean;
  timePref?: "any" | "morning" | "afternoon";
  allowMultiplePerDay?: boolean;
}) {
  return await upsertSubjectDb(subj);
}

export async function deleteSubjectAction(id: string) {
  return await deleteSubjectDb(id);
}

export async function saveTeacherAvailabilityAction(teacher: RoutineTeacher) {
  return await upsertTeacherAvailabilityDb(teacher);
}

export async function saveAssignmentAction(asg: {
  id?: string;
  classId: string;
  subjectId: string;
  teacherId: string;
  roomId?: string | null;
  periodsPerWeek: number;
}) {
  return await upsertAssignmentDb(asg);
}

export async function deleteAssignmentAction(id: string) {
  return await deleteAssignmentDb(id);
}

export async function saveGeneratedRoutineAction(routine: GeneratedRoutine) {
  return await saveGeneratedRoutineDb(routine);
}

export async function validateRoutineDataAction(
  settings: RoutineSettings,
  classes: RoutineClass[],
  teachers: RoutineTeacher[],
  subjects: RoutineSubject[],
  assignments: RoutineAssignment[],
  rooms: RoutineRoom[] = []
): Promise<ValidationReport> {
  return validateRoutineData(settings, classes, teachers, subjects, assignments, rooms);
}

export async function generateRoutineServerAction(
  settings: RoutineSettings,
  classes: RoutineClass[],
  teachers: RoutineTeacher[],
  subjects: RoutineSubject[],
  assignments: RoutineAssignment[],
  rooms: RoutineRoom[] = []
): Promise<GeneratedRoutine> {
  const result = generateRoutine(settings, classes, teachers, subjects, assignments, rooms);
  if (result.success) {
    await saveGeneratedRoutineDb(result);
  }
  return result;
}
