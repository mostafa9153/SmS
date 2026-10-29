import { createAdminClient } from "@/lib/supabase/admin";
import { mustWrite } from "@/lib/supabase/write";
import { currentYearIST } from "@/lib/utils/academic-year";
import {
  DEFAULT_SPORTS_CONFIG,
  PRESET_SPORTS_EVENTS,
  type SportsConfig,
  type SportsEvent,
  type SportsParticipant,
} from "./types";

/* eslint-disable @typescript-eslint/no-explicit-any -- Supabase rows with embedded relations */

type Db = ReturnType<typeof createAdminClient>;

/** A request that breaks a sports rule (limit reached, chest number taken). Routes answer 400. */
export class SportsRuleError extends Error {}

const STUDENT_COLUMNS = "id, name, school_id, present_class, present_section, present_roll, gender, photo_url";
const FIRST_CHEST_NUMBER = 101;

async function read<T>(query: PromiseLike<{ data: T | null; error: { message: string } | null }>, what: string): Promise<T> {
  const { data, error } = await query;
  if (error) throw new Error(`${what}: ${error.message}`);
  return data as T;
}

const one = (rel: any) => (Array.isArray(rel) ? rel[0] : rel) || {};

function toEvent(d: any): SportsEvent {
  return {
    id: d.id,
    academicYear: d.academic_year,
    name: d.name,
    category: d.category,
    gender: d.gender,
    eligibleClasses: d.eligible_classes || [],
    scoringType: d.scoring_type,
    measurementUnit: d.measurement_unit,
    maxParticipants: d.max_participants,
    description: d.description,
    createdAt: d.created_at,
  };
}

function toEventRow(e: Partial<Omit<SportsEvent, "id">>) {
  const row: Record<string, unknown> = {};
  if (e.academicYear !== undefined) row.academic_year = e.academicYear;
  if (e.name !== undefined) row.name = e.name;
  if (e.category !== undefined) row.category = e.category;
  if (e.gender !== undefined) row.gender = e.gender;
  if (e.eligibleClasses !== undefined) row.eligible_classes = e.eligibleClasses;
  if (e.scoringType !== undefined) row.scoring_type = e.scoringType;
  if (e.measurementUnit !== undefined) row.measurement_unit = e.measurementUnit;
  if (e.maxParticipants !== undefined) row.max_participants = e.maxParticipants;
  if (e.description !== undefined) row.description = e.description;
  return row;
}

function toParticipant(student: any, chestNumber: string, eventNames: string[]): SportsParticipant {
  return {
    registrationId: "",
    eventId: "",
    studentId: student.id,
    chestNumber,
    studentName: student.name || "Student",
    schoolId: student.school_id || "",
    presentClass: student.present_class || "",
    presentSection: student.present_section || "A",
    presentRoll: student.present_roll || 0,
    gender: student.gender || "All",
    photoUrl: student.photo_url,
    status: "Registered",
    registeredEventsCount: eventNames.length,
    enrolledEvents: eventNames,
  };
}

const byChestNumber = (a: SportsParticipant, b: SportsParticipant) => {
  const numA = parseInt(a.chestNumber, 10);
  const numB = parseInt(b.chestNumber, 10);
  if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
  return a.chestNumber.localeCompare(b.chestNumber);
};

/**
 * Registrations in `year`'s events: student id → event names. Pass `studentIds` only for a
 * short list (one event's participants); a long `.in()` list overflows the request URL.
 */
async function eventNamesByStudent(supabase: Db, year: number, studentIds?: string[]) {
  if (studentIds && !studentIds.length) return {} as Record<string, string[]>;
  let query = supabase
    .from("sports_event_registrations")
    .select("student_id, sports_events!inner(name, academic_year)")
    .eq("sports_events.academic_year", year);
  if (studentIds) query = query.in("student_id", studentIds);
  const rows = await read<any[]>(query, "sports_event_registrations select");
  const map: Record<string, string[]> = {};
  for (const r of rows) {
    const name = one(r.sports_events).name;
    if (!name) continue;
    const list = (map[r.student_id] ||= []);
    if (!list.includes(name)) list.push(name);
  }
  return map;
}

// ---------- Events ----------

