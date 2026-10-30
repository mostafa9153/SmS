"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import { GeneratedRoutine, RoutineGrid } from "@/lib/routine/types";
import { getClassNumericRank } from "@/lib/ems/ems-config-loader";
import { getCellOptions } from "@/lib/routine/routine-groups";
import { ViewMode } from "@/components/routine/viewer/types";

import type { RoutineViewerTabProps } from "./props";

export function useViewerCore({
  routine: initialRoutine,
  settings,
  classes,
  teachers,
  subjects,
  rooms,
  initialViewMode = "master",
  initialTeacherId,
  initialFullscreen = false,
  onExitFullscreen,
  hideViewModeSelector = false,
}: RoutineViewerTabProps) {
  const sortedClasses = useMemo(() => {
    return [...classes].sort((a, b) => {
      const rankA = getClassNumericRank(a.className);
      const rankB = getClassNumericRank(b.className);
      if (rankA !== rankB) return rankA - rankB;
      return a.section.localeCompare(b.section);
    });
  }, [classes]);

  const [routine, setRoutine] = useState<GeneratedRoutine | null>(initialRoutine);
  const [history, setHistory] = useState<RoutineGrid[]>([]);
  const [draggedPos, setDraggedPos] = useState<{ classId: string; dPos: number; pPos: number } | null>(null);
  const [dragOverPos, setDragOverPos] = useState<{ classId: string; dPos: number; pPos: number } | null>(null);

  useEffect(() => {
    setRoutine(initialRoutine);
  }, [initialRoutine]);

  const [viewMode, setViewMode] = useState<ViewMode>(initialViewMode);
  const [masterDaySelection, setMasterDaySelection] = useState<string>("0");
  const isAllDaysMaster = masterDaySelection === "ALL" && (viewMode === "master" || viewMode === "master-teacher");
  const masterDayIdx = masterDaySelection === "ALL" ? 0 : (parseInt(masterDaySelection, 10) || 0);
  const [masterSectionFilter, setMasterSectionFilter] = useState<string>("ALL");
  const [selectedClassId, setSelectedClassId] = useState<string>(sortedClasses[0]?.id || "");
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>(
    initialTeacherId || teachers[0]?.id || ""
  );
  const [selectedRoomId, setSelectedRoomId] = useState<string>(rooms[0]?.id || "");

  useEffect(() => {
    if (initialTeacherId) {
      if (teachers.length > 0) {
        const match = teachers.find(
          (t) =>
            t.id === initialTeacherId ||
            t.name.toLowerCase() === initialTeacherId.toLowerCase()
        );
        setSelectedTeacherId(match ? match.id : initialTeacherId);
      } else {
        setSelectedTeacherId(initialTeacherId);
      }
    }
  }, [initialTeacherId, teachers]);

  useEffect(() => {
    if (initialViewMode) {
      setViewMode(initialViewMode);
    }
  }, [initialViewMode]);

  const [isFullscreen, setIsFullscreen] = useState(initialFullscreen);
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const containerRef = useRef<HTMLDivElement>(null);
  const printSheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Shrink the timetable so the whole routine fits one A3 landscape sheet when printing.
    const PX_PER_MM = 96 / 25.4;
    const PRINT_HEADER_RESERVE_PX = 90;
    const fitToPage = () => {
      const sheet = printSheetRef.current;
      if (!sheet) return;
      sheet.style.zoom = "";
      const maxW = 420 * PX_PER_MM;
      const maxH = 297 * PX_PER_MM - PRINT_HEADER_RESERVE_PX;
      const scale = Math.min(1, maxW / sheet.offsetWidth, maxH / sheet.offsetHeight);
      if (scale < 1) sheet.style.zoom = String(scale);
    };
    const resetFit = () => {
      if (printSheetRef.current) printSheetRef.current.style.zoom = "";
    };
    window.addEventListener("beforeprint", fitToPage);
    window.addEventListener("afterprint", resetFit);
    return () => {
      window.removeEventListener("beforeprint", fitToPage);
      window.removeEventListener("afterprint", resetFit);
    };
  }, []);

  const toggleFullscreen = () => {
    if (!isFullscreen) {
      setIsFullscreen(true);
      if (containerRef.current && containerRef.current.requestFullscreen) {
        containerRef.current.requestFullscreen().catch(() => {});
      }
    } else {
      if (typeof document !== "undefined" && document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
      setIsFullscreen(false);
      onExitFullscreen?.();
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      if (typeof document !== "undefined") {
        if (!document.fullscreenElement && isFullscreen) {
          setIsFullscreen(false);
          onExitFullscreen?.();
        } else if (document.fullscreenElement && !isFullscreen) {
          setIsFullscreen(true);
        }
      }
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, [isFullscreen, onExitFullscreen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isFullscreen) {
        if (typeof document !== "undefined" && document.fullscreenElement) {
          document.exitFullscreen().catch(() => {});
        }
        setIsFullscreen(false);
        onExitFullscreen?.();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFullscreen, onExitFullscreen]);

  useEffect(() => {
    const currentRef = containerRef.current;
    if (!currentRef) return;

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey) {
        e.preventDefault();
        if (e.deltaY < 0) {
          setZoomLevel((prev) => Math.min(150, prev + 10));
        } else {
          setZoomLevel((prev) => Math.max(60, prev - 10));
        }
      }
    };

    currentRef.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      currentRef.removeEventListener("wheel", handleWheel);
    };
  }, []);

  const classMap = useMemo(() => new Map(classes.map((c) => [c.id, c])), [classes]);
  const teacherMap = useMemo(() => new Map(teachers.map((t) => [t.id, t])), [teachers]);
  const subjectMap = useMemo(() => new Map(subjects.map((s) => [s.id, s])), [subjects]);
  const roomMap = useMemo(() => new Map(rooms.map((r) => [r.id, r])), [rooms]);

  const activeDays = routine?.days || settings.workingDays;
  const halfDays = settings.halfDays || [];
  const maxHalfP = settings.halfDayPeriods || 4;

  // Distinct class names list
  const distinctClassNames = useMemo(() => {
    const set = new Set<string>();
    const list: string[] = [];
    sortedClasses.forEach((c) => {
      if (!set.has(c.className)) {
        set.add(c.className);
        list.push(c.className);
      }
    });
    return list;
  }, [sortedClasses]);

  // Selected class object
  const currentClassObj = useMemo(() => {
    return classMap.get(selectedClassId) || sortedClasses[0];
  }, [classMap, selectedClassId, sortedClasses]);

  const currentClassName = currentClassObj?.className || distinctClassNames[0] || "";

  // Available sections for the current selected class
  const availableSectionsForCurrentClass = useMemo(() => {
    return sortedClasses.filter((c) => c.className === currentClassName);
  }, [sortedClasses, currentClassName]);

  // Distinct section names across all classes for master section filter
  const allDistinctSectionNames = useMemo(() => {
    const set = new Set<string>();
    const list: string[] = [];
    sortedClasses.forEach((c) => {
      const sec = c.section || "A";
      if (!set.has(sec)) {
        set.add(sec);
        list.push(sec);
      }
    });
    return list;
  }, [sortedClasses]);

  // Classes filtered for Master view
  const displayedMasterClasses = useMemo(() => {
    if (masterSectionFilter === "ALL") return sortedClasses;
    return sortedClasses.filter((c) => (c.section || "A") === masterSectionFilter);
  }, [sortedClasses, masterSectionFilter]);

  // Master Faculty filter & list for Master Teacher-wise view
  const [masterFacultyFilter, setMasterFacultyFilter] = useState<string>("ALL");

  const distinctFacultySubjects = useMemo(() => {
    const set = new Set<string>();
    teachers.forEach((t) => {
      if (t.primarySubject && t.primarySubject.trim()) {
        set.add(t.primarySubject.trim());
      }
    });
    return Array.from(set).sort();
  }, [teachers]);

  const displayedMasterTeachers = useMemo(() => {
    let list = [...teachers].sort((a, b) => (a.shortName || a.name).localeCompare(b.shortName || b.name));
    if (masterFacultyFilter !== "ALL") {
      list = list.filter((t) => t.primarySubject?.trim() === masterFacultyFilter);
    }
    return list;
  }, [teachers, masterFacultyFilter]);

  const handleSelectClass = (clsName: string) => {
    const match = sortedClasses.find((c) => c.className === clsName);
    if (match) setSelectedClassId(match.id);
  };

  const handleSelectSection = (classId: string) => {
    setSelectedClassId(classId);
  };

  // Auto-sync initial selections when data loads
  React.useEffect(() => {
    if (!selectedClassId && classes.length > 0) setSelectedClassId(classes[0].id);
  }, [classes, selectedClassId]);

  React.useEffect(() => {
    if (!selectedTeacherId && teachers.length > 0) setSelectedTeacherId(teachers[0].id);
  }, [teachers, selectedTeacherId]);

  React.useEffect(() => {
    if (!selectedRoomId && rooms.length > 0) setSelectedRoomId(rooms[0].id);
  }, [rooms, selectedRoomId]);

  // Compute teacher double-booking clashes for current active master day(s)
  const dayClashes = useMemo(() => {
    if (!routine?.grid || (viewMode !== "master" && viewMode !== "master-teacher")) return new Map<string, string>();
    const map = new Map<string, string>();
    const dPositions = isAllDaysMaster
      ? activeDays.map((_, idx) => idx)
      : [masterDayIdx];

    for (const dPos of dPositions) {
      for (let pPos = 0; pPos < settings.periodsPerDay; pPos++) {
        // Collect (teacherId -> { classIds, unitKeys }). A unit key is `gid`
        // when the cell is a group placement, else the cell's `uid` from the
        // solver. Two member classes sharing the same group cell share the
        // same unit key — that is NOT a clash, so we count distinct units.
        const teacherSeen = new Map<
          string,
          { classIds: Set<string>; units: Set<string | number> }
        >();
        for (const [cid, classSchedule] of Object.entries(routine.grid)) {
          const cell = classSchedule?.[dPos]?.[pPos];
          if (!cell) continue;
          const unitKey = (cell.gid as string | undefined) ?? cell.uid;
          // Every option-teacher in this cell occupies this slot once per unit.
          const tids = getCellOptions(cell).map((o) => o.tid);
          for (const tid of tids) {
            if (!tid) continue;
            let entry = teacherSeen.get(tid);
            if (!entry) {
              entry = { classIds: new Set(), units: new Set() };
              teacherSeen.set(tid, entry);
            }
            entry.classIds.add(cid);
            entry.units.add(unitKey);
          }
        }

        for (const [tid, entry] of teacherSeen.entries()) {
          if (entry.units.size > 1) {
            const tch = teacherMap.get(tid);
            const tName = tch?.shortName || tch?.name || "Teacher";
            entry.classIds.forEach((cid) => {
              const otherClasses = Array.from(entry.classIds)
                .filter((id) => id !== cid)
                .map((id) => `${classMap.get(id)?.className || ""}-${classMap.get(id)?.section || ""}`)
                .join(", ");
              map.set(`${cid}_${dPos}_${pPos}`, `Clash: ${tName} double-booked with ${otherClasses}`);
              map.set(`${cid}_${pPos}`, `Clash: ${tName} double-booked with ${otherClasses}`);
            });
          }
        }
      }
    }
    return map;
  }, [routine?.grid, isAllDaysMaster, activeDays, masterDayIdx, settings.periodsPerDay, teacherMap, classMap, viewMode]);

  return {
    activeDays,
    allDistinctSectionNames,
    availableSectionsForCurrentClass,
    classMap,
    classes,
    containerRef,
    currentClassName,
    currentClassObj,
    dayClashes,
    displayedMasterClasses,
    displayedMasterTeachers,
    distinctClassNames,
    distinctFacultySubjects,
    dragOverPos,
    draggedPos,
    halfDays,
    handleSelectClass,
    handleSelectSection,
    hideViewModeSelector,
    history,
    initialFullscreen,
    initialTeacherId,
    initialViewMode,
    isAllDaysMaster,
    isFullscreen,
    masterDayIdx,
    masterDaySelection,
    masterFacultyFilter,
    masterSectionFilter,
    maxHalfP,
    onExitFullscreen,
    printSheetRef,
    roomMap,
    rooms,
    routine,
    selectedClassId,
    selectedRoomId,
    selectedTeacherId,
    setDragOverPos,
    setDraggedPos,
    setHistory,
    setIsFullscreen,
    setMasterDaySelection,
    setMasterFacultyFilter,
    setMasterSectionFilter,
    setRoutine,
    setSelectedClassId,
    setSelectedRoomId,
    setSelectedTeacherId,
    setViewMode,
    setZoomLevel,
    settings,
    sortedClasses,
    subjectMap,
    subjects,
    teacherMap,
    teachers,
    toggleFullscreen,
    viewMode,
    zoomLevel,
  };
}

export type ViewerCoreState = ReturnType<typeof useViewerCore>;
