"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import Link from "next/link";
import {
  GeneratedRoutine,
  RoutineSettings,
  RoutineClass,
  RoutineTeacher,
  RoutineSubject,
  RoutineRoom,
  DAY_NAMES,
  RoutineGrid,
} from "@/lib/routine/types";
import { Button } from "@/components/ui/button";
import {
  Printer,
  FileDown,
  Calendar,
  Users,
  School,
  Building2,
  Coffee,
  Sparkles,
  ArrowRight,
  Sliders,
  RotateCcw,
  GripVertical,
  AlertTriangle,
  ChevronDown,
  Check,
  Filter,
  UserCheck,
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getClassNumericRank } from "@/lib/ems/ems-config-loader";
import { showToast } from "@/components/ui/toast-banner";
import { saveGeneratedRoutineDb } from "@/lib/supabase/db-routine";
import {
  getCellOptions,
  cellHasTeacher,
  cellHasRoom,
} from "@/lib/routine/routine-groups";

interface RoutineViewerTabProps {
  routine: GeneratedRoutine | null;
  settings: RoutineSettings;
  classes: RoutineClass[];
  teachers: RoutineTeacher[];
  subjects: RoutineSubject[];
  rooms: RoutineRoom[];
  initialViewMode?: ViewMode;
  initialTeacherId?: string;
  initialFullscreen?: boolean;
  onExitFullscreen?: () => void;
  hideViewModeSelector?: boolean;
}

function getSubjectShort(name: string): string {
  if (!name) return "?";
  const cleaned = name.trim();
  const upper = cleaned.toUpperCase();
  if (upper.includes("BENGALI") || upper.includes("BANGLA")) return "BEN";
  if (upper.includes("ENGLISH")) return "ENG";
  if (upper.includes("MATH")) return "MATH";
  if (upper.includes("PHYSICAL SCIENCE") || upper.includes("PHYSICS")) return "PSC";
  if (upper.includes("LIFE SCIENCE") || upper.includes("BIOLOGY")) return "LSC";
  if (upper.includes("CHEMISTRY")) return "CHEM";
  if (upper.includes("HISTORY")) return "HIST";
  if (upper.includes("GEOGRAPHY")) return "GEO";
  if (upper.includes("PHILOSOPHY")) return "PHIL";
  if (upper.includes("ENVIRONMENT")) return "EVS";
  if (upper.includes("SANSKRIT")) return "SNS";
  if (upper.includes("COMPUTER")) return "COMP";
  if (upper.includes("HEALTH") || upper.includes("PHYSICAL EDUCATION")) return "P.ED";
  if (upper.includes("WORK EDUCATION")) return "W.ED";
  if (upper.includes("ARABIC")) return "ARB";
  if (cleaned.length <= 4) return cleaned.toUpperCase();
  const words = cleaned.split(/\s+/);
  if (words.length > 1) {
    return words.slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  }
  return cleaned.slice(0, 4).toUpperCase();
}

function getClassShort(className: string, section?: string): string {
  const shortCls = className.replace(/Class\s*/i, "").trim();
  if (!section || section === "ALL") return shortCls;
  return `${shortCls}-${section}`;
}

const DAY_COLOR_THEMES = [
  {
    // Monday (0) - Blue
    headerBg: "bg-blue-500/10 dark:bg-blue-950/40",
    headerText: "text-blue-900 dark:text-blue-200",
    headerBorder: "border-b-2 border-b-blue-500",
    subHeaderBg: "bg-blue-500/[0.05] dark:bg-blue-950/30",
    cellColBg: "bg-blue-500/[0.025] dark:bg-blue-500/[0.03]",
    dividerBorder: "!border-r-[4px] !border-double !border-r-blue-400 dark:!border-r-blue-500",
  },
  {
    // Tuesday (1) - Emerald
    headerBg: "bg-emerald-500/10 dark:bg-emerald-950/40",
    headerText: "text-emerald-900 dark:text-emerald-200",
    headerBorder: "border-b-2 border-b-emerald-500",
    subHeaderBg: "bg-emerald-500/[0.05] dark:bg-emerald-950/30",
    cellColBg: "bg-emerald-500/[0.025] dark:bg-emerald-500/[0.03]",
    dividerBorder: "!border-r-[4px] !border-double !border-r-emerald-400 dark:!border-r-emerald-500",
  },
  {
    // Wednesday (2) - Purple
    headerBg: "bg-purple-500/10 dark:bg-purple-950/40",
    headerText: "text-purple-900 dark:text-purple-200",
    headerBorder: "border-b-2 border-b-purple-500",
    subHeaderBg: "bg-purple-500/[0.05] dark:bg-purple-950/30",
    cellColBg: "bg-purple-500/[0.025] dark:bg-purple-500/[0.03]",
    dividerBorder: "!border-r-[4px] !border-double !border-r-purple-400 dark:!border-r-purple-500",
  },
  {
    // Thursday (3) - Amber
    headerBg: "bg-amber-500/10 dark:bg-amber-950/40",
    headerText: "text-amber-900 dark:text-amber-200",
    headerBorder: "border-b-2 border-b-amber-500",
    subHeaderBg: "bg-amber-500/[0.05] dark:bg-amber-950/30",
    cellColBg: "bg-amber-500/[0.025] dark:bg-amber-500/[0.03]",
    dividerBorder: "!border-r-[4px] !border-double !border-r-amber-400 dark:!border-r-amber-500",
  },
  {
    // Friday (4) - Rose
    headerBg: "bg-rose-500/10 dark:bg-rose-950/40",
    headerText: "text-rose-900 dark:text-rose-200",
    headerBorder: "border-b-2 border-b-rose-500",
    subHeaderBg: "bg-rose-500/[0.05] dark:bg-rose-950/30",
    cellColBg: "bg-rose-500/[0.025] dark:bg-rose-500/[0.03]",
    dividerBorder: "!border-r-[4px] !border-double !border-r-rose-400 dark:!border-r-rose-500",
  },
  {
    // Saturday (5) - Cyan
    headerBg: "bg-cyan-500/10 dark:bg-cyan-950/40",
    headerText: "text-cyan-900 dark:text-cyan-200",
    headerBorder: "border-b-2 border-b-cyan-500",
    subHeaderBg: "bg-cyan-500/[0.05] dark:bg-cyan-950/30",
    cellColBg: "bg-cyan-500/[0.025] dark:bg-cyan-500/[0.03]",
    dividerBorder: "!border-r-[4px] !border-double !border-r-cyan-400 dark:!border-r-cyan-500",
  },
  {
    // Sunday (6) - Indigo
    headerBg: "bg-indigo-500/10 dark:bg-indigo-950/40",
    headerText: "text-indigo-900 dark:text-indigo-200",
    headerBorder: "border-b-2 border-b-indigo-500",
    subHeaderBg: "bg-indigo-500/[0.05] dark:bg-indigo-950/30",
    cellColBg: "bg-indigo-500/[0.025] dark:bg-indigo-500/[0.03]",
    dividerBorder: "!border-r-[4px] !border-double !border-r-indigo-400 dark:!border-r-indigo-500",
  },
];

const TIFFIN_BREAK_BORDER = "!border-r-2 !border-r-foreground/60 dark:!border-r-foreground/50 print:!border-r-2 print:!border-black";

type ViewMode = "master" | "master-teacher" | "class" | "teacher" | "room";

