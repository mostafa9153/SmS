"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  RoutineTeacher,
  RoutineAssignment,
  RoutineSettings,
  RoutineClass,
  RoutineSubject,
} from "@/lib/routine/types";
import { Button } from "@/components/ui/button";
import {
  Plus,
  Users,
  GraduationCap,
  CloudUpload,
  RefreshCw,
  Save,
  Check,
} from "lucide-react";
import { showToast } from "@/components/ui/toast-banner";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { batchSaveTeachersAvailabilityDb } from "@/lib/supabase/db-routine";
import {
  getDynamicClassList,
  FALLBACK_CLASSES,
  getClassNumericRank,
  getDatabaseSubjectsForClass,
} from "@/lib/ems/ems-config-loader";
import {
  generateInitials,
  isHsClass,
  parseSectionAndStream,
  detectSubjectStream,
  getConfiguredStreamsForClass,
  getTeacherSubjectPeriod,
  HS_STREAM_PRESETS,
  sanitizeTeacherSubjectPeriods,
} from "@/lib/routine/routine-helpers";
import { createClient } from "@/lib/supabase/client";
import {
  syncRoutineTeacherToClasses,
  parseClassSectionLabel,
  formatClassSectionLabel,
} from "@/lib/routine/routine-sync";
import { TeacherSummaryBadges } from "./teachers/teacher-summary-badges";
import { TeacherTableRow } from "./teachers/teacher-table-row";
import { TeacherEditorForm } from "./teachers/teacher-editor-form";

export interface RoutineTeachersTabProps {
  teachers: RoutineTeacher[];
  assignments: RoutineAssignment[];
  settings: RoutineSettings;
  classes?: RoutineClass[];
  subjects?: RoutineSubject[];
  onSaveTeacher: (teacher: RoutineTeacher) => Promise<void>;
  onDeleteTeacher?: (id: string) => Promise<void>;
}

