"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  fetchRoutineFullState,
  saveGeneratedRoutineDb,
  RoutineFullState,
} from "@/lib/supabase/db-routine";
import {
  RoutineSettings,
  RoutineClass,
  RoutineTeacher,
  RoutineSubject,
  RoutineAssignment,
  RoutineRoom,
  RoutineSubjectGroup,
  GeneratedRoutine,
  ValidationReport,
  DiagnosticItem,
  DEFAULT_ROUTINE_SETTINGS,
} from "@/lib/routine/types";
import { validateRoutineData, generateRoutine, diagnoseRoutineData } from "@/lib/routine/routineGenerator";
import { autoBuildRoutineAssignmentsWithReport } from "@/lib/routine/routine-auto-assign";
import { RoutineGeneratorTab } from "@/components/routine/routine-generator-tab";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "sonner";

export default function RoutineGeneratePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<RoutineSettings>(DEFAULT_ROUTINE_SETTINGS);
  const [classes, setClasses] = useState<RoutineClass[]>([]);
  const [teachers, setTeachers] = useState<RoutineTeacher[]>([]);
  const [subjects, setSubjects] = useState<RoutineSubject[]>([]);
  const [assignments, setAssignments] = useState<RoutineAssignment[]>([]);
  const [rooms, setRooms] = useState<RoutineRoom[]>([]);
  const [groups, setGroups] = useState<RoutineSubjectGroup[]>([]);

  const loadData = async () => {
    setLoading(true);
    try {
      const data: RoutineFullState = await fetchRoutineFullState();
      setSettings(data.settings || DEFAULT_ROUTINE_SETTINGS);
      setClasses(data.classes || []);
      setTeachers(data.teachers || []);
      setSubjects(data.subjects || []);
      setAssignments(data.assignments || []);
      setRooms(data.rooms || []);
      setGroups(data.groups || []);
    } catch (err) {
      console.error("Failed to load routine data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    let timeoutId: NodeJS.Timeout | null = null;
    const handleStateUpdated = () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        loadData();
      }, 200);
    };

    window.addEventListener("sms_routine_state_updated", handleStateUpdated);
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      window.removeEventListener("sms_routine_state_updated", handleStateUpdated);
    };
  }, []);

  // Always rebuilt from the Teachers tab: a stored row can never put a teacher on a subject they were not given
  const buildAssignments = () =>
    autoBuildRoutineAssignmentsWithReport(classes, subjects, teachers, settings, rooms, groups);

  const handleAutoBuildAssignments = async () => {
    const built = buildAssignments().assignments;
    setAssignments(built);
    return built;
  };

  const handleValidate = async (): Promise<ValidationReport> => {
    const { assignments: list, warnings, unstaffed } = buildAssignments();
    const report = validateRoutineData(settings, classes, teachers, subjects, list, rooms, groups);
    // Strict rules that are provably impossible and per-teacher adjustments: warnings, because the engine relaxes them
    const { reasons, adjustments } = await diagnoseRoutineData(settings, classes, teachers, subjects, list, rooms, groups);
    const unstaffedItems: DiagnosticItem[] = unstaffed.map((u) => ({
      type: "faculty_shortage",
      severity: "error",
      title: `No teacher: ${u.className} ${u.section} - ${u.subjectName}`,
      description: `${u.periods} periods a week have no teacher, so this subject cannot be placed.`,
      solution: "Setup Hub → Teachers: tick this subject for a teacher in this section.",
      className: `${u.className} ${u.section}`,
      subjectName: u.subjectName,
    }));
    const errors = [...unstaffedItems.map((i) => i.title), ...report.errors];
    return {
      isValid: errors.length === 0,
      errors,
      warnings: [...warnings, ...reasons.map((r) => r.title), ...adjustments, ...report.warnings],
      diagnosticItems: [
        ...unstaffedItems,
        ...(report.diagnosticItems || []),
        ...reasons.map((r) => ({ ...r, severity: "warning" as const })),
      ],
    };
  };

  const handleGenerate = async (): Promise<GeneratedRoutine> => {
    const { assignments: list, warnings } = buildAssignments();
    setAssignments(list);
    const result = await generateRoutine(settings, classes, teachers, subjects, list, rooms, groups);
    if (result.success) {
      // Kept with the run so History can list them later
      result.metadata = { ...(result.metadata || {}), setupWarnings: warnings };
      if (!(await saveGeneratedRoutineDb(result))) {
        toast.error("Routine generated but not saved. The previous routine is still active.");
      }
    }
    return result;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 text-sm text-muted-foreground">
        <Spinner className="w-4 h-4 mr-2" /> Loading generator...
      </div>
    );
  }

  return (
    <RoutineGeneratorTab
      settings={settings}
      classes={classes}
      teachers={teachers}
      subjects={subjects}
      assignments={assignments}
      rooms={rooms}
      groups={groups}
      onValidate={handleValidate}
      onGenerate={handleGenerate}
      onAutoBuildAssignments={handleAutoBuildAssignments}
      onNavigateToViewer={() => router.push("/routine/viewer")}
    />
  );
}
