"use client";

import React, { useState, useEffect } from "react";
import {
  fetchRoutineFullState,
  RoutineFullState,
} from "@/lib/supabase/db-routine";
import {
  RoutineSettings,
  RoutineClass,
  RoutineSubject,
  RoutineTeacher,
  RoutineRoom,
  GeneratedRoutine,
  DEFAULT_ROUTINE_SETTINGS,
} from "@/lib/routine/types";
import { RoutineViewerTab } from "@/components/routine/routine-viewer-tab";
import { RefreshCw } from "lucide-react";

export default function RoutineViewerPage() {
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<RoutineSettings>(DEFAULT_ROUTINE_SETTINGS);
  const [classes, setClasses] = useState<RoutineClass[]>([]);
  const [subjects, setSubjects] = useState<RoutineSubject[]>([]);
  const [teachers, setTeachers] = useState<RoutineTeacher[]>([]);
  const [rooms, setRooms] = useState<RoutineRoom[]>([]);
  const [routine, setRoutine] = useState<GeneratedRoutine | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const data: RoutineFullState = await fetchRoutineFullState();
      setSettings(data.settings || DEFAULT_ROUTINE_SETTINGS);
      setClasses(data.classes || []);
      setSubjects(data.subjects || []);
      setTeachers(data.teachers || []);
      setRooms(data.rooms || []);
      setRoutine(data.routine || null);
    } catch (err) {
      console.error("Failed to load routine for viewer:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    const handleStateUpdated = () => {
      loadData();
    };

    window.addEventListener("sms_routine_state_updated", handleStateUpdated);
    return () => {
      window.removeEventListener("sms_routine_state_updated", handleStateUpdated);
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 text-sm text-muted-foreground">
        <RefreshCw className="w-4 h-4 animate-spin mr-2" /> Loading routine viewer...
      </div>
    );
  }

  return (
    <RoutineViewerTab
      settings={settings}
      classes={classes}
      subjects={subjects}
      teachers={teachers}
      rooms={rooms}
      routine={routine}
    />
  );
}
