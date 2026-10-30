import { createClient } from "@/lib/supabase/client";
import { RoutineClass, RoutineSubjectGroup, RoutineGroupOption } from "@/lib/routine/types";
import { isPooledGroup } from "@/lib/routine/routine-domain";
import { mustWrite } from "@/lib/supabase/write";
import { getLocalRoutineState, setLocalRoutineState } from "@/lib/supabase/routine/local-state";

// ============================================================
// Subject Groups (parallel elective blocks)
// ============================================================

const isUuidStr = (str?: string) =>
  str ? /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str) : false;

/**
 * Resolve the sectionIds for a group:
 *  - scope='section': stored membership rows.
 *  - scope='class'  : all routine_classes matching className (and stream if set).
 *                     Parsing follows the project convention
 *                     "A (Science)" => section=A, stream=Science.
 */
function resolveGroupSectionIds(
  group: { scope: "class" | "section"; className?: string | null; stream?: string | null },
  explicitSectionIds: string[],
  classes: RoutineClass[]
): string[] {
  if (group.scope === "section") return explicitSectionIds;

  const wantedClass = (group.className || "").trim();
  if (!wantedClass) return [];

  // Local parser (avoid importing routine-helpers to prevent cycles).
  const parse = (raw: string): { section: string; stream: string } => {
    const t = (raw || "").trim();
    const paren = t.match(/^([^()]+?)\s*\(([^()]+)\)\s*$/);
    if (paren) return { section: paren[1].trim(), stream: paren[2].trim() };
    const dash = t.match(/^([^-]+?)\s*-\s*(.+)$/);
    if (dash) return { section: dash[1].trim(), stream: dash[2].trim() };
    if (!t) return { section: "A", stream: "General" };
    return /^[A-Z]{1,3}$/i.test(t)
      ? { section: t, stream: "General" }
      : { section: "A", stream: t };
  };

  const wantedStream = (group.stream || "").trim().toLowerCase();
  return classes
    .filter((c) => (c.className || "").trim() === wantedClass)
    .filter((c) => {
      if (!wantedStream) return true;
      const { stream } = parse(c.section || "");
      return stream.toLowerCase() === wantedStream;
    })
    .map((c) => c.id);
}

/**
 * Load all subject groups (header + section memberships + options).
 */
export async function fetchSubjectGroupsDb(
  classes: RoutineClass[]
): Promise<RoutineSubjectGroup[]> {
  const supabase = createClient();

  try {
    const [headersRes, sectionsRes, optionsRes] = await Promise.all([
      supabase.from("routine_subject_groups").select("*").order("sort_order", { ascending: true }),
      supabase.from("routine_subject_group_sections").select("*"),
      supabase
        .from("routine_subject_group_options")
        .select("*")
        .order("sort_order", { ascending: true }),
    ]);

    const headers = headersRes.data || [];
    const sections = sectionsRes.data || [];
    const options = optionsRes.data || [];

    const sectionsByGroup = new Map<string, string[]>();
    for (const row of sections) {
      const list = sectionsByGroup.get(row.group_id) || [];
      list.push(row.class_id);
      sectionsByGroup.set(row.group_id, list);
    }

    const optionsByGroup = new Map<string, RoutineGroupOption[]>();
    for (const row of options) {
      const list = optionsByGroup.get(row.group_id) || [];
      list.push({
        id: row.id,
        groupId: row.group_id,
        subjectId: row.subject_id,
        teacherId: row.teacher_id || "",
        roomId: row.room_id,
        sortOrder: row.sort_order ?? 0,
      });
      optionsByGroup.set(row.group_id, list);
    }

    return headers.map((h: any) => {
      const explicit = sectionsByGroup.get(h.id) || [];
      const resolved = resolveGroupSectionIds(
        { scope: h.scope, className: h.class_name, stream: h.stream },
        explicit,
        classes
      );
      return {
        id: h.id,
        name: h.name,
        scope: h.scope,
        className: h.class_name,
        stream: h.stream,
        pooled: isPooledGroup(h.scope),
        periodsPerWeek: h.periods_per_week ?? 1,
        periodSize: (h.period_size === 2 ? 2 : 1) as 1 | 2,
        timePref: h.time_pref || "any",
        maxPerDay: h.max_per_day,
        sortOrder: h.sort_order ?? 0,
        sectionIds: resolved,
        options: optionsByGroup.get(h.id) || [],
      };
    });
  } catch (err) {
    console.warn("fetchSubjectGroupsDb:", err);
    return [];
  }
}

/**
 * Upsert a subject group with its sections and options.
 * Replaces sections/options atomically (delete-then-insert of children).
 */
