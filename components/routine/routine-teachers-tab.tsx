"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  RoutineTeacher,
  RoutineAssignment,
  RoutineSettings,
  RoutineClass,
  RoutineSubject,
  DAY_NAMES,
} from "@/lib/routine/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  Users,
  AlertTriangle,
  CheckCircle2,
  SlidersHorizontal,
  BookOpen,
  GraduationCap,
  Award,
  Copy,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  getDynamicClassList,
  FALLBACK_CLASSES,
  getClassNumericRank,
  getDatabaseSubjectsForClass,
} from "@/lib/ems/ems-config-loader";
import { generateInitials } from "@/lib/routine/routine-helpers";
import { createClient } from "@/lib/supabase/client";
import {
  syncRoutineTeacherToClasses,
  parseClassSectionLabel,
  formatClassSectionLabel,
} from "@/lib/routine/routine-sync";

interface RoutineTeachersTabProps {
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

  // Compute preset subjects for each class
  const classSubjectsDictionary = useMemo(() => {
    const map: Record<string, string[]> = {};
    presetClasses.forEach((c) => {
      const subs = getDatabaseSubjectsForClass(c.code || c.name);
      map[c.name] = subs;
    });
    return map;
  }, [presetClasses]);

  // Aggregated unique subjects list across configured subjects & presets
  const availableSubjectOptions = useMemo(() => {
    const set = new Set<string>();
    subjects.forEach((s) => {
      if (s.name) set.add(s.name.trim());
    });
    Object.values(classSubjectsDictionary).forEach((subs) => {
      subs.forEach((s) => set.add(s.trim()));
    });
    // Standard default list
    [
      "Bengali",
      "English",
      "Mathematics",
      "Physical Science",
      "Life Science",
      "History",
      "Geography",
      "Health & Physical Education",
      "Work Education",
      "Computer Application",
      "Physics",
      "Chemistry",
      "Biology",
      "Sanskrit",
      "Arabic",
    ].forEach((s) => set.add(s));

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
  const getClassSections = React.useCallback(
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

  // Compute workload per teacher
  const teacherLoadMap: Record<string, number> = useMemo(() => {
    const map: Record<string, number> = {};
    assignments.forEach((a) => {
      map[a.teacherId] = (map[a.teacherId] || 0) + a.periodsPerWeek;
    });
    return map;
  }, [assignments]);

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
  };

  // Open Editor for Editing Existing Teacher
  const handleEdit = React.useCallback((t: RoutineTeacher) => {
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
    const qClasses = t.qualifiedClasses || Object.keys(t.classSubjects || {});
    setSelectedClasses(qClasses);
    setClassSubjectsMap(t.classSubjects || {});
    setSectionSubjectsMap(t.sectionSubjects || {});
    setClassSectionsMap(t.classSections || {});
    setClassPeriodsMap(t.classPeriods || {});
    setSectionPeriodsMap(t.sectionPeriods || {});
    setSubjectPeriodsMap(t.subjectPeriods || {});
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
  }, [staffList, availableSubjectOptions, settings]);

  const handleCancel = React.useCallback(() => {
    setIsEditorOpen(false);
    setEditingTeacherId(null);
  }, []);

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

      // Default all sections for this class
      const defaultSecs = getClassSections(clsName);
      setClassSectionsMap((prev) => ({
        ...prev,
        [clsName]: defaultSecs,
      }));

      // Initialize each section's subjects with initialSubs
      setSectionSubjectsMap((prev) => {
        const next = { ...prev };
        defaultSecs.forEach((sec) => {
          next[`${clsName}::${sec}`] = [...initialSubs];
        });
        return next;
      });
    }
  };

  // Toggle section selection for a specific class
  const toggleSectionForClass = (clsName: string, section: string) => {
    const allSecs = getClassSections(clsName);
    const current = classSectionsMap[clsName] || allSecs;

    if (section === "ALL") {
      const isAll = current.length === allSecs.length;
      setClassSectionsMap((prev) => ({
        ...prev,
        [clsName]: isAll ? [] : [...allSecs],
      }));
      return;
    }

    const exists = current.includes(section);
    const next = exists ? current.filter((s) => s !== section) : [...current, section];
    setClassSectionsMap((prev) => ({
      ...prev,
      [clsName]: next,
    }));
  };

  // Toggle all sections for a class
  const toggleAllSectionsForClass = (clsName: string) => {
    toggleSectionForClass(clsName, "ALL");
  };

  // Helper to get default weekly period for a subject in a class
  const getSubjectDefaultPeriod = React.useCallback(
    (clsName: string, subName: string): number => {
      const matched = (subjects || []).find(
        (s) =>
          s.name.trim().toLowerCase() === subName.trim().toLowerCase() &&
          (s.className ? s.className.trim().toLowerCase() === clsName.trim().toLowerCase() : true)
      );
      return matched?.periodsPerWeek && matched.periodsPerWeek > 0 ? matched.periodsPerWeek : 5;
    },
    [subjects]
  );