export async function getSportsEvents(academicYear: number = currentYearIST()): Promise<SportsEvent[]> {
  const supabase = createAdminClient();
  const rows = await read<any[]>(
    supabase.from("sports_events").select("*").eq("academic_year", academicYear).order("name", { ascending: true }),
    "sports_events select",
  );
  if (!rows.length) return [];

  const ids = rows.map((r) => r.id);
  const [regs, results] = await Promise.all([
    read<any[]>(supabase.from("sports_event_registrations").select("event_id, student_id").in("event_id", ids), "sports_event_registrations select"),
    read<any[]>(supabase.from("sports_event_results").select("event_id, student_id, best_score, rank_position").in("event_id", ids), "sports_event_results select"),
  ]);

  const registered = new Set(regs.map((r) => `${r.event_id}:${r.student_id}`));
  const count = (map: Record<string, number>, id: string) => (map[id] = (map[id] || 0) + 1);
  const participants: Record<string, number> = {};
  const scored: Record<string, number> = {};
  const podium: Record<string, number> = {};
  regs.forEach((r) => count(participants, r.event_id));
  for (const r of results) {
    // Results of students no longer registered do not count.
    if (!registered.has(`${r.event_id}:${r.student_id}`)) continue;
    if (r.best_score && String(r.best_score).trim() !== "") count(scored, r.event_id);
    if (r.rank_position >= 1 && r.rank_position <= 3) count(podium, r.event_id);
  }

  return rows.map((d) => ({
    ...toEvent(d),
    participantCount: participants[d.id] || 0,
    scoredCount: scored[d.id] || 0,
    podiumCount: podium[d.id] || 0,
  }));
}

export async function getSportsEventRow(id: string) {
  return read<any>(createAdminClient().from("sports_events").select("*").eq("id", id).maybeSingle(), "sports_events select");
}

export async function createSportsEvent(eventData: Omit<SportsEvent, "id">): Promise<SportsEvent> {
  const row = await read<any>(
    createAdminClient()
      .from("sports_events")
      .insert(toEventRow({ ...eventData, academicYear: eventData.academicYear || currentYearIST() }))
      .select()
      .single(),
    "sports_events insert",
  );
  return { ...toEvent(row), participantCount: 0 };
}

/** Adds the standard events that `academicYear` does not have yet (matched by name). */
export async function addPresetEvents(academicYear: number): Promise<number> {
  const supabase = createAdminClient();
  const existing = await read<any[]>(
    supabase.from("sports_events").select("name").eq("academic_year", academicYear),
    "sports_events select",
  );
  const have = new Set(existing.map((e) => String(e.name).toLowerCase()));
  const missing = PRESET_SPORTS_EVENTS.filter((p) => !have.has(p.name.toLowerCase()));
  if (!missing.length) return 0;
  await mustWrite(
    supabase.from("sports_events").insert(missing.map((p) => toEventRow({ ...p, academicYear }))),
    "sports_events insert",
  );
  return missing.length;
}