export function RoutineTeachersTab({
  teachers,
  assignments,
  settings,
  classes = [],
  subjects = [],
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

  // Compute subjects for each class served downstream from Routine Subjects
  const classSubjectsDictionary = useMemo(() => {
    const map: Record<string, string[]> = {};
    presetClasses.forEach((c) => {
      const clsName = c.name;
      const clsLower = clsName.trim().toLowerCase();

      // Synced from Routine Subjects tab (Authoritative source)
      const routineSubs = (subjects || []).filter(
        (s) => !s.className || s.className.trim().toLowerCase() === clsLower
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
  }, [presetClasses, subjects]);

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

  // Helper to compute a teacher's total active workload across all assigned classes, sections, and subjects
  const computeTeacherEffectiveLoad = useCallback(
    (t: RoutineTeacher): number => {
      // 1. Check if explicit assignments exist for this teacher
      const asgLoad = assignments
        .filter((a) => a.teacherId === t.id || a.teacherId === t.name)
        .reduce((sum, a) => sum + (Number(a.periodsPerWeek) || 0), 0);
      if (asgLoad > 0) return asgLoad;

      // 2. Otherwise calculate directly from configured classes, sections, and subjects
      const qClasses = t.qualifiedClasses || Object.keys(t.classSubjects || {});
      if (!qClasses || qClasses.length === 0) return 0;

      let totalLoad = 0;

      qClasses.forEach((clsName) => {
        const hasSecConfig = Object.keys(t.sectionSubjects || {}).some(
          (k) => k.startsWith(`${clsName}::`) || k.startsWith(`${clsName}-`) || k.startsWith(`${clsName}_`)
        );

        const configuredSections =
          t.classSections?.[clsName] !== undefined
            ? t.classSections[clsName]
            : hasSecConfig
            ? Array.from(
                new Set(
                  Object.keys(t.sectionSubjects || {})
                    .filter(
                      (k) =>
                        (k.startsWith(`${clsName}::`) || k.startsWith(`${clsName}-`) || k.startsWith(`${clsName}_`)) &&
                        (t.sectionSubjects?.[k] || []).length > 0
                    )
                    .map((k) => {
                      const parts = k.includes("::") ? k.split("::") : k.includes("-") ? k.split("-") : k.split("_");
                      return parts[1]?.trim() || "";
                    })
                    .filter(Boolean)
                )
              )
            : [getClassSections(clsName)[0] || "A"];

        configuredSections.forEach((sec) => {
          const secKey = `${clsName}::${sec}`;
          const altSecKey1 = `${clsName}-${sec}`;
          const altSecKey2 = `${clsName}_${sec}`;

          const directSecPeriod =
            t.sectionPeriods?.[secKey] ??
            t.sectionPeriods?.[altSecKey1] ??
            t.sectionPeriods?.[altSecKey2];

          // Subjects for this section - strictly isolate if section config exists
          let secSubs: string[] = [];
          if (hasSecConfig) {
            secSubs =
              t.sectionSubjects?.[secKey] ??
              t.sectionSubjects?.[altSecKey1] ??
              t.sectionSubjects?.[altSecKey2] ??
              [];
          } else {
            secSubs = t.classSubjects?.[clsName] ?? [];
          }

          if (secSubs.length > 0) {
            secSubs.forEach((sub) => {
              const p = getTeacherSubjectPeriod(
                t,
                clsName,
                sec,
                sub,
                getSubjectDefaultPeriod(clsName, sub)
              );
              totalLoad += Number(p) || 0;
            });
          } else if (directSecPeriod && directSecPeriod > 0) {
            totalLoad += Number(directSecPeriod);
          } else if (t.classPeriods?.[clsName] && t.classPeriods[clsName] > 0) {
            totalLoad += Number(t.classPeriods[clsName]);
          }
        });
      });

      return totalLoad;
    },
    [assignments, getClassSections, getSubjectDefaultPeriod]
  );

  // Compute workload per teacher
  const teacherLoadMap: Record<string, number> = useMemo(() => {
    const map: Record<string, number> = {};
    teachers.forEach((t) => {
      map[t.id] = computeTeacherEffectiveLoad(t);
    });
    return map;
  }, [teachers, computeTeacherEffectiveLoad]);

  // Aggregate teacher load stats
  const totalAllottedLoad = useMemo(() => {
    return Object.values(teacherLoadMap).reduce((sum, val) => sum + val, 0);
  }, [teacherLoadMap]);

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
  const totalAssignedSubjects = useMemo(() => {
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
      if (t.primarySubject && t.primarySubject.trim()) {
        const canonical = t.primarySubject.trim().toLowerCase().replace(/\s*\([^)]*\)/g, "").replace(/\s+/g, " ").trim();
        assignedSet.add(canonical);
      }
    });
    assignments.forEach((a) => {
      const sub = subjects.find((s) => s.id === a.subjectId);
      if (sub && sub.name) {
        const canonical = sub.name.trim().toLowerCase().replace(/\s*\([^)]*\)/g, "").replace(/\s+/g, " ").trim();
        assignedSet.add(canonical);
      }
    });
    return distinctCurriculumSubjects.filter((s) => assignedSet.has(s)).length;
  }, [teachers, assignments, subjects, distinctCurriculumSubjects]);

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

  // Total required subject periods across all sections of all classes in the school
  const totalSchoolSubjectPeriods = useMemo(() => {
    let totalPeriods = 0;
    const sourceClasses = classes.length > 0 ? classes : [];

    // If classes array is empty, fall back to presetClasses with their default sections
    if (sourceClasses.length === 0) {
      const pClasses = presetClasses.length > 0 ? presetClasses : FALLBACK_CLASSES;
      pClasses.forEach((pc) => {
        const secs = pc.sections && pc.sections.length > 0 ? pc.sections : ["A", "B"];
        const presets = getDatabaseSubjectsForClass(pc.name);
        const clsLower = pc.name.trim().toLowerCase();
        const classSubs = subjects.filter(
          (s) => s.className && s.className.trim().toLowerCase() === clsLower
        );

        let classPeriodSum = 0;
        if (classSubs.length > 0) {
          const seen = new Set<string>();
          classSubs.forEach((s) => {
            const canonical = s.name.trim().toLowerCase().replace(/\s*\([^)]*\)/g, "").replace(/\s+/g, " ").trim();
            if (!seen.has(canonical)) {
              seen.add(canonical);
              classPeriodSum += s.periodsPerWeek && s.periodsPerWeek > 0 ? s.periodsPerWeek : (s.isLab ? 2 : 5);
            }
          });
        } else {
          classPeriodSum = presets.length * 5;
        }
        totalPeriods += classPeriodSum * secs.length;
      });
      return totalPeriods;
    }

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

        const seen = new Set<string>();
        streamSubs.forEach((s) => {
          const canonical = s.name.trim().toLowerCase().replace(/\s*\([^)]*\)/g, "").replace(/\s+/g, " ").trim();
          if (!seen.has(canonical)) {
            seen.add(canonical);
            totalPeriods += s.periodsPerWeek && s.periodsPerWeek > 0 ? s.periodsPerWeek : 5;
          }
        });
      } else {
        const seen = new Set<string>();
        if (classSubs.length > 0) {
          classSubs.forEach((s) => {
            const canonical = s.name.trim().toLowerCase().replace(/\s*\([^)]*\)/g, "").replace(/\s+/g, " ").trim();
            if (!seen.has(canonical)) {
              seen.add(canonical);
              totalPeriods += s.periodsPerWeek && s.periodsPerWeek > 0 ? s.periodsPerWeek : (s.isLab ? 2 : 5);
            }
          });
        } else {
          const dbPresets = getDatabaseSubjectsForClass(c.className);
          totalPeriods += dbPresets.length * 5;
        }
      }
    });

    return totalPeriods;
  }, [classes, subjects, presetClasses]);

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

  // Open Editor for Creating New Teacher (Auto-populates from unadded school staff)
  const handleOpenAdd = () => {
    const defaultStaff = unaddedStaff[0] || null;
    const initialName = defaultStaff ? defaultStaff.full_name : "";
    const initialId = defaultStaff ? defaultStaff.id : null;
    const initialShort = initialName ? generateInitials(initialName) : "";

    setSelectedStaffId(defaultStaff ? defaultStaff.id : "__custom__");
    setEditingTeacherId(initialId);
    setTeacherName(initialName);
    setShortName(initialShort);

    // Try auto-detecting primary subject from designation
    const desig = defaultStaff?.designation || "";
    const matchedSubject = availableSubjectOptions.find((s) =>
      desig.toLowerCase().includes(s.toLowerCase())
    );
    setPrimarySubject(matchedSubject || "");
    setCustomPrimarySubject("");
    setClassTeacherOf("__none__");
    setOriginalClassTeacherOf(null);
    setClassTeacherFirstPeriods(3);

    setMaxPeriods(24);
    setSelectedClasses([]);
    setClassSubjectsMap({});
    setSectionSubjectsMap({});
    setClassSectionsMap({});
    setClassPeriodsMap({});
    setSectionPeriodsMap({});
    setSubjectPeriodsMap({});
    setActiveSectionTab({});

    const defaultSlots: Record<number, number[]> = {};
    settings.workingDays.forEach((d) => {
      defaultSlots[d] = [];
      for (let p = 1; p <= settings.periodsPerDay; p++) defaultSlots[d].push(p);
    });
    setAvailSlots(defaultSlots);
    setIsEditorOpen(true);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("tab", "teachers");
      url.searchParams.set("newTeacher", "1");
      url.searchParams.delete("teacherId");
      window.history.replaceState(null, "", url.toString());
    }
  };

  const handleCancel = useCallback(() => {
    setIsEditorOpen(false);
    setEditingTeacherId(null);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.delete("teacherId");
      url.searchParams.delete("newTeacher");
      window.history.replaceState(null, "", url.toString());
    }
  }, []);

  // Open Editor for Editing Existing Teacher
  const handleEdit = useCallback(
    (t: RoutineTeacher) => {
      if (isEditorOpen && editingTeacherId === t.id) {
        handleCancel();
        return;
      }

      const matchedStaff = staffList.find(
        (s) => s.id === t.id || s.full_name.toLowerCase() === t.name.toLowerCase()
      );

      setSelectedStaffId(matchedStaff ? matchedStaff.id : "__custom__");
      setEditingTeacherId(t.id);
      setTeacherName(t.name);
      setShortName(t.shortName || generateInitials(t.name));

      const subj = t.primarySubject || "";
      const isStandardSubj = availableSubjectOptions.includes(subj);
      if (subj && !isStandardSubj) {
        setPrimarySubject("__custom__");
        setCustomPrimarySubject(subj);
      } else {
        setPrimarySubject(subj);
        setCustomPrimarySubject("");
      }

      setClassTeacherOf(t.classTeacherOf || "__none__");
      setOriginalClassTeacherOf(t.classTeacherOf || null);
      setClassTeacherFirstPeriods(t.classTeacherFirstPeriods ?? 3);
      setMaxPeriods(t.maxPeriods || 24);

      // Load qualified classes, subjects, sections, and periods
      const sanitized = sanitizeTeacherSubjectPeriods(t);
      const qClasses = sanitized.qualifiedClasses || Object.keys(sanitized.classSubjects || {});
      setSelectedClasses(qClasses);
      setClassSubjectsMap(sanitized.classSubjects || {});
      setSectionSubjectsMap(sanitized.sectionSubjects || {});

      // Build robust classSectionsMap, reconstructing from sectionSubjects if classSections was not previously persisted
      const initialSectionsMap: Record<string, string[]> = { ...(sanitized.classSections || {}) };
      qClasses.forEach((cls) => {
        if (!initialSectionsMap[cls] || initialSectionsMap[cls].length === 0) {
          const secSubsKeys = Object.keys(sanitized.sectionSubjects || {}).filter(
            (k) => k.startsWith(`${cls}::`) || k.startsWith(`${cls}-`) || k.startsWith(`${cls}_`)
          );
          if (secSubsKeys.length > 0) {
            const extractedSecs = new Set<string>();
            secSubsKeys.forEach((k) => {
              const parts = k.includes("::") ? k.split("::") : k.includes("-") ? k.split("-") : k.split("_");
              if (parts[1]) extractedSecs.add(parts[1].trim());
            });
            initialSectionsMap[cls] = Array.from(extractedSecs);
          } else {
            const allSecs = getClassSections(cls);
            initialSectionsMap[cls] = [allSecs[0] || "A"];
          }
        }
      });
      setClassSectionsMap(initialSectionsMap);
      setClassPeriodsMap(sanitized.classPeriods || {});
      setSectionPeriodsMap(sanitized.sectionPeriods || {});
      setSubjectPeriodsMap(sanitized.subjectPeriods || {});
      setActiveSectionTab({});

      // Deep copy available slots
      const slots: Record<number, number[]> = {};
      settings.workingDays.forEach((d) => {
        const raw = t.availableSlots?.[d] ?? (t.availableSlots as any)?.[String(d)];
        if (Array.isArray(raw)) {
          slots[d] = [...raw];
        } else {
          slots[d] = [];
          for (let p = 1; p <= settings.periodsPerDay; p++) slots[d].push(p);
        }
      });
      setAvailSlots(slots);
      setIsEditorOpen(true);
      if (typeof window !== "undefined") {
        const url = new URL(window.location.href);
        url.searchParams.set("tab", "teachers");
        url.searchParams.set("teacherId", t.id);
        url.searchParams.delete("newTeacher");
        window.history.replaceState(null, "", url.toString());
      }
    },
    [isEditorOpen, editingTeacherId, handleCancel, staffList, availableSubjectOptions, settings, getClassSections]
  );

  // Auto-restore teacher editor once on initial mount if URL contains teacherId or newTeacher flag
  const hasRestoredEditorRef = useRef(false);
  useEffect(() => {
    if (hasRestoredEditorRef.current) return;
    if (typeof window !== "undefined" && teachers.length > 0 && !isEditorOpen) {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get("tab") === "teachers") {
        const tId = urlParams.get("teacherId");
        if (tId) {
          const target = teachers.find((t) => t.id === tId);
          if (target) {
            hasRestoredEditorRef.current = true;
            handleEdit(target);
            return;
          }
        }
        if (urlParams.get("newTeacher") === "1") {
          hasRestoredEditorRef.current = true;
          handleOpenAdd();
        }
      }
    }
  }, [teachers, isEditorOpen, handleEdit]);

  // Handle Staff Dropdown Change in Form
  const handleStaffDropdownChange = (staffId: string) => {
    setSelectedStaffId(staffId);
    if (staffId === "__custom__") {
      setEditingTeacherId(null);
      setTeacherName("");
      setShortName("");
      setPrimarySubject("");
      setCustomPrimarySubject("");
      setClassTeacherOf("__none__");
    } else {
      const staff = staffList.find((s) => s.id === staffId);
      if (staff) {
        setEditingTeacherId(staff.id);
        setTeacherName(staff.full_name);
        setShortName(generateInitials(staff.full_name));

        const desig = staff.designation || "";
        const matchedSubject = availableSubjectOptions.find((s) =>
          desig.toLowerCase().includes(s.toLowerCase())
        );
        if (matchedSubject) {
          setPrimarySubject(matchedSubject);
        }
      }
    }
  };

  // Handle Custom Name typing
  const handleCustomNameChange = (name: string) => {
    setTeacherName(name);
    setShortName(generateInitials(name));
  };

  // Toggle class selection for this teacher
  const toggleClass = (clsName: string) => {
    const isSelected = selectedClasses.includes(clsName);
    if (isSelected) {
      setSelectedClasses((prev) => prev.filter((c) => c !== clsName));
      setClassSubjectsMap((prev) => {
        const next = { ...prev };
        delete next[clsName];
        return next;
      });
      setClassSectionsMap((prev) => {
        const next = { ...prev };
        delete next[clsName];
        return next;
      });
      setClassPeriodsMap((prev) => {
        const next = { ...prev };
        delete next[clsName];
        return next;
      });
      setSectionPeriodsMap((prev) => {
        const next = { ...prev };
        Object.keys(next).forEach((k) => {
          if (k.startsWith(`${clsName}::`) || k.startsWith(`${clsName}-`) || k.startsWith(`${clsName}_`)) {
            delete next[k];
          }
        });
        return next;
      });
      setSectionSubjectsMap((prev) => {
        const next = { ...prev };
        Object.keys(next).forEach((k) => {
          if (k.startsWith(`${clsName}::`) || k.startsWith(`${clsName}-`)) {
            delete next[k];
          }
        });
        return next;
      });
      setSubjectPeriodsMap((prev) => {
        const next = { ...prev };
        Object.keys(next).forEach((k) => {
          if (k.startsWith(`${clsName}::`)) {
            delete next[k];
          }
        });
        return next;
      });
    } else {
      setSelectedClasses((prev) => [...prev, clsName]);
      const defaultSubs = classSubjectsDictionary[clsName] || [];
      const initialSubs =
        primarySubject && primarySubject !== "__custom__" && defaultSubs.includes(primarySubject)
          ? [primarySubject]
          : [...defaultSubs];

      setClassSubjectsMap((prev) => ({
        ...prev,
        [clsName]: initialSubs,
      }));

      // Initialize ONLY the first section so Section B does NOT get pre-assigned unless "ALL" is chosen
      const defaultSecs = getClassSections(clsName);
      const firstSec = defaultSecs[0] || "A";

      setActiveSectionTab((prev) => ({
        ...prev,
        [clsName]: firstSec,
      }));

      setClassSectionsMap((prev) => ({
        ...prev,
        [clsName]: [firstSec],
      }));

      // Initialize ONLY the first section's subjects with initialSubs
      setSectionSubjectsMap((prev) => ({
        ...prev,
        [`${clsName}::${firstSec}`]: [...initialSubs],
      }));

      // Initialize default periods for the first section only
      setSubjectPeriodsMap((prev) => {
        const next = { ...prev };
        initialSubs.forEach((sub) => {
          next[`${clsName}::${firstSec}::${sub}`] = getSubjectDefaultPeriod(clsName, sub);
        });
        return next;
      });
    }
  };

  const handleSelectSection = (
    clsName: string,
    sec: string,
    action?: "select" | "deselect" | "toggle"
  ) => {
    const allSecs = getClassSections(clsName);
    if (sec === "ALL") {
      setClassSectionsMap((prev) => ({ ...prev, [clsName]: [...allSecs] }));
      return;
    }

    let isDeselecting = false;
    setClassSectionsMap((prev) => {
      const current = prev[clsName] ?? [allSecs[0] || "A"];
      const isSelected = current.includes(sec);
      let nextSecs: string[];

      if (action === "select") {
        nextSecs = isSelected ? current : [...current, sec];
      } else if (action === "deselect") {
        nextSecs = current.filter((s) => s !== sec);
        isDeselecting = true;
      } else {
        // Default toggle
        if (isSelected) {
          nextSecs = current.filter((s) => s !== sec);
          isDeselecting = true;
        } else {
          nextSecs = [...current, sec];
        }
      }

      return {
        ...prev,
        [clsName]: nextSecs,
      };
    });

    if (isDeselecting) {
      // Clean up section subjects and subject periods for the deselected section
      setSectionSubjectsMap((prev) => {
        const next = { ...prev };
        delete next[`${clsName}::${sec}`];
        delete next[`${clsName}-${sec}`];
        delete next[`${clsName}_${sec}`];
        return next;
      });
      setSubjectPeriodsMap((prev) => {
        const next = { ...prev };
        Object.keys(next).forEach((k) => {
          if (
            k.startsWith(`${clsName}::${sec}::`) ||
            k.startsWith(`${clsName}-${sec}-`) ||
            k.startsWith(`${clsName}_${sec}_`) ||
            k.startsWith(`${clsName}-${sec}::`) ||
            k.startsWith(`${clsName}_${sec}::`)
          ) {
            delete next[k];
          }
        });
        return next;
      });
    }
  };

  // Helper to get active subjects for a specific section (or ALL)
  const getSectionSubjects = useCallback(
    (clsName: string, sec: string): string[] => {
      if (sec === "ALL") {
        const allSecs = getClassSections(clsName);
        const selectedSecs = classSectionsMap[clsName] ?? [allSecs[0] || "A"];
        if (selectedSecs.length === 0) return [];
        const union = new Set<string>();
        selectedSecs.forEach((s) => {
          const direct =
            sectionSubjectsMap[`${clsName}::${s}`] ??
            sectionSubjectsMap[`${clsName}-${s}`] ??
            sectionSubjectsMap[`${clsName}_${s}`];
          if (direct !== undefined) {
            direct.forEach((sub) => union.add(sub));
          }
        });
        return Array.from(union);
      }
      const secKey = `${clsName}::${sec}`;
      const direct =
        sectionSubjectsMap[secKey] ??
        sectionSubjectsMap[`${clsName}-${sec}`] ??
        sectionSubjectsMap[`${clsName}_${sec}`];
      if (direct !== undefined) {
        return direct;
      }
      const hasAnySecConfig = Object.keys(sectionSubjectsMap).some(
        (k) => k.startsWith(`${clsName}::`) || k.startsWith(`${clsName}-`) || k.startsWith(`${clsName}_`)
      );
      if (hasAnySecConfig) {
        return [];
      }

      const allowedSecs = classSectionsMap[clsName];
      if (allowedSecs !== undefined && !allowedSecs.includes(sec)) {
        return [];
      }

      return classSubjectsMap[clsName] || [];
    },
    [sectionSubjectsMap, classSubjectsMap, classSectionsMap, getClassSections]
  );

  // Helper to get specific period count for a subject in a section (or ALL)
  const getSubjectPeriod = useCallback(
    (clsName: string, sec: string, subName: string): number => {
      if (sec === "ALL") {
        const allSecs = getClassSections(clsName);
        const selectedSecs = classSectionsMap[clsName] ?? [allSecs[0] || "A"];
        const targetSec = selectedSecs[0] || "A";
        const secKey = `${clsName}::${targetSec}::${subName}`;
        if (subjectPeriodsMap[secKey] !== undefined && subjectPeriodsMap[secKey] > 0) {
          return subjectPeriodsMap[secKey];
        }
        const clsKey = `${clsName}::${subName}`;
        if (subjectPeriodsMap[clsKey] !== undefined && subjectPeriodsMap[clsKey] > 0) {
          return subjectPeriodsMap[clsKey];
        }
        return getSubjectDefaultPeriod(clsName, subName);
      }

      const p =
        subjectPeriodsMap[`${clsName}::${sec}::${subName}`] ??
        subjectPeriodsMap[`${clsName}-${sec}-${subName}`] ??
        subjectPeriodsMap[`${clsName}_${sec}_${subName}`] ??
        subjectPeriodsMap[`${clsName}-${sec}::${subName}`] ??
        subjectPeriodsMap[`${clsName}_${sec}::${subName}`];

      if (p !== undefined && p > 0) {
        return p;
      }

      const clsP =
        subjectPeriodsMap[`${clsName}::${subName}`] ??
        subjectPeriodsMap[`${clsName}-${subName}`] ??
        subjectPeriodsMap[`${clsName}_${subName}`];

      if (clsP !== undefined && clsP > 0) {
        return clsP;
      }

      return getSubjectDefaultPeriod(clsName, subName);
    },
    [subjectPeriodsMap, getSubjectDefaultPeriod, classSectionsMap, getClassSections]
  );

  // Helper to compute live allocation breakdown across other teachers for a given class, section, and subject
  const getSubjectAllocationStats = useCallback(
    (clsName: string, sec: string, subName: string) => {
      const isTheory = subName.includes("(Theory)");
      const isLabVariant = subName.includes("(Lab)") || subName.includes("(Practical)");
      const cleanSubName = subName.replace(/\s*\((Theory|Lab|Practical)\)/i, "").trim().toLowerCase();

      // 1. Total weekly demand from configured subjects (or fallback default 5)
      const matchedSubject = (subjects || []).find(
        (s) =>
          (s.name.trim().toLowerCase() === cleanSubName || s.name.trim().toLowerCase() === subName.trim().toLowerCase()) &&
          (!s.className || s.className.trim().toLowerCase() === clsName.trim().toLowerCase())
      );

      let totalDemand = 5;
      if (matchedSubject) {
        if (isTheory) {
          totalDemand =
            matchedSubject.theoryPeriods && matchedSubject.theoryPeriods > 0
              ? matchedSubject.theoryPeriods
              : matchedSubject.periodsPerWeek
              ? Math.max(1, matchedSubject.periodsPerWeek - (matchedSubject.labPeriods || 2))
              : 4;
        } else if (isLabVariant) {
          totalDemand =
            matchedSubject.labPeriods && matchedSubject.labPeriods > 0
              ? matchedSubject.labPeriods
              : matchedSubject.periodsPerWeek && matchedSubject.isLab
              ? matchedSubject.periodsPerWeek
              : 2;
        } else {
          totalDemand =
            matchedSubject.periodsPerWeek && matchedSubject.periodsPerWeek > 0
              ? matchedSubject.periodsPerWeek
              : 5;
        }
      }

      // 2. Sections to check (if sec === "ALL", inspect all configured sections)
      const allSecs = getClassSections(clsName);
      const targetSecs = sec === "ALL" ? (classSectionsMap[clsName] ?? [allSecs[0] || "A"]) : [sec];

      // 3. Find other teachers who have this subject assigned in these sections
      const otherTeacherLoads: { teacherName: string; shortName: string; periods: number }[] = [];
      let totalOtherAssigned = 0;

      teachers
        .filter(
          (t) =>
            t.id !== editingTeacherId &&
            t.name.trim().toLowerCase() !== teacherName.trim().toLowerCase()
        )
        .forEach((t) => {
          let tPeriodsForSec = 0;
          targetSecs.forEach((s) => {
            const allowedSecs = t.classSections?.[clsName];
            if (allowedSecs !== undefined && Array.isArray(allowedSecs)) {
              const isAllowed = allowedSecs.some(
                (sec) => sec.trim().toLowerCase() === "all" || sec.trim().toLowerCase() === s.toLowerCase()
              );
              if (!isAllowed) {
                return;
              }
            }

            const secKey = `${clsName}::${s}`;
            const altSecKey = `${clsName}-${s}`;
            const altSecKey2 = `${clsName}_${s}`;

            const hasSecConfig = Object.keys(t.sectionSubjects || {}).some(
              (k) =>
                k.startsWith(`${clsName}::`) ||
                k.startsWith(`${clsName}-`) ||
                k.startsWith(`${clsName}_`)
            );

            const hasSecSub =
              (t.sectionSubjects?.[secKey] && t.sectionSubjects[secKey].includes(subName)) ||
              (t.sectionSubjects?.[altSecKey] && t.sectionSubjects[altSecKey].includes(subName)) ||
              (t.sectionSubjects?.[altSecKey2] && t.sectionSubjects[altSecKey2].includes(subName));

            const isAssignedToSec =
              hasSecSub ||
              (!hasSecConfig &&
                allowedSecs === undefined &&
                t.qualifiedClasses?.includes(clsName) &&
                t.classSubjects?.[clsName]?.includes(subName));

            if (isAssignedToSec) {
              const specificPeriod =
                t.subjectPeriods?.[`${clsName}::${s}::${subName}`] ??
                t.subjectPeriods?.[`${clsName}-${s}-${subName}`] ??
                t.subjectPeriods?.[`${clsName}_${s}_${subName}`] ??
                t.subjectPeriods?.[`${clsName}-${s}::${subName}`] ??
                t.subjectPeriods?.[`${clsName}_${s}::${subName}`] ??
                t.subjectPeriods?.[`${clsName}::${subName}`] ??
                t.subjectPeriods?.[`${clsName}-${subName}`] ??
                t.subjectPeriods?.[`${clsName}_${subName}`] ??
                getSubjectDefaultPeriod(clsName, subName);
              tPeriodsForSec += Number(specificPeriod) || getSubjectDefaultPeriod(clsName, subName);
            }
          });

          const avgPeriods =
            targetSecs.length > 0 ? Math.round(tPeriodsForSec / targetSecs.length) : tPeriodsForSec;

          if (avgPeriods > 0) {
            totalOtherAssigned += avgPeriods;
            otherTeacherLoads.push({
              teacherName: t.name,
              shortName: t.shortName || generateInitials(t.name),
              periods: avgPeriods,
            });
          }
        });

      const remaining = Math.max(0, totalDemand - totalOtherAssigned);
      const isFullyBooked = totalOtherAssigned >= totalDemand;

      return {
        totalDemand,
        otherAssigned: totalOtherAssigned,
        remaining,
        isFullyBooked,
        otherTeachers: otherTeacherLoads,
      };
    },
    [
      subjects,
      getClassSections,
      classSectionsMap,
      teachers,
      editingTeacherId,
      teacherName,
      getSubjectDefaultPeriod,
    ]
  );

  // Calculate total weekly periods for a section automatically from its active subjects
  const calculateSectionTotalPeriods = useCallback(
    (clsName: string, sec: string): number => {
      const secSubs = getSectionSubjects(clsName, sec);
      return secSubs.reduce((sum, sub) => sum + getSubjectPeriod(clsName, sec, sub), 0);
    },
    [getSectionSubjects, getSubjectPeriod]
  );

  // Handle subject period count change (for single sec or ALL)
  const handleSubjectPeriodChange = (clsName: string, sec: string, subName: string, val: string) => {
    const num = val.trim() === "" ? 0 : parseInt(val, 10);
    const allSecs = getClassSections(clsName);
    const selectedSecs = classSectionsMap[clsName] ?? [allSecs[0] || "A"];

    setSubjectPeriodsMap((prev) => {
      const next = { ...prev };
      if (sec === "ALL") {
        selectedSecs.forEach((s) => {
          const k = `${clsName}::${s}::${subName}`;
          if (!num || num <= 0) {
            delete next[k];
          } else {
            next[k] = num;
          }
        });
        const clsK = `${clsName}::${subName}`;
        if (!num || num <= 0) {
          delete next[clsK];
        } else {
          next[clsK] = num;
        }
      } else {
        const secKey = `${clsName}::${sec}::${subName}`;
        if (!num || num <= 0) {
          delete next[secKey];
        } else {
          next[secKey] = num;
        }
      }
      return next;
    });
  };

  // Toggle subject for a specific section (or ALL)
  const toggleSubjectForSection = (clsName: string, sec: string, subName: string) => {
    const allSecs = getClassSections(clsName);
    const selectedSecs = classSectionsMap[clsName] ?? [allSecs[0] || "A"];

    if (sec === "ALL") {
      const currentUnion = getSectionSubjects(clsName, "ALL");
      const exists = currentUnion.includes(subName);

      setSectionSubjectsMap((prev) => {
        const next = { ...prev };
        selectedSecs.forEach((s) => {
          const current = next[`${clsName}::${s}`] || [];
          next[`${clsName}::${s}`] = exists
            ? current.filter((sub) => sub !== subName)
            : Array.from(new Set([...current, subName]));
        });
        return next;
      });

      setClassSubjectsMap((prev) => ({
        ...prev,
        [clsName]: exists
          ? (prev[clsName] || []).filter((sub) => sub !== subName)
          : Array.from(new Set([...(prev[clsName] || []), subName])),
      }));

      // When unchecking in ALL, clean up matching keys in subjectPeriodsMap
      if (exists) {
        setSubjectPeriodsMap((prev) => {
          const next = { ...prev };
          selectedSecs.forEach((s) => {
            delete next[`${clsName}::${s}::${subName}`];
            delete next[`${clsName}-${s}-${subName}`];
            delete next[`${clsName}_${s}_${subName}`];
            delete next[`${clsName}-${s}::${subName}`];
            delete next[`${clsName}_${s}::${subName}`];
          });
          delete next[`${clsName}::${subName}`];
          delete next[`${clsName}-${subName}`];
          delete next[`${clsName}_${subName}`];
          return next;
        });
      } else {
        const stats = getSubjectAllocationStats(clsName, "ALL", subName);
        const autoFillPeriods = stats.remaining > 0 ? stats.remaining : stats.totalDemand;
        handleSubjectPeriodChange(clsName, "ALL", subName, String(autoFillPeriods));
      }
      return;
    }

    const secKey = `${clsName}::${sec}`;
    const current = getSectionSubjects(clsName, sec);
    const exists = current.includes(subName);
    const updated = exists ? current.filter((s) => s !== subName) : [...current, subName];

    setSectionSubjectsMap((prev) => ({
      ...prev,
      [secKey]: updated,
    }));

    if (exists) {
      // Clean up matching keys from subjectPeriodsMap
      setSubjectPeriodsMap((prev) => {
        const next = { ...prev };
        delete next[`${clsName}::${sec}::${subName}`];
        delete next[`${clsName}-${sec}-${subName}`];
        delete next[`${clsName}_${sec}_${subName}`];
        delete next[`${clsName}-${sec}::${subName}`];
        delete next[`${clsName}_${sec}::${subName}`];
        return next;
      });
    } else {
      const stats = getSubjectAllocationStats(clsName, sec, subName);
      const autoFillPeriods = stats.remaining > 0 ? stats.remaining : stats.totalDemand;
      handleSubjectPeriodChange(clsName, sec, subName, String(autoFillPeriods));
    }

    // Maintain class-level union
    setClassSubjectsMap((prev) => {
      const allUnion = new Set<string>();
      allSecs.forEach((s) => {
        const subs = s === sec ? updated : getSectionSubjects(clsName, s);
        subs.forEach((sub) => allUnion.add(sub));
      });
      return {
        ...prev,
        [clsName]: Array.from(allUnion),
      };
    });
  };

  // Toggle all subjects for a specific section (or ALL)
  const toggleAllSubjectsForSection = (clsName: string, sec: string) => {
    const allSubs = classSubjectsDictionary[clsName] || [];
    const allSecs = getClassSections(clsName);
    const selectedSecs = classSectionsMap[clsName] ?? [allSecs[0] || "A"];

    if (sec === "ALL") {
      const currentUnion = getSectionSubjects(clsName, "ALL");
      const allSelected = allSubs.length > 0 && currentUnion.length === allSubs.length;
      const nextSubs = allSelected ? [] : [...allSubs];

      setSectionSubjectsMap((prev) => {
        const next = { ...prev };
        selectedSecs.forEach((s) => {
          next[`${clsName}::${s}`] = [...nextSubs];
        });
        return next;
      });

      setClassSubjectsMap((prev) => ({
        ...prev,
        [clsName]: [...nextSubs],
      }));

      if (allSelected) {
        setSubjectPeriodsMap((prev) => {
          const next = { ...prev };
          selectedSecs.forEach((s) => {
            allSubs.forEach((subName) => {
              delete next[`${clsName}::${s}::${subName}`];
              delete next[`${clsName}-${s}-${subName}`];
              delete next[`${clsName}_${s}_${subName}`];
              delete next[`${clsName}-${s}::${subName}`];
              delete next[`${clsName}_${s}::${subName}`];
            });
          });
          allSubs.forEach((subName) => {
            delete next[`${clsName}::${subName}`];
            delete next[`${clsName}-${subName}`];
            delete next[`${clsName}_${subName}`];
          });
          return next;
        });
      }
      return;
    }

    const current = getSectionSubjects(clsName, sec);
    const allSelected = allSubs.length > 0 && current.length === allSubs.length;
    const next = allSelected ? [] : [...allSubs];

    const secKey = `${clsName}::${sec}`;
    setSectionSubjectsMap((prev) => ({
      ...prev,
      [secKey]: next,
    }));

    if (allSelected) {
      setSubjectPeriodsMap((prev) => {
        const nextMap = { ...prev };
        allSubs.forEach((subName) => {
          delete nextMap[`${clsName}::${sec}::${subName}`];
          delete nextMap[`${clsName}-${sec}-${subName}`];
          delete nextMap[`${clsName}_${sec}_${subName}`];
          delete nextMap[`${clsName}-${sec}::${subName}`];
          delete nextMap[`${clsName}_${sec}::${subName}`];
        });
        return nextMap;
      });
    }

    setClassSubjectsMap((prev) => {
      const allUnion = new Set<string>();
      allSecs.forEach((s) => {
        const subs = s === sec ? next : getSectionSubjects(clsName, s);
        subs.forEach((sub) => allUnion.add(sub));
      });
      return {
        ...prev,
        [clsName]: Array.from(allUnion),
      };
    });
  };

  // Period Availability toggles
  const togglePeriod = (dayIdx: number, period: number) => {
    const current = availSlots[dayIdx] || [];
    const exists = current.includes(period);
    const updated = exists
      ? current.filter((p) => p !== period)
      : [...current, period].sort((a, b) => a - b);

    setAvailSlots({
      ...availSlots,
      [dayIdx]: updated,
    });
  };

  const setPreset = (dayIdx: number, type: "all" | "morning" | "afternoon" | "none") => {
    if (type === "none") {
      setAvailSlots({ ...availSlots, [dayIdx]: [] });
    } else if (type === "all") {
      const all: number[] = [];
      for (let p = 1; p <= settings.periodsPerDay; p++) all.push(p);
      setAvailSlots({ ...availSlots, [dayIdx]: all });
    } else if (type === "morning") {
      const breakPoint = settings.breaks[0] || Math.floor(settings.periodsPerDay / 2);
      const morning: number[] = [];
      for (let p = 1; p <= breakPoint; p++) morning.push(p);
      setAvailSlots({ ...availSlots, [dayIdx]: morning });
    } else if (type === "afternoon") {
      const breakPoint = settings.breaks[0] || Math.floor(settings.periodsPerDay / 2);
      const afternoon: number[] = [];
      for (let p = breakPoint + 1; p <= settings.periodsPerDay; p++) afternoon.push(p);
      setAvailSlots({ ...availSlots, [dayIdx]: afternoon });
    }
  };

  // Save Teacher
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teacherName.trim()) return;

    setIsSubmitting(true);
    try {
      const teacherId = editingTeacherId || crypto.randomUUID();
      const finalSubject = (primarySubject === "__custom__" ? customPrimarySubject : primarySubject).trim();
      const finalClassTeacher = classTeacherOf && classTeacherOf !== "__none__" ? classTeacherOf.trim() : null;

      const payload: RoutineTeacher = {
        id: teacherId,
        name: teacherName.trim(),
        shortName: shortName.trim() || generateInitials(teacherName.trim()),
        maxPeriods: maxPeriods || 24,
        availableSlots: availSlots,
        qualifiedClasses: selectedClasses,
        classSubjects: classSubjectsMap,
        sectionSubjects: sectionSubjectsMap,
        classSections: classSectionsMap,
        classPeriods: classPeriodsMap,
        sectionPeriods: sectionPeriodsMap,
        subjectPeriods: subjectPeriodsMap,
        primarySubject: finalSubject || null,
        classTeacherOf: finalClassTeacher,
        classTeacherFirstPeriods: finalClassTeacher ? Number(classTeacherFirstPeriods) || 3 : null,
      };

      await onSaveTeacher(payload);
      await syncRoutineTeacherToClasses(teacherName.trim(), finalClassTeacher, originalClassTeacherOf);

      setIsEditorOpen(false);
      setEditingTeacherId(null);
      setOriginalClassTeacherOf(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Teacher
  const handleDelete = useCallback(async (id: string) => {
    if (onDeleteTeacher) {
      const target = teachers.find((t) => t.id === id);
      if (target?.classTeacherOf) {
        await syncRoutineTeacherToClasses(target.name, null, target.classTeacherOf);
      }
      await onDeleteTeacher(id);
    }
  }, [onDeleteTeacher, teachers]);

  // Readable label for the teacher dropdown trigger
  const selectedStaffLabel = useMemo(() => {
    if (selectedStaffId === "__custom__") return "+ Custom Teacher (Manual Name)";
    const staff = staffList.find((s) => s.id === selectedStaffId);
    if (staff) {
      return `${staff.full_name} ${staff.designation ? `(${staff.designation})` : ""}`;
    }
    return teacherName || "Select Teacher";
  }, [selectedStaffId, staffList, teacherName]);

  // Class teacher assignments lookup for display & conflict detection
  const currentClassTeacherMap = useMemo(() => {
    const map: Record<string, { id: string; name: string }> = {};
    teachers.forEach((t) => {
      if (t.classTeacherOf && t.classTeacherOf.trim() && t.classTeacherOf !== "__none__") {
        const info = { id: t.id, name: t.name };
        map[t.classTeacherOf.trim()] = info;
        const parsed = parseClassSectionLabel(t.classTeacherOf);
        if (parsed) {
          map[formatClassSectionLabel(parsed.className, parsed.section)] = info;
          map[`${parsed.className} - ${parsed.section}`] = info;
          map[`${parsed.className}-${parsed.section}`] = info;
        }
      }
    });
    return map;
  }, [teachers]);

  // Detect conflict if selected class is already assigned to another teacher
  const conflictTeacher = useMemo(() => {
    if (!classTeacherOf || classTeacherOf === "__none__") return null;
    const info = currentClassTeacherMap[classTeacherOf.trim()];
    if (!info) return null;
    if (editingTeacherId && info.id === editingTeacherId) return null;
    if (teacherName && info.name.trim().toLowerCase() === teacherName.trim().toLowerCase()) return null;
    return info;
  }, [classTeacherOf, currentClassTeacherMap, editingTeacherId, teacherName]);

  // Batch Save all teachers to Cloud
  const [isSavingAll, setIsSavingAll] = useState(false);
  const [isSavedRecently, setIsSavedRecently] = useState(false);
  const handleSaveAllToCloud = async () => {
    setIsSavingAll(true);
    try {
      const ok = await batchSaveTeachersAvailabilityDb(teachers);
      if (ok) {
        setIsSavedRecently(true);
        setTimeout(() => setIsSavedRecently(false), 2500);
        showToast("Faculty configuration saved successfully!", "success");
        if (typeof window !== "undefined") {
          window.dispatchEvent(new Event("sms_routine_state_updated"));
        }
      } else {
        showToast("Failed to save faculty to cloud", "error");
      }
    } catch {
      showToast("Error saving faculty to cloud", "error");
    } finally {
      setIsSavingAll(false);
    }
  };

  return (
    <div className="space-y-4 w-full">
      {/* Top Header Card: Add Teacher Button & Save to Cloud */}
      <div className="bg-card border rounded-lg p-3.5 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <GraduationCap className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-semibold tracking-tight text-foreground">
            Faculty Class & Subject Configuration
          </h2>
        </div>

        <div className="flex items-center gap-2">
          {!isEditorOpen && (
            <>
              <Button
                type="button"
                size="sm"
                disabled={isSavingAll || teachers.length === 0}
                onClick={handleSaveAllToCloud}
                className={cn(
                  "h-8 text-xs font-semibold gap-1.5 px-3 transition-all duration-150 shadow-xs cursor-pointer",
                  isSavedRecently
                    ? "bg-emerald-600 hover:bg-emerald-600 text-white"
                    : "bg-primary hover:bg-primary/90 text-primary-foreground"
                )}
              >
                {isSavingAll ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : isSavedRecently ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Saved</span>
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    <span>Save</span>
                  </>
                )}
              </Button>

              <Button
                type="button"
                size="sm"
                onClick={handleOpenAdd}
                className="h-8 text-xs font-semibold gap-1.5 px-3.5"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Teacher
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Faculty Editor Dialog Popup (Modal for Add & Edit) */}
      <Dialog
        open={isEditorOpen}
        onOpenChange={(open) => {
          if (!open) handleCancel();
        }}
      >
        <DialogContent
          showCloseButton={false}
          className="max-w-4xl w-[96vw] max-h-[90vh] overflow-y-auto p-4 sm:p-5 rounded-xl bg-card border shadow-xl"
        >
          <DialogHeader className="sr-only">
            <DialogTitle>
              {editingTeacherId && !unaddedStaff.some((s) => s.id === editingTeacherId)
                ? `Edit Faculty: ${teacherName}`
                : "Configure Faculty Member"}
            </DialogTitle>
          </DialogHeader>
          <TeacherEditorForm
            isSubmitting={isSubmitting}
            editingTeacherId={editingTeacherId}
            teacherName={teacherName}
            shortName={shortName}
            primarySubject={primarySubject}
            customPrimarySubject={customPrimarySubject}
            classTeacherOf={classTeacherOf}
            classTeacherFirstPeriods={classTeacherFirstPeriods}
            maxPeriods={maxPeriods}
            selectedClasses={selectedClasses}
            classSubjectsMap={classSubjectsMap}
            sectionSubjectsMap={sectionSubjectsMap}
            classSectionsMap={classSectionsMap}
            classPeriodsMap={classPeriodsMap}
            activeSectionTab={activeSectionTab}
            availSlots={availSlots}
            presetClasses={presetClasses}
            staffList={staffList}
            selectableStaffList={selectableStaffList}
            unaddedStaff={unaddedStaff}
            selectedStaffId={selectedStaffId}
            selectedStaffLabel={selectedStaffLabel}
            availableSubjectOptions={availableSubjectOptions}
            availableClassOptions={availableClassOptions}
            currentClassTeacherMap={currentClassTeacherMap}
            conflictTeacher={conflictTeacher}
            classSubjectsDictionary={classSubjectsDictionary}
            settings={settings}
            onSave={handleSave}
            onCancel={handleCancel}
            onStaffDropdownChange={handleStaffDropdownChange}
            onCustomNameChange={handleCustomNameChange}
            setShortName={setShortName}
            setPrimarySubject={setPrimarySubject}
            setCustomPrimarySubject={setCustomPrimarySubject}
            setClassTeacherOf={setClassTeacherOf}
            setClassTeacherFirstPeriods={setClassTeacherFirstPeriods}
            setMaxPeriods={setMaxPeriods}
            onToggleClass={toggleClass}
            onToggleSubjectForSection={toggleSubjectForSection}
            onToggleAllSubjectsForSection={toggleAllSubjectsForSection}
            onSubjectPeriodChange={handleSubjectPeriodChange}
            onSetActiveSectionTab={(cls, sec) => setActiveSectionTab((prev) => ({ ...prev, [cls]: sec }))}
            onSelectSection={handleSelectSection}
            onTogglePeriod={togglePeriod}
            onSetPreset={setPreset}
            getClassSections={getClassSections}
            getSectionSubjects={getSectionSubjects}
            getSubjectPeriod={getSubjectPeriod}
            getSubjectAllocationStats={getSubjectAllocationStats}
            calculateSectionTotalPeriods={calculateSectionTotalPeriods}
          />
        </DialogContent>
      </Dialog>

      {/* Teachers List Table */}
      <div className="bg-card border rounded-lg shadow-xs overflow-hidden">
        <div className="px-4 py-2 bg-muted/40 border-b flex flex-wrap items-center justify-between gap-2">
          <TeacherSummaryBadges
            totalStaffCount={teachers.length}
            totalAllottedLoad={totalAllottedLoad}
            totalSchoolSubjectPeriods={totalSchoolSubjectPeriods}
            totalAssignedSubjects={totalAssignedSubjects}
            totalSchoolSubjects={totalSchoolSubjects}
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-muted/20 border-b text-muted-foreground font-semibold">
                <th className="py-2.5 px-4 w-1/5">Teacher Name</th>
                <th className="py-2.5 px-4 w-16">Code</th>
                <th className="py-2.5 px-4 w-28">Subject</th>
                <th className="py-2.5 px-4 w-32">Class Teacher</th>
                <th className="py-2.5 px-4">Eligible Classes, Sections & Subjects</th>
                <th className="py-2.5 px-4 w-20">Capacity</th>
                <th className="py-2.5 px-4 w-24">Workload</th>
                <th className="py-2.5 px-4 text-right w-20">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {teachers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-muted-foreground">
                    <Users className="w-6 h-6 mx-auto mb-1 opacity-40" />
                    <span>No teaching staff configured. Click &quot;Add Teacher&quot; above to begin.</span>
                  </td>
                </tr>
              ) : (
                teachers.map((t) => (
                  <TeacherTableRow
                    key={t.id}
                    teacher={t}
                    load={teacherLoadMap[t.id] || 0}
                    subjects={subjects}
                    classTotalSubjectsMap={classTotalSubjectsMap}
                    settings={settings}
                    isEditing={isEditorOpen && editingTeacherId === t.id}
                    onEdit={handleEdit}
                    onDelete={onDeleteTeacher ? handleDelete : undefined}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