function ViewerDropdown({
  value,
  onChange,
  options,
  icon,
  labelPrefix,
  placeholder = "Select...",
  className,
}: {
  value: string;
  onChange: (val: string) => void;
  options: { value: string; label: string }[];
  icon?: React.ReactNode;
  labelPrefix?: string;
  placeholder?: string;
  className?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const selected = options.find((o) => o.value === value);

  return (
    <div className="relative inline-block" ref={ref}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "h-8 px-2.5 rounded-md border border-input bg-background hover:bg-muted/40 text-xs font-medium flex items-center gap-1.5 transition-all shadow-2xs select-none cursor-pointer",
          isOpen && "ring-1 ring-primary border-primary",
          className
        )}
      >
        {icon && <span className="text-muted-foreground">{icon}</span>}
        {labelPrefix && (
          <span className="text-muted-foreground text-[11px] font-normal">{labelPrefix}:</span>
        )}
        <span className="truncate max-w-[130px] font-semibold text-foreground">
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 shrink-0 ml-0.5",
            isOpen && "rotate-180 text-primary"
          )}
        />
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full mt-1 min-w-[140px] max-w-[240px] rounded-lg border border-border bg-popover text-popover-foreground p-1 shadow-lg z-50 animate-in fade-in-0 zoom-in-95 duration-100 max-h-[260px] overflow-y-auto">
          {options.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                className={cn(
                  "w-full flex items-center justify-between rounded-md px-2.5 py-1.5 text-xs text-left transition-colors cursor-pointer",
                  isSelected
                    ? "bg-primary text-primary-foreground font-semibold"
                    : "text-foreground hover:bg-muted"
                )}
              >
                <span className="truncate">{opt.label}</span>
                {isSelected && <Check className="h-3.5 w-3.5 shrink-0 ml-1.5" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function RoutineViewerTab({
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

  const handleCellSwap = async (
    sourceClassId: string,
    sourceDPos: number,
    sourcePPos: number,
    targetClassId: string,
    targetDPos: number,
    targetPPos: number
  ) => {
    if (!routine || !routine.grid) return;
    if (sourceClassId === targetClassId && sourceDPos === targetDPos && sourcePPos === targetPPos) return;

    const sourceClass = classMap.get(sourceClassId);
    const targetClass = classMap.get(targetClassId);
    const sourceCell = routine.grid[sourceClassId]?.[sourceDPos]?.[sourcePPos] || null;
    const targetCell = routine.grid[targetClassId]?.[targetDPos]?.[targetPPos] || null;

    if (!sourceCell && !targetCell) return;

    // Check lab double period boundary
    if (sourceCell?.lab || targetCell?.lab) {
      showToast({
        type: "warning",
        title: "Lab Period Notice",
        description: "Double-period lab blocks cannot be split into a single period slot.",
      });
      return;
    }

    // Group cells span multiple sections; swapping one section out would
    // break the parallel block for the others. Block the swap instead.
    if (sourceCell?.gid || targetCell?.gid) {
      showToast({
        type: "warning",
        title: "Group Cell Locked",
        description: "A parallel group cell can't be moved — all member sections share the same slot.",
      });
      return;
    }

    // Save previous grid for Undo
    setHistory((prev) => [routine.grid, ...prev.slice(0, 9)]);

    // Clone grid immutably
    const newGrid: RoutineGrid = {};
    for (const [cid, days] of Object.entries(routine.grid)) {
      newGrid[cid] = days.map((dayPeriods, d) =>
        d === sourceDPos || d === targetDPos ? [...dayPeriods] : dayPeriods
      );
    }

    if (!newGrid[sourceClassId] || !newGrid[targetClassId]) return;

    // Perform swap (any day, any period)
    newGrid[sourceClassId][sourceDPos][sourcePPos] = targetCell;
    newGrid[targetClassId][targetDPos][targetPPos] = sourceCell;

    const updatedRoutine: GeneratedRoutine = {
      ...routine,
      grid: newGrid,
      generatedAt: new Date().toISOString(),
    };

    setRoutine(updatedRoutine);

    // Conflict check on newly swapped slots — group cells shared across
    // member classes are ONE unit; count distinct unit keys per teacher.
    const clashes: string[] = [];
    const checkClashesAtPeriod = (dPos: number, pPos: number) => {
      const tSeen = new Map<string, { cids: Set<string>; units: Set<string | number> }>();
      for (const [cid, days] of Object.entries(newGrid)) {
        const cell = days[dPos]?.[pPos];
        if (!cell) continue;
        const unitKey = (cell.gid as string | undefined) ?? cell.uid;
        for (const o of getCellOptions(cell)) {
          if (!o.tid) continue;
          let entry = tSeen.get(o.tid);
          if (!entry) {
            entry = { cids: new Set(), units: new Set() };
            tSeen.set(o.tid, entry);
          }
          entry.cids.add(cid);
          entry.units.add(unitKey);
        }
      }
      for (const [tid, entry] of tSeen.entries()) {
        if (entry.units.size > 1) {
          const tch = teacherMap.get(tid);
          const tName = tch?.shortName || tch?.name || "Teacher";
          const classNames = Array.from(entry.cids)
            .map((id) => `${classMap.get(id)?.className || ""}-${classMap.get(id)?.section || ""}`)
            .join(" & ");
          clashes.push(`${tName} in Period ${pPos + 1} (${classNames})`);
        }
      }
    };

    checkClashesAtPeriod(sourceDPos, sourcePPos);
    if (targetPPos !== sourcePPos || targetDPos !== sourceDPos) {
      checkClashesAtPeriod(targetDPos, targetPPos);
    }

    // Rule checks on the two new slots: teacher availability, class day limit, teacher daily/consecutive limits
    const ruleIssues: string[] = [];
    const touched = new Set<string>();
    const slots = [
      { cid: sourceClassId, d: sourceDPos, p: sourcePPos, cell: targetCell },
      { cid: targetClassId, d: targetDPos, p: targetPPos, cell: sourceCell },
    ];
    for (const s of slots) {
      if (!s.cell) continue;
      const dayVal = routine.days?.[s.d] ?? s.d;
      const cls = classMap.get(s.cid);
      const dayCap = settings.halfDays.includes(dayVal) ? settings.halfDayPeriods : settings.periodsPerDay;
      const cap = Math.min(dayCap, cls?.dailyPeriods || settings.periodsPerDay);
      if (s.p + 1 > cap) {
        ruleIssues.push(`${cls?.className || "Class"} has only ${cap} periods that day`);
      }
      for (const o of getCellOptions(s.cell)) {
        if (!o.tid) continue;
        touched.add(`${o.tid}|${s.d}`);
        const tch = teacherMap.get(o.tid);
        const av = (tch?.availableSlots as Record<string, number[]> | undefined)?.[String(dayVal)];
        if (Array.isArray(av) && !av.includes(s.p + 1)) {
          ruleIssues.push(`${tch?.shortName || tch?.name || "Teacher"} is unavailable in period ${s.p + 1}`);
        }
      }
    }
    for (const key of touched) {
      const [tid, dStr] = key.split("|");
      const d = Number(dStr);
      const periods = new Set<number>();
      for (const days of Object.values(newGrid)) {
        (days[d] || []).forEach((cell, p) => {
          if (cell && getCellOptions(cell).some((o) => o.tid === tid)) periods.add(p + 1);
        });
      }
      const name = teacherMap.get(tid)?.shortName || teacherMap.get(tid)?.name || "Teacher";
      if (periods.size > settings.tchDailyMax) {
        ruleIssues.push(`${name} has ${periods.size} periods that day (max ${settings.tchDailyMax})`);
      }
      let run = 0;
      let best = 0;
      for (let q = 1; q <= settings.periodsPerDay; q++) {
        if (settings.breaks.includes(q - 1)) run = 0;
        run = periods.has(q) ? run + 1 : 0;
        best = Math.max(best, run);
      }
      if (best > settings.tchConsecMax) {
        ruleIssues.push(`${name} teaches ${best} in a row (max ${settings.tchConsecMax})`);
      }
    }
    clashes.push(...Array.from(new Set(ruleIssues)));

    if (clashes.length > 0) {
      showToast({
        type: "warning",
        title: "Swapped with Warnings",
        description: clashes.slice(0, 3).join("; "),
      });
    } else {
      showToast({
        type: "success",
        title: "Periods Swapped",
        description: `${sourceClass?.className || "Class"} (P${sourcePPos + 1}) ⇄ ${targetClass?.className || "Class"} (P${targetPPos + 1})`,
      });
    }

    // Persist to database in background
    try {
      await saveGeneratedRoutineDb(updatedRoutine);
    } catch (err) {
      console.error("Failed to persist swapped routine:", err);
    }
  };

  const handleUndo = async () => {
    if (history.length === 0 || !routine) return;
    const previousGrid = history[0];
    setHistory((prev) => prev.slice(1));

    const updatedRoutine: GeneratedRoutine = {
      ...routine,
      grid: previousGrid,
      generatedAt: new Date().toISOString(),
    };

    setRoutine(updatedRoutine);
    showToast({
      type: "info",
      title: "Action Undone",
      description: "Restored to previous schedule state.",
    });

    try {
      await saveGeneratedRoutineDb(updatedRoutine);
    } catch (err) {
      console.error("Failed to persist undone routine:", err);
    }
  };

  
  const handleExportExcel = async () => {
    if (!routine) {
      showToast({ title: "No routine to export", type: "error" });
      return;
    }
    
    try {
      showToast({ title: "Generating styled Excel file...", type: "info" });
      const ExcelJS = (await import("exceljs")).default;
      const workbook = new ExcelJS.Workbook();
      workbook.creator = "SMS Web App";
      
      const maxPeriods = settings.periodsPerDay;
      const headerRow = ["Day / Class", ...Array.from({ length: maxPeriods }, (_, i) => "Period " + (i + 1))];
      
      // Reusable styles
      const headerFill: any = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F81BD' } };
      const headerFont = { color: { argb: 'FFFFFFFF' }, bold: true };
      const dayRowFill: any = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE6E6FA' } };
      
      const borderAll: any = {
        top: { style: 'thin', color: { argb: 'FFBFBFBF' } },
        left: { style: 'thin', color: { argb: 'FFBFBFBF' } },
        bottom: { style: 'thin', color: { argb: 'FFBFBFBF' } },
        right: { style: 'thin', color: { argb: 'FFBFBFBF' } }
      };

      const applyTableStyles = (sheet: any, startRow: number, rowCount: number, colCount: number) => {
        sheet.getColumn(1).width = 20;
        for (let i = 2; i <= colCount; i++) {
          sheet.getColumn(i).width = 23;
        }

        for (let r = startRow; r < startRow + rowCount; r++) {
          for (let c = 1; c <= colCount; c++) {
             const cell = sheet.getCell(r, c);
             cell.border = borderAll;
             cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
          }
        }
        
        for (let c = 1; c <= colCount; c++) {
           const cell = sheet.getCell(startRow, c);
           cell.fill = headerFill;
           cell.font = headerFont;
        }
      };

      // --- 1. MASTER (DAY-WISE) SHEET ---
      const wsMaster = workbook.addWorksheet("Master (Day-wise)");
      let mRowIdx = 1;

      settings.workingDays.forEach((dIdx, dPos) => {
        const titleRow = wsMaster.getRow(mRowIdx);
        titleRow.getCell(1).value = "--- " + DAY_NAMES[dIdx] + " ---";
        titleRow.getCell(1).font = { bold: true, size: 13, color: { argb: 'FF333333' } };
        titleRow.getCell(1).fill = dayRowFill;
        wsMaster.mergeCells(mRowIdx, 1, mRowIdx, maxPeriods + 1);
        titleRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
        mRowIdx++;

        const startTblRow = mRowIdx;
        wsMaster.getRow(mRowIdx).values = headerRow;
        mRowIdx++;

        classes.forEach((c) => {
          const classLimit = c.dailyPeriods || maxPeriods;
          const rowData = [c.className + " - " + c.section];

          for (let p = 1; p <= maxPeriods; p++) {
            if (p > classLimit) {
              rowData.push("");
            } else {
              const cellData = routine.grid[c.id]?.[dPos]?.[p - 1];
              if (cellData) {
                if (cellData.gid) {
                  // Parallel group cell: list all options stacked.
                  const text = getCellOptions(cellData)
                    .map((o) => {
                      const s = subjectMap.get(o.sid);
                      const t = teacherMap.get(o.tid);
                      return `${s?.name || "?"} (${t?.shortName || "?"})`;
                    })
                    .join(" | ");
                  rowData.push(text);
                } else {
                  const subj = subjectMap.get(cellData.sid);
                  const tch = teacherMap.get(cellData.tid);
                  rowData.push((subj?.name || "Unknown") + "\n(" + (tch?.shortName || "?") + ")");
                }
              } else {
                 rowData.push("-");
              }
            }
          }
          wsMaster.getRow(mRowIdx).values = rowData;
          wsMaster.getRow(mRowIdx).height = 44;
          mRowIdx++;
        });
        
        applyTableStyles(wsMaster, startTblRow, mRowIdx - startTblRow, maxPeriods + 1);
        mRowIdx += 2;
      });

      // --- 2. MASTER (TEACHER-WISE) SHEET ---
      const wsMasterTeacher = workbook.addWorksheet("Master (Teacher-wise)");
      let mtRowIdx = 1;
      const teacherHeaderRow = ["Teacher / Faculty", ...Array.from({ length: maxPeriods }, (_, i) => "Period " + (i + 1))];
      const teacherDayRowFill: any = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2EFDA' } };
      const teacherHeaderFill: any = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF385723' } };

      const sortedFaculty = [...teachers].sort((a, b) => (a.shortName || a.name).localeCompare(b.shortName || b.name));

      settings.workingDays.forEach((dIdx, dPos) => {
        const titleRow = wsMasterTeacher.getRow(mtRowIdx);
        titleRow.getCell(1).value = "--- " + DAY_NAMES[dIdx] + " (Teacher Master) ---";
        titleRow.getCell(1).font = { bold: true, size: 13, color: { argb: 'FF274E13' } };
        titleRow.getCell(1).fill = teacherDayRowFill;
        wsMasterTeacher.mergeCells(mtRowIdx, 1, mtRowIdx, maxPeriods + 1);
        titleRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
        mtRowIdx++;

        const startTblRow = mtRowIdx;
        wsMasterTeacher.getRow(mtRowIdx).values = teacherHeaderRow;
        mtRowIdx++;

        sortedFaculty.forEach((tch) => {
          const rowData: any[] = [
            tch.name + (tch.shortName ? ` (${tch.shortName})` : "") + (tch.primarySubject ? ` [${tch.primarySubject}]` : "")
          ];

          for (let p = 1; p <= maxPeriods; p++) {
            const pPos = p - 1;
            let assignedClass: RoutineClass | null = null;
            let assignedCell: any = null;
            let matchedOpt: { sid: string; tid: string; rid?: string | null } | null = null;

            const seenGroupUnits = new Set<string>();
            for (const c of classes) {
              const cellData = routine.grid[c.id]?.[dPos]?.[pPos];
              if (!cellData || !cellHasTeacher(cellData, tch.id)) continue;
              if (cellData.gid) {
                if (seenGroupUnits.has(cellData.gid)) continue;
                seenGroupUnits.add(cellData.gid);
              }
              const opt = getCellOptions(cellData).find((o) => o.tid === tch.id);
              if (!opt) continue;
              assignedClass = c;
              assignedCell = cellData;
              matchedOpt = opt;
              break;
            }

            if (assignedClass && assignedCell && matchedOpt) {
              const subj = subjectMap.get(matchedOpt.sid);
              const room = matchedOpt.rid ? roomMap.get(matchedOpt.rid) : null;
              let text = `${assignedClass.className}-${assignedClass.section}\n${subj?.name || "Unknown"}`;
              if (assignedCell.lab) text += " (Lab)";
              if (assignedCell.gid) text += " [Group]";
              if (room) text += `\n[${room.name}]`;
              rowData.push(text);
            } else {
              rowData.push("-");
            }
          }

          wsMasterTeacher.getRow(mtRowIdx).values = rowData;
          wsMasterTeacher.getRow(mtRowIdx).height = 44;
          mtRowIdx++;
        });

        applyTableStyles(wsMasterTeacher, startTblRow, mtRowIdx - startTblRow, maxPeriods + 1);
        for (let c = 1; c <= maxPeriods + 1; c++) {
          const hCell = wsMasterTeacher.getCell(startTblRow, c);
          hCell.fill = teacherHeaderFill;
          hCell.font = headerFont;
        }
        mtRowIdx += 2;
      });

      // --- 3. CLASS-WISE SHEET ---
      const wsClass = workbook.addWorksheet("Class-wise");
      let cRowIdx = 1;

      classes.forEach((c) => {
        const titleRow = wsClass.getRow(cRowIdx);
        titleRow.getCell(1).value = "Class: " + c.className + " - " + c.section;
        titleRow.getCell(1).font = { bold: true, size: 14, color: { argb: 'FF9C0006' } };
        titleRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFC7CE' } };
        wsClass.mergeCells(cRowIdx, 1, cRowIdx, maxPeriods + 1);
        titleRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
        titleRow.height = 25;
        cRowIdx++;

        const startTblRow = cRowIdx;
        wsClass.getRow(cRowIdx).values = ["Day", ...Array.from({ length: maxPeriods }, (_, i) => "Period " + (i + 1))];
        cRowIdx++;

        settings.workingDays.forEach((dIdx, dPos) => {
          const classLimit = c.dailyPeriods || maxPeriods;
          const rowData: any[] = [DAY_NAMES[dIdx]];

          for (let p = 1; p <= maxPeriods; p++) {
            if (p > classLimit) {
              rowData.push("");
            } else {
              const cellData = routine.grid[c.id]?.[dPos]?.[p - 1];
              if (cellData) {
                if (cellData.gid) {
                  const text = getCellOptions(cellData)
                    .map((o) => {
                      const s = subjectMap.get(o.sid);
                      const t = teacherMap.get(o.tid);
                      return `${s?.name || "?"} (${t?.shortName || "?"})`;
                    })
                    .join(" | ");
                  rowData.push(text);
                } else {
                  const subj = subjectMap.get(cellData.sid);
                  const tch = teacherMap.get(cellData.tid);
                  rowData.push((subj?.name || "Unknown") + "\n(" + (tch?.shortName || "?") + ")");
                }
              } else {
                 rowData.push("-");
              }
            }
          }
          wsClass.getRow(cRowIdx).values = rowData;
          wsClass.getRow(cRowIdx).height = 48;
          cRowIdx++;
        });

        applyTableStyles(wsClass, startTblRow, cRowIdx - startTblRow, maxPeriods + 1);
        cRowIdx += 2;
      });

      // --- 4. TEACHER-WISE SHEET ---
      const wsTeacher = workbook.addWorksheet("Teachers");
      let tRowIdx = 1;

      teachers.forEach((tch) => {
        const titleRow = wsTeacher.getRow(tRowIdx);
        titleRow.getCell(1).value = "Teacher: " + tch.name + " (" + tch.shortName + ")";
        titleRow.getCell(1).font = { bold: true, size: 14, color: { argb: 'FF006100' } };
        titleRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC6EFCE' } };
        wsTeacher.mergeCells(tRowIdx, 1, tRowIdx, maxPeriods + 1);
        titleRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
        titleRow.height = 25;
        tRowIdx++;

        const startTblRow = tRowIdx;
        wsTeacher.getRow(tRowIdx).values = ["Day", ...Array.from({ length: maxPeriods }, (_, i) => "Period " + (i + 1))];
        tRowIdx++;

        settings.workingDays.forEach((dIdx, dPos) => {
          const rowData: any[] = [DAY_NAMES[dIdx]];

          for (let p = 1; p <= maxPeriods; p++) {
            let foundCell: any = null;
            let foundClass: any = null;
            let foundOpt: { sid: string; tid: string; rid?: string | null } | null = null;

            const seenGroupUnits4 = new Set<string>();
            for (const c of classes) {
              const cellData = routine.grid[c.id]?.[dPos]?.[p - 1];
              if (!cellData || !cellHasTeacher(cellData, tch.id)) continue;
              if (cellData.gid) {
                if (seenGroupUnits4.has(cellData.gid)) continue;
                seenGroupUnits4.add(cellData.gid);
              }
              const opt = getCellOptions(cellData).find((o) => o.tid === tch.id);
              if (!opt) continue;
              foundCell = cellData;
              foundClass = c;
              foundOpt = opt;
              break;
            }

            if (foundCell && foundClass && foundOpt) {
               const subj = subjectMap.get(foundOpt.sid);
               const groupTag = foundCell.gid ? " [Group]" : "";
               rowData.push((subj?.name || "Unknown") + groupTag + "\n[" + foundClass.className + "-" + foundClass.section + "]");
            } else {
               rowData.push("-");
            }
          }
          wsTeacher.getRow(tRowIdx).values = rowData;
          wsTeacher.getRow(tRowIdx).height = 48;
          tRowIdx++;
        });

        applyTableStyles(wsTeacher, startTblRow, tRowIdx - startTblRow, maxPeriods + 1);
        tRowIdx += 2;
      });

      // Export
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement("a");
      link.href = url;
      link.download = "Routine_Export_Pro.xlsx";
      document.body.appendChild(link);
      link.click();
      
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      showToast({ title: "Routine exported beautifully!", type: "success" });
    } catch (err) {
      console.error(err);
      showToast({ title: "Failed to export Excel", type: "error" });
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (!routine || !routine.grid || Object.keys(routine.grid).length === 0) {
    return (
      <div className="bg-card border rounded-lg p-12 text-center shadow-xs w-full space-y-4">
        <div className="p-3 bg-muted rounded-full w-fit mx-auto">
          <Calendar className="h-8 w-8 text-muted-foreground" />
        </div>
        <div className="space-y-1">
          <h3 className="text-base font-semibold text-foreground">No Timetable Generated Yet</h3>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            Please run the constraint satisfaction solver from the Generator engine to create your school timetable.
          </p>
        </div>
        <div className="pt-2">
          <Link href="/routine/generate">
            <Button size="sm" className="h-8 text-xs font-semibold gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              Go to Routine Generator
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        "w-full transition-all",
        isFullscreen
          ? "fixed inset-0 z-50 bg-background flex flex-col h-screen w-screen overflow-hidden p-3 gap-2.5"
          : "space-y-4"
      )}
    >
      {/* Top Toolbar (Hidden on print) */}
      <div className="print:hidden bg-card border rounded-lg p-2.5 sm:p-3 shadow-xs flex flex-wrap items-center justify-between gap-2.5 shrink-0">
        {/* Mode Segmented Controls */}
        {!hideViewModeSelector ? (
          <div className="flex items-center bg-muted/70 p-1 rounded-lg text-xs font-semibold gap-1 border border-border/70 overflow-x-auto">
            <button
              type="button"
              onClick={() => setViewMode("master")}
              className={cn(
                "px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 whitespace-nowrap",
                viewMode === "master"
                  ? "bg-background text-foreground shadow-xs font-bold"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Calendar className="h-3.5 w-3.5" />
              <span>Master (Day-wise)</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode("master-teacher")}
              className={cn(
                "px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 whitespace-nowrap",
                viewMode === "master-teacher"
                  ? "bg-background text-foreground shadow-xs font-bold"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Users className="h-3.5 w-3.5" />
              <span>Master (Teacher-wise)</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode("class")}
              className={cn(
                "px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 whitespace-nowrap",
                viewMode === "class"
                  ? "bg-background text-foreground shadow-xs font-bold"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <School className="h-3.5 w-3.5" />
              <span>Class-wise</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode("teacher")}
              className={cn(
                "px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 whitespace-nowrap",
                viewMode === "teacher"
                  ? "bg-background text-foreground shadow-xs font-bold"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <UserCheck className="h-3.5 w-3.5" />
              <span>Teacher-wise</span>
            </button>

            {rooms.length > 0 && (
              <button
                type="button"
                onClick={() => setViewMode("room")}
                className={cn(
                  "px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 whitespace-nowrap",
                  viewMode === "room"
                    ? "bg-background text-foreground shadow-xs font-bold"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Building2 className="h-3.5 w-3.5" />
                <span>Room-wise</span>
              </button>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Calendar className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs sm:text-sm font-bold text-foreground">
                {teacherMap.get(selectedTeacherId)?.name || "Teacher"}&apos;s Weekly Schedule
              </p>
              <p className="text-[10px] text-muted-foreground">Full Week Timetable Grid</p>
            </div>
          </div>
        )}

        {/* Dynamic Selector Dropdowns & Actions */}
        <div className="flex items-center flex-wrap gap-2">
          {/* Master Day-wise View Controls: Day + Section Filter */}
          {viewMode === "master" && (
            <>
              <ViewerDropdown
                value={masterDaySelection}
                onChange={setMasterDaySelection}
                options={[
                  { value: "ALL", label: "All Days (Full Week)" },
                  ...activeDays.map((dIdx, idx) => ({
                    value: String(idx),
                    label: `${DAY_NAMES[dIdx]}${halfDays.includes(dIdx) ? " (Half)" : ""}`,
                  })),
                ]}
                labelPrefix="Day"
                icon={<Calendar className="w-3.5 h-3.5" />}
              />

              <ViewerDropdown
                value={masterSectionFilter}
                onChange={setMasterSectionFilter}
                options={[
                  { value: "ALL", label: "All Sections" },
                  ...allDistinctSectionNames.map((sec) => ({
                    value: sec,
                    label: `Section ${sec}`,
                  })),
                ]}
                labelPrefix="Section"
                icon={<Filter className="w-3.5 h-3.5" />}
              />
            </>
          )}

          {/* Master Teacher-wise View Controls: Day + Subject Filter */}
          {viewMode === "master-teacher" && (
            <>
              <ViewerDropdown
                value={masterDaySelection}
                onChange={setMasterDaySelection}
                options={[
                  { value: "ALL", label: "All Days (Full Week)" },
                  ...activeDays.map((dIdx, idx) => ({
                    value: String(idx),
                    label: `${DAY_NAMES[dIdx]}${halfDays.includes(dIdx) ? " (Half)" : ""}`,
                  })),
                ]}
                labelPrefix="Day"
                icon={<Calendar className="w-3.5 h-3.5" />}
              />

              {distinctFacultySubjects.length > 0 && (
                <ViewerDropdown
                  value={masterFacultyFilter}
                  onChange={setMasterFacultyFilter}
                  options={[
                    { value: "ALL", label: "All Faculty" },
                    ...distinctFacultySubjects.map((sub) => ({
                      value: sub,
                      label: sub,
                    })),
                  ]}
                  labelPrefix="Department"
                  icon={<Filter className="w-3.5 h-3.5" />}
                />
              )}
            </>
          )}

          {/* Class-wise View Controls: Class Dropdown + Section Dropdown */}
          {viewMode === "class" && (
            <>
              <ViewerDropdown
                value={currentClassName}
                onChange={handleSelectClass}
                options={distinctClassNames.map((name) => ({
                  value: name,
                  label: name,
                }))}
                labelPrefix="Class"
                icon={<School className="w-3.5 h-3.5" />}
              />

              <ViewerDropdown
                value={selectedClassId}
                onChange={handleSelectSection}
                options={availableSectionsForCurrentClass.map((c) => ({
                  value: c.id,
                  label: `Section ${c.section}`,
                }))}
                labelPrefix="Section"
              />

              {(() => {
                const selectedClass = classMap.get(selectedClassId);
                const ct = selectedClass
                  ? teachers.find((t) => {
                      if (!t.classTeacherOf) return false;
                      const fullLabel = `${selectedClass.className}${selectedClass.section && selectedClass.section !== "ALL" ? ` - ${selectedClass.section}` : ""}`.toLowerCase();
                      return (
                        t.classTeacherOf.toLowerCase() === fullLabel ||
                        t.classTeacherOf.toLowerCase() === selectedClass.className.toLowerCase()
                      );
                    })
                  : null;
                return ct ? (
                  <Badge
                    variant="secondary"
                    className="text-[11px] font-semibold bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-200 h-8 px-2.5 flex items-center"
                  >
                    CT: {ct.name} ({ct.shortName})
                  </Badge>
                ) : null;
              })()}
            </>
          )}

          {/* Teacher-wise View Controls */}
          {viewMode === "teacher" && (
            <>
              <ViewerDropdown
                value={selectedTeacherId}
                onChange={setSelectedTeacherId}
                options={teachers.map((t) => ({
                  value: t.id,
                  label: `${t.name} (${t.shortName || "-"})`,
                }))}
                labelPrefix="Faculty"
                icon={<Users className="w-3.5 h-3.5" />}
                className="max-w-[200px]"
              />
              {(() => {
                const tch = teacherMap.get(selectedTeacherId);
                return tch && (tch.primarySubject || tch.classTeacherOf) ? (
                  <div className="hidden sm:flex items-center gap-1.5">
                    {tch.primarySubject && (
                      <Badge variant="outline" className="text-[11px] font-medium h-8 px-2.5 flex items-center">
                        {tch.primarySubject}
                      </Badge>
                    )}
                    {tch.classTeacherOf && (
                      <Badge
                        variant="secondary"
                        className="text-[11px] font-semibold bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-200 h-8 px-2.5 flex items-center"
                      >
                        CT: {tch.classTeacherOf}
                      </Badge>
                    )}
                  </div>
                ) : null;
              })()}
            </>
          )}

          {/* Room-wise View Controls */}
          {viewMode === "room" && (
            <ViewerDropdown
              value={selectedRoomId}
              onChange={setSelectedRoomId}
              options={rooms.map((r) => ({
                value: r.id,
                label: `${r.name}${r.isLab ? " (Lab)" : ""}`,
              }))}
              labelPrefix="Room"
              icon={<Building2 className="w-3.5 h-3.5" />}
            />
          )}

          {viewMode === "master" && history.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleUndo}
              className="h-8 text-xs font-semibold gap-1.5 bg-background shadow-xs text-amber-700 dark:text-amber-300 border-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/20"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Undo ({history.length})</span>
            </Button>
          )}

          
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportExcel}
              className="h-8 text-xs font-semibold gap-1.5 bg-background shadow-xs"
            >
              <FileDown className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Export Excel</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="h-8 text-xs font-semibold gap-1.5 bg-background shadow-xs"
            >
              <Printer className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Print Timetable</span>
            </Button>

            {/* Zoom Controls */}
            <div className="flex items-center bg-muted/60 border border-input rounded-md p-0.5 gap-0.5 shadow-2xs h-8">
              <button
                type="button"
                onClick={() => setZoomLevel((z) => Math.max(60, z - 10))}
                disabled={zoomLevel <= 60}
                title="Zoom Out (Ctrl -)"
                className="h-7 w-7 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-background/80 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
              >
                <ZoomOut className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setZoomLevel(100)}
                title="Reset Zoom to 100%"
                className="px-1.5 h-7 text-[11px] font-mono font-bold text-foreground hover:bg-background/80 rounded transition-colors flex items-center justify-center cursor-pointer min-w-[38px]"
              >
                {zoomLevel}%
              </button>
              <button
                type="button"
                onClick={() => setZoomLevel((z) => Math.min(150, z + 10))}
                disabled={zoomLevel >= 150}
                title="Zoom In (Ctrl +)"
                className="h-7 w-7 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-background/80 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
              >
                <ZoomIn className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Full Screen Toggle Button */}
            <Button
              variant={isFullscreen ? "default" : "outline"}
              size="sm"
              onClick={toggleFullscreen}
              className={cn(
                "h-8 text-xs font-semibold gap-1.5 shadow-xs transition-all",
                isFullscreen
                  ? "bg-primary text-primary-foreground hover:bg-primary/90"
                  : "bg-background hover:bg-muted"
              )}
            >
              {isFullscreen ? (
                <>
                  <Minimize2 className="h-3.5 w-3.5" />
                  <span>Exit Full Screen</span>
                  <kbd className="hidden sm:inline-block ml-0.5 px-1 py-0.2 text-[9px] bg-primary-foreground/20 rounded font-mono">
                    Esc
                  </kbd>
                </>
              ) : (
                <>
                  <Maximize2 className="h-3.5 w-3.5 text-primary" />
                  <span>Full Screen</span>
                </>
              )}
            </Button>
          </div>
        </div>

      {/* Printable Sheet Header (Only visible in Print view) */}
      <div className="hidden print:block text-center border-b pb-3 mb-4">
        <h1 className="text-xl font-bold uppercase tracking-tight">Academic Routine & Master Timetable</h1>
        <div className="text-xs text-muted-foreground font-semibold mt-0.5">
          {viewMode === "master" && `Master Schedule (Day-wise) — ${masterDaySelection === "ALL" ? "All Days (Full Week)" : DAY_NAMES[activeDays[masterDayIdx] || 0]}${masterSectionFilter !== "ALL" ? ` (Section ${masterSectionFilter})` : ""}`}
          {viewMode === "master-teacher" && `Master Faculty Schedule (Teacher-wise) — ${masterDaySelection === "ALL" ? "All Days (Full Week)" : DAY_NAMES[activeDays[masterDayIdx] || 0]}${masterFacultyFilter !== "ALL" ? ` (${masterFacultyFilter})` : ""}`}
          {viewMode === "class" && (
            <>
              Class Schedule — {classMap.get(selectedClassId)?.className || ""}{" "}
              {classMap.get(selectedClassId)?.section || ""}
              {(() => {
                const selectedClass = classMap.get(selectedClassId);
                const ct = selectedClass
                  ? teachers.find((t) => {
                      if (!t.classTeacherOf) return false;
                      const fullLabel = `${selectedClass.className}${selectedClass.section && selectedClass.section !== "ALL" ? ` - ${selectedClass.section}` : ""}`.toLowerCase();
                      return (
                        t.classTeacherOf.toLowerCase() === fullLabel ||
                        t.classTeacherOf.toLowerCase() === selectedClass.className.toLowerCase()
                      );
                    })
                  : null;
                return ct ? ` | Class Teacher: ${ct.name} (${ct.shortName})` : "";
              })()}
            </>
          )}
          {viewMode === "teacher" &&
            `Faculty Timetable — ${teacherMap.get(selectedTeacherId)?.name || ""} (${teacherMap.get(selectedTeacherId)?.shortName || ""})${teacherMap.get(selectedTeacherId)?.primarySubject ? ` | Subject: ${teacherMap.get(selectedTeacherId)?.primarySubject}` : ""}`}
          {viewMode === "room" && `Facility Timetable — ${roomMap.get(selectedRoomId)?.name || ""}`}
        </div>
      </div>

      {/* Timetable Grid Container */}
      <div
        ref={printSheetRef}
        className={cn(
          "routine-print-sheet bg-card border rounded-lg shadow-xs overflow-hidden print:border-black print:rounded-none",
          isFullscreen && "flex-1 min-h-0 flex flex-col rounded-md"
        )}
      >
        <style dangerouslySetInnerHTML={{ __html: `
          @media print {
            @page { size: A3 landscape; margin: 0; }
            * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            .routine-print-sheet,
            .routine-print-sheet div {
              overflow: visible !important;
              max-height: none !important;
              height: auto !important;
            }
            .routine-print-sheet { border: 0 !important; box-shadow: none !important; }
            .routine-print-sheet table { width: 100% !important; }
            .routine-print-sheet th,
            .routine-print-sheet td {
              width: auto !important;
              min-width: 0 !important;
              max-width: none !important;
            }
            .routine-print-sheet .sticky { position: static !important; }
            .routine-print-sheet thead { display: table-header-group; }
            .routine-print-sheet tfoot { display: table-footer-group; }
            .routine-print-sheet tr,
            .routine-print-sheet td,
            .routine-print-sheet th { break-inside: avoid; page-break-inside: avoid; }
          }
        `}} />
        <div className={cn("overflow-auto flex-1 min-h-0 relative", isFullscreen && "custom-scrollbar")}>
          <div style={{ zoom: zoomLevel !== 100 ? `${zoomLevel}%` : undefined }} className="min-w-fit">
            <table className="w-full text-xs text-center border-collapse">
            <thead className="sticky top-0 z-30 shadow-2xs">
              {isAllDaysMaster ? (
                <>
                  <tr className="bg-muted border-b text-foreground font-semibold print:bg-gray-100 print:text-black">
                    <th
                      rowSpan={2}
                      className="py-2.5 px-3 text-left border-r border-b border-border print:border-black w-40 min-w-[140px] font-bold sticky top-0 left-0 z-40 bg-muted shadow-[2px_2px_4px_-2px_rgba(0,0,0,0.15)]"
                    >
                      {viewMode === "master" ? "Class \\ Day" : "Teacher \\ Day"}
                    </th>
                    {activeDays.map((dIdx, dPos) => {
                      const isHalf = halfDays.includes(dIdx);
                      const dayPeriods = isHalf ? maxHalfP : settings.periodsPerDay;
                      const isLastDay = dPos === activeDays.length - 1;
                      const theme = DAY_COLOR_THEMES[dIdx % DAY_COLOR_THEMES.length];
                      return (
                        <th
                          key={dIdx}
                          colSpan={dayPeriods}
                          className={cn(
                            "py-1.5 px-2 text-center border-b font-bold sticky top-0 z-30 backdrop-blur-xs transition-colors",
                            theme.headerBg,
                            theme.headerText,
                            theme.headerBorder,
                            !isLastDay ? theme.dividerBorder : "border-r border-border print:border-black"
                          )}
                        >
                          <div className="flex items-center justify-center gap-1.5">
                            <span className="font-bold">{DAY_NAMES[dIdx]}</span>
                            {isHalf && (
                              <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                                (Half)
                              </span>
                            )}
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                  <tr className="bg-muted/95 border-b text-foreground font-semibold print:bg-gray-50 print:text-black">
                    {activeDays.map((dIdx, dPos) => {
                      const isHalf = halfDays.includes(dIdx);
                      const dayPeriods = isHalf ? maxHalfP : settings.periodsPerDay;
                      const isLastDay = dPos === activeDays.length - 1;
                      const theme = DAY_COLOR_THEMES[dIdx % DAY_COLOR_THEMES.length];
                      return Array.from({ length: dayPeriods }, (_, i) => i + 1).map((p) => {
                        const isLastInDay = p === dayPeriods;
                        const isBreakAfter = (settings.breaks || []).includes(p) && p < dayPeriods;
                        return (
                          <th
                            key={`${dIdx}_${p}`}
                            title={isBreakAfter ? `P${p} (Tiffin follows)` : `P${p}`}
                            className={cn(
                              "py-1 px-0.5 border-b border-border print:border-black text-[10px] font-semibold text-center w-[60px] min-w-[55px] max-w-[65px] sticky top-[33px] z-30 backdrop-blur-xs transition-colors",
                              theme.subHeaderBg,
                              theme.headerText,
                              isLastInDay && !isLastDay
                                ? theme.dividerBorder
                                : isBreakAfter
                                ? TIFFIN_BREAK_BORDER
                                : "border-r border-border print:border-black"
                            )}
                          >
                            P{p}
                          </th>
                        );
                      });
                    })}
                  </tr>
                </>
              ) : (
                <tr className="bg-muted border-b text-foreground font-semibold print:bg-gray-100 print:text-black">
                  <th className="py-2.5 px-3 text-left border-r border-border print:border-black w-36 font-bold sticky top-0 left-0 z-40 bg-muted shadow-[2px_2px_4px_-2px_rgba(0,0,0,0.15)]">
                    {viewMode === "master"
                      ? "Class \\ Period"
                      : viewMode === "master-teacher"
                      ? "Teacher \\ Period"
                      : "Day \\ Period"}
                  </th>
                  {Array.from({ length: settings.periodsPerDay }, (_, i) => i + 1).map((p) => {
                    const hasBreakAfter = settings.breaks.includes(p) && p < settings.periodsPerDay;
                    return (
                      <React.Fragment key={p}>
                        <th className="py-2.5 px-2 border-r last:border-r-0 border-border print:border-black min-w-[110px] sticky top-0 z-30 bg-muted/95 backdrop-blur-xs">
                          <span>Period {p}</span>
                        </th>
                        {hasBreakAfter && (
                          <th className="py-2.5 px-2 !border-x-2 !border-x-foreground/50 dark:!border-x-foreground/40 print:!border-black print:!border-x-2 border-b border-border min-w-[70px] bg-amber-500/15 text-amber-800 dark:text-amber-300 font-bold sticky top-0 z-30 backdrop-blur-xs">
                            <div className="flex items-center justify-center gap-1">
                              <Coffee className="w-3 h-3 text-amber-600" />
                              <span>Recess</span>
                            </div>
                          </th>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tr>
              )}
            </thead>
            <tbody className="divide-y divide-border print:divide-black">
              {/* MASTER VIEW (Day-wise: Rows = Classes) */}
              {viewMode === "master" && (
                <>
                  {isAllDaysMaster ? (
                    displayedMasterClasses.map((c) => {
                      const classLimit = c.dailyPeriods || settings.periodsPerDay;
                      return (
                        <tr key={c.id} className="hover:bg-muted/20 transition-colors">
                          <td className="py-2 px-2.5 text-left font-bold text-foreground bg-card border-r border-border print:border-black sticky left-0 z-20 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.15)] whitespace-nowrap w-40 min-w-[140px]">
                            <div className="font-bold text-xs">{c.className} - {c.section}</div>
                          </td>
                          {activeDays.map((dIdx, dPos) => {
                            const actDay = dIdx;
                            const maxPForDay = halfDays.includes(actDay) ? maxHalfP : settings.periodsPerDay;
                            const dayPeriods = halfDays.includes(actDay) ? maxHalfP : settings.periodsPerDay;
                            const isLastDay = dPos === activeDays.length - 1;
                            const theme = DAY_COLOR_THEMES[actDay % DAY_COLOR_THEMES.length];

                            return Array.from({ length: dayPeriods }, (_, i) => i + 1).map((p) => {
                              const isGray = p > maxPForDay || p > classLimit;
                              const pPos = p - 1;
                              const cellData = isGray ? null : routine.grid[c.id]?.[dPos]?.[pPos];
                              const isSource = draggedPos?.classId === c.id && draggedPos?.dPos === dPos && draggedPos?.pPos === pPos;
                              const isTarget = dragOverPos?.classId === c.id && dragOverPos?.dPos === dPos && dragOverPos?.pPos === pPos;
                              const clashReason = dayClashes.get(`${c.id}_${dPos}_${pPos}`);
                              const isLastInDay = p === dayPeriods;
                              const isDayDivider = isLastInDay && !isLastDay;
                              const isBreakAfter = (settings.breaks || []).includes(p) && p < dayPeriods;
                              const cellBorderClass = isDayDivider
                                ? theme.dividerBorder
                                : isBreakAfter
                                ? TIFFIN_BREAK_BORDER
                                : "border-r border-border last:border-r-0";

                              if (isGray) {
                                return (
                                  <td
                                    key={`${dPos}_${p}`}
                                    className={cn(
                                      "py-1 px-0.5 border-border bg-muted/40 text-muted-foreground/30 print:bg-gray-50 print:border-black select-none font-mono text-center text-xs w-[60px] min-w-[55px] max-w-[65px] h-12 transition-colors",
                                      theme.cellColBg,
                                      cellBorderClass
                                    )}
                                  >
                                    -
                                  </td>
                                );
                              }

                              if (!cellData) {
                                return (
                                  <td
                                    key={`${dPos}_${p}`}
                                    onDragOver={(e) => {
                                      e.preventDefault();
                                      e.dataTransfer.dropEffect = "move";
                                      if (dragOverPos?.classId !== c.id || dragOverPos?.dPos !== dPos || dragOverPos?.pPos !== pPos) {
                                        setDragOverPos({ classId: c.id, dPos, pPos });
                                      }
                                    }}
                                    onDragLeave={() => {
                                      if (dragOverPos?.classId === c.id && dragOverPos?.dPos === dPos && dragOverPos?.pPos === pPos) {
                                        setDragOverPos(null);
                                      }
                                    }}
                                    onDrop={(e) => {
                                      e.preventDefault();
                                      setDragOverPos(null);
                                      setDraggedPos(null);
                                      try {
                                        const raw = e.dataTransfer.getData("application/json") || e.dataTransfer.getData("text/plain");
                                        const data = JSON.parse(raw);
                                        if (data?.classId) {
                                          handleCellSwap(data.classId, data.dPos ?? dPos, data.pPos, c.id, dPos, pPos);
                                        }
                                      } catch (err) {
                                        console.error("Drop parse error:", err);
                                      }
                                    }}
                                    className={cn(
                                      "py-1 px-0.5 border-border transition-all select-none print:border-black w-[60px] min-w-[55px] max-w-[65px] h-12",
                                      theme.cellColBg,
                                      cellBorderClass,
                                      isTarget ? "bg-primary/20 ring-2 ring-inset ring-primary" : "text-muted-foreground/30 hover:bg-muted/30"
                                    )}
                                  >
                                    <div className="h-full flex items-center justify-center text-xs font-mono">
                                      {isTarget ? (
                                        <span className="text-[9px] font-bold text-primary animate-pulse">Move</span>
                                      ) : (
                                        "·"
                                      )}
                                    </div>
                                  </td>
                                );
                              }

                              const isGroupCell = Boolean(cellData.gid);
                              const cellOpts = getCellOptions(cellData);
                              const subj = subjectMap.get(cellData.sid);
                              const tch = teacherMap.get(cellData.tid);
                              const rm = cellData.rid ? roomMap.get(cellData.rid) : null;
                              const subShort = isGroupCell
                                ? cellOpts.map((o) => getSubjectShort(subjectMap.get(o.sid)?.name || "")).join(" | ")
                                : getSubjectShort(subj?.name || "");
                              const tchShort = isGroupCell
                                ? cellOpts
                                    .map((o) => teacherMap.get(o.tid))
                                    .map((t) => t?.shortName || t?.name || "?")
                                    .join(" | ")
                                : tch?.shortName || tch?.name || "?";
                              const fullTooltip = isGroupCell
                                ? `${c.className} ${c.section} | ${DAY_NAMES[actDay]} Period ${p}\nGroup options:\n${cellOpts
                                    .map((o) => {
                                      const s = subjectMap.get(o.sid);
                                      const t = teacherMap.get(o.tid);
                                      const r = o.rid ? roomMap.get(o.rid) : null;
                                      return `  • ${s?.name || "?"} — ${t?.name || "?"}${r ? ` [${r.name}]` : ""}`;
                                    })
                                    .join("\n")}${clashReason ? `\n${clashReason}` : ""}`
                                : `${c.className} ${c.section} | ${DAY_NAMES[actDay]} Period ${p}\nSubject: ${subj?.name || "?"}\nFaculty: ${tch?.name || "?"} (${tchShort})\n${rm ? `Room: ${rm.name}` : ""}${clashReason ? `\n${clashReason}` : ""}`;

                              return (
                                <td
                                  key={`${dPos}_${p}`}
                                  onDragOver={(e) => {
                                    e.preventDefault();
                                    e.dataTransfer.dropEffect = "move";
                                    if (dragOverPos?.classId !== c.id || dragOverPos?.dPos !== dPos || dragOverPos?.pPos !== pPos) {
                                      setDragOverPos({ classId: c.id, dPos, pPos });
                                    }
                                  }}
                                  onDragLeave={() => {
                                    if (dragOverPos?.classId === c.id && dragOverPos?.dPos === dPos && dragOverPos?.pPos === pPos) {
                                      setDragOverPos(null);
                                    }
                                  }}
                                  onDrop={(e) => {
                                    e.preventDefault();
                                    setDragOverPos(null);
                                    setDraggedPos(null);
                                    try {
                                      const raw = e.dataTransfer.getData("application/json") || e.dataTransfer.getData("text/plain");
                                      const data = JSON.parse(raw);
                                      if (data?.classId) {
                                        handleCellSwap(data.classId, data.dPos ?? dPos, data.pPos, c.id, dPos, pPos);
                                      }
                                    } catch (err) {
                                      console.error("Drop parse error:", err);
                                    }
                                  }}
                                  className={cn(
                                    "py-0.5 px-0.5 border-border h-12 align-middle print:border-black transition-all w-[60px] min-w-[55px] max-w-[65px]",
                                    theme.cellColBg,
                                    cellBorderClass,
                                    isTarget && "bg-primary/20 ring-2 ring-inset ring-primary scale-[1.02] shadow-xs z-10"
                                  )}
                                >
                                  <div
                                    draggable={true}
                                    title={fullTooltip}
                                    onDragStart={(e) => {
                                      setDraggedPos({ classId: c.id, dPos, pPos });
                                      const payload = JSON.stringify({ classId: c.id, dPos, pPos });
                                      e.dataTransfer.setData("application/json", payload);
                                      e.dataTransfer.setData("text/plain", payload);
                                      e.dataTransfer.effectAllowed = "move";
                                    }}
                                    onDragEnd={() => {
                                      setDraggedPos(null);
                                      setDragOverPos(null);
                                    }}
                                    className={cn(
                                      "relative h-full w-full rounded p-1 flex flex-col justify-center items-center text-center border shadow-2xs transition-all cursor-grab active:cursor-grabbing select-none leading-none overflow-hidden",
                                      cellData.lab
                                        ? "bg-blue-500/10 border-blue-300 dark:border-blue-800"
                                        : "bg-background border-border hover:border-primary/50",
                                      isGroupCell && "bg-amber-100/40 dark:bg-amber-900/15 border-amber-300 dark:border-amber-800/60",
                                      subj?.isHard && "border-t-2 border-t-amber-500",
                                      clashReason && "border-destructive bg-destructive/15 ring-1 ring-destructive",
                                      isSource && "opacity-30 scale-95 ring-1 ring-dashed ring-primary"
                                    )}
                                  >
                                    {isGroupCell && (
                                      <span className="absolute -top-0.5 -left-0.5 text-[7px] font-bold text-amber-700 dark:text-amber-400 bg-amber-200/70 dark:bg-amber-900/40 px-0.5 rounded-sm leading-none">
                                        G
                                      </span>
                                    )}
                                    <span className={cn(
                                      "font-bold text-[10px] truncate max-w-full block leading-tight",
                                      clashReason ? "text-destructive" : "text-foreground"
                                    )}>
                                      {subShort}
                                    </span>
                                    <span className="font-mono text-[9px] text-primary truncate max-w-full block mt-0.5 font-semibold">
                                      {tchShort}
                                    </span>
                                  </div>
                                </td>
                              );
                            });
                          })}
                        </tr>
                      );
                    })
                  ) : (
                    displayedMasterClasses.map((c) => {
                      const dPos = masterDayIdx || 0;
                      const actDay = activeDays[dPos];
                      const maxPForDay = halfDays.includes(actDay)
                        ? maxHalfP
                        : settings.periodsPerDay;
                      const classLimit = c.dailyPeriods || settings.periodsPerDay;

                      return (
                        <tr key={c.id} className="hover:bg-muted/20 transition-colors">
                          <td className="py-3 px-3 text-left font-bold text-foreground bg-card border-r border-border print:border-black sticky left-0 z-20 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.15)] whitespace-nowrap">
                            {c.className} - {c.section}
                          </td>
                          {Array.from({ length: settings.periodsPerDay }, (_, i) => i + 1).map((p) => {
                            const isGray = p > maxPForDay || p > classLimit;
                            const pPos = p - 1;
                            const hasBreakAfter = settings.breaks.includes(p) && p < settings.periodsPerDay;
                            const cellData = isGray ? null : routine.grid[c.id]?.[dPos]?.[pPos];
                            const isSource = draggedPos?.classId === c.id && draggedPos?.dPos === dPos && draggedPos?.pPos === pPos;
                            const isTarget = dragOverPos?.classId === c.id && dragOverPos?.dPos === dPos && dragOverPos?.pPos === pPos;
                            const clashReason = dayClashes.get(`${c.id}_${dPos}_${pPos}`) || dayClashes.get(`${c.id}_${pPos}`);

                            return (
                              <React.Fragment key={p}>
                                {isGray ? (
                                  <td
                                    className="py-2 px-1.5 border-r border-border last:border-r-0 bg-muted/40 text-muted-foreground/30 print:bg-gray-50 print:border-black select-none font-mono"
                                  >
                                    -
                                  </td>
                                ) : !cellData ? (
                                  <td
                                    onDragOver={(e) => {
                                      e.preventDefault();
                                      e.dataTransfer.dropEffect = "move";
                                      if (dragOverPos?.classId !== c.id || dragOverPos?.dPos !== dPos || dragOverPos?.pPos !== pPos) {
                                        setDragOverPos({ classId: c.id, dPos, pPos });
                                      }
                                    }}
                                    onDragLeave={() => {
                                      if (dragOverPos?.classId === c.id && dragOverPos?.dPos === dPos && dragOverPos?.pPos === pPos) {
                                        setDragOverPos(null);
                                      }
                                    }}
                                    onDrop={(e) => {
                                      e.preventDefault();
                                      setDragOverPos(null);
                                      setDraggedPos(null);
                                      try {
                                        const raw = e.dataTransfer.getData("application/json") || e.dataTransfer.getData("text/plain");
                                        const data = JSON.parse(raw);
                                        if (data?.classId) {
                                          handleCellSwap(data.classId, data.dPos ?? dPos, data.pPos, c.id, dPos, pPos);
                                        }
                                      } catch (err) {
                                        console.error("Drop parse error:", err);
                                      }
                                    }}
                                    className={cn(
                                      "py-2 px-1.5 border-r border-border last:border-r-0 transition-all select-none print:border-black",
                                      isTarget
                                        ? "bg-primary/20 ring-2 ring-inset ring-primary"
                                        : "text-muted-foreground/30 hover:bg-muted/30"
                                    )}
                                  >
                                    <div className="h-16 flex items-center justify-center text-xs font-mono">
                                      {isTarget ? (
                                        <span className="text-[10px] font-bold text-primary animate-pulse">Move here</span>
                                      ) : (
                                        "·"
                                      )}
                                    </div>
                                  </td>
                                ) : (
                                  <td
                                    onDragOver={(e) => {
                                      e.preventDefault();
                                      e.dataTransfer.dropEffect = "move";
                                      if (dragOverPos?.classId !== c.id || dragOverPos?.dPos !== dPos || dragOverPos?.pPos !== pPos) {
                                        setDragOverPos({ classId: c.id, dPos, pPos });
                                      }
                                    }}
                                    onDragLeave={() => {
                                      if (dragOverPos?.classId === c.id && dragOverPos?.dPos === dPos && dragOverPos?.pPos === pPos) {
                                        setDragOverPos(null);
                                      }
                                    }}
                                    onDrop={(e) => {
                                      e.preventDefault();
                                      setDragOverPos(null);
                                      setDraggedPos(null);
                                      try {
                                        const raw = e.dataTransfer.getData("application/json") || e.dataTransfer.getData("text/plain");
                                        const data = JSON.parse(raw);
                                        if (data?.classId) {
                                          handleCellSwap(data.classId, data.dPos ?? dPos, data.pPos, c.id, dPos, pPos);
                                        }
                                      } catch (err) {
                                        console.error("Drop parse error:", err);
                                      }
                                    }}
                                    className={cn(
                                      "py-1.5 px-1.5 border-r border-border last:border-r-0 h-16 align-top print:border-black transition-all",
                                      isTarget && "bg-primary/20 ring-2 ring-inset ring-primary scale-[1.02] shadow-sm z-10"
                                    )}
                                  >
                                    {(() => {
                                      const subj = subjectMap.get(cellData.sid);
                                      const tch = teacherMap.get(cellData.tid);
                                      const rm = cellData.rid ? roomMap.get(cellData.rid) : null;
                                      return (
                                        <div
                                          draggable={true}
                                          onDragStart={(e) => {
                                            setDraggedPos({ classId: c.id, dPos, pPos });
                                            const payload = JSON.stringify({ classId: c.id, dPos, pPos });
                                            e.dataTransfer.setData("application/json", payload);
                                            e.dataTransfer.setData("text/plain", payload);
                                            e.dataTransfer.effectAllowed = "move";
                                          }}
                                          onDragEnd={() => {
                                            setDraggedPos(null);
                                            setDragOverPos(null);
                                          }}
                                          className={cn(
                                            "h-full rounded-md p-1.5 flex flex-col justify-between text-left border shadow-2xs transition-all cursor-grab active:cursor-grabbing select-none group",
                                            cellData.lab
                                              ? "bg-blue-500/10 border-blue-300 dark:border-blue-800"
                                              : "bg-background border-border hover:border-primary/50 hover:shadow-xs",
                                            subj?.isHard && "border-l-4 border-l-amber-500",
                                            clashReason && "border-destructive bg-destructive/10 ring-1 ring-destructive",
                                            isSource && "opacity-30 scale-95 ring-2 ring-dashed ring-primary"
                                          )}
                                        >
                                          <div className="flex items-start justify-between gap-1">
                                            <span className="font-bold text-foreground text-[11px] truncate block leading-tight flex-1">
                                              {subj?.name || "?"} {cellData.lab ? "(Lab)" : ""}
                                            </span>
                                            {clashReason ? (
                                              <span
                                                title={clashReason}
                                                className="text-[9px] font-bold text-destructive flex items-center gap-0.5 bg-destructive/15 px-1 rounded shrink-0"
                                              >
                                                <AlertTriangle className="w-2.5 h-2.5" /> Clash
                                              </span>
                                            ) : (
                                              <GripVertical className="w-2.5 h-2.5 text-muted-foreground/30 group-hover:text-muted-foreground shrink-0 mt-0.5" />
                                            )}
                                          </div>
                                          <div className="flex items-center justify-between text-[10px] text-muted-foreground mt-1">
                                            <span className={cn(
                                              "font-semibold font-mono",
                                              clashReason ? "text-destructive font-bold" : "text-primary"
                                            )}>
                                              {tch?.shortName || tch?.name || "?"}
                                            </span>
                                            {rm && (
                                              <span className="bg-amber-500/20 text-amber-800 dark:text-amber-300 px-1 py-0.2 rounded text-[9px] font-bold">
                                                {rm.name.split(" ")[0]}
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                      );
                                    })()}
                                  </td>
                                )}
                                {hasBreakAfter && (
                                  <td
                                    className={cn(
                                      "py-2 px-1 !border-x-2 !border-x-foreground/50 dark:!border-x-foreground/40 print:!border-black print:!border-x-2 text-center font-semibold text-[10px] select-none",
                                      p >= maxPForDay
                                        ? "bg-muted/30 text-muted-foreground/30"
                                        : "bg-amber-500/10 text-amber-700 dark:text-amber-400"
                                    )}
                                  >
                                    {p < maxPForDay ? "Tiffin" : "-"}
                                  </td>
                                )}
                              </React.Fragment>
                            );
                          })}
                        </tr>
                      );
                    })
                  )}
                </>
              )}

              {/* MASTER TEACHER-WISE (Day-wise: Rows = Teachers) */}
              {viewMode === "master-teacher" && (
                <>
                  {isAllDaysMaster ? (
                    displayedMasterTeachers.map((tch) => {
                      return (
                        <tr key={tch.id} className="hover:bg-muted/20 transition-colors">
                          <td className="py-2 px-2.5 text-left font-bold text-foreground bg-card border-r border-border print:border-black sticky left-0 z-20 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.15)] whitespace-nowrap w-40 min-w-[140px]">
                            <div className="font-bold text-xs truncate max-w-[130px]">{tch.name}</div>
                            <div className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                              <span className="font-mono font-semibold text-primary">{tch.shortName || "-"}</span>
                              {tch.primarySubject && (
                                <span className="truncate max-w-[80px] text-muted-foreground font-normal">
                                  • {tch.primarySubject}
                                </span>
                              )}
                            </div>
                          </td>
                          {activeDays.map((dIdx, dPos) => {
                            const isHalf = halfDays.includes(dIdx);
                            const dayPeriods = isHalf ? maxHalfP : settings.periodsPerDay;
                            const isLastDay = dPos === activeDays.length - 1;
                            const theme = DAY_COLOR_THEMES[dIdx % DAY_COLOR_THEMES.length];

                            return Array.from({ length: dayPeriods }, (_, i) => i + 1).map((p) => {
                              const pPos = p - 1;
                              const isLastInDay = p === dayPeriods;
                              const isDayDivider = isLastInDay && !isLastDay;
                              const isBreakAfter = (settings.breaks || []).includes(p) && p < dayPeriods;
                              const cellBorderClass = isDayDivider
                                ? theme.dividerBorder
                                : isBreakAfter
                                ? TIFFIN_BREAK_BORDER
                                : "border-r border-border last:border-r-0";
                              const assigned: { c: RoutineClass; cell: any; opt: { sid: string; tid: string; rid?: string | null } }[] = [];
                              const seenGroupUnits = new Set<string | number>();
                              for (const c of classes) {
                                const cell = routine.grid[c.id]?.[dPos]?.[pPos];
                                if (!cell || !cellHasTeacher(cell, tch.id)) continue;
                                // De-dupe shared group cells (pooled across sections).
                                if (cell.gid) {
                                  const key = cell.gid;
                                  if (seenGroupUnits.has(key)) continue;
                                  seenGroupUnits.add(key);
                                }
                                const matchedOpt = getCellOptions(cell).find((o) => o.tid === tch.id);
                                if (!matchedOpt) continue;
                                assigned.push({ c, cell, opt: matchedOpt });
                              }

                              if (assigned.length === 0) {
                                return (
                                  <td
                                    key={`${dPos}_${p}`}
                                    className={cn(
                                      "py-1 px-0.5 border-border text-muted-foreground/30 hover:bg-muted/30 transition-all select-none print:border-black w-[60px] min-w-[55px] max-w-[65px] h-12 text-center",
                                      theme.cellColBg,
                                      cellBorderClass
                                    )}
                                  >
                                    <div className="h-full flex items-center justify-center text-xs font-mono text-muted-foreground/25">
                                      -
                                    </div>
                                  </td>
                                );
                              }

                              return (
                                <td
                                  key={`${dPos}_${p}`}
                                  className={cn(
                                    "py-0.5 px-0.5 border-border h-12 align-middle print:border-black transition-all w-[60px] min-w-[55px] max-w-[65px]",
                                    theme.cellColBg,
                                    cellBorderClass
                                  )}
                                >
                                  {assigned.map(({ c, cell, opt }, aIdx) => {
                                    const subj = subjectMap.get(opt.sid);
                                    const rm = opt.rid ? roomMap.get(opt.rid) : null;
                                    const hasClash = assigned.length > 1;
                                    const clsShort = getClassShort(c.className, c.section);
                                    const subShort = getSubjectShort(subj?.name || "");
                                    const fullTooltip = `Teacher: ${tch.name} (${tch.shortName})\nDay: ${DAY_NAMES[dIdx]}, Period ${p}\nClass: ${c.className} ${c.section}\nSubject: ${subj?.name || "?"}\n${rm ? `Room: ${rm.name}` : ""}${hasClash ? "\nWARNING: Teacher is double-booked!" : ""}`;

                                    return (
                                      <div
                                        key={aIdx}
                                        title={fullTooltip}
                                        className={cn(
                                          "h-full w-full rounded p-1 flex flex-col justify-center items-center text-center border shadow-2xs select-none leading-none overflow-hidden",
                                          cell.lab
                                            ? "bg-blue-500/10 border-blue-300 dark:border-blue-800"
                                            : "bg-background border-border",
                                          subj?.isHard && "border-t-2 border-t-amber-500",
                                          hasClash && "border-destructive bg-destructive/15 ring-1 ring-destructive"
                                        )}
                                      >
                                        <span className={cn(
                                          "font-bold text-[10px] truncate max-w-full block leading-tight",
                                          hasClash ? "text-destructive" : "text-foreground"
                                        )}>
                                          {clsShort}
                                        </span>
                                        <span className="font-semibold text-[9px] text-primary truncate max-w-full block mt-0.5">
                                          {subShort}
                                        </span>
                                      </div>
                                    );
                                  })}
                                </td>
                              );
                            });
                          })}
                        </tr>
                      );
                    })
                  ) : (
                    displayedMasterTeachers.map((tch) => {
                      const dPos = masterDayIdx || 0;
                      const actDay = activeDays[dPos];
                      const maxPForDay = halfDays.includes(actDay)
                        ? maxHalfP
                        : settings.periodsPerDay;

                      return (
                        <tr key={tch.id} className="hover:bg-muted/20 transition-colors">
                          <td className="py-2.5 px-3 text-left font-bold text-foreground bg-card border-r border-border print:border-black sticky left-0 z-20 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.15)] whitespace-nowrap">
                            <div className="font-bold text-foreground text-xs leading-tight">
                              {tch.name}
                            </div>
                            <div className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                              <span className="font-mono font-semibold text-primary">{tch.shortName || "-"}</span>
                              {tch.primarySubject && (
                                <span className="truncate max-w-[90px] text-muted-foreground font-normal">
                                  • {tch.primarySubject}
                                </span>
                              )}
                            </div>
                          </td>
                          {Array.from({ length: settings.periodsPerDay }, (_, i) => i + 1).map((p) => {
                            const isGray = p > maxPForDay;
                            const pPos = p - 1;
                            const hasBreakAfter = settings.breaks.includes(p) && p < settings.periodsPerDay;

                            const assigned: { c: RoutineClass; cell: any; opt: { sid: string; tid: string; rid?: string | null } }[] = [];
                            const seenGroupUnits2 = new Set<string | number>();
                            if (!isGray) {
                              for (const c of classes) {
                                const cell = routine.grid[c.id]?.[dPos]?.[pPos];
                                if (!cell || !cellHasTeacher(cell, tch.id)) continue;
                                if (cell.gid) {
                                  if (seenGroupUnits2.has(cell.gid)) continue;
                                  seenGroupUnits2.add(cell.gid);
                                }
                                const matchedOpt = getCellOptions(cell).find((o) => o.tid === tch.id);
                                if (!matchedOpt) continue;
                                assigned.push({ c, cell, opt: matchedOpt });
                              }
                            }

                            return (
                              <React.Fragment key={p}>
                                {isGray ? (
                                  <td
                                    className="py-2 px-1.5 border-r border-border last:border-r-0 bg-muted/40 text-muted-foreground/30 print:bg-gray-50 print:border-black select-none font-mono"
                                  >
                                    -
                                  </td>
                                ) : assigned.length === 0 ? (
                                  <td
                                    className="py-2 px-1.5 border-r border-border last:border-r-0 text-muted-foreground/30 hover:bg-muted/30 transition-all select-none print:border-black"
                                  >
                                    <div className="h-16 flex items-center justify-center text-xs font-mono text-muted-foreground/25">
                                      -
                                    </div>
                                  </td>
                                ) : (
                                  <td
                                    className="py-1.5 px-1.5 border-r border-border last:border-r-0 h-16 align-top print:border-black transition-all"
                                  >
                                    {assigned.map(({ c, cell, opt }, aIdx) => {
                                      const subj = subjectMap.get(opt.sid);
                                      const rm = opt.rid ? roomMap.get(opt.rid) : null;
                                      // Multiple classes = clash only when NOT a shared group cell.
                                      const hasClash = assigned.length > 1 && !cell.gid;

                                      return (
                                        <div
                                          key={aIdx}
                                          className={cn(
                                            "h-full rounded-md p-1.5 flex flex-col justify-between text-left border shadow-2xs select-none",
                                            cell.lab
                                              ? "bg-blue-500/10 border-blue-300 dark:border-blue-800"
                                              : "bg-background border-border",
                                            subj?.isHard && "border-l-4 border-l-amber-500",
                                            hasClash && "border-destructive bg-destructive/10 ring-1 ring-destructive"
                                          )}
                                        >
                                          <div className="flex items-start justify-between gap-1">
                                            <span className="font-bold text-foreground text-[11px] truncate block leading-tight flex-1">
                                              {c.className} - {c.section}
                                            </span>
                                            {hasClash && (
                                              <span
                                                title="Faculty double-booked in this period!"
                                                className="text-[9px] font-bold text-destructive flex items-center gap-0.5 bg-destructive/15 px-1 rounded shrink-0"
                                              >
                                                <AlertTriangle className="w-2.5 h-2.5" /> Clash
                                              </span>
                                            )}
                                          </div>
                                          <div className="flex items-center justify-between text-[10px] text-muted-foreground mt-1">
                                            <span className="font-semibold text-primary truncate max-w-[85px]">
                                              {subj?.name || "?"} {cell.lab ? "(Lab)" : ""}
                                            </span>
                                            {rm && (
                                              <span className="bg-amber-500/20 text-amber-800 dark:text-amber-300 px-1 py-0.2 rounded text-[9px] font-bold">
                                                {rm.name.split(" ")[0]}
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </td>
                                )}
                                {hasBreakAfter && (
                                  <td
                                    className={cn(
                                      "py-2 px-1 !border-x-2 !border-x-foreground/50 dark:!border-x-foreground/40 print:!border-black print:!border-x-2 text-center font-semibold text-[10px] select-none",
                                      p >= maxPForDay
                                        ? "bg-muted/30 text-muted-foreground/30"
                                        : "bg-amber-500/10 text-amber-700 dark:text-amber-400"
                                    )}
                                  >
                                    {p < maxPForDay ? "Tiffin" : "-"}
                                  </td>
                                )}
                              </React.Fragment>
                            );
                          })}
                        </tr>
                      );
                    })
                  )}
                </>
              )}

              {/* CLASS-WISE / TEACHER-WISE / ROOM-WISE (Rows = Days) */}
              {viewMode !== "master" && viewMode !== "master-teacher" && (
                <>
                  {activeDays.map((dIdx, dPos) => {
                    const maxPForDay = halfDays.includes(dIdx)
                      ? maxHalfP
                      : settings.periodsPerDay;
                    let entityLimit = settings.periodsPerDay;
                    if (viewMode === "class") {
                      const cl = classMap.get(selectedClassId);
                      if (cl?.dailyPeriods) entityLimit = cl.dailyPeriods;
                    }

                    return (
                      <tr key={dIdx} className="hover:bg-muted/20 transition-colors">
                        <td className="py-3 px-3 text-left font-bold text-foreground bg-card border-r border-border print:border-black sticky left-0 z-20 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.15)] whitespace-nowrap">
                          {DAY_NAMES[dIdx]} {halfDays.includes(dIdx) && "(Half)"}
                        </td>
                        {Array.from({ length: settings.periodsPerDay }, (_, i) => i + 1).map((p) => {
                          const isGray = p > maxPForDay || p > entityLimit;
                          const pPos = p - 1;
                          const hasBreakAfter = settings.breaks.includes(p) && p < settings.periodsPerDay;

                          let cellData = null;
                          let associatedClassId = selectedClassId;

                          if (!isGray) {
                            if (viewMode === "class") {
                              cellData = routine.grid[selectedClassId]?.[dPos]?.[pPos];
                            } else if (viewMode === "teacher") {
                              // Match any option carrying this teacher; a shared
                              // group cell is picked once (prefer the first match).
                              for (const c of classes) {
                                const cell = routine.grid[c.id]?.[dPos]?.[pPos];
                                if (!cell || !cellHasTeacher(cell, selectedTeacherId)) continue;
                                const opt = getCellOptions(cell).find((o) => o.tid === selectedTeacherId);
                                if (!opt) continue;
                                cellData = { ...cell, sid: opt.sid, tid: opt.tid, rid: opt.rid ?? null };
                                associatedClassId = c.id;
                                break;
                              }
                            } else if (viewMode === "room") {
                              for (const c of classes) {
                                const cell = routine.grid[c.id]?.[dPos]?.[pPos];
                                if (!cell || !cellHasRoom(cell, selectedRoomId)) continue;
                                const opt = getCellOptions(cell).find((o) => (o.rid || null) === selectedRoomId);
                                if (!opt) continue;
                                cellData = { ...cell, sid: opt.sid, tid: opt.tid, rid: opt.rid ?? null };
                                associatedClassId = c.id;
                                break;
                              }
                            }
                          }

                          return (
                            <React.Fragment key={p}>
                              {isGray ? (
                                <td
                                  className="py-2 px-1.5 border-r border-border last:border-r-0 bg-muted/40 text-muted-foreground/30 print:bg-gray-50 print:border-black select-none font-mono"
                                >
                                  -
                                </td>
                              ) : !cellData ? (
                                <td
                                  className="py-2 px-1.5 border-r border-border last:border-r-0 text-muted-foreground/30 print:border-black"
                                >
                                  ·
                                </td>
                              ) : (
                                <td
                                  className="py-1.5 px-1.5 border-r border-border last:border-r-0 h-16 align-top print:border-black"
                                >
                                  {(() => {
                                    const subj = subjectMap.get(cellData.sid);
                                    const tch = teacherMap.get(cellData.tid);
                                    const cls = classMap.get(associatedClassId);
                                    const rm = cellData.rid ? roomMap.get(cellData.rid) : null;

                                    const title1 = subj?.name || "?";
                                    const title2 =
                                      viewMode === "class"
                                        ? tch?.shortName || tch?.name || "?"
                                        : viewMode === "teacher"
                                        ? `${cls?.className || "?"} ${cls?.section || ""}`
                                        : `${cls?.className || "?"} ${cls?.section || ""} • ${tch?.shortName || tch?.name || ""}`;

                                    return (
                                      <div
                                        className={cn(
                                          "h-full rounded-md p-1.5 flex flex-col justify-between text-left border shadow-2xs transition-all",
                                          cellData.lab
                                            ? "bg-blue-500/10 border-blue-300 dark:border-blue-800"
                                            : "bg-background border-border",
                                          subj?.isHard && "border-l-4 border-l-amber-500"
                                        )}
                                      >
                                        <span className="font-bold text-foreground text-[11px] truncate block leading-tight">
                                          {title1} {cellData.lab ? "(Lab)" : ""}
                                        </span>
                                        <div className="flex items-center justify-between text-[10px] text-muted-foreground mt-1">
                                          <span className="font-semibold text-primary font-mono">{title2}</span>
                                          {rm && viewMode !== "room" && (
                                            <span className="bg-amber-500/20 text-amber-800 dark:text-amber-300 px-1 py-0.2 rounded text-[9px] font-bold">
                                              {rm.name.split(" ")[0]}
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })()}
                                </td>
                              )}
                              {hasBreakAfter && (
                                <td
                                  className={cn(
                                    "py-2 px-1 !border-x-2 !border-x-foreground/50 dark:!border-x-foreground/40 print:!border-black print:!border-x-2 text-center font-semibold text-[10px] select-none",
                                    p >= maxPForDay
                                      ? "bg-muted/30 text-muted-foreground/30"
                                      : "bg-amber-500/10 text-amber-700 dark:text-amber-400"
                                  )}
                                >
                                  {p < maxPForDay ? "Tiffin" : "-"}
                                </td>
                              )}
                            </React.Fragment>
                          );
                        })}
                      </tr>
                    );
                  })}
                </>
              )}
            </tbody>
          </table>
          </div>
        </div>
      </div>

      {/* Workflow Navigation Footer (Hidden when full screen or print) */}
      {!isFullscreen && (
        <div className="print:hidden pt-4 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
          <Link href="/routine/generate">
            <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
              ← Back to Generator Engine
            </Button>
          </Link>
          <Link href="/routine">
            <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
              <Sliders className="w-3.5 h-3.5" />
              Adjust Setup Hub Configuration
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}
