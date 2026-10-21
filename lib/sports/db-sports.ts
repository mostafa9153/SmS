import { createAdminClient } from "@/lib/supabase/admin";
import {
  SportsEvent,
  SportsAthlete,
  SportsParticipant,
  PRESET_SPORTS_EVENTS,
} from "./types";

// In-memory / fallback store for offline development and instant resilience
let memoryEvents: SportsEvent[] = PRESET_SPORTS_EVENTS.map((e, idx) => ({
  ...e,
  id: `event-${idx + 1}`,
  createdAt: new Date().toISOString(),
  participantCount: 0,
}));

let memoryAthletes: Record<string, SportsAthlete> = {}; // key: studentId
let memoryRegistrations: Record<string, { eventId: string; studentId: string; status: string; laneOrHeat?: string }> = {};
let memoryResults: Record<string, { eventId: string; studentId: string; trial1?: string; trial2?: string; trial3?: string; bestScore?: string; rankPosition?: number | null; remarks?: string }> = {};

export async function getSportsEvents(academicYear?: number): Promise<SportsEvent[]> {
  const year = academicYear || new Date().getFullYear();
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("sports_events")
      .select("*")
      .order("name", { ascending: true });

    if (!error && data && data.length > 0) {
      // Count participants per event
      const { data: regData } = await supabase
        .from("sports_event_registrations")
        .select("event_id");

      const countMap: Record<string, number> = {};
      (regData || []).forEach((r: any) => {
        countMap[r.event_id] = (countMap[r.event_id] || 0) + 1;
      });

      return data.map((d: any) => ({
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
        participantCount: countMap[d.id] || 0,
      }));
    }
  } catch (err) {
    // Graceful fallback to memory/cache
  }

  // Calculate participant counts for memory store
  const countMap: Record<string, number> = {};
  Object.values(memoryRegistrations).forEach((r) => {
    countMap[r.eventId] = (countMap[r.eventId] || 0) + 1;
  });

  return memoryEvents.map((e) => ({
    ...e,
    participantCount: countMap[e.id] || 0,
  }));
}

export async function createSportsEvent(eventData: Omit<SportsEvent, "id">): Promise<SportsEvent> {
  const academicYear = eventData.academicYear || new Date().getFullYear();
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("sports_events")
      .insert({
        academic_year: academicYear,
        name: eventData.name,
        category: eventData.category,
        gender: eventData.gender,
        eligible_classes: eventData.eligibleClasses,
        scoring_type: eventData.scoringType,
        measurement_unit: eventData.measurementUnit,
        max_participants: eventData.maxParticipants,
        description: eventData.description,
      })
      .select()
      .single();

    if (!error && data) {
      return {
        id: data.id,
        academicYear: data.academic_year,
        name: data.name,
        category: data.category,
        gender: data.gender,
        eligibleClasses: data.eligible_classes,
        scoringType: data.scoring_type,
        measurementUnit: data.measurement_unit,
        maxParticipants: data.max_participants,
        description: data.description,
        createdAt: data.created_at,
        participantCount: 0,
      };
    }
  } catch (err) {}

  const newEvent: SportsEvent = {
    ...eventData,
    id: `event-custom-${Date.now()}`,
    createdAt: new Date().toISOString(),
    participantCount: 0,
  };
  memoryEvents.unshift(newEvent);
  return newEvent;
}

