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
  DEFAULT_ROUTINE_SETTINGS,
} from "@/lib/routine/types";
import { validateRoutineData, generateRoutine, diagnoseRoutineData } from "@/lib/routine/routineGenerator";
import {
  autoBuildRoutineAssignments,
  autoBuildRoutineAssignmentsWithReport,
  assignmentsAreCurrent,
} from "@/lib/routine/routine-auto-assign";
import { RoutineGeneratorTab } from "@/components/routine/routine-generator-tab";
import { RefreshCw } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";

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

  const handleAutoBuildAssignments = async () => {
    const built = autoBuildRoutineAssignments(classes, subjects, teachers, settings, rooms, groups);
    setAssignments(built);
    return built;
  };

  // Stored assignments are used only while they still match the current data; otherwise rebuild
  const resolveAssignments = () => {
    if (assignmentsAreCurrent(assignments, classes, subjects, teachers, groups)) {
      return { list: assignments, warnings: [] as string[], rebuilt: false };
    }
    const built = autoBuildRoutineAssignmentsWithReport(classes, subjects, teachers, settings, rooms, groups);
    return { list: built.assignments, warnings: built.warnings, rebuilt: true };
  };

  const handleValidate = async (): Promise<ValidationReport> => {
    const { list, warnings } = resolveAssignments();
    const report = validateRoutineData(settings, classes, teachers, subjects, list, rooms, groups);
    // Strict rules that are provably impossible and per-teacher adjustments: warnings, because the engine relaxes them
    const { reasons, adjustments } = await diagnoseRoutineData(settings, classes, teachers, subjects, list, rooms, groups);
    return {
      ...report,
      warnings: [...warnings, ...reasons.map((r) => r.title), ...adjustments, ...report.warnings],
      diagnosticItems: [
        ...(report.diagnosticItems || []),
        ...reasons.map((r) => ({ ...r, severity: "warning" as const })),
      ],
    };
  };

  const handleGenerate = async (): Promise<GeneratedRoutine> => {
    const { list: activeAssignments, rebuilt } = resolveAssignments();
    if (rebuilt) setAssignments(activeAssignments);
    const result = await generateRoutine(settings, classes, teachers, subjects, activeAssignments, rooms, groups);
    if (result.success) {
      await saveGeneratedRoutineDb(result);
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
