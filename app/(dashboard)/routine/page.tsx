"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  fetchRoutineFullState,
  saveRoutineSettingsDb,
  upsertRoomDb,
  deleteRoomDb,
  upsertClassDb,
  batchUpsertClassesDb,
  deleteClassDb,
  upsertSubjectDb,
  batchUpsertSubjectsDb,
  deleteSubjectDb,
  upsertTeacherAvailabilityDb,
  deleteTeacherDb,
  RoutineFullState,
} from "@/lib/supabase/db-routine";
import { fetchSchoolConfigClient } from "@/lib/utils/school-config-client";
import {
  RoutineSettings,
  RoutineRoom,
  RoutineClass,
  RoutineSubject,
  RoutineTeacher,
  RoutineAssignment,
  DEFAULT_ROUTINE_SETTINGS,
} from "@/lib/routine/types";
import { RoutineSettingsTab } from "@/components/routine/routine-settings-tab";
import { RoutineRoomsTab } from "@/components/routine/routine-rooms-tab";
import { RoutineClassesTab } from "@/components/routine/routine-classes-tab";
import { RoutineTeachersTab } from "@/components/routine/routine-teachers-tab";
import { RoutineSubjectsTab } from "@/components/routine/routine-subjects-tab";
import { RoutineDemandAllotmentTab } from "@/components/routine/routine-demand-allotment-tab";
import { RoutineAllotmentOverviewTab } from "@/components/routine/routine-allotment-overview-tab";
import {
  Sliders,
  Building2,
  School,
  Users,
  BookOpen,
  RefreshCw,
  ArrowRight,
  CheckCircle2,
  BarChart3,
  LayoutGrid,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { showToast } from "@/components/ui/toast-banner";
import { normalizeClassToCode, syncAllSubjectsFromPresetsToRoutine } from "@/lib/routine/routine-sync";

type SetupTab = "settings" | "classes" | "subjects" | "teachers" | "rooms" | "overview" | "demand";

const VALID_TABS: SetupTab[] = ["settings", "classes", "subjects", "teachers", "rooms", "overview", "demand"];
function isValidTab(val: any): val is SetupTab {
  return VALID_TABS.includes(val);
}

function RoutineSetupPageContent() {
  const searchParams = useSearchParams();

  // Initialize active tab with strict priority: URL query param -> localStorage -> default "settings"
  const getInitialTab = (): SetupTab => {
    const tabParam = searchParams?.get("tab");
    if (tabParam && isValidTab(tabParam)) {
      return tabParam;
    }
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("sms_routine_active_tab");
        if (saved && isValidTab(saved)) {
          return saved;
        }
      } catch {}
    }
    return "settings";
  };

  const [activeTab, setActiveTab] = useState<SetupTab>(getInitialTab);
  const [loading, setLoading] = useState(true);

  // Listen to browser Back/Forward navigation
  useEffect(() => {
    const handlePopState = () => {
      const param = new URLSearchParams(window.location.search).get("tab");
      if (param && isValidTab(param)) {
        setActiveTab(param);
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  // Handle tab change with immediate state update, localStorage persistence, and URL sync
  const handleTabChange = (newTab: SetupTab) => {
    setActiveTab(newTab);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("sms_routine_active_tab", newTab);
      } catch {}
      const url = new URL(window.location.href);
      url.searchParams.set("tab", newTab);
      if (newTab !== "teachers") {
        url.searchParams.delete("teacherId");
        url.searchParams.delete("newTeacher");
      }
      window.history.replaceState(null, "", url.toString());
    }
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("sms_routine_active_tab", activeTab);
      } catch {}
      const url = new URL(window.location.href);
      if (url.searchParams.get("tab") !== activeTab) {
        url.searchParams.set("tab", activeTab);
        window.history.replaceState(null, "", url.toString());
      }
    }
  }, [activeTab]);

  // Core state
  const [settings, setSettings] = useState<RoutineSettings>(DEFAULT_ROUTINE_SETTINGS);
  const [rooms, setRooms] = useState<RoutineRoom[]>([]);
  const [classes, setClasses] = useState<RoutineClass[]>([]);
  const [teachers, setTeachers] = useState<RoutineTeacher[]>([]);
  const [subjects, setSubjects] = useState<RoutineSubject[]>([]);
  const [assignments, setAssignments] = useState<RoutineAssignment[]>([]);

  const loadData = React.useCallback(async (showSpinner = false) => {
    if (showSpinner) setLoading(true);
    try {
      // 1. Fetch centralized school config from server without force refreshing
      await fetchSchoolConfigClient(false).catch((e) => console.warn("Failed to sync school config:", e));
      // 2. Automatically sync subjects from Presets (/settings/presets?section=marks_scheme) to Routine
      await syncAllSubjectsFromPresetsToRoutine().catch((e) => console.warn("Auto-sync from presets:", e));
      // 3. Fetch routine full state from Supabase
      const data: RoutineFullState = await fetchRoutineFullState();
      setSettings(data.settings || DEFAULT_ROUTINE_SETTINGS);
      setRooms(data.rooms || []);
      setClasses(data.classes || []);
      setTeachers(data.teachers || []);
      setSubjects(data.subjects || []);
      setAssignments(data.assignments || []);
    } catch (err) {
      console.error("Failed to load routine setup data:", err);
    } finally {
      if (showSpinner) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData(true);

    let timeoutId: NodeJS.Timeout | null = null;
    const handleStateUpdate = () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        loadData(false);
      }, 300);
    };

    window.addEventListener("sms_routine_state_updated", handleStateUpdate);

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      window.removeEventListener("sms_routine_state_updated", handleStateUpdate);
    };
  }, [loadData]);

  // Handlers for Settings
  const handleSaveSettings = async (newSettings: RoutineSettings) => {
    setSettings(newSettings);
    await saveRoutineSettingsDb(newSettings);
  };

  // Handlers for Rooms
  const handleSaveRoom = async (roomData: { id?: string; name: string; isLab?: boolean }) => {
    const id = await upsertRoomDb(roomData);
    setRooms((prev) => {
      const idx = prev.findIndex((r) => r.id === id);
      const updated: RoutineRoom = { id, name: roomData.name, isLab: roomData.isLab };
      if (idx > -1) {
        const next = [...prev];
        next[idx] = updated;
        return next;
      }
      return [...prev, updated];
    });
  };

  const handleDeleteRoom = async (id: string) => {
    await deleteRoomDb(id);
    setRooms((prev) => prev.filter((r) => r.id !== id));
  };

  // Handlers for Classes
  const handleSaveClass = async (clsData: { id?: string; className: string; section: string; dailyPeriods?: number | null }) => {
    const id = await upsertClassDb(clsData);
    setClasses((prev) => {
      const idx = prev.findIndex((c) => c.id === id);
      const updated: RoutineClass = {
        id,
        className: clsData.className,
        section: clsData.section,
        dailyPeriods: clsData.dailyPeriods,
      };
      if (idx > -1) {
        const next = [...prev];
        next[idx] = updated;
        return next;
      }
      return [...prev, updated];
    });
  };

  const handleBatchSaveClasses = async (
    classesList: { id?: string; className: string; section: string; dailyPeriods?: number | null }[]
  ) => {
    const saved = await batchUpsertClassesDb(classesList);
    setClasses(saved);
  };

  const handleDeleteClass = async (id: string) => {
    await deleteClassDb(id);
    setClasses((prev) => prev.filter((c) => c.id !== id));
  };

  // Handlers for Subjects
  const handleSaveSubject = async (subjData: {
    id?: string;
    name: string;
    className?: string | null;
    classId?: string | null;
    stream?: string | null;
    isCommon?: boolean;
    isHard?: boolean;
    isLab?: boolean;
    timePref?: "any" | "morning" | "afternoon";
    allowMultiplePerDay?: boolean;
    maxPerDay?: number | null;
    periodsPerWeek?: number | null;
  }) => {
    const id = await upsertSubjectDb(subjData);
    setSubjects((prev) => {
      const idx = prev.findIndex((s) => s.id === id);
      const updated: RoutineSubject = {
        id,
        name: subjData.name,
        className: subjData.className || null,
        classId: subjData.classId || null,
        stream: subjData.stream || null,
        isCommon: Boolean(subjData.isCommon),
        isHard: Boolean(subjData.isHard),
        isLab: Boolean(subjData.isLab),
        timePref: subjData.timePref || "any",
        allowMultiplePerDay: Boolean(subjData.allowMultiplePerDay),
        maxPerDay:
          subjData.maxPerDay !== undefined && subjData.maxPerDay !== null
            ? Number(subjData.maxPerDay)
            : Boolean(subjData.allowMultiplePerDay)
            ? 2
            : 1,
        periodsPerWeek:
          subjData.periodsPerWeek !== undefined && subjData.periodsPerWeek !== null
            ? Number(subjData.periodsPerWeek)
            : 5,
      };
      if (idx > -1) {
        const next = [...prev];
        next[idx] = updated;
        return next;
      }
      return [...prev, updated];
    });
  };

  const handleDeleteSubject = async (id: string) => {
    const targetSub = subjects.find((s) => s.id === id);
    if (!targetSub) return;

    // Safety guard: Check if assigned to any teacher or scheduled in timetable
    const cleanSubLower = targetSub.name.trim().toLowerCase();
    const className = targetSub.className || "";
    const classCode = normalizeClassToCode(className);

    const assignedTeacher = teachers.find((t) => {
      const classSubs = t.classSubjects?.[className] || t.classSubjects?.[classCode] || [];
      if (classSubs.some((s) => s.trim().toLowerCase() === cleanSubLower)) {
        return true;
      }
      if (t.sectionSubjects) {
        for (const [key, subs] of Object.entries(t.sectionSubjects)) {
          if (
            (key.startsWith(`${className}::`) || key.startsWith(`${classCode}::`)) &&
            subs.some((s) => s.trim().toLowerCase() === cleanSubLower)
          ) {
            return true;
          }
        }
      }
      return false;
    });

    const isAssignedInTimetable = assignments.some((a) => a.subjectId === id);

    if (assignedTeacher || isAssignedInTimetable) {
      const teacherInfo = assignedTeacher ? ` (${assignedTeacher.name})` : "";
      showToast({
        type: "warning",
        title: "Subject In Use",
        description: `"${targetSub.name}" is assigned to teacher${teacherInfo} or scheduled in timetable. Please unassign first before removing.`,
      });
      return;
    }

    await deleteSubjectDb(id);
    showToast({
      type: "info",
      title: "Subject Removed",
      description: `"${targetSub.name}" has been removed from Routine.`,
    });
    setSubjects((prev) => prev.filter((s) => s.id !== id));
  };

  const handleBatchSaveSubjects = async (
    subjectsList: {
      id?: string;
      name: string;
      className?: string | null;
      classId?: string | null;
      stream?: string | null;
      isCommon?: boolean;
      isHard?: boolean;
      isLab?: boolean;
      timePref?: "any" | "morning" | "afternoon";
      allowMultiplePerDay?: boolean;
      maxPerDay?: number | null;
      periodsPerWeek?: number | null;
    }[]
  ) => {
    const saved = await batchUpsertSubjectsDb(subjectsList);
    setSubjects((prev) => {
      const next = [...prev];
      saved.forEach((sub) => {
        const idx = next.findIndex((s) => s.id === sub.id);
        if (idx > -1) {
          next[idx] = sub;
        } else {
          next.push(sub);
        }
      });
      return next;
    });
  };

  // Handlers for Teachers
  const handleSaveTeacher = async (teacherData: RoutineTeacher) => {
    await upsertTeacherAvailabilityDb(teacherData);
    setTeachers((prev) => {
      const idx = prev.findIndex((t) => t.id === teacherData.id);
      if (idx > -1) {
        const next = [...prev];
        next[idx] = teacherData;
        return next;
      }
      return [...prev, teacherData];
    });
  };

  const handleDeleteTeacher = async (id: string) => {
    await deleteTeacherDb(id);
    setTeachers((prev) => prev.filter((t) => t.id !== id));
    setAssignments((prev) => prev.filter((a) => a.teacherId !== id));
  };

  const setupTabs = [
    { id: "settings", label: "Global Settings", icon: Sliders },
    { id: "classes", label: "Classes", icon: School, count: classes.length },
    { id: "subjects", label: "Subjects", icon: BookOpen, count: subjects.length },
    { id: "teachers", label: "Teachers", icon: Users, count: teachers.length },
    { id: "rooms", label: "Rooms & Labs", icon: Building2, count: rooms.length },
    { id: "overview", label: "Allotment Overview", icon: LayoutGrid },
    { id: "demand", label: "Demand vs Allotment", icon: BarChart3 },
  ];

  return (
    <div className="space-y-5 w-full">
      {/* Quick Setup Stats Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
        <div className="bg-card border rounded-lg p-3 flex flex-col justify-between shadow-xs">
          <span className="text-[11px] font-medium text-muted-foreground">Working Schedule</span>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-base font-bold text-foreground font-mono">{settings.workingDays.length} Days</span>
            <span className="text-[11px] text-muted-foreground font-mono">({settings.periodsPerDay} P/D)</span>
          </div>
        </div>

        <div className="bg-card border rounded-lg p-3 flex flex-col justify-between shadow-xs">
          <span className="text-[11px] font-medium text-muted-foreground">Configured Classes</span>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-base font-bold text-foreground font-mono">{classes.length}</span>
            <span className="text-[11px] text-muted-foreground">sections</span>
          </div>
        </div>

        <div className="bg-card border rounded-lg p-3 flex flex-col justify-between shadow-xs">
          <span className="text-[11px] font-medium text-muted-foreground">Curriculum Subjects</span>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-base font-bold text-foreground font-mono">{subjects.length}</span>
            <span className="text-[11px] text-muted-foreground">courses</span>
          </div>
        </div>

        <div className="bg-card border rounded-lg p-3 flex flex-col justify-between shadow-xs">
          <span className="text-[11px] font-medium text-muted-foreground">Active Faculty</span>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-base font-bold text-foreground font-mono">{teachers.length}</span>
            <span className="text-[11px] text-muted-foreground">teachers</span>
          </div>
        </div>

        <div className="bg-card border rounded-lg p-3 flex flex-col justify-between shadow-xs col-span-2 sm:col-span-1">
          <span className="text-[11px] font-medium text-muted-foreground">Dedicated Rooms</span>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-base font-bold text-foreground font-mono">{rooms.length}</span>
            <span className="text-[11px] text-muted-foreground">facilities</span>
          </div>
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="flex items-center gap-1.5 border-b border-border pb-2 overflow-x-auto text-xs font-semibold scrollbar-none">
        {setupTabs.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleTabChange(item.id as SetupTab)}
              className={cn(
                "px-3.5 py-1.5 rounded-md flex items-center gap-2 whitespace-nowrap transition-all select-none border",
                isActive
                  ? "bg-primary text-primary-foreground border-primary shadow-xs font-bold"
                  : "bg-background text-muted-foreground border-border/80 hover:bg-muted/70 hover:text-foreground"
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{item.label}</span>
              {typeof item.count === "number" && (
                <Badge
                  variant={isActive ? "secondary" : "outline"}
                  className={cn(
                    "text-[10px] px-1.5 py-0 font-mono font-bold leading-tight",
                    isActive
                      ? "bg-primary-foreground/20 text-primary-foreground border-transparent"
                      : "bg-muted/60 text-muted-foreground"
                  )}
                >
                  {item.count}
                </Badge>
              )}
            </button>
          );
        })}
      </div>

      {/* Main Tab Content */}
      <div className="pt-1">
        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center gap-2 text-muted-foreground text-xs">
            <RefreshCw className="h-5 w-5 animate-spin text-primary" />
            <span>Loading Routine Configuration...</span>
          </div>
        ) : (
          <>
            {activeTab === "settings" && (
              <RoutineSettingsTab
                settings={settings}
                onSave={handleSaveSettings}
                isLoading={loading}
              />
            )}

            {activeTab === "classes" && (
              <RoutineClassesTab
                classes={classes}
                settings={settings}
                onSaveClass={handleSaveClass}
                onBatchSaveClasses={handleBatchSaveClasses}
                onDeleteClass={handleDeleteClass}
              />
            )}

            {activeTab === "subjects" && (
              <RoutineSubjectsTab
                subjects={subjects}
                classes={classes}
                onSaveSubject={handleSaveSubject}
                onBatchSaveSubjects={handleBatchSaveSubjects}
                onDeleteSubject={handleDeleteSubject}
              />
            )}

            {activeTab === "teachers" && (
              <RoutineTeachersTab
                teachers={teachers}
                assignments={assignments}
                settings={settings}
                classes={classes}
                subjects={subjects}
                onSaveTeacher={handleSaveTeacher}
                onDeleteTeacher={handleDeleteTeacher}
              />
            )}

            {activeTab === "rooms" && (
              <RoutineRoomsTab
                rooms={rooms}
                onSaveRoom={handleSaveRoom}
                onDeleteRoom={handleDeleteRoom}
              />
            )}

            {activeTab === "overview" && (
              <RoutineAllotmentOverviewTab
                classes={classes}
                subjects={subjects}
                teachers={teachers}
                assignments={assignments}
                settings={settings}
              />
            )}

            {activeTab === "demand" && (
              <RoutineDemandAllotmentTab
                classes={classes}
                subjects={subjects}
                teachers={teachers}
                assignments={assignments}
                settings={settings}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function RoutineSetupPage() {
  return (
    <Suspense
      fallback={
        <div className="py-16 flex flex-col items-center justify-center gap-2 text-muted-foreground text-xs">
          <RefreshCw className="h-5 w-5 animate-spin text-primary" />
          <span>Loading Routine Setup...</span>
        </div>
      }
    >
      <RoutineSetupPageContent />
    </Suspense>
  );
}