export async function updateSportsEvent(id: string, eventData: Partial<Omit<SportsEvent, "id">>): Promise<SportsEvent | null> {
  const row = await read<any>(
    createAdminClient()
      .from("sports_events")
      .update({ ...toEventRow(eventData), updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .maybeSingle(),
    "sports_events update",
  );
  return row ? toEvent(row) : null;
}

/** Registrations and results go with the event (ON DELETE CASCADE). */
export async function deleteSportsEvent(id: string): Promise<void> {
  await mustWrite(createAdminClient().from("sports_events").delete().eq("id", id), "sports_events delete");
}

// ---------- Athletes and chest numbers ----------

/**
 * Gives every student in `studentIds` a chest number for `year` (existing ones are kept).
 * Numbers are the lowest free ones from 101. Two enrolments at once can pick the same
 * number; the unique index (academic_year, chest_number) rejects the second insert, so
 * the whole batch is retried with fresh data.
 */
async function assignChestNumbers(supabase: Db, studentIds: string[], year: number): Promise<void> {
  for (let attempt = 0; ; attempt++) {
    const rows = await read<any[]>(
      supabase.from("sports_athletes").select("student_id, chest_number").eq("academic_year", year),
      "sports_athletes select",
    );
    const has = new Set(rows.map((r) => r.student_id));
    const missing = studentIds.filter((id) => !has.has(id));
    if (!missing.length) return;

    const used = new Set(rows.map((r) => parseInt(r.chest_number, 10)).filter((n) => !isNaN(n)));
    let next = FIRST_CHEST_NUMBER;
    const inserts = missing.map((studentId) => {
      while (used.has(next)) next++;
      used.add(next);
      return { academic_year: year, student_id: studentId, chest_number: String(next) };
    });

    const { error } = await supabase.from("sports_athletes").insert(inserts);
    if (!error) return;
    if (error.code !== "23505" || attempt >= 2) throw new Error(`sports_athletes insert: ${error.message}`);
  }
}

export async function getAllAthletesWithEvents(academicYear: number = currentYearIST()): Promise<SportsParticipant[]> {
  const supabase = createAdminClient();
  const rows = await read<any[]>(
    supabase.from("sports_athletes").select(`id, student_id, chest_number, students:student_id (${STUDENT_COLUMNS})`).eq("academic_year", academicYear),
    "sports_athletes select",
  );
  const names = await eventNamesByStudent(supabase, academicYear);

  return rows
    .filter((a) => names[a.student_id]?.length)
    .map((a) => ({
      ...toParticipant({ ...one(a.students), id: a.student_id }, String(a.chest_number || "").trim(), names[a.student_id]),
      registrationId: `ath-${a.id}`,
      athleteId: a.id,
    }))
    .sort(byChestNumber);
}

export async function updateChestNumber(studentId: string, newChestNumber: string, academicYear: number = currentYearIST()): Promise<void> {
  const chest = newChestNumber.trim();
  if (!chest) throw new SportsRuleError("Chest number cannot be empty");

  const supabase = createAdminClient();
  const taken = await read<any>(
    supabase
      .from("sports_athletes")
      .select("student_id")
      .eq("academic_year", academicYear)
      .eq("chest_number", chest)
      .neq("student_id", studentId)
      .maybeSingle(),
    "sports_athletes select",
  );
  if (taken) throw new SportsRuleError(`Chest number ${chest} is already assigned to another student.`);

  const { error } = await supabase
    .from("sports_athletes")
    .upsert(
      { student_id: studentId, academic_year: academicYear, chest_number: chest, updated_at: new Date().toISOString() },
      { onConflict: "academic_year,student_id" },
    );
  if (error?.code === "23505") throw new SportsRuleError(`Chest number ${chest} is already assigned to another student.`);
  if (error) throw new Error(`sports_athletes upsert: ${error.message}`);
}

// ---------- Registrations ----------

/** Number of events each student is entered in, for `year`'s events. */
export async function getStudentRegistrationCounts(academicYear: number = currentYearIST()): Promise<Record<string, number>> {
  const rows = await read<any[]>(
    createAdminClient()
      .from("sports_event_registrations")
      .select("student_id, sports_events!inner(academic_year)")
      .eq("sports_events.academic_year", academicYear),
    "sports_event_registrations select",
  );
  const counts: Record<string, number> = {};
  rows.forEach((r) => (counts[r.student_id] = (counts[r.student_id] || 0) + 1));
  return counts;
}

export async function getEventParticipants(eventId: string): Promise<SportsParticipant[]> {
  const supabase = createAdminClient();
  const [event, regs, results] = await Promise.all([
    getSportsEventRow(eventId),
    read<any[]>(
      supabase.from("sports_event_registrations").select(`id, event_id, student_id, lane_or_heat, status, students:student_id (${STUDENT_COLUMNS})`).eq("event_id", eventId),
      "sports_event_registrations select",
    ),
    read<any[]>(supabase.from("sports_event_results").select("*").eq("event_id", eventId), "sports_event_results select"),
  ]);
  if (!event || !regs.length) return [];

  const studentIds = regs.map((r) => r.student_id);
  const [athletes, names] = await Promise.all([
    read<any[]>(
      supabase.from("sports_athletes").select("id, student_id, chest_number").eq("academic_year", event.academic_year).in("student_id", studentIds),
      "sports_athletes select",
    ),
    eventNamesByStudent(supabase, event.academic_year, studentIds),
  ]);
  const athleteOf = new Map(athletes.map((a) => [a.student_id, a]));
  const resultOf = new Map(results.map((r) => [r.student_id, r]));

  return regs.map((r) => {
    const athlete = athleteOf.get(r.student_id);
    const res = resultOf.get(r.student_id);
    const eventNames = names[r.student_id] || [];
    return {
      ...toParticipant({ ...one(r.students), id: r.student_id }, athlete?.chest_number || "-", eventNames),
      registrationId: r.id,
      eventId: r.event_id,
      athleteId: athlete?.id,
      laneOrHeat: r.lane_or_heat,
      status: r.status || "Registered",
      registeredEventsCount: eventNames.length || 1,
      resultId: res?.id,
      trial1: res?.trial_1,
      trial2: res?.trial_2,
      trial3: res?.trial_3,
      bestScore: res?.best_score,
      rankPosition: res?.rank_position,
      remarks: res?.remarks,
    };
  });
}

async function getSportsConfig(supabase: Db): Promise<SportsConfig> {
  const row = await read<any>(supabase.from("system_config").select("value").eq("key", "sports_config").maybeSingle(), "system_config select");
  const v = row?.value || {};
  return {
    maxEventsPerStudent: typeof v.maxEventsPerStudent === "number" ? v.maxEventsPerStudent : DEFAULT_SPORTS_CONFIG.maxEventsPerStudent,
    enforcementMode: v.enforcementMode === "strict" ? "strict" : "warning",
  };
}

/**
 * Enrols students in an event for the event's own academic year. The event's
 * participant limit and, in strict mode, the per-student event limit are checked
 * here so another tab or a direct request cannot pass them.
 */
export async function enrollStudentsInEvent(eventId: string, studentIds: string[]): Promise<{ enrolledCount: number; alreadyEnrolled: number }> {
  const supabase = createAdminClient();
  const [event, current, config] = await Promise.all([
    getSportsEventRow(eventId),
    read<any[]>(supabase.from("sports_event_registrations").select("student_id").eq("event_id", eventId), "sports_event_registrations select"),
    getSportsConfig(supabase),
  ]);
  if (!event) throw new SportsRuleError("Event not found");

  const enrolled = new Set(current.map((r) => r.student_id));
  const newIds = Array.from(new Set(studentIds)).filter((id) => !enrolled.has(id));
  if (!newIds.length) return { enrolledCount: 0, alreadyEnrolled: studentIds.length };

  if (event.max_participants && enrolled.size + newIds.length > event.max_participants) {
    throw new SportsRuleError(`${event.name} allows ${event.max_participants} participants; ${enrolled.size} already enrolled.`);
  }

  if (config.enforcementMode === "strict" && config.maxEventsPerStudent > 0) {
    const counts = await getStudentRegistrationCounts(event.academic_year);
    const over = newIds.filter((id) => (counts[id] || 0) >= config.maxEventsPerStudent);
    if (over.length) {
      throw new SportsRuleError(`${over.length} student(s) already have ${config.maxEventsPerStudent} events, the limit.`);
    }
  }

  await assignChestNumbers(supabase, newIds, event.academic_year);
  await mustWrite(
    supabase
      .from("sports_event_registrations")
      .upsert(newIds.map((studentId) => ({ event_id: eventId, student_id: studentId, status: "Registered" })), {
        onConflict: "event_id,student_id",
        ignoreDuplicates: true,
      }),
    "sports_event_registrations upsert",
  );
  return { enrolledCount: newIds.length, alreadyEnrolled: studentIds.length - newIds.length };
}

/** Removes the registration and that student's result for the event. */
export async function removeStudentFromEvent(eventId: string, studentId: string): Promise<void> {
  const supabase = createAdminClient();
  await mustWrite(
    supabase.from("sports_event_results").delete().eq("event_id", eventId).eq("student_id", studentId),
    "sports_event_results delete",
  );
  await mustWrite(
    supabase.from("sports_event_registrations").delete().eq("event_id", eventId).eq("student_id", studentId),
    "sports_event_registrations delete",
  );
}

// ---------- Results ----------

export interface SportsResultInput {
  studentId: string;
  trial1?: string;
  trial2?: string;
  trial3?: string;
  bestScore?: string;
  rankPosition?: number | null;
  remarks?: string;
}

/** Saves all rows in one upsert; rows of students not registered in the event are ignored. Returns the saved rows. */
export async function saveEventResults(eventId: string, results: SportsResultInput[]): Promise<any[]> {
  const supabase = createAdminClient();
  const regs = await read<any[]>(
    supabase.from("sports_event_registrations").select("student_id").eq("event_id", eventId),
    "sports_event_registrations select",
  );
  const registered = new Set(regs.map((r) => r.student_id));
  const now = new Date().toISOString();
  const rows = results
    .filter((r) => registered.has(r.studentId))
    .map((r) => ({
      event_id: eventId,
      student_id: r.studentId,
      trial_1: r.trial1,
      trial_2: r.trial2,
      trial_3: r.trial3,
      best_score: r.bestScore,
      rank_position: r.rankPosition || null,
      remarks: r.remarks,
      updated_at: now,
    }));
  if (!rows.length) return [];
  return read<any[]>(
    supabase.from("sports_event_results").upsert(rows, { onConflict: "event_id,student_id" }).select("id"),
    "sports_event_results upsert",
  );
}
