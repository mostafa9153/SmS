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
import ExcelJS from "exceljs";
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
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getClassNumericRank } from "@/lib/ems/ems-config-loader";
import { showToast } from "@/components/ui/toast-banner";
import { saveGeneratedRoutineDb } from "@/lib/supabase/db-routine";

interface RoutineViewerTabProps {
  routine: GeneratedRoutine | null;
  settings: RoutineSettings;
  classes: RoutineClass[];
  teachers: RoutineTeacher[];
  subjects: RoutineSubject[];
  rooms: RoutineRoom[];
}

type ViewMode = "master" | "class" | "teacher" | "room";

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
  const [draggedPos, setDraggedPos] = useState<{ classId: string; pPos: number } | null>(null);
  const [dragOverPos, setDragOverPos] = useState<{ classId: string; pPos: number } | null>(null);

  useEffect(() => {
    setRoutine(initialRoutine);
  }, [initialRoutine]);

  const [viewMode, setViewMode] = useState<ViewMode>("master");
  const [masterDayIdx, setMasterDayIdx] = useState<number>(0);
  const [masterSectionFilter, setMasterSectionFilter] = useState<string>("ALL");
  const [selectedClassId, setSelectedClassId] = useState<string>(sortedClasses[0]?.id || "");
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>(teachers[0]?.id || "");
  const [selectedRoomId, setSelectedRoomId] = useState<string>(rooms[0]?.id || "");

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

  // Compute teacher double-booking clashes for current active master day
  const dayClashes = useMemo(() => {
    if (!routine?.grid || viewMode !== "master") return new Map<string, string>();
    const map = new Map<string, string>();
    const dPos = masterDayIdx || 0;

    for (let pPos = 0; pPos < settings.periodsPerDay; pPos++) {
      const teacherClassMap = new Map<string, string[]>();
      for (const [cid, classSchedule] of Object.entries(routine.grid)) {
        const cell = classSchedule?.[dPos]?.[pPos];
        if (cell?.tid) {
          const list = teacherClassMap.get(cell.tid) || [];
          list.push(cid);
          teacherClassMap.set(cell.tid, list);
        }
      }

      for (const [tid, cids] of teacherClassMap.entries()) {
        if (cids.length > 1) {
          const tch = teacherMap.get(tid);
          const tName = tch?.shortName || tch?.name || "Teacher";
          cids.forEach((cid) => {
            const otherClasses = cids
              .filter((id) => id !== cid)
              .map((id) => `${classMap.get(id)?.className || ""}-${classMap.get(id)?.section || ""}`)
              .join(", ");
            map.set(`${cid}_${pPos}`, `Clash: ${tName} has duplicate class in ${otherClasses}`);
          });
        }
      }
    }
    return map;
  }, [routine?.grid, masterDayIdx, settings.periodsPerDay, teacherMap, classMap, viewMode]);

  const handleCellSwap = async (
    sourceClassId: string,
    sourcePPos: number,
    targetClassId: string,
    targetPPos: number
  ) => {
    if (!routine || !routine.grid) return;
    if (sourceClassId === targetClassId && sourcePPos === targetPPos) return;

    const dPos = masterDayIdx || 0;
    const sourceClass = classMap.get(sourceClassId);
    const targetClass = classMap.get(targetClassId);
    const sourceCell = routine.grid[sourceClassId]?.[dPos]?.[sourcePPos] || null;
    const targetCell = routine.grid[targetClassId]?.[dPos]?.[targetPPos] || null;

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

    // Save previous grid for Undo
    setHistory((prev) => [routine.grid, ...prev.slice(0, 9)]);

    // Clone grid immutably
    const newGrid: RoutineGrid = {};
    for (const [cid, days] of Object.entries(routine.grid)) {
      newGrid[cid] = days.map((dayPeriods, d) =>
        d === dPos ? [...dayPeriods] : dayPeriods
      );
    }

    if (!newGrid[sourceClassId] || !newGrid[targetClassId]) return;

    // Perform swap
    newGrid[sourceClassId][dPos][sourcePPos] = targetCell;
    newGrid[targetClassId][dPos][targetPPos] = sourceCell;

    const updatedRoutine: GeneratedRoutine = {
      ...routine,
      grid: newGrid,
      generatedAt: new Date().toISOString(),
    };

    setRoutine(updatedRoutine);

    // Conflict check on newly swapped slots
    const clashes: string[] = [];
    const checkClashesAtPeriod = (pPos: number) => {
      const tMap = new Map<string, string[]>();
      for (const [cid, days] of Object.entries(newGrid)) {
        const cell = days[dPos]?.[pPos];
        if (cell?.tid) {
          const list = tMap.get(cell.tid) || [];
          list.push(cid);
          tMap.set(cell.tid, list);
        }
      }
      for (const [tid, cids] of tMap.entries()) {
        if (cids.length > 1) {
          const tch = teacherMap.get(tid);
          const tName = tch?.shortName || tch?.name || "Teacher";
          const classNames = cids
            .map((id) => `${classMap.get(id)?.className || ""}-${classMap.get(id)?.section || ""}`)
            .join(" & ");
          clashes.push(`${tName} in Period ${pPos + 1} (${classNames})`);
        }
      }
    };

    checkClashesAtPeriod(sourcePPos);
    if (targetPPos !== sourcePPos) {
      checkClashesAtPeriod(targetPPos);
    }

    if (clashes.length > 0) {
      showToast({
        type: "warning",
        title: "Swapped with Clash Warning",
        description: clashes.slice(0, 2).join("; "),
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
      showToast({ title: "No routine to export", variant: "error" });
      return;
    }
    
    try {
      showToast({ title: "Generating styled Excel file...", variant: "default" });
      const workbook = new ExcelJS.Workbook();
      workbook.creator = "SMS Web App";
      
      const maxPeriods = settings.periodsPerDay;
      const headerRow = ["Day / Class", ...Array.from({ length: maxPeriods }, (_, i) => "Period " + (i + 1))];
      
      // Reusable styles
      const headerFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F81BD' } };
      const headerFont = { color: { argb: 'FFFFFFFF' }, bold: true };
      const dayRowFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE6E6FA' } };
      
      const borderAll = {
        top: { style: 'thin', color: { argb: 'FFBFBFBF' } },
        left: { style: 'thin', color: { argb: 'FFBFBFBF' } },
        bottom: { style: 'thin', color: { argb: 'FFBFBFBF' } },
        right: { style: 'thin', color: { argb: 'FFBFBFBF' } }
      };

      const applyTableStyles = (sheet, startRow, rowCount, colCount) => {
        sheet.getColumn(1).width = 25;
        for (let i = 2; i <= colCount; i++) {
          sheet.getColumn(i).width = 18;
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

      // --- 1. MASTER SHEET ---
      const wsMaster = workbook.addWorksheet("Master");
      let mRowIdx = 1;

      settings.workingDays.forEach((dIdx) => {
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
              const cellData = routine.grid[c.id]?.[dIdx]?.[p - 1];
              if (cellData) {
                 const subj = subjectMap.get(cellData.sid);
                 const tch = teacherMap.get(cellData.tid);
                 rowData.push((subj?.name || "Unknown") + "\n(" + (tch?.shortName || "?") + ")");
              } else {
                 rowData.push("-");
              }
            }
          }
          wsMaster.getRow(mRowIdx).values = rowData;
          mRowIdx++;
        });
        
        applyTableStyles(wsMaster, startTblRow, mRowIdx - startTblRow, maxPeriods + 1);
        mRowIdx += 2;
      });

      // --- 2. CLASS-WISE SHEET ---
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

        settings.workingDays.forEach((dIdx) => {
          const classLimit = c.dailyPeriods || maxPeriods;
          const rowData = [DAY_NAMES[dIdx]];
          
          for (let p = 1; p <= maxPeriods; p++) {
            if (p > classLimit) {
              rowData.push("");
            } else {
              const cellData = routine.grid[c.id]?.[dIdx]?.[p - 1];
              if (cellData) {
                 const subj = subjectMap.get(cellData.sid);
                 const tch = teacherMap.get(cellData.tid);
                 rowData.push((subj?.name || "Unknown") + "\n(" + (tch?.shortName || "?") + ")");
              } else {
                 rowData.push("-");
              }
            }
          }
          wsClass.getRow(cRowIdx).values = rowData;
          wsClass.getRow(cRowIdx - 1).height = 40; 
          cRowIdx++;
        });

        applyTableStyles(wsClass, startTblRow, cRowIdx - startTblRow, maxPeriods + 1);
        cRowIdx += 2;
      });

      // --- 3. TEACHER-WISE SHEET ---
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

        settings.workingDays.forEach((dIdx) => {
          const rowData = [DAY_NAMES[dIdx]];
          
          for (let p = 1; p <= maxPeriods; p++) {
            let foundCell = null;
            let foundClass = null;
            
            for (const c of classes) {
              const cellData = routine.grid[c.id]?.[dIdx]?.[p - 1];
              if (cellData && cellData.tid === tch.id) {
                foundCell = cellData;
                foundClass = c;
                break;
              }
            }
            
            if (foundCell) {
               const subj = subjectMap.get(foundCell.sid);
               rowData.push((subj?.name || "Unknown") + "\n[" + foundClass.className + "-" + foundClass.section + "]");
            } else {
               rowData.push("-");
            }
          }
          wsTeacher.getRow(tRowIdx).values = rowData;
          wsTeacher.getRow(tRowIdx - 1).height = 40;
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
      
      showToast({ title: "Routine exported beautifully!", variant: "success" });
    } catch (err) {
      console.error(err);
      showToast({ title: "Failed to export Excel", variant: "error" });
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
    <div className="space-y-4 w-full">
      {/* Top Toolbar (Hidden on print) */}
      <div className="print:hidden bg-card border rounded-lg p-3 shadow-xs flex flex-wrap items-center justify-between gap-3">
        {/* Mode Segmented Controls */}
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
            <Users className="h-3.5 w-3.5" />
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

        {/* Dynamic Selector Dropdowns & Actions */}
        <div className="flex items-center flex-wrap gap-2">
          {/* Master View Controls: Day + Section Filter */}
          {viewMode === "master" && (
            <>
              <ViewerDropdown
                value={String(masterDayIdx)}
                onChange={(v) => setMasterDayIdx(parseInt(v, 10))}
                options={activeDays.map((dIdx, idx) => ({
                  value: String(idx),
                  label: `${DAY_NAMES[dIdx]}${halfDays.includes(dIdx) ? " (Half)" : ""}`,
                }))}
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
        </div>
      </div>

      {/* Printable Sheet Header (Only visible in Print view) */}
      <div className="hidden print:block text-center border-b pb-3 mb-4">
        <h1 className="text-xl font-bold uppercase tracking-tight">Academic Routine & Master Timetable</h1>
        <div className="text-xs text-muted-foreground font-semibold mt-0.5">
          {viewMode === "master" && `Master Schedule — ${DAY_NAMES[activeDays[masterDayIdx] || 0]}${masterSectionFilter !== "ALL" ? ` (Section ${masterSectionFilter})` : ""}`}
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
      <div className="bg-card border rounded-lg shadow-xs overflow-hidden print:border-black print:rounded-none">
        <style dangerouslySetInnerHTML={{ __html: `
          @media print {
            @page { size: landscape; margin: 8mm; }
            * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          }
        `}} />
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-center border-collapse">
            <thead>
              <tr className="bg-muted/70 border-b text-foreground font-semibold print:bg-gray-100 print:text-black">
                <th className="py-2.5 px-3 text-left border-r border-border print:border-black w-32 font-bold">
                  {viewMode === "master" ? "Class \\ Period" : "Day \\ Period"}
                </th>
                {Array.from({ length: settings.periodsPerDay }, (_, i) => i + 1).map((p) => {
                  const hasBreakAfter = settings.breaks.includes(p) && p < settings.periodsPerDay;
                  return (
                    <React.Fragment key={p}>
                      <th className="py-2.5 px-2 border-r last:border-r-0 border-border print:border-black min-w-[110px]">
                        <span>Period {p}</span>
                      </th>
                      {hasBreakAfter && (
                        <th className="py-2.5 px-2 border-r border-border print:border-black min-w-[70px] bg-amber-500/15 text-amber-800 dark:text-amber-300 font-bold">
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
            </thead>
            <tbody className="divide-y divide-border print:divide-black">
              {/* MASTER VIEW (Day-wise: Rows = Classes) */}
              {viewMode === "master" && (
                <>
                  {displayedMasterClasses.map((c) => {
                    const dPos = masterDayIdx || 0;
                    const actDay = activeDays[dPos];
                    const maxPForDay = halfDays.includes(actDay)
                      ? maxHalfP
                      : settings.periodsPerDay;
                    const classLimit = c.dailyPeriods || settings.periodsPerDay;

                    return (
                      <tr key={c.id} className="hover:bg-muted/20 transition-colors">
                        <td className="py-3 px-3 text-left font-bold text-foreground bg-muted/30 border-r border-border print:border-black">
                          {c.className} - {c.section}
                        </td>
                        {Array.from({ length: settings.periodsPerDay }, (_, i) => i + 1).map((p) => {
                          const isGray = p > maxPForDay || p > classLimit;
                          const pPos = p - 1;
                          const hasBreakAfter = settings.breaks.includes(p) && p < settings.periodsPerDay;
                          const cellData = isGray ? null : routine.grid[c.id]?.[dPos]?.[pPos];
                          const isSource = draggedPos?.classId === c.id && draggedPos?.pPos === pPos;
                          const isTarget = dragOverPos?.classId === c.id && dragOverPos?.pPos === pPos;
                          const clashReason = dayClashes.get(`${c.id}_${pPos}`);

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
                                    if (dragOverPos?.classId !== c.id || dragOverPos?.pPos !== pPos) {
                                      setDragOverPos({ classId: c.id, pPos });
                                    }
                                  }}
                                  onDragLeave={() => {
                                    if (dragOverPos?.classId === c.id && dragOverPos?.pPos === pPos) {
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
                                        handleCellSwap(data.classId, data.pPos, c.id, pPos);
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
                                    if (dragOverPos?.classId !== c.id || dragOverPos?.pPos !== pPos) {
                                      setDragOverPos({ classId: c.id, pPos });
                                    }
                                  }}
                                  onDragLeave={() => {
                                    if (dragOverPos?.classId === c.id && dragOverPos?.pPos === pPos) {
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
                                        handleCellSwap(data.classId, data.pPos, c.id, pPos);
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
                                          setDraggedPos({ classId: c.id, pPos });
                                          const payload = JSON.stringify({ classId: c.id, pPos });
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
                                    "py-2 px-1 border-r border-border print:border-black text-center font-semibold text-[10px] select-none",
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

              {/* CLASS-WISE / TEACHER-WISE / ROOM-WISE (Rows = Days) */}
              {viewMode !== "master" && (
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
                        <td className="py-3 px-3 text-left font-bold text-foreground bg-muted/30 border-r border-border print:border-black">
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
                              classes.forEach((c) => {
                                const cell = routine.grid[c.id]?.[dPos]?.[pPos];
                                if (cell && cell.tid === selectedTeacherId) {
                                  cellData = cell;
                                  associatedClassId = c.id;
                                }
                              });
                            } else if (viewMode === "room") {
                              classes.forEach((c) => {
                                const cell = routine.grid[c.id]?.[dPos]?.[pPos];
                                if (cell && cell.rid === selectedRoomId) {
                                  cellData = cell;
                                  associatedClassId = c.id;
                                }
                              });
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
                                    "py-2 px-1 border-r border-border print:border-black text-center font-semibold text-[10px] select-none",
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

      {/* Workflow Navigation Footer */}
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
    </div>
  );
}