export async function updateSportsEvent(
  id: string,
  eventData: Partial<Omit<SportsEvent, "id">>
): Promise<SportsEvent | null> {
  try {
    const supabase = createAdminClient();
    const updatePayload: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };
    if (eventData.name !== undefined) updatePayload.name = eventData.name;
    if (eventData.category !== undefined) updatePayload.category = eventData.category;
    if (eventData.gender !== undefined) updatePayload.gender = eventData.gender;
    if (eventData.eligibleClasses !== undefined) updatePayload.eligible_classes = eventData.eligibleClasses;
    if (eventData.scoringType !== undefined) updatePayload.scoring_type = eventData.scoringType;
    if (eventData.measurementUnit !== undefined) updatePayload.measurement_unit = eventData.measurementUnit;
    if (eventData.maxParticipants !== undefined) updatePayload.max_participants = eventData.maxParticipants;
    if (eventData.description !== undefined) updatePayload.description = eventData.description;

    const { data, error } = await supabase
      .from("sports_events")
      .update(updatePayload)
      .eq("id", id)
      .select()
      .maybeSingle();

    if (!error && data) {
      return {
        id: data.id,
        academicYear: data.academic_year,
        name: data.name,
        category: data.category,
        gender: data.gender,
        eligibleClasses: data.eligible_classes || [],
        scoringType: data.scoring_type,
        measurementUnit: data.measurement_unit,
        maxParticipants: data.max_participants,
        description: data.description,
        createdAt: data.created_at,
        participantCount: 0,
      };
    }
  } catch (err) {}

  // Fallback to memory
  const idx = memoryEvents.findIndex((e) => e.id === id);
  if (idx !== -1) {
    memoryEvents[idx] = {
      ...memoryEvents[idx],
      ...eventData,
    };
    return memoryEvents[idx];
  }
  return null;
}

export async function deleteSportsEvent(id: string): Promise<boolean> {
  try {
    const supabase = createAdminClient();
    const { error } = await supabase.from("sports_events").delete().eq("id", id);
    if (!error) {
      return true;
    }
  } catch (err) {}

  // Fallback to memory
  memoryEvents = memoryEvents.filter((e) => e.id !== id);
  // Also clean up registrations for this event
  Object.keys(memoryRegistrations).forEach((key) => {
    if (memoryRegistrations[key].eventId === id) {
      delete memoryRegistrations[key];
    }
  });
  return true;
}

export async function getStudentRegistrationCounts(): Promise<Record<string, number>> {
  try {
    const supabase = createAdminClient();
    const { data } = await supabase.from("sports_event_registrations").select("student_id");
    const counts: Record<string, number> = {};
    (data || []).forEach((r: any) => {
      counts[r.student_id] = (counts[r.student_id] || 0) + 1;
    });
    return counts;
  } catch (err) {}

  const counts: Record<string, number> = {};
  Object.values(memoryRegistrations).forEach((r) => {
    counts[r.studentId] = (counts[r.studentId] || 0) + 1;
  });
  return counts;
}