export async function upsertSubjectGroupDb(group: {
  id?: string;
  name: string;
  scope: "class" | "section";
  className?: string | null;
  stream?: string | null;
  pooled: boolean;
  periodsPerWeek: number;
  periodSize: 1 | 2;
  timePref: "any" | "morning" | "afternoon";
  maxPerDay?: number | null;
  sortOrder?: number;
  sectionIds: string[];     // required when scope='section'
  options: Array<{
    id?: string;
    subjectId: string;
    teacherId: string;
    roomId?: string | null;
    sortOrder?: number;
  }>;
}): Promise<string> {
  const id = isUuidStr(group.id) ? group.id! : crypto.randomUUID();
  const supabase = createClient();

  // Local optimistic write
  const local = getLocalRoutineState() || {};
  const current = local.groups || [];
  const idx = current.findIndex((g) => g.id === id);
  const nextLocal: RoutineSubjectGroup = {
    id,
    name: group.name,
    scope: group.scope,
    className: group.className || null,
    stream: group.stream || null,
    pooled: isPooledGroup(group.scope),
    periodsPerWeek: group.periodsPerWeek,
    periodSize: group.periodSize,
    timePref: group.timePref,
    maxPerDay: group.maxPerDay ?? null,
    sortOrder: group.sortOrder ?? 0,
    sectionIds: group.scope === "section"
      ? group.sectionIds
      : resolveGroupSectionIds(
          { scope: "class", className: group.className, stream: group.stream },
          [],
          local.classes || []
        ),
    options: group.options.map((o) => ({
      id: isUuidStr(o.id) ? o.id! : crypto.randomUUID(),
      groupId: id,
      subjectId: o.subjectId,
      teacherId: o.teacherId,
      roomId: o.roomId ?? null,
      sortOrder: o.sortOrder ?? 0,
    })),
  };
  const nextList = idx > -1 ? [...current] : [...current, nextLocal];
  if (idx > -1) nextList[idx] = nextLocal;
  setLocalRoutineState({ groups: nextList });

  try {
    // 1. upsert header
    const headerRow = {
      id,
      name: group.name,
      scope: group.scope,
      class_name: group.scope === "class" ? group.className ?? null : null,
      stream: group.scope === "class" ? group.stream ?? null : null,
      pooled: isPooledGroup(group.scope),
      periods_per_week: group.periodsPerWeek,
      period_size: group.periodSize,
      time_pref: group.timePref,
      max_per_day: group.maxPerDay ?? null,
      sort_order: group.sortOrder ?? 0,
      updated_at: new Date().toISOString(),
    };
    const { error: hErr } = await supabase.from("routine_subject_groups").upsert(headerRow);
    if (hErr) console.warn("upsertSubjectGroupDb header:", hErr);

    // 2. replace section memberships (scope='section')
    await mustWrite(supabase.from("routine_subject_group_sections").delete().eq("group_id", id), "routine_subject_group_sections delete");
    if (group.scope === "section" && group.sectionIds.length > 0) {
      const secRows = group.sectionIds.map((cid) => ({ group_id: id, class_id: cid }));
      const { error: sErr } = await supabase
        .from("routine_subject_group_sections")
        .insert(secRows);
      if (sErr) console.warn("upsertSubjectGroupDb sections:", sErr);
    }

    // 3. upsert options first, then drop the ones that are gone, so a failed write never wipes the old rows
    const optRows = group.options.map((o, i) => ({
      id: nextLocal.options[i].id,
      group_id: id,
      subject_id: o.subjectId,
      teacher_id: o.teacherId || null,
      room_id: o.roomId ?? null,
      sort_order: o.sortOrder ?? i,
    }));
    if (optRows.length > 0) {
      const { error: oErr } = await supabase.from("routine_subject_group_options").upsert(optRows);
      if (oErr) console.warn("upsertSubjectGroupDb options:", oErr);
    }
    const keepIds = optRows.map((r) => r.id);
    const cleanup = supabase.from("routine_subject_group_options").delete().eq("group_id", id);
    const { error: dErr } = keepIds.length
      ? await cleanup.not("id", "in", `(${keepIds.join(",")})`)
      : await cleanup;
    if (dErr) console.warn("upsertSubjectGroupDb option cleanup:", dErr);
  } catch (err) {
    console.warn("upsertSubjectGroupDb:", err);
  }

  return id;
}

/**
 * Delete a subject group. Child rows cascade.
 */
export async function deleteSubjectGroupDb(id: string): Promise<boolean> {
  const local = getLocalRoutineState() || {};
  if (local.groups) {
    setLocalRoutineState({ groups: local.groups.filter((g) => g.id !== id) });
  }

  const supabase = createClient();
  try {
    const { error } = await supabase.from("routine_subject_groups").delete().eq("id", id);
    if (error) {
      console.warn("deleteSubjectGroupDb:", error);
      return false;
    }
    return true;
  } catch (err) {
    console.warn("deleteSubjectGroupDb:", err);
    return false;
  }
}

/**
 * Return the list of group ids a given teacher is referenced in (via any option).
 * Used by teacher-delete safety checks.
 */
async function fetchGroupsReferencingTeacherDb(teacherId: string): Promise<
  Array<{ groupId: string; groupName: string }>
> {
  const supabase = createClient();
  try {
    const { data: optRows, error } = await supabase
      .from("routine_subject_group_options")
      .select("group_id")
      .eq("teacher_id", teacherId);
    if (error || !optRows || optRows.length === 0) return [];
    const groupIds = Array.from(new Set(optRows.map((r: any) => r.group_id)));
    const { data: headers } = await supabase
      .from("routine_subject_groups")
      .select("id, name")
      .in("id", groupIds);
    return (headers || []).map((h: any) => ({ groupId: h.id, groupName: h.name }));
  } catch (err) {
    console.warn("fetchGroupsReferencingTeacherDb:", err);
    return [];
  }
}
