"use client";

import React, { useState, useEffect } from "react";
import {
  fetchRoutineFullState,
  batchUpsertAssignmentsDb,
  upsertAssignmentDb,
  deleteAssignmentDb,
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
import { RoutineAssignmentsTab } from "@/components/routine/routine-assignments-tab";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ShieldCheck, Layers, RefreshCw } from "lucide-react";

export default function RoutineAssignmentsPage() {
  const [activeTab, setActiveTab] = useState<"verification" | "manual">("verification");
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

  const handleSaveAssignments = async (newAssignments: RoutineAssignment[]) => {
    await batchUpsertAssignmentsDb(newAssignments);
    setAssignments(newAssignments);
  };

  const handleSaveSingleAssignment = async (asg: {
    id?: string;
    classId: string;
    subjectId: string;
    teacherId: string;
    roomId?: string | null;
    periodsPerWeek: number;
  }) => {
    await upsertAssignmentDb(asg);
    const updated = await fetchRoutineFullState();
    setAssignments(updated.assignments || []);
  };

  const handleDeleteSingleAssignment = async (id: string) => {
    await deleteAssignmentDb(id);
    const updated = await fetchRoutineFullState();
    setAssignments(updated.assignments || []);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 text-sm text-muted-foreground">
        <RefreshCw className="w-4 h-4 animate-spin mr-2" /> Loading verification engine...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Tabs
        value={activeTab}
        onValueChange={(val) => setActiveTab(val as "verification" | "manual")}
        className="w-full"
      >
        <div className="flex items-center justify-between pb-1 border-b">
          <TabsList className="grid grid-cols-2 w-[380px]">
            <TabsTrigger value="verification" className="flex items-center gap-1.5 text-xs font-semibold">
              <ShieldCheck className="w-4 h-4" />
              Verification & Audit
            </TabsTrigger>
            <TabsTrigger value="manual" className="flex items-center gap-1.5 text-xs font-semibold">
              <Layers className="w-4 h-4" />
              Manual Workload Allotment
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="verification" className="mt-4">
          <RoutineVerificationTab
            settings={settings}
            classes={classes}
            subjects={subjects}
            teachers={teachers}
            assignments={assignments}
            rooms={rooms}
            onSaveAssignments={handleSaveAssignments}
          />
        </TabsContent>

        <TabsContent value="manual" className="mt-4">
          <RoutineAssignmentsTab
            assignments={assignments}
            classes={classes}
            subjects={subjects}
            teachers={teachers}
            rooms={rooms}
            onSaveAssignment={handleSaveSingleAssignment}
            onDeleteAssignment={handleDeleteSingleAssignment}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