export async function getEventParticipants(eventId: string): Promise<SportsParticipant[]> {
  try {
    const supabase = createAdminClient();
    const { data: regRows, error: regError } = await supabase
      .from("sports_event_registrations")
      .select(`
        id,
        event_id,
        student_id,
        lane_or_heat,
        status,
        students:student_id (
          id,
          name,
          school_id,
          present_class,
          present_section,
          present_roll,
          gender,
          photo_url
        )
      `)
      .eq("event_id", eventId);

    if (!regError && regRows && regRows.length > 0) {
      const studentIds = regRows.map((r: any) => r.student_id);
      
      // Fetch athletes (chest numbers)
      const { data: athleteRows } = await supabase
        .from("sports_athletes")
        .select("*")
        .in("student_id", studentIds);

      const athleteMap = new Map((athleteRows || []).map((a: any) => [a.student_id, a]));

      // Fetch results for this event
      const { data: resultRows } = await supabase
        .from("sports_event_results")
        .select("*")
        .eq("event_id", eventId);

      const resultMap = new Map((resultRows || []).map((res: any) => [res.student_id, res]));

      // Fetch registration counts and all event names per student
      const { data: allRegs } = await supabase
        .from("sports_event_registrations")
        .select(`
          student_id,
          event_id,
          sports_events (
            name
          )
        `)
        .in("student_id", studentIds);

      const countMap: Record<string, number> = {};
      const eventsMap: Record<string, string[]> = {};
      (allRegs || []).forEach((r: any) => {
        countMap[r.student_id] = (countMap[r.student_id] || 0) + 1;
        const evName = r.sports_events?.name;
        if (evName) {
          eventsMap[r.student_id] = eventsMap[r.student_id] || [];
          if (!eventsMap[r.student_id].includes(evName)) {
            eventsMap[r.student_id].push(evName);
          }
        }
      });

      return regRows.map((r: any) => {
        const s = r.students || {};
        const athlete = athleteMap.get(r.student_id);
        const res = resultMap.get(r.student_id);
        return {
          registrationId: r.id,
          eventId: r.event_id,
          studentId: r.student_id,
          athleteId: athlete?.id,
          chestNumber: athlete?.chest_number || "-",
          studentName: s.name || "Student",
          schoolId: s.school_id || "",
          presentClass: s.present_class || "",
          presentSection: s.present_section || "A",
          presentRoll: s.present_roll || 0,
          gender: s.gender || "All",
          photoUrl: s.photo_url,
          laneOrHeat: r.lane_or_heat,
          status: r.status || "Registered",
          registeredEventsCount: countMap[r.student_id] || 1,
          enrolledEvents: eventsMap[r.student_id] || [],
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
  } catch (err) {}

  // Fallback to memory
  const regs = Object.values(memoryRegistrations).filter((r) => r.eventId === eventId);
  return regs.map((r, i) => {
    const athlete = memoryAthletes[r.studentId];
    const res = memoryResults[`${eventId}-${r.studentId}`];
    const studentEvents: string[] = [];
    Object.values(memoryRegistrations).forEach((reg) => {
      if (reg.studentId === r.studentId) {
        const ev = memoryEvents.find((e) => e.id === reg.eventId);
        if (ev && !studentEvents.includes(ev.name)) {
          studentEvents.push(ev.name);
        }
      }
    });

    return {
      registrationId: `reg-${eventId}-${r.studentId}`,
      eventId: r.eventId,
      studentId: r.studentId,
      athleteId: athlete?.id,
      chestNumber: athlete?.chestNumber || `${100 + i + 1}`,
      studentName: `Student ${r.studentId.substring(0, 6)}`,
      schoolId: `MHS/2026/${100 + i}`,
      presentClass: "V",
      presentSection: "A",
      presentRoll: i + 1,
      gender: "Male",
      laneOrHeat: r.laneOrHeat,
      status: (r.status as any) || "Registered",
      registeredEventsCount: studentEvents.length || 1,
      enrolledEvents: studentEvents.length ? studentEvents : ["Sports Event"],
      trial1: res?.trial1,
      trial2: res?.trial2,
      trial3: res?.trial3,
      bestScore: res?.bestScore,
      rankPosition: res?.rankPosition,
      remarks: res?.remarks,
    };
  });
}

export async function getAllAthletesWithEvents(
  academicYear: number = new Date().getFullYear()
): Promise<SportsParticipant[]> {
  try {
    const supabase = createAdminClient();
    const { data: athleteRows, error } = await supabase
      .from("sports_athletes")
      .select(`
        id,
        student_id,
        chest_number,
        academic_year,
        students:student_id (
          id,
          name,
          school_id,
          present_class,
          present_section,
          present_roll,
          gender,
          photo_url
        )
      `)
      .eq("academic_year", academicYear);

    if (!error && athleteRows && athleteRows.length > 0) {
      const studentIds = athleteRows.map((a: any) => a.student_id);

      const { data: regRows } = await supabase
        .from("sports_event_registrations")
        .select(`
          student_id,
          event_id,
          sports_events (
            name
          )
        `)
        .in("student_id", studentIds);

      const eventsMap: Record<string, string[]> = {};
      (regRows || []).forEach((r: any) => {
        const evName = r.sports_events?.name;
        if (evName) {
          eventsMap[r.student_id] = eventsMap[r.student_id] || [];
          if (!eventsMap[r.student_id].includes(evName)) {
            eventsMap[r.student_id].push(evName);
          }
        }
      });

      // Filter only athletes who actually enrolled in at least one event
      return athleteRows
        .filter((a: any) => (eventsMap[a.student_id] || []).length > 0)
        .map((a: any) => {
          const s = a.students || {};
          const studentEvents = eventsMap[a.student_id] || [];
          return {
            registrationId: `ath-${a.id}`,
            eventId: "",
            studentId: a.student_id,
            athleteId: a.id,
            chestNumber: a.chest_number,
            studentName: s.name || "Student",
            schoolId: s.school_id || "",
            presentClass: s.present_class || "",
            presentSection: s.present_section || "A",
            presentRoll: s.present_roll || 0,
            gender: s.gender || "All",
            photoUrl: s.photo_url,
            status: "Registered" as const,
            registeredEventsCount: studentEvents.length,
            enrolledEvents: studentEvents,
          };
        })
        .sort((a: any, b: any) => {
          const numA = parseInt(a.chestNumber, 10);
          const numB = parseInt(b.chestNumber, 10);
          if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
          return a.chestNumber.localeCompare(b.chestNumber);
        });
    }
  } catch (err) {}

  // Memory fallback
  return Object.values(memoryAthletes)
    .map((ath) => {
      const studentEvents: string[] = [];
      Object.values(memoryRegistrations).forEach((reg) => {
        if (reg.studentId === ath.studentId) {
          const ev = memoryEvents.find((e) => e.id === reg.eventId);
          if (ev && !studentEvents.includes(ev.name)) {
            studentEvents.push(ev.name);
          }
        }
      });

      return {
        registrationId: `ath-${ath.id}`,
        eventId: "",
        studentId: ath.studentId,
        athleteId: ath.id,
        chestNumber: ath.chestNumber,
        studentName: `Student ${ath.studentId.substring(0, 6)}`,
        schoolId: `MHS/2026/${ath.chestNumber}`,
        presentClass: "V",
        presentSection: "A",
        presentRoll: 1,
        gender: "All",
        status: "Registered" as const,
        registeredEventsCount: studentEvents.length,
        enrolledEvents: studentEvents,
      };
    })
    .filter((a) => a.enrolledEvents.length > 0);
}

/**
 * Assigns or gets a universal chest number for a student.
 * If student already has a chest number for this year, retains it.
 * Otherwise, generates next available sequential number (e.g. 101, 102...)
 */
export async function getOrCreateChestNumber(
  studentId: string,
  academicYear: number = new Date().getFullYear(),
  preferredChestNumber?: string
): Promise<string> {
  try {
    const supabase = createAdminClient();
    
    // Check if athlete already exists
    const { data: existing } = await supabase
      .from("sports_athletes")
      .select("chest_number")
      .eq("student_id", studentId)
      .eq("academic_year", academicYear)
      .maybeSingle();

    if (existing?.chest_number) {
      if (preferredChestNumber && preferredChestNumber !== existing.chest_number) {
        await supabase
          .from("sports_athletes")
          .update({ chest_number: preferredChestNumber })
          .eq("student_id", studentId)
          .eq("academic_year", academicYear);
        return preferredChestNumber;
      }
      return existing.chest_number;
    }

    let finalChestNo = preferredChestNumber;
    if (!finalChestNo) {
      // Determine next sequential chest number
      const { data: allAthletes } = await supabase
        .from("sports_athletes")
        .select("chest_number")
        .eq("academic_year", academicYear);

      const usedNumbers = new Set(
        (allAthletes || [])
          .map((a: any) => parseInt(a.chest_number, 10))
          .filter((n: number) => !isNaN(n))
      );

      let nextNum = 101;
      while (usedNumbers.has(nextNum)) {
        nextNum++;
      }
      finalChestNo = String(nextNum);
    }

    await supabase.from("sports_athletes").insert({
      academic_year: academicYear,
      student_id: studentId,
      chest_number: finalChestNo,
    });

    return finalChestNo;
  } catch (err) {}

  // Memory fallback
  if (memoryAthletes[studentId]) {
    if (preferredChestNumber) {
      memoryAthletes[studentId].chestNumber = preferredChestNumber;
    }
    return memoryAthletes[studentId].chestNumber;
  }

  const existingNos = new Set(
    Object.values(memoryAthletes).map((a) => parseInt(a.chestNumber, 10)).filter((n) => !isNaN(n))
  );
  let next = 101;
  while (existingNos.has(next)) {
    next++;
  }
  const assigned = preferredChestNumber || String(next);
  memoryAthletes[studentId] = {
    id: `ath-${studentId}`,
    academicYear,
    studentId,
    chestNumber: assigned,
    createdAt: new Date().toISOString(),
  };
  return assigned;
}

export async function enrollStudentsInEvent(
  eventId: string,
  studentIds: string[],
  academicYear: number = new Date().getFullYear()
): Promise<{ enrolledCount: number; errors: string[] }> {
  const errors: string[] = [];
  let count = 0;

  for (const studentId of studentIds) {
    try {
      // 1. Ensure universal chest number
      const chestNo = await getOrCreateChestNumber(studentId, academicYear);

      // 2. Insert into registrations
      const supabase = createAdminClient();
      const { error } = await supabase
        .from("sports_event_registrations")
        .upsert(
          {
            event_id: eventId,
            student_id: studentId,
            status: "Registered",
          },
          { onConflict: "event_id,student_id" }
        );

      if (!error) {
        count++;
      } else {
        // Track memory
        memoryRegistrations[`${eventId}-${studentId}`] = {
          eventId,
          studentId,
          status: "Registered",
        };
        count++;
      }
    } catch (err: any) {
      memoryRegistrations[`${eventId}-${studentId}`] = {
        eventId,
        studentId,
        status: "Registered",
      };
      count++;
    }
  }

  return { enrolledCount: count, errors };
}

export async function removeStudentFromEvent(eventId: string, studentId: string): Promise<boolean> {
  try {
    const supabase = createAdminClient();
    await supabase
      .from("sports_event_registrations")
      .delete()
      .eq("event_id", eventId)
      .eq("student_id", studentId);
  } catch (err) {}

  delete memoryRegistrations[`${eventId}-${studentId}`];
  delete memoryResults[`${eventId}-${studentId}`];
  return true;
}

export async function saveEventResults(
  eventId: string,
  results: {
    studentId: string;
    trial1?: string;
    trial2?: string;
    trial3?: string;
    bestScore?: string;
    rankPosition?: number | null;
    remarks?: string;
  }[]
): Promise<boolean> {
  try {
    const supabase = createAdminClient();
    for (const res of results) {
      await supabase.from("sports_event_results").upsert(
        {
          event_id: eventId,
          student_id: res.studentId,
          trial_1: res.trial1,
          trial_2: res.trial2,
          trial_3: res.trial3,
          best_score: res.bestScore,
          rank_position: res.rankPosition || null,
          remarks: res.remarks,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "event_id,student_id" }
      );
    }
    return true;
  } catch (err) {}

  // Memory fallback
  for (const res of results) {
    memoryResults[`${eventId}-${res.studentId}`] = {
      eventId,
      ...res,
    };
  }
  return true;
}

export async function updateChestNumber(studentId: string, newChestNumber: string, academicYear = new Date().getFullYear()): Promise<boolean> {
  try {
    const supabase = createAdminClient();
    await supabase
      .from("sports_athletes")
      .upsert(
        {
          student_id: studentId,
          academic_year: academicYear,
          chest_number: newChestNumber.trim(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "academic_year,student_id" }
      );
    return true;
  } catch (err) {}

  if (memoryAthletes[studentId]) {
    memoryAthletes[studentId].chestNumber = newChestNumber.trim();
  } else {
    memoryAthletes[studentId] = {
      id: `ath-${studentId}`,
      academicYear,
      studentId,
      chestNumber: newChestNumber.trim(),
      createdAt: new Date().toISOString(),
    };
  }
  return true;
}
