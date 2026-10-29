"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { getDynamicClassList, FALLBACK_CLASSES, getClassNumericRank, getDatabaseSubjectsForClass } from "@/lib/ems/ems-config-loader";
import { isHsClass, parseSectionAndStream, detectSubjectStream, getConfiguredStreamsForClass, calculateTotalSchoolSectionDemand, calculateTeacherConfiguredLoads } from "@/lib/routine/routine-helpers";
import { createClient } from "@/lib/supabase/client";
import { formatClassSectionLabel } from "@/lib/routine/routine-sync";

import type { RoutineTeachersTabProps } from "./props";

export function useTeachersCore({
  teachers,
  settings,
  classes = [],
  subjects = [],
  groups = [],
  onSaveGroup,
  onSaveTeacher,
  onDeleteTeacher,
}: RoutineTeachersTabProps) {
  // Preset Classes & Staff List
  const [presetClasses, setPresetClasses] = useState<ReturnType<typeof getDynamicClassList>>([]);
  const [staffList, setStaffList] = useState<{ id: string; full_name: string; designation?: string }[]>([]);

  useEffect(() => {
    const list = getDynamicClassList();
    const sorted = (list && list.length > 0 ? list : FALLBACK_CLASSES).sort(
      (a, b) => getClassNumericRank(a.code) - getClassNumericRank(b.code)
    );
    setPresetClasses(sorted);

    // Fetch registered teaching staff from staff_profiles for quick selection
    const supabase = createClient();
    supabase
      .from("staff_profiles")
      .select("id, full_name, designation")
      .eq("employee_type", "TEACHING")
      .order("full_name", { ascending: true })
      .then(({ data }) => {
        if (data && data.length > 0) {
          setStaffList(data);
        }
      });
  }, []);

  // Groups that touch a class (class-wise by className, section-wise via their sections)
  const groupsForClass = useCallback(
    (clsName: string) => {
      const clsLower = clsName.trim().toLowerCase();
      const sectionClass = new Map(classes.map((c) => [c.id, c.className.trim().toLowerCase()]));
      return groups.filter((g) =>
        g.scope === "class"
          ? (g.className || "").trim().toLowerCase() === clsLower
          : g.sectionIds.some((id) => sectionClass.get(id) === clsLower)
      );
    },
    [groups, classes]
  );

  // Group member subjects are allotted through the group, never as plain section subjects
  const groupMemberIdsByClass = useMemo(() => {
    const map: Record<string, Set<string>> = {};
    presetClasses.forEach((c) => {
      const ids = new Set<string>();
      groupsForClass(c.name).forEach((g) => g.options.forEach((o) => ids.add(o.subjectId)));
      map[c.name] = ids;
    });
    return map;
  }, [presetClasses, groupsForClass]);

  const groupMemberNamesByClass = useMemo(() => {
    const byId = new Map(subjects.map((s) => [s.id, s.name.trim().toLowerCase()]));
    const map: Record<string, Set<string>> = {};
    Object.entries(groupMemberIdsByClass).forEach(([cls, ids]) => {
      map[cls] = new Set(Array.from(ids).map((id) => byId.get(id)).filter(Boolean) as string[]);
    });
    return map;
  }, [groupMemberIdsByClass, subjects]);

  // Compute subjects for each class served downstream from Routine Subjects
  const classSubjectsDictionary = useMemo(() => {
    const map: Record<string, string[]> = {};
    presetClasses.forEach((c) => {
      const clsName = c.name;
      const clsLower = clsName.trim().toLowerCase();

      // Synced from Routine Subjects tab (Authoritative source)
      const groupIds = groupMemberIdsByClass[clsName];
      const groupNames = groupMemberNamesByClass[clsName];
      const routineSubs = (subjects || []).filter(
        (s) =>
          (!s.className || s.className.trim().toLowerCase() === clsLower) &&
          !groupIds?.has(s.id) &&
          !groupNames?.has(s.name.trim().toLowerCase())
      );

      if (routineSubs.length > 0) {
        const expandedSubs: string[] = [];
        routineSubs.forEach((s) => {
          const sName = s.name.trim();
          const hasSeparateTheoryAndLab = s.isLab && (s.theoryPeriods ?? 0) > 0 && (s.labPeriods ?? 0) > 0;
          if (hasSeparateTheoryAndLab) {
            expandedSubs.push(`${sName} (Theory)`);
            expandedSubs.push(`${sName} (Lab)`);
          } else if (s.isLab && (s.theoryPeriods ?? 0) === 0) {
            expandedSubs.push(
              sName.toLowerCase().includes("lab") || sName.toLowerCase().includes("practical")
                ? sName
                : `${sName} (Lab)`
            );
          } else {
            expandedSubs.push(sName);
          }
        });
        map[clsName] = Array.from(new Set(expandedSubs));
      } else {
        // Fallback only if no routine subjects configured yet for this class
        const dbSubs = getDatabaseSubjectsForClass(c.code || c.name);
        map[clsName] = Array.from(new Set(dbSubs));
      }
    });
    return map;
  }, [presetClasses, subjects, groupMemberIdsByClass, groupMemberNamesByClass]);

  // Aggregated unique subjects list across configured routine subjects
  const availableSubjectOptions = useMemo(() => {
    const set = new Set<string>();
    subjects.forEach((s) => {
      if (s.name) set.add(s.name.trim());
    });
    if (set.size === 0) {
      Object.values(classSubjectsDictionary).forEach((subs) => {
        subs.forEach((s) => set.add(s.trim()));
      });
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [subjects, classSubjectsDictionary]);

  // Section-wise class options for Class Teacher assignment
  const availableClassOptions = useMemo(() => {
    const options: { id: string; label: string; className: string; section: string }[] = [];
    const sourceClasses = presetClasses.length > 0 ? presetClasses : FALLBACK_CLASSES;

    sourceClasses.forEach((c) => {
      const secs = c.sections && c.sections.length > 0 ? c.sections : ["A", "B"];
      secs.forEach((sec) => {
        const cleanSec = sec.trim().replace(/^Section\s+/i, "");
        const label = formatClassSectionLabel(c.name, cleanSec);
        options.push({
          id: `${c.name}-${cleanSec}`,
          label,
          className: c.name,
          section: cleanSec,
        });
      });
    });

    return options;
  }, [presetClasses]);

  // Form State for Add / Edit
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingTeacherId, setEditingTeacherId] = useState<string | null>(null);
  // Group options (by option id) this teacher is picked for in the open editor; written to the groups on save
  const [groupPicks, setGroupPicks] = useState<Set<string>>(new Set());
  const [originalClassTeacherOf, setOriginalClassTeacherOf] = useState<string | null>(null);
  const [selectedStaffId, setSelectedStaffId] = useState<string>("");
  const [teacherName, setTeacherName] = useState("");
  const [shortName, setShortName] = useState("");
  const [primarySubject, setPrimarySubject] = useState<string>("");
  const [customPrimarySubject, setCustomPrimarySubject] = useState<string>("");
  const [classTeacherOf, setClassTeacherOf] = useState<string>("");
  const [classTeacherFirstPeriods, setClassTeacherFirstPeriods] = useState<number>(3);
  const [maxPeriods, setMaxPeriods] = useState<number>(24);
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [classSubjectsMap, setClassSubjectsMap] = useState<Record<string, string[]>>({});
  const [sectionSubjectsMap, setSectionSubjectsMap] = useState<Record<string, string[]>>({});
  const [classSectionsMap, setClassSectionsMap] = useState<Record<string, string[]>>({});
  const [classPeriodsMap, setClassPeriodsMap] = useState<Record<string, number>>({});
  const [sectionPeriodsMap, setSectionPeriodsMap] = useState<Record<string, number>>({});
  const [subjectPeriodsMap, setSubjectPeriodsMap] = useState<Record<string, number>>({});
  const [activeSectionTab, setActiveSectionTab] = useState<Record<string, string>>({});
  const [availSlots, setAvailSlots] = useState<Record<number, number[]>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Helper to extract configured sections for a class
  const getClassSections = useCallback(
    (clsName: string): string[] => {
      const clsLower = clsName.trim().toLowerCase();
      const matched = classes.filter((c) => c.className.trim().toLowerCase() === clsLower);
      if (matched.length > 0) {
        const secs = matched.map((c) => c.section.trim()).filter(Boolean);
        return Array.from(new Set(secs));
      }
      return ["A", "B"];
    },
    [classes]
  );

  // Helper to get default weekly period for a subject in a class
  const getSubjectDefaultPeriod = useCallback(
    (clsName: string, subName: string): number => {
      const isTheory = subName.includes("(Theory)");
      const isLabVariant = subName.includes("(Lab)") || subName.includes("(Practical)");
      const cleanSubName = subName.replace(/\s*\((Theory|Lab|Practical)\)/i, "").trim().toLowerCase();

      const matched = (subjects || []).find(
        (s) =>
          (s.name.trim().toLowerCase() === cleanSubName || s.name.trim().toLowerCase() === subName.trim().toLowerCase()) &&
          (s.className ? s.className.trim().toLowerCase() === clsName.trim().toLowerCase() : true)
      );

      if (matched) {
        if (isTheory) {
          return matched.theoryPeriods && matched.theoryPeriods > 0
            ? matched.theoryPeriods
            : matched.periodsPerWeek
            ? Math.max(1, matched.periodsPerWeek - (matched.labPeriods || 2))
            : 4;
        }
        if (isLabVariant) {
          return matched.labPeriods && matched.labPeriods > 0
            ? matched.labPeriods
            : (matched.periodsPerWeek && matched.isLab ? matched.periodsPerWeek : 2);
        }
        return matched.periodsPerWeek && matched.periodsPerWeek > 0 ? matched.periodsPerWeek : 5;
      }
      return 5;
    },
    [subjects]
  );

  // Each teacher's load comes only from what was ticked here (+ groups); stored assignments are derived data
  const teacherLoadMap: Record<string, number> = useMemo(
    () => Object.fromEntries(calculateTeacherConfiguredLoads(teachers, classes, subjects, groups)),
    [teachers, classes, subjects, groups]
  );

  // Aggregate teacher load stats: the same per-teacher numbers the Setup Hub cards add up
  const totalAllottedLoad = useMemo(
    () => Object.values(teacherLoadMap).reduce((a, b) => a + b, 0),
    [teacherLoadMap]
  );

  // Distinct curriculum subjects across the school
  const distinctCurriculumSubjects = useMemo(() => {
    const set = new Set<string>();
    subjects.forEach((s) => {
      if (s.name && s.name.trim()) {
        const canonical = s.name.trim().toLowerCase().replace(/\s*\([^)]*\)/g, "").replace(/\s+/g, " ").trim();
        set.add(canonical);
      }
    });
    return Array.from(set);
  }, [subjects]);

  const totalSchoolSubjects = distinctCurriculumSubjects.length;

  // Number of distinct curriculum subjects that have at least one teacher assigned
  const { totalAssignedSubjects, unassignedSubjects } = useMemo(() => {
    const assignedSet = new Set<string>();
    teachers.forEach((t) => {
      if (t.classSubjects) {
        Object.values(t.classSubjects).forEach((subs) => {
          subs.forEach((s) => {
            const canonical = s.trim().toLowerCase().replace(/\s*\([^)]*\)/g, "").replace(/\s+/g, " ").trim();
            assignedSet.add(canonical);
          });
        });
      }
      if (t.sectionSubjects) {
        Object.values(t.sectionSubjects).forEach((subs) => {
          subs.forEach((s) => {
            const canonical = s.trim().toLowerCase().replace(/\s*\([^)]*\)/g, "").replace(/\s+/g, " ").trim();
            assignedSet.add(canonical);
          });
        });
      }
    });
    groups.forEach((g) =>
      g.options.forEach((o) => {
        const sub = o.teacherId ? subjects.find((s) => s.id === o.subjectId) : undefined;
        if (sub) assignedSet.add(sub.name.trim().toLowerCase().replace(/\s*\([^)]*\)/g, "").replace(/\s+/g, " ").trim());
      })
    );
    const missing = distinctCurriculumSubjects.filter((s) => !assignedSet.has(s));
    const label = (canonical: string) =>
      subjects.find(
        (s) => s.name.trim().toLowerCase().replace(/\s*\([^)]*\)/g, "").replace(/\s+/g, " ").trim() === canonical
      )?.name || canonical;
    return {
      totalAssignedSubjects: distinctCurriculumSubjects.length - missing.length,
      unassignedSubjects: missing.map(label),
    };
  }, [teachers, subjects, groups, distinctCurriculumSubjects]);

  // Map of total configured subjects for each class
  const classTotalSubjectsMap = useMemo(() => {
    const map: Record<string, number> = {};
    const sourceClasses = classes.length > 0 ? classes : [];
    sourceClasses.forEach((c) => {
      const clsLower = c.className.trim().toLowerCase();
      const isHs = isHsClass(c.className);
      const presets = new Set(getDatabaseSubjectsForClass(c.className).map((sub) => sub.toLowerCase()));
      const classSubs = subjects.filter(
        (s) =>
          (s.className && s.className.trim().toLowerCase() === clsLower) ||
          (!s.className && presets.has(s.name.trim().toLowerCase()))
      );

      if (isHs) {
        const { stream: parsedStream } = parseSectionAndStream(c.section || "");
        const configuredStreams = getConfiguredStreamsForClass(c.className);
        const targetStream =
          parsedStream && parsedStream.toLowerCase() !== "general" && parsedStream.toLowerCase() !== "all"
            ? parsedStream
            : configuredStreams[0] || "Arts";
        const streamSubs = classSubs.filter((s) => {
          const detStream = detectSubjectStream(s.name, s.stream);
          return detStream === "Common" || s.isCommon || detStream.toLowerCase() === targetStream.toLowerCase();
        });
        const distinct = new Set(streamSubs.map((s) => s.name.trim().toLowerCase()));
        map[c.className] = distinct.size > 0 ? distinct.size : 6;
      } else {
        const distinct = new Set(classSubs.map((s) => s.name.trim().toLowerCase()));
        const dbPresets = getDatabaseSubjectsForClass(c.className);
        map[c.className] = distinct.size > 0 ? distinct.size : (dbPresets.length || 8);
      }
    });
    return map;
  }, [classes, subjects]);

  // Total demand across all sections, group slots and extra option periods included
  const totalSchoolDemand = useMemo(
    () => calculateTotalSchoolSectionDemand(classes, subjects, groups),
    [classes, subjects, groups]
  );

  // Staff members not yet added as routine faculty
  const unaddedStaff = useMemo(() => {
    const existingNames = new Set(teachers.map((t) => t.name.trim().toLowerCase()));
    const existingIds = new Set(teachers.map((t) => t.id));
    return staffList.filter(
      (s) => !existingIds.has(s.id) && !existingNames.has(s.full_name.trim().toLowerCase())
    );
  }, [staffList, teachers]);

  // Staff members available for selection in the form (unadded staff + currently editing teacher)
  const selectableStaffList = useMemo(() => {
    return staffList.filter((s) => {
      const isCurrentEditing =
        editingTeacherId &&
        (s.id === editingTeacherId ||
          teachers.find((t) => t.id === editingTeacherId)?.name.trim().toLowerCase() ===
            s.full_name.trim().toLowerCase());
      if (isCurrentEditing) return true;

      const isAlreadyInRoutine = teachers.some(
        (t) => t.id === s.id || t.name.trim().toLowerCase() === s.full_name.trim().toLowerCase()
      );
      return !isAlreadyInRoutine;
    });
  }, [staffList, teachers, editingTeacherId]);


  return {
    activeSectionTab,
    availSlots,
    availableClassOptions,
    availableSubjectOptions,
    classPeriodsMap,
    classSectionsMap,
    classSubjectsDictionary,
    classSubjectsMap,
    classTeacherFirstPeriods,
    classTeacherOf,
    classTotalSubjectsMap,
    classes,
    customPrimarySubject,
    distinctCurriculumSubjects,
    editingTeacherId,
    getClassSections,
    getSubjectDefaultPeriod,
    groupMemberIdsByClass,
    groupMemberNamesByClass,
    groupPicks,
    groups,
    groupsForClass,
    isEditorOpen,
    isSubmitting,
    maxPeriods,
    onDeleteTeacher,
    onSaveGroup,
    onSaveTeacher,
    originalClassTeacherOf,
    presetClasses,
    primarySubject,
    sectionPeriodsMap,
    sectionSubjectsMap,
    selectableStaffList,
    selectedClasses,
    selectedStaffId,
    setActiveSectionTab,
    setAvailSlots,
    setClassPeriodsMap,
    setClassSectionsMap,
    setClassSubjectsMap,
    setClassTeacherFirstPeriods,
    setClassTeacherOf,
    setCustomPrimarySubject,
    setEditingTeacherId,
    setGroupPicks,
    setIsEditorOpen,
    setIsSubmitting,
    setMaxPeriods,
    setOriginalClassTeacherOf,
    setPresetClasses,
    setPrimarySubject,
    setSectionPeriodsMap,
    setSectionSubjectsMap,
    setSelectedClasses,
    setSelectedStaffId,
    setShortName,
    setStaffList,
    setSubjectPeriodsMap,
    setTeacherName,
    settings,
    shortName,
    staffList,
    subjectPeriodsMap,
    subjects,
    teacherLoadMap,
    teacherName,
    teachers,
    totalAllottedLoad,
    totalAssignedSubjects,
    totalSchoolDemand,
    totalSchoolSubjects,
    unaddedStaff,
    unassignedSubjects,
  };
}

export type TeachersCoreState = ReturnType<typeof useTeachersCore>;
