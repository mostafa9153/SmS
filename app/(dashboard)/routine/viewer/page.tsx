"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
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
import { ArrowLeft } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";

function RoutineViewerContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const viewParam = searchParams.get("view") as
    | "master"
    | "master-teacher"
    | "class"
    | "teacher"
    | "room"
    | null;
  const teacherIdParam = searchParams.get("teacherId");
  const fromParam = searchParams.get("from");

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

  const handleBack = () => {
    if (typeof document !== "undefined" && document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
    router.push("/teacher");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 text-sm text-muted-foreground">
        <Spinner className="w-4 h-4 mr-2" /> Loading routine viewer...
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {fromParam === "teacher" && (
        <div className="print:hidden flex items-center justify-between pb-1">
          <button
            type="button"
            onClick={handleBack}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Teacher Workspace</span>
          </button>
        </div>
      )}
      <RoutineViewerTab
        settings={settings}
        classes={classes}
        subjects={subjects}
        teachers={teachers}
        rooms={rooms}
        routine={routine}
        initialViewMode={viewParam || "master"}
        initialTeacherId={teacherIdParam || undefined}
      />
    </div>
  );
}

export default function RoutineViewerPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center p-12 text-sm text-muted-foreground">
          <Spinner className="w-4 h-4 mr-2" /> Loading routine viewer...
        </div>
      }
    >
      <RoutineViewerContent />
    </Suspense>
  );
}
