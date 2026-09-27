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
  GeneratedRoutine,
  ValidationReport,
  DEFAULT_ROUTINE_SETTINGS,
} from "@/lib/routine/types";
import { validateRoutineData, generateRoutine } from "@/lib/routine/routineGenerator";
import { autoBuildRoutineAssignments } from "@/lib/routine/routine-auto-assign";
import { RoutineGeneratorTab } from "@/components/routine/routine-generator-tab";
import { RefreshCw } from "lucide-react";

export default function RoutineGeneratePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<RoutineSettings>(DEFAULT_ROUTINE_SETTINGS);
  const [classes, setClasses] = useState<RoutineClass[]>([]);
  const [teachers, setTeachers] = useState<RoutineTeacher[]>([]);
  const [subjects, setSubjects] = useState<RoutineSubject[]>([]);
  const [assignments, setAssignments] = useState<RoutineAssignment[]>([]);
  const [rooms, setRooms] = useState<RoutineRoom[]>([]);

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
    } catch (err) {
      console.error("Failed to load routine data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAutoBuildAssignments = async () => {
    const built = autoBuildRoutineAssignments(classes, subjects, teachers, settings);
    setAssignments(built);
    return built;
  };

  const handleValidate = async (): Promise<ValidationReport> => {
    const activeAssignments =
      assignments.length > 0
        ? assignments
        : autoBuildRoutineAssignments(classes, subjects, teachers, settings);
    return validateRoutineData(settings, classes, teachers, subjects, activeAssignments, rooms);
  };

  const handleGenerate = async (): Promise<GeneratedRoutine> => {
    let activeAssignments = assignments;
    if (activeAssignments.length === 0) {
      activeAssignments = autoBuildRoutineAssignments(classes, subjects, teachers, settings);
      setAssignments(activeAssignments);
    }
    const result = generateRoutine(settings, classes, teachers, subjects, activeAssignments, rooms);
    if (result.success) {
      await saveGeneratedRoutineDb(result);
    }
    return result;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 text-sm text-muted-foreground">
        <RefreshCw className="w-4 h-4 animate-spin mr-2" /> Loading generator...
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
      onValidate={handleValidate}
      onGenerate={handleGenerate}
      onAutoBuildAssignments={handleAutoBuildAssignments}
      onNavigateToViewer={() => router.push("/routine/viewer")}
    />
  );
}
