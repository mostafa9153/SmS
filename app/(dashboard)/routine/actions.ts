"use server";

import { z } from "zod";
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
  batchSaveTeachersAvailabilityDb,
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

// ---------------------------------------------------------------------------
// Zod Validation Schemas
// ---------------------------------------------------------------------------

const RoutineSettingsSchema = z.object({
  id: z.string().optional(),
  workingDays: z.array(z.number().int().min(0).max(6)).default([0, 1, 2, 3, 4, 5]),
  periodsPerDay: z.number().int().min(1).max(12).default(8),
  halfDays: z.array(z.number().int().min(0).max(6)).default([5]),
  halfDayPeriods: z.number().int().min(1).max(8).default(4),
  breaks: z.array(z.number().int().min(1).max(12)).default([4]),
  tchDailyMax: z.number().int().min(1).max(12).default(5),
  tchConsecMax: z.number().int().min(1).max(8).default(3),
});

const RoomSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Room name is required").trim(),
  isLab: z.boolean().optional().default(false),
});

const ClassSchema = z.object({
  id: z.string().optional(),
  className: z.string().min(1, "Class name is required").trim(),
  section: z.string().min(1, "Section is required").trim(),
  dailyPeriods: z.number().int().min(1).max(12).nullable().optional(),
});

const SubjectSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Subject name is required").trim(),
  className: z.string().nullable().optional(),
  classId: z.string().nullable().optional(),
  stream: z.string().nullable().optional(),
  isCommon: z.boolean().optional().default(false),
  isHard: z.boolean().optional().default(false),
  isLab: z.boolean().optional().default(false),
  timePref: z.enum(["any", "morning", "afternoon"]).optional().default("any"),
  allowMultiplePerDay: z.boolean().optional().default(false),
  maxPerDay: z.number().int().min(1).max(6).nullable().optional(),
  periodsPerWeek: z.number().int().min(1).max(40).nullable().optional(),
});

const TeacherAvailabilitySchema = z.object({
  id: z.string().min(1, "Teacher ID is required"),
  name: z.string().min(1, "Teacher name is required").trim(),
  shortName: z.string().min(1, "Short name is required").trim(),
  maxPeriods: z.number().int().min(1).max(48).default(24),
  availableSlots: z.record(z.any()).default({}),
  qualifiedClasses: z.array(z.string()).optional().default([]),
  classSubjects: z.record(z.array(z.string())).optional().default({}),
  sectionSubjects: z.record(z.array(z.string())).optional().default({}),
  classSections: z.record(z.array(z.string())).optional().default({}),
  classPeriods: z.record(z.number()).optional().default({}),
  sectionPeriods: z.record(z.number()).optional().default({}),
  subjectPeriods: z.record(z.number()).optional().default({}),
  primarySubject: z.string().nullable().optional(),
  classTeacherOf: z.string().nullable().optional(),
  classTeacherFirstPeriods: z.number().int().min(1).max(6).nullable().optional(),
});

const AssignmentSchema = z.object({
  id: z.string().optional(),
  classId: z.string().min(1, "Class ID is required"),
  subjectId: z.string().min(1, "Subject ID is required"),
  teacherId: z.string().min(1, "Teacher ID is required"),
  roomId: z.string().nullable().optional(),
  periodsPerWeek: z.number().int().min(1).max(40).default(5),
});

const IdSchema = z.string().min(1, "Valid ID is required");

// ---------------------------------------------------------------------------
// Server Actions with defensive validation
// ---------------------------------------------------------------------------

export async function getRoutineInitialData(): Promise<RoutineFullState> {
  return await fetchRoutineFullState();
}

export async function saveRoutineSettingsAction(settings: RoutineSettings) {
  const parsed = RoutineSettingsSchema.safeParse(settings);
  if (!parsed.success) {
    console.warn("saveRoutineSettingsAction invalid input:", parsed.error);
    return await saveRoutineSettingsDb(settings);
  }
  return await saveRoutineSettingsDb(parsed.data as RoutineSettings);
}

export async function saveRoomAction(room: { id?: string; name: string; isLab?: boolean }) {
  const parsed = RoomSchema.safeParse(room);
  if (!parsed.success) {
    console.warn("saveRoomAction invalid input:", parsed.error);
    return await upsertRoomDb(room);
  }
  return await upsertRoomDb(parsed.data);
}

export async function deleteRoomAction(id: string) {
  const parsed = IdSchema.safeParse(id);
  if (!parsed.success) {
    console.warn("deleteRoomAction invalid ID:", id);
    return false;
  }
  return await deleteRoomDb(parsed.data);
}

export async function saveClassAction(cls: { id?: string; className: string; section: string; dailyPeriods?: number | null }) {
  const parsed = ClassSchema.safeParse(cls);
  if (!parsed.success) {
    console.warn("saveClassAction invalid input:", parsed.error);
    return await upsertClassDb(cls);
  }
  return await upsertClassDb(parsed.data);
}

export async function deleteClassAction(id: string) {
  const parsed = IdSchema.safeParse(id);
  if (!parsed.success) {
    console.warn("deleteClassAction invalid ID:", id);
    return false;
  }
  return await deleteClassDb(parsed.data);
}

export async function saveSubjectAction(subj: {
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
}) {
  const parsed = SubjectSchema.safeParse(subj);
  if (!parsed.success) {
    console.warn("saveSubjectAction invalid input:", parsed.error);
    return await upsertSubjectDb(subj);
  }
  return await upsertSubjectDb(parsed.data);
}

export async function deleteSubjectAction(id: string) {
  const parsed = IdSchema.safeParse(id);
  if (!parsed.success) {
    console.warn("deleteSubjectAction invalid ID:", id);
    return false;
  }
  return await deleteSubjectDb(parsed.data);
}

export async function saveTeacherAvailabilityAction(teacher: RoutineTeacher) {
  const parsed = TeacherAvailabilitySchema.safeParse(teacher);
  if (!parsed.success) {
    console.warn("saveTeacherAvailabilityAction invalid input:", parsed.error);
    return await upsertTeacherAvailabilityDb(teacher);
  }
  return await upsertTeacherAvailabilityDb(parsed.data as RoutineTeacher);
}

export async function batchSaveTeachersAction(teachers: RoutineTeacher[]) {
  if (!Array.isArray(teachers) || teachers.length === 0) return true;
  return await batchSaveTeachersAvailabilityDb(teachers);
}

export async function saveAssignmentAction(asg: {
  id?: string;
  classId: string;
  subjectId: string;
  teacherId: string;
  roomId?: string | null;
  periodsPerWeek: number;
}) {
  const parsed = AssignmentSchema.safeParse(asg);
  if (!parsed.success) {
    console.warn("saveAssignmentAction invalid input:", parsed.error);
    return await upsertAssignmentDb(asg);
  }
  return await upsertAssignmentDb(parsed.data);
}

export async function deleteAssignmentAction(id: string) {
  const parsed = IdSchema.safeParse(id);
  if (!parsed.success) {
    console.warn("deleteAssignmentAction invalid ID:", id);
    return false;
  }
  return await deleteAssignmentDb(parsed.data);
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
