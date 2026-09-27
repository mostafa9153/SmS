"use client";

import React, { useState, useEffect } from "react";
import {
  fetchRoutineFullState,
  batchUpsertAssignmentsDb,
  RoutineFullState,
} from "@/lib/supabase/db-routine";
import {
  RoutineClass,
  RoutineSubject,
  RoutineRoom,
  RoutineTeacher,
  RoutineAssignment,
  RoutineSettings,
  DEFAULT_ROUTINE_SETTINGS,
} from "@/lib/routine/types";
import { RoutineVerificationTab } from "@/components/routine/routine-verification-tab";
import { RefreshCw } from "lucide-react";

export default function RoutineVerificationPage() {
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<RoutineSettings>(DEFAULT_ROUTINE_SETTINGS);
  const [classes, setClasses] = useState<RoutineClass[]>([]);
  const [subjects, setSubjects] = useState<RoutineSubject[]>([]);
  const [rooms, setRooms] = useState<RoutineRoom[]>([]);
  const [teachers, setTeachers] = useState<RoutineTeacher[]>([]);
  const [assignments, setAssignments] = useState<RoutineAssignment[]>([]);

  const loadData = async () => {
    setLoading(true);
    try {
      const data: RoutineFullState = await fetchRoutineFullState();
      setSettings(data.settings || DEFAULT_ROUTINE_SETTINGS);
      setClasses(data.classes || []);
      setSubjects(data.subjects || []);
      setRooms(data.rooms || []);
      setTeachers(data.teachers || []);
      setAssignments(data.assignments || []);
    } catch (err) {
      console.error("Failed to load verification state:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSaveAssignments = async (newAssignments: RoutineAssignment[]) => {
    await batchUpsertAssignmentsDb(newAssignments);
    setAssignments(newAssignments);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 text-sm text-muted-foreground">
        <RefreshCw className="w-4 h-4 animate-spin mr-2" /> Loading verification engine...
      </div>
    );
  }

  return (
    <RoutineVerificationTab
      settings={settings}
      classes={classes}
      subjects={subjects}
      teachers={teachers}
      assignments={assignments}
      rooms={rooms}
      onSaveAssignments={handleSaveAssignments}
    />
  );
}