  // Helper to get active subjects for a specific section (or ALL)
  const getSectionSubjects = React.useCallback(
    (clsName: string, sec: string): string[] => {
      if (sec === "ALL") {
        const allSecs = getClassSections(clsName);
        const selectedSecs = classSectionsMap[clsName] || allSecs;
        if (selectedSecs.length === 0) return classSubjectsMap[clsName] || [];
        const union = new Set<string>();
        selectedSecs.forEach((s) => {
          const subs = sectionSubjectsMap[`${clsName}::${s}`] || classSubjectsMap[clsName] || [];
          subs.forEach((sub) => union.add(sub));
        });
        return Array.from(union);
      }
      const secKey = `${clsName}::${sec}`;
      if (sectionSubjectsMap[secKey] !== undefined) {
        return sectionSubjectsMap[secKey];
      }
      return classSubjectsMap[clsName] || [];
    },
    [sectionSubjectsMap, classSubjectsMap, classSectionsMap, getClassSections]
  );

  // Helper to get specific period count for a subject in a section (or ALL)
  const getSubjectPeriod = React.useCallback(
    (clsName: string, sec: string, subName: string): number => {
      if (sec === "ALL") {
        const allSecs = getClassSections(clsName);
        const selectedSecs = classSectionsMap[clsName] || allSecs;
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
      const secKey = `${clsName}::${sec}::${subName}`;
      if (subjectPeriodsMap[secKey] !== undefined && subjectPeriodsMap[secKey] > 0) {
        return subjectPeriodsMap[secKey];
      }
      const clsKey = `${clsName}::${subName}`;
      if (subjectPeriodsMap[clsKey] !== undefined && subjectPeriodsMap[clsKey] > 0) {
        return subjectPeriodsMap[clsKey];
      }
      return getSubjectDefaultPeriod(clsName, subName);
    },
    [subjectPeriodsMap, getSubjectDefaultPeriod, classSectionsMap, getClassSections]
  );

  // Helper to compute live allocation breakdown across other teachers for a given class, section, and subject
  const getSubjectAllocationStats = React.useCallback(
    (clsName: string, sec: string, subName: string) => {
      // 1. Total weekly demand from configured subjects (or fallback default 5)
      const matchedSubject = (subjects || []).find(
        (s) =>
          s.name.trim().toLowerCase() === subName.trim().toLowerCase() &&
          (!s.className || s.className.trim().toLowerCase() === clsName.trim().toLowerCase())
      );
      const totalDemand =
        matchedSubject?.periodsPerWeek && matchedSubject.periodsPerWeek > 0
          ? matchedSubject.periodsPerWeek
          : 5;

      // 2. Sections to check (if sec === "ALL", inspect all configured sections)
      const allSecs = getClassSections(clsName);
      const targetSecs = sec === "ALL" ? (classSectionsMap[clsName] || allSecs) : [sec];

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
            const secKey = `${clsName}::${s}`;
            const isAssignedToSec =
              (t.sectionSubjects?.[secKey] && t.sectionSubjects[secKey].includes(subName)) ||
              (!t.sectionSubjects?.[secKey] &&
                t.qualifiedClasses?.includes(clsName) &&
                t.classSubjects?.[clsName]?.includes(subName) &&
                (t.classSections?.[clsName] || allSecs).includes(s));

            if (isAssignedToSec) {
              const specificPeriod =
                t.subjectPeriods?.[`${clsName}::${s}::${subName}`] ||
                t.subjectPeriods?.[`${clsName}::${subName}`] ||
                getSubjectDefaultPeriod(clsName, subName);
              tPeriodsForSec += specificPeriod;
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
  const calculateSectionTotalPeriods = React.useCallback(
    (clsName: string, sec: string): number => {
      const secSubs = getSectionSubjects(clsName, sec);
      return secSubs.reduce((sum, sub) => sum + getSubjectPeriod(clsName, sec, sub), 0);
    },
    [getSectionSubjects, getSubjectPeriod]
  );

  // Toggle subject for a specific section (or ALL)
  const toggleSubjectForSection = (clsName: string, sec: string, subName: string) => {
    const allSecs = getClassSections(clsName);
    const selectedSecs = classSectionsMap[clsName] || allSecs;

    if (sec === "ALL") {
      const currentUnion = getSectionSubjects(clsName, "ALL");
      const exists = currentUnion.includes(subName);

      setSectionSubjectsMap((prev) => {
        const next = { ...prev };
        selectedSecs.forEach((s) => {
          const current = next[`${clsName}::${s}`] || classSubjectsMap[clsName] || [];
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

      // Auto-populate remaining slots if newly activating
      if (!exists) {
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

    // Auto-populate remaining slots if newly activating
    if (!exists) {
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
    const selectedSecs = classSectionsMap[clsName] || allSecs;

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

  // Handle subject period count change (for single sec or ALL)
  const handleSubjectPeriodChange = (clsName: string, sec: string, subName: string, val: string) => {
    const num = val.trim() === "" ? 0 : parseInt(val, 10);
    const allSecs = getClassSections(clsName);
    const selectedSecs = classSectionsMap[clsName] || allSecs;

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

  // Copy one section's configured subjects and loads to all other sections of that class
  const handleCopySectionConfigToAll = (clsName: string, fromSec: string) => {
    const sourceSubs = getSectionSubjects(clsName, fromSec);
    const allSecs = getClassSections(clsName);

    setSectionSubjectsMap((prev) => {
      const next = { ...prev };
      allSecs.forEach((sec) => {
        next[`${clsName}::${sec}`] = [...sourceSubs];
      });
      return next;
    });

    setSubjectPeriodsMap((prev) => {
      const next = { ...prev };
      allSecs.forEach((sec) => {
        if (sec !== fromSec) {
          sourceSubs.forEach((sub) => {
            const fromKey = `${clsName}::${fromSec}::${sub}`;
            const toKey = `${clsName}::${sec}::${sub}`;
            if (prev[fromKey] !== undefined) {
              next[toKey] = prev[fromKey];
            }
          });
        }
      });
      return next;
    });
  };

  // Set target weekly periods for a specific class default
  const handlePeriodChangeForClass = (clsName: string, val: string) => {
    const num = val.trim() === "" ? 0 : parseInt(val, 10);
    setClassPeriodsMap((prev) => {
      const next = { ...prev };
      if (!num || num <= 0) {
        delete next[clsName];
      } else {
        next[clsName] = num;
      }
      return next;
    });
  };

  // Set target weekly periods for a specific section
  const handleSectionPeriodChange = (clsName: string, sec: string, val: string) => {
    const key = `${clsName}::${sec}`;
    const num = val.trim() === "" ? 0 : parseInt(val, 10);
    setSectionPeriodsMap((prev) => {
      const next = { ...prev };
      if (!num || num <= 0) {
        delete next[key];
      } else {
        next[key] = num;
      }
      return next;
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
  const handleDelete = React.useCallback(async (id: string) => {
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

  // Class teacher assignments lookup for display
  const currentClassTeacherMap = useMemo(() => {
    const map: Record<string, string> = {};
    teachers.forEach((t) => {
      if (t.classTeacherOf) {
        map[t.classTeacherOf] = t.name;
        const parsed = parseClassSectionLabel(t.classTeacherOf);
        if (parsed) {
          map[formatClassSectionLabel(parsed.className, parsed.section)] = t.name;
          map[`${parsed.className} - ${parsed.section}`] = t.name;
        }
      }
    });
    return map;
  }, [teachers]);

  return (
    <div className="space-y-4 w-full">
      {/* Top Header Card: Add Teacher Button */}
      <div className="bg-card border rounded-lg p-3.5 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <GraduationCap className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-semibold tracking-tight text-foreground">
            Faculty Class & Subject Configuration
          </h2>
        </div>

        <div className="flex items-center gap-2">
          {!isEditorOpen && (
            <Button
              type="button"
              size="sm"
              onClick={handleOpenAdd}
              className="h-8 text-xs font-semibold gap-1.5 px-3.5"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Teacher
            </Button>
          )}
        </div>
      </div>

      {/* Availability & Class/Subject Editor Card */}
      {isEditorOpen && (
        <form
          onSubmit={handleSave}
          autoComplete="off"
          className="bg-card border-2 border-primary/40 rounded-lg p-4 shadow-sm space-y-4 animate-in fade-in duration-150"
        >
          <div className="flex items-center justify-between border-b pb-2.5">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-semibold tracking-tight text-foreground">
                {editingTeacherId && !unaddedStaff.some((s) => s.id === editingTeacherId)
                  ? `Edit Faculty: ${teacherName}`
                  : "Select & Configure Faculty Member"}
              </h2>
            </div>
            <Button type="button" variant="ghost" size="sm" onClick={handleCancel} className="h-7 w-7 p-0">
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Row 1: Teacher Selection & Initials (2 fields) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* 1. Saved Teacher Dropdown Selection */}
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs font-semibold">Select Teacher from Staff *</Label>
              {staffList.length > 0 ? (
                <Select
                  value={selectedStaffId}
                  onValueChange={(val) => val && handleStaffDropdownChange(val)}
                >
                  <SelectTrigger className="h-8 text-xs font-medium bg-background">
                    <SelectValue placeholder="Select Teacher">
                      {selectedStaffLabel}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {selectableStaffList.length > 0 ? (
                      selectableStaffList.map((s) => (
                        <SelectItem key={s.id} value={s.id} className="text-xs">
                          {s.full_name} {s.designation ? `(${s.designation})` : ""}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="__none__" disabled className="text-xs">
                        All School Staff Added
                      </SelectItem>
                    )}
                    <SelectItem value="__custom__" className="text-xs font-medium text-primary">
                      + Custom Teacher (Manual Name)
                    </SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  type="text"
                  placeholder="e.g. Ananya Kayal"
                  value={teacherName}
                  onChange={(e) => handleCustomNameChange(e.target.value)}
                  className="h-8 text-xs font-medium"
                  required
                />
              )}
            </div>

            {/* Custom Teacher Name field if __custom__ selected, else Initials */}
            {selectedStaffId === "__custom__" ? (
              <div className="space-y-1.5 sm:col-span-1">
                <Label className="text-xs font-semibold">Custom Teacher Name *</Label>
                <Input
                  type="text"
                  placeholder="Enter full name"
                  value={teacherName}
                  onChange={(e) => handleCustomNameChange(e.target.value)}
                  className="h-8 text-xs font-medium"
                  required
                />
              </div>
            ) : (
              <div className="space-y-1.5 sm:col-span-1">
                <Label className="text-xs font-semibold">Short Code / Initials *</Label>
                <Input
                  type="text"
                  placeholder="e.g. AK, RM"
                  maxLength={6}
                  value={shortName}
                  onChange={(e) => setShortName(e.target.value.toUpperCase())}
                  className="h-8 text-xs font-mono font-bold uppercase"
                  required
                />
              </div>
            )}
          </div>

          {/* Row 2: Primary Subject, Class Teacher Of, (1st Period Quota if CT), Max Periods / Week */}
          <div
            className={cn(
              "grid grid-cols-1 gap-3",
              classTeacherOf && classTeacherOf !== "__none__"
                ? "sm:grid-cols-2 lg:grid-cols-4"
                : "sm:grid-cols-3"
            )}
          >
            {/* 3. Primary Subject / Specialization */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Primary Subject</Label>
              <Select
                value={primarySubject || "__none__"}
                onValueChange={(val) => {
                  if (!val || val === "__none__") {
                    setPrimarySubject("");
                  } else {
                    setPrimarySubject(val);
                  }
                }}
              >
                <SelectTrigger className="h-8 text-xs font-medium bg-background">
                  <SelectValue placeholder="Select Subject">
                    {primarySubject === "__custom__"
                      ? "Custom Subject..."
                      : primarySubject || "-- None / General --"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__" className="text-xs text-muted-foreground">
                    -- None / General --
                  </SelectItem>
                  {availableSubjectOptions.map((subj) => (
                    <SelectItem key={subj} value={subj} className="text-xs">
                      {subj}
                    </SelectItem>
                  ))}
                  <SelectItem value="__custom__" className="text-xs font-medium text-primary">
                    + Custom Subject...
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 4. Class Teacher Assignment */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Class Teacher Of</Label>
              <Select
                value={classTeacherOf || "__none__"}
                onValueChange={(val) => setClassTeacherOf(val || "")}
              >
                <SelectTrigger className="h-8 text-xs bg-background font-medium">
                  <SelectValue placeholder="Select Class">
                    {classTeacherOf && classTeacherOf !== "__none__"
                      ? classTeacherOf
                      : "-- Not Assigned --"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__" className="text-xs text-muted-foreground">
                    -- Not a Class Teacher --
                  </SelectItem>
                  {availableClassOptions.map((c) => {
                    const currentCt = currentClassTeacherMap[c.label];
                    const isCurrent = editingTeacherId && currentCt === teacherName;
                    return (
                      <SelectItem key={c.id || c.label} value={c.label} className="text-xs">
                        <span>{c.label}</span>
                        {currentCt && !isCurrent && (
                          <span className="text-[10px] text-muted-foreground ml-1 font-normal">
                            (CT: {currentCt})
                          </span>
                        )}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* 4b. 1st Period in CT Class (Only shown when Class Teacher is assigned) */}
            {classTeacherOf && classTeacherOf !== "__none__" && (
              <div className="space-y-1.5 animate-in fade-in duration-150">
                <Label className="text-xs font-semibold text-primary flex items-center justify-between">
                  <span>CT 1st Periods / Wk</span>
                  <span className="text-[10px] text-muted-foreground font-normal">(Default 3)</span>
                </Label>
                <Input
                  type="number"
                  min={1}
                  max={6}
                  value={classTeacherFirstPeriods}
                  onChange={(e) => setClassTeacherFirstPeriods(parseInt(e.target.value, 10) || 1)}
                  className="h-8 text-xs font-mono font-bold border-primary/40 bg-primary/5 focus:bg-background"
                  required
                />
              </div>
            )}

            {/* 5. Max periods limit */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Max Periods / Week</Label>
              <Input
                type="number"
                min={1}
                max={48}
                value={maxPeriods}
                onChange={(e) => setMaxPeriods(parseInt(e.target.value, 10) || 24)}
                className="h-8 text-xs font-mono font-medium"
              />
            </div>
          </div>

          {/* Custom Subject Input if __custom__ selected */}
          {primarySubject === "__custom__" && (
            <div className="p-2.5 bg-muted/40 border rounded-md space-y-1 max-w-sm">
              <Label className="text-xs font-medium">Enter Custom Subject Name *</Label>
              <Input
                type="text"
                placeholder="e.g. Sanskrit, Statistics"
                value={customPrimarySubject}
                onChange={(e) => setCustomPrimarySubject(e.target.value)}
                className="h-8 text-xs bg-background"
                required
              />
            </div>
          )}

          {/* Class & Subject Eligibility Setup */}
          <div className="space-y-2.5 pt-1 border-t">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-primary" />
                <Label className="text-xs font-semibold text-foreground">
                  Eligible Classes & Preset Subjects
                </Label>
              </div>
              <span className="text-[11px] text-muted-foreground font-medium">
                {selectedClasses.length} Classes Selected
              </span>
            </div>

            {/* Class Selection Pills */}
            <div className="flex flex-wrap gap-1.5 p-2 bg-muted/30 border rounded-lg">
              {presetClasses.map((c) => {
                const isSelected = selectedClasses.includes(c.name);
                const subCount = (classSubjectsMap[c.name] || []).length;
                const secCount = (classSectionsMap[c.name] || getClassSections(c.name)).length;
                const periodLoad = classPeriodsMap[c.name];
                return (
                  <button
                    key={c.name}
                    type="button"
                    onClick={() => toggleClass(c.name)}
                    className={cn(
                      "px-2.5 py-1 rounded-md text-xs font-semibold border transition-all flex items-center gap-1.5 select-none",
                      isSelected
                        ? "bg-primary text-primary-foreground border-primary shadow-xs"
                        : "bg-background text-muted-foreground border-border hover:bg-muted/60"
                    )}
                  >
                    <span>{c.name}</span>
                    {isSelected && (
                      <Badge
                        variant="secondary"
                        className="text-[9px] px-1 py-0 bg-primary-foreground/20 text-primary-foreground border-transparent font-mono"
                      >
                        {secCount} Sec • {subCount} Sub {periodLoad ? `• ${periodLoad}p` : ""}
                      </Badge>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Subject, Section & Period Panels for Each Selected Class */}
            {selectedClasses.length > 0 && (
              <div className="space-y-3 pt-1">
                {presetClasses
                  .filter((c) => selectedClasses.includes(c.name))
                  .map((c) => {
                    const availableSubs = classSubjectsDictionary[c.name] || [];
                    const allSecs = getClassSections(c.name);
                    const selectedSecs = classSectionsMap[c.name] || allSecs;
                    const allSecsSelected =
                      allSecs.length > 0 && selectedSecs.length === allSecs.length;
                    const currentActiveSec =
                      activeSectionTab[c.name] || (allSecs.length > 1 ? "ALL" : allSecs[0] || "A");

                    const classTotalPeriods = selectedSecs.reduce(
                      (sum, sec) => sum + calculateSectionTotalPeriods(c.name, sec),
                      0
                    );

                    return (
                      <div
                        key={c.name}
                        className="p-3 bg-card border rounded-lg space-y-3 shadow-xs"
                      >
                        {/* Class Header: Name & Auto Total Workload */}
                        <div className="flex items-center justify-between border-b pb-2">
                          <div className="flex items-center gap-2">
                            <Badge
                              variant="outline"
                              className="font-bold text-xs text-foreground font-mono bg-background"
                            >
                              {c.name}
                            </Badge>
                            <span className="text-[11px] text-muted-foreground">
                              {selectedSecs.length} Active {selectedSecs.length === 1 ? "Section" : "Sections"}
                            </span>
                          </div>

                          <Badge
                            variant="secondary"
                            className="font-mono text-xs font-bold text-primary bg-primary/10 border-primary/20"
                          >
                            Class Total: {classTotalPeriods} p/wk
                          </Badge>
                        </div>

                        {/* Section Selection Bar & Switcher */}
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-semibold text-foreground">
                              Configure Section ({c.name}):
                            </span>
                            <span className="text-[10px] text-muted-foreground font-mono">
                              Click to switch
                            </span>
                          </div>

                          {/* Clean Segmented Tab Buttons */}
                          <div className="flex flex-wrap gap-1.5 p-1 bg-muted/30 rounded-lg border">
                            {allSecs.length > 1 && (
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveSectionTab((prev) => ({ ...prev, [c.name]: "ALL" }));
                                  if (!allSecsSelected) {
                                    setClassSectionsMap((prev) => ({ ...prev, [c.name]: [...allSecs] }));
                                  }
                                }}
                                className={cn(
                                  "px-3 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer select-none",
                                  currentActiveSec === "ALL"
                                    ? "bg-primary text-primary-foreground shadow-xs font-bold ring-1 ring-primary/40"
                                    : "bg-background text-foreground hover:bg-muted/80 border border-transparent hover:border-border"
                                )}
                              >
                                {currentActiveSec === "ALL" && (
                                  <Check className="w-3.5 h-3.5 text-primary-foreground" />
                                )}
                                <span>All Sections</span>
                                <Badge
                                  variant="secondary"
                                  className={cn(
                                    "text-[10px] font-mono px-1.5 py-0 font-bold",
                                    currentActiveSec === "ALL"
                                      ? "bg-primary-foreground text-primary"
                                      : "bg-muted text-muted-foreground"
                                  )}
                                >
                                  {classTotalPeriods} p/wk
                                </Badge>
                              </button>
                            )}

                            {allSecs.map((sec) => {
                              const isFocused = currentActiveSec === sec;
                              const secLoad = calculateSectionTotalPeriods(c.name, sec);

                              return (
                                <button
                                  key={sec}
                                  type="button"
                                  onClick={() => {
                                    setActiveSectionTab((prev) => ({ ...prev, [c.name]: sec }));
                                    if (!selectedSecs.includes(sec)) {
                                      setClassSectionsMap((prev) => ({
                                        ...prev,
                                        [c.name]: Array.from(new Set([...(prev[c.name] || allSecs), sec])),
                                      }));
                                    }
                                  }}
                                  className={cn(
                                    "px-3 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer select-none",
                                    isFocused
                                      ? "bg-primary text-primary-foreground shadow-xs font-bold ring-1 ring-primary/40"
                                      : "bg-background text-foreground hover:bg-muted/80 border border-transparent hover:border-border"
                                  )}
                                >
                                  {isFocused && (
                                    <Check className="w-3.5 h-3.5 text-primary-foreground" />
                                  )}
                                  <span>Sec {sec}</span>
                                  <Badge
                                    variant="secondary"
                                    className={cn(
                                      "text-[10px] font-mono px-1.5 py-0 font-bold",
                                      isFocused
                                        ? "bg-primary-foreground text-primary"
                                        : "bg-muted text-muted-foreground"
                                    )}
                                  >
                                    {secLoad} p/wk
                                  </Badge>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Subjects for the Active Section or All Sections */}
                        {selectedSecs.includes(currentActiveSec) || (currentActiveSec === "ALL" && selectedSecs.length > 0) ? (
                          <div className="space-y-2 pt-2 border-t bg-muted/15 -mx-3 -mb-3 p-3 rounded-b-lg">
                            <div className="flex flex-wrap items-center justify-between gap-1.5">
                              <div className="flex items-center gap-1.5">
                                <span className="text-[11px] font-semibold text-foreground">
                                  {currentActiveSec === "ALL" ? "Subjects for All Sections:" : `Subjects for Sec ${currentActiveSec}:`}
                                </span>
                                <Badge variant="outline" className="text-[10px] font-mono font-bold bg-background">
                                  {getSectionSubjects(c.name, currentActiveSec).length} Selected • {currentActiveSec === "ALL" ? classTotalPeriods : calculateSectionTotalPeriods(c.name, currentActiveSec)} p/wk
                                </Badge>
                              </div>

                              <div className="flex items-center gap-1">
                                {allSecs.length > 1 && currentActiveSec !== "ALL" && (
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleCopySectionConfigToAll(c.name, currentActiveSec)}
                                    className="h-5 text-[10px] px-1.5 gap-1 bg-background text-foreground hover:bg-muted"
                                    title="Apply this section's subjects and period loads to all other sections"
                                  >
                                    <Copy className="w-2.5 h-2.5" />
                                    <span>Copy to All Secs</span>
                                  </Button>
                                )}
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => toggleAllSubjectsForSection(c.name, currentActiveSec)}
                                  className="h-5 text-[10px] px-1.5 text-primary hover:bg-primary/10"
                                >
                                  {getSectionSubjects(c.name, currentActiveSec).length === availableSubs.length &&
                                  availableSubs.length > 0
                                    ? "Deselect All"
                                    : "Select All"}
                                </Button>
                              </div>
                            </div>

                            {/* Subject Pills with live quota breakdown and inline editable p/wk */}
                            <div className="flex flex-wrap gap-2 pt-0.5">
                              {availableSubs.length === 0 ? (
                                <span className="text-xs text-muted-foreground italic">
                                  No subjects configured for this class in School Settings.
                                </span>
                              ) : (
                                availableSubs.map((sub) => {
                                  const secSubs = getSectionSubjects(c.name, currentActiveSec);
                                  const isSubActive = secSubs.includes(sub);
                                  const subPeriod = getSubjectPeriod(c.name, currentActiveSec, sub);
                                  const stats = getSubjectAllocationStats(c.name, currentActiveSec, sub);
                                  const isOverflow = isSubActive && subPeriod > stats.remaining;
                                  const overflowAmount = subPeriod - stats.remaining;

                                  return (
                                    <div
                                      key={sub}
                                      className={cn(
                                        "inline-flex flex-col sm:flex-row items-stretch sm:items-center rounded-lg border text-xs transition-all p-1 gap-1",
                                        isSubActive
                                          ? isOverflow
                                            ? "bg-card border-rose-500/60 shadow-2xs text-foreground ring-1 ring-rose-500/30"
                                            : "bg-card border-primary/50 shadow-2xs text-foreground ring-1 ring-primary/20"
                                          : "bg-muted/30 text-muted-foreground border-border hover:bg-muted/60"
                                      )}
                                    >
                                      <button
                                        type="button"
                                        onClick={() =>
                                          toggleSubjectForSection(c.name, currentActiveSec, sub)
                                        }
                                        className={cn(
                                          "px-2 py-1 text-left font-medium flex items-center gap-1.5 select-none transition-colors",
                                          isSubActive ? "text-primary font-semibold" : "text-foreground/80 hover:text-foreground"
                                        )}
                                      >
                                        <div
                                          className={cn(
                                            "w-3.5 h-3.5 rounded-sm border flex items-center justify-center transition-colors shrink-0",
                                            isSubActive
                                              ? "bg-primary border-primary text-primary-foreground"
                                              : "border-muted-foreground/50 bg-background"
                                          )}
                                        >
                                          {isSubActive && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                                        </div>
                                        <div className="flex flex-col">
                                          <span className="font-semibold text-xs leading-tight">{sub}</span>
                                          <div className="flex items-center gap-1 mt-0.5">
                                            {stats.isFullyBooked ? (
                                              <span className="text-[9.5px] px-1 py-0 rounded bg-muted text-muted-foreground border border-border font-mono">
                                                Full ({stats.otherTeachers.map((t) => `${t.shortName}: ${t.periods}p`).join(", ")})
                                              </span>
                                            ) : stats.otherAssigned > 0 ? (
                                              <span className="text-[9.5px] px-1 py-0 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 font-mono">
                                                {stats.otherAssigned}/{stats.totalDemand} ({stats.otherTeachers.map((t) => `${t.shortName}:${t.periods}p`).join(",")}) • {stats.remaining} Rem
                                              </span>
                                            ) : (
                                              <span className="text-[9.5px] px-1 py-0 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-mono">
                                                0/{stats.totalDemand} • {stats.remaining} Free
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                      </button>

                                      {isSubActive && (
                                        <div className="flex items-center justify-between sm:justify-start gap-1.5 px-2 py-0.5 border-t sm:border-t-0 sm:border-l border-border/80 bg-muted/20 rounded">
                                          <div className="flex items-center gap-1">
                                            <Input
                                              type="number"
                                              min={1}
                                              max={20}
                                              value={subPeriod}
                                              onChange={(e) =>
                                                handleSubjectPeriodChange(
                                                  c.name,
                                                  currentActiveSec,
                                                  sub,
                                                  e.target.value
                                                )
                                              }
                                              className={cn(
                                                "h-6 w-11 text-[11px] font-mono font-bold px-1 text-center bg-background",
                                                isOverflow
                                                  ? "border-rose-500 text-rose-500 focus:ring-rose-500"
                                                  : "border-primary/40 text-foreground"
                                              )}
                                              title={`Weekly periods for ${sub}${currentActiveSec === "ALL" ? " across all sections" : ` in Sec ${currentActiveSec}`}`}
                                            />
                                            <span className="text-[10px] text-muted-foreground font-mono font-medium">
                                              p/wk
                                            </span>
                                          </div>

                                          {isOverflow && (
                                            <Badge
                                              variant="destructive"
                                              className="text-[9px] px-1 py-0 gap-0.5 bg-rose-500/15 text-rose-500 border border-rose-500/30 hover:bg-rose-500/20 font-bold"
                                              title="Assigned periods exceed remaining unallocated demand"
                                            >
                                              <AlertTriangle className="w-2.5 h-2.5" />
                                              +{overflowAmount} Over
                                            </Badge>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="p-2.5 bg-muted/20 border border-dashed rounded text-center text-xs text-muted-foreground">
                            Select a section above to configure its subjects and weekly period load.
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            )}
          </div>

          {/* Availability Matrix */}
          <div className="space-y-2 pt-2 border-t">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold text-foreground">Weekly Period Availability Matrix</Label>
              <Badge variant="outline" className="text-[10px] font-mono">
                {settings.workingDays.length} Working Days
              </Badge>
            </div>

            <div className="border rounded-md divide-y overflow-hidden text-xs bg-card">
              {settings.workingDays.map((dIdx) => {
                const dayPeriods = availSlots[dIdx] || [];
                const isHalf = settings.halfDays?.includes(dIdx);
                const maxP = isHalf ? settings.halfDayPeriods || 4 : settings.periodsPerDay;

                return (
                  <div
                    key={dIdx}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-2.5 hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-center gap-2 sm:w-32">
                      <span className="font-semibold text-xs text-foreground">{DAY_NAMES[dIdx]}</span>
                      {isHalf && (
                        <Badge
                          variant="outline"
                          className="text-[9px] px-1 py-0 bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-300"
                        >
                          Half
                        </Badge>
                      )}
                    </div>

                    {/* Period chips */}
                    <div className="flex flex-wrap gap-1 flex-1">
                      {Array.from({ length: settings.periodsPerDay }, (_, i) => i + 1).map((p) => {
                        const isSelected = dayPeriods.includes(p);
                        const isBreak = settings.breaks.includes(p);
                        const isOverLimit = p > maxP;

                        if (isOverLimit) {
                          return (
                            <span
                              key={p}
                              className="px-2 py-0.5 rounded text-[10px] font-mono border bg-muted/40 text-muted-foreground/40 select-none"
                            >
                              -
                            </span>
                          );
                        }

                        return (
                          <button
                            key={p}
                            type="button"
                            onClick={() => togglePeriod(dIdx, p)}
                            className={cn(
                              "px-2 py-0.5 rounded text-[11px] font-mono font-medium border transition-all select-none",
                              isSelected && "bg-primary text-primary-foreground border-primary shadow-xs font-bold",
                              !isSelected && "bg-muted/50 text-muted-foreground border-border hover:bg-muted"
                            )}
                          >
                            P{p}
                          </button>
                        );
                      })}
                    </div>

                    {/* Quick presets */}
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setPreset(dIdx, "all")}
                        className="h-6 px-1.5 text-[10px] text-muted-foreground hover:text-foreground"
                      >
                        All
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setPreset(dIdx, "morning")}
                        className="h-6 px-1.5 text-[10px] text-muted-foreground hover:text-foreground"
                      >
                        Morning
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setPreset(dIdx, "none")}
                        className="h-6 px-1.5 text-[10px] text-destructive hover:bg-destructive/10"
                      >
                        Clear
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button type="button" variant="outline" size="sm" onClick={handleCancel} className="h-8 text-xs">
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting || !teacherName.trim()}
              className="h-8 text-xs font-semibold px-4"
            >
              <Check className="h-3.5 w-3.5 mr-1.5" />
              Save Teacher & Qualifications
            </Button>
          </div>
        </form>
      )}

      {/* Teachers List Table */}
      <div className="bg-card border rounded-lg shadow-xs overflow-hidden">
        <div className="px-4 py-2.5 bg-muted/40 border-b flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-foreground">Teaching Faculty</span>
            <Badge variant="secondary" className="text-[10px] font-mono">
              {teachers.length} Active Staff
            </Badge>
          </div>
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
                <th className="py-2.5 px-4 w-24">Availability</th>
                <th className="py-2.5 px-4 text-right w-20">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {teachers.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-muted-foreground">
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
                    settings={settings}
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

interface TeacherTableRowProps {
  teacher: RoutineTeacher;
  load: number;
  settings: RoutineSettings;
  onEdit: (t: RoutineTeacher) => void;
  onDelete?: (id: string) => Promise<void>;
}

const TeacherTableRow = React.memo(function TeacherTableRow({
  teacher: t,
  load,
  settings,
  onEdit,
  onDelete,
}: TeacherTableRowProps) {
  const isOverloaded = load > t.maxPeriods;
  const totalSlots = settings.workingDays.reduce((acc, d) => {
    const raw = t.availableSlots?.[d] ?? (t.availableSlots as any)?.[String(d)];
    return acc + (Array.isArray(raw) ? raw.length : settings.periodsPerDay);
  }, 0);

  const qClasses = t.qualifiedClasses || Object.keys(t.classSubjects || {});
  const cSubjects = t.classSubjects || {};
  const cSections = t.classSections || {};
  const cPeriods = t.classPeriods || {};
  const sPeriods = t.sectionPeriods || {};

  return (
    <tr className="hover:bg-muted/30 transition-colors">
      <td className="py-2.5 px-4 font-semibold text-foreground">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span>{t.name}</span>
          {t.classTeacherOf && (
            <Badge
              variant="secondary"
              className="text-[9px] px-1.5 py-0 bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-200"
            >
              CT: {t.classTeacherOf}
            </Badge>
          )}
        </div>
      </td>
      <td className="py-2.5 px-4">
        <Badge variant="outline" className="font-mono text-[10px] font-bold">
          {t.shortName || "-"}
        </Badge>
      </td>
      <td className="py-2.5 px-4">
        {t.primarySubject ? (
          <Badge variant="secondary" className="text-[10px] font-medium bg-muted font-mono">
            {t.primarySubject}
          </Badge>
        ) : (
          <span className="text-muted-foreground text-[11px]">-</span>
        )}
      </td>
      <td className="py-2.5 px-4">
        {t.classTeacherOf ? (
          <div className="flex flex-col gap-0.5">
            <span className="font-semibold text-primary text-[11px] flex items-center gap-1">
              <Award className="w-3 h-3 text-primary" />
              {t.classTeacherOf}
            </span>
            <span className="text-[10px] text-muted-foreground font-mono">
              1st Period: {t.classTeacherFirstPeriods ?? 3}/wk
            </span>
          </div>
        ) : (
          <span className="text-muted-foreground text-[11px]">-</span>
        )}
      </td>
      <td className="py-2.5 px-4">
        {qClasses.length === 0 ? (
          <span className="text-muted-foreground text-[11px] italic">
            All classes & subjects
          </span>
        ) : (
          <div className="flex flex-wrap gap-1.5 max-w-lg">
            {qClasses.map((cls) => {
              const subs = cSubjects[cls] || [];
              const secs = cSections[cls] || [];
              const periodTarget = cPeriods[cls];

              return (
                <div
                  key={cls}
                  className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-muted/60 border text-[10px] font-medium text-foreground flex-wrap"
                >
                  <span className="font-bold text-primary">{cls}:</span>
                  {secs.length > 0 && (
                    <Badge variant="outline" className="text-[9px] px-1 py-0 font-mono bg-background font-semibold">
                      {secs
                        .map((sec) => {
                          const p = sPeriods[`${cls}::${sec}`] || sPeriods[`${cls}-${sec}`] || sPeriods[`${cls}_${sec}`];
                          return p ? `Sec ${sec} (${p}p)` : `Sec ${sec}`;
                        })
                        .join(", ")}
                    </Badge>
                  )}
                  {periodTarget && periodTarget > 0 && (
                    <Badge variant="secondary" className="text-[9px] px-1 py-0 font-mono bg-primary/10 text-primary font-bold">
                      {periodTarget} p/wk
                    </Badge>
                  )}
                  <span className="text-muted-foreground">
                    {subs.length > 0 ? subs.join(", ") : "All"}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </td>
      <td className="py-2.5 px-4 font-mono text-muted-foreground text-[11px]">
        {t.maxPeriods} p/wk
      </td>
      <td className="py-2.5 px-4">
        <Badge
          variant={isOverloaded ? "destructive" : "secondary"}
          className={cn(
            "text-[10px] font-mono gap-1",
            !isOverloaded && load > 0 && "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-200"
          )}
        >
          {isOverloaded && <AlertTriangle className="w-2.5 h-2.5" />}
          {!isOverloaded && load > 0 && <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />}
          {load} / {t.maxPeriods}
        </Badge>
      </td>
      <td className="py-2.5 px-4">
        <span className="text-muted-foreground text-[11px] font-mono">
          {totalSlots} slots/wk
        </span>
      </td>
      <td className="py-2.5 px-4 text-right">
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEdit(t)}
            className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
          >
            <Edit2 className="h-3.5 w-3.5" />
          </Button>
          {onDelete && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(t.id)}
              className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </td>
    </tr>
  );
});
