"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  RoutineAssignment,
  RoutineClass,
  RoutineSubject,
  RoutineTeacher,
  RoutineRoom,
} from "@/lib/routine/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Plus,
  Edit2,
  Trash2,
  Check,
  X,
  Filter,
  Layers,
  ArrowRight,
  School,
  CalendarCheck2,
  Users,
  AlertTriangle,
  FlaskConical,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getClassNumericRank } from "@/lib/ems/ems-config-loader";

interface RoutineAssignmentsTabProps {
  assignments: RoutineAssignment[];
  classes: RoutineClass[];
  subjects: RoutineSubject[];
  teachers: RoutineTeacher[];
  rooms: RoutineRoom[];
  onSaveAssignment: (asg: {
    id?: string;
    classId: string;
    subjectId: string;
    teacherId: string;
    roomId?: string | null;
    periodsPerWeek: number;
  }) => Promise<void>;
  onDeleteAssignment: (id: string) => Promise<void>;
}

export function RoutineAssignmentsTab({
  assignments,
  classes,
  subjects,
  teachers,
  rooms,
  onSaveAssignment,
  onDeleteAssignment,
}: RoutineAssignmentsTabProps) {
  const [classId, setClassId] = useState(classes[0]?.id || "");
  const [subjectId, setSubjectId] = useState(subjects[0]?.id || "");
  const [teacherId, setTeacherId] = useState(teachers[0]?.id || "");
  const [roomId, setRoomId] = useState<string>("");
  const [periods, setPeriods] = useState<number>(4);
  const [editId, setEditId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync initial select state when async data arrives
  React.useEffect(() => {
    if (!classId && classes.length > 0) setClassId(classes[0].id);
  }, [classes, classId]);

  React.useEffect(() => {
    if (!subjectId && subjects.length > 0) setSubjectId(subjects[0].id);
  }, [subjects, subjectId]);

  React.useEffect(() => {
    if (!teacherId && teachers.length > 0) setTeacherId(teachers[0].id);
  }, [teachers, teacherId]);

  // Filter state
  const [filterClass, setFilterClass] = useState<string>("all");
  const [filterTeacher, setFilterTeacher] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const sortedClasses = useMemo(() => {
    return [...classes].sort((a, b) => {
      const rankA = getClassNumericRank(a.className);
      const rankB = getClassNumericRank(b.className);
      if (rankA !== rankB) return rankA - rankB;
      return a.section.localeCompare(b.section);
    });
  }, [classes]);

  const classMap = useMemo(() => new Map(classes.map((c) => [c.id, c])), [classes]);
  const subjectMap = useMemo(() => new Map(subjects.map((s) => [s.id, s])), [subjects]);
  const teacherMap = useMemo(() => new Map(teachers.map((t) => [t.id, t])), [teachers]);
  const roomMap = useMemo(() => new Map(rooms.map((r) => [r.id, r])), [rooms]);

  const selectedClassObj = classMap.get(classId);
  const relevantSubjects = useMemo(() => {
    if (!selectedClassObj) return subjects;
    const explicit = subjects.filter(
      (s) => s.className && s.className.toLowerCase() === selectedClassObj.className.toLowerCase()
    );
    if (explicit.length > 0) return explicit;
    return subjects.filter((s) => !s.className);
  }, [subjects, selectedClassObj]);

  React.useEffect(() => {
    if (relevantSubjects.length > 0 && !relevantSubjects.some((s) => s.id === subjectId)) {
      setSubjectId(relevantSubjects[0].id);
    }
  }, [relevantSubjects, subjectId]);

  // Teacher loads and overload checks
  const teacherLoadMap = useMemo(() => {
    const map: Record<string, number> = {};
    assignments.forEach((a) => {
      map[a.teacherId] = (map[a.teacherId] || 0) + a.periodsPerWeek;
    });
    return map;
  }, [assignments]);

  const overloadedTeachersCount = useMemo(() => {
    return teachers.filter((t) => (teacherLoadMap[t.id] || 0) > (t.maxPeriods || 24)).length;
  }, [teachers, teacherLoadMap]);

  const totalAssignedPeriods = useMemo(() => {
    return assignments.reduce((sum, a) => sum + a.periodsPerWeek, 0);
  }, [assignments]);

  const assignedClassCount = useMemo(() => {
    const unique = new Set(assignments.map((a) => a.classId));
    return unique.size;
  }, [assignments]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!classId || !subjectId || !teacherId) return;

    setIsSubmitting(true);
    try {
      await onSaveAssignment({
        id: editId || undefined,
        classId,
        subjectId,
        teacherId,
        roomId: roomId || null,
        periodsPerWeek: periods || 4,
      });
      setEditId(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (a: RoutineAssignment) => {
    setEditId(a.id);
    setClassId(a.classId);
    setSubjectId(a.subjectId);
    setTeacherId(a.teacherId);
    setRoomId(a.roomId || "");
    setPeriods(a.periodsPerWeek);
  };

  const handleCancel = () => {
    setEditId(null);
  };

  const filteredAssignments = useMemo(() => {
    return assignments.filter((a) => {
      if (filterClass !== "all" && a.classId !== filterClass) return false;
      if (filterTeacher !== "all" && a.teacherId !== filterTeacher) return false;
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const cls = classMap.get(a.classId);
        const subj = subjectMap.get(a.subjectId);
        const tch = teacherMap.get(a.teacherId);
        const matchClass = cls && `${cls.className} ${cls.section}`.toLowerCase().includes(query);
        const matchSubj = subj && subj.name.toLowerCase().includes(query);
        const matchTch = tch && `${tch.name} ${tch.shortName || ""}`.toLowerCase().includes(query);
        if (!matchClass && !matchSubj && !matchTch) return false;
      }
      return true;
    });
  }, [assignments, filterClass, filterTeacher, searchQuery, classMap, subjectMap, teacherMap]);

  const totalFilteredPeriods = useMemo(() => {
    return filteredAssignments.reduce((sum, a) => sum + a.periodsPerWeek, 0);
  }, [filteredAssignments]);

  return (
    <div className="space-y-5 w-full">
      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-card border rounded-lg p-3.5 shadow-xs flex items-center gap-3">
          <div className="p-2 bg-blue-500/10 text-blue-600 rounded-lg">
            <School className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-medium text-muted-foreground block">Assigned Classes</span>
            <div className="flex items-baseline gap-1 font-mono">
              <span className="text-lg font-bold text-foreground">{assignedClassCount}</span>
              <span className="text-xs text-muted-foreground">/ {classes.length}</span>
            </div>
          </div>
        </div>

        <div className="bg-card border rounded-lg p-3.5 shadow-xs flex items-center gap-3">
          <div className="p-2 bg-purple-500/10 text-purple-600 rounded-lg">
            <CalendarCheck2 className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-medium text-muted-foreground block">Total Workload</span>
            <div className="flex items-baseline gap-1 font-mono">
              <span className="text-lg font-bold text-foreground">{totalAssignedPeriods}</span>
              <span className="text-xs text-muted-foreground">periods/wk</span>
            </div>
          </div>
        </div>

        <div className="bg-card border rounded-lg p-3.5 shadow-xs flex items-center gap-3">
          <div className="p-2 bg-emerald-500/10 text-emerald-600 rounded-lg">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-medium text-muted-foreground block">Active Faculty</span>
            <div className="flex items-baseline gap-1 font-mono">
              <span className="text-lg font-bold text-foreground">{teachers.length}</span>
              <span className="text-xs text-muted-foreground">teachers</span>
            </div>
          </div>
        </div>

        <div className="bg-card border rounded-lg p-3.5 shadow-xs flex items-center gap-3">
          <div className={cn(
            "p-2 rounded-lg",
            overloadedTeachersCount > 0 ? "bg-red-500/10 text-red-600" : "bg-emerald-500/10 text-emerald-600"
          )}>
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-medium text-muted-foreground block">Faculty Overload</span>
            <div className="flex items-baseline gap-1 font-mono">
              <span className={cn(
                "text-lg font-bold",
                overloadedTeachersCount > 0 ? "text-destructive" : "text-emerald-600"
              )}>
                {overloadedTeachersCount}
              </span>
              <span className="text-xs text-muted-foreground">overloaded</span>
            </div>
          </div>
        </div>
      </div>

      {/* Form Card */}
      <form onSubmit={handleSubmit} autoComplete="off" className="bg-card border rounded-lg p-4 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b pb-2.5">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold tracking-tight text-foreground">
              {editId ? "Edit Workload Assignment" : "Assign Subject Workload to Faculty"}
            </h2>
          </div>
          {editId && (
            <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-300">
              Editing Assignment
            </Badge>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 items-end">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Class Section *</Label>
            <select
              value={classId}
              onChange={(e) => setClassId(e.target.value)}
              className="h-8 w-full rounded-md border border-input bg-background px-2.5 text-xs font-medium"
              required
            >
              {sortedClasses.length === 0 && <option value="">No classes</option>}
              {sortedClasses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.className} - {c.section}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Subject *</Label>
            <select
              value={subjectId}
              onChange={(e) => setSubjectId(e.target.value)}
              className="h-8 w-full rounded-md border border-input bg-background px-2.5 text-xs font-medium"
              required
            >
              {relevantSubjects.length === 0 && <option value="">No subjects available</option>}
              {relevantSubjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} {s.isLab ? "(Lab)" : ""} {s.className ? `(${s.className})` : ""}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Assigned Teacher *</Label>
            <select
              value={teacherId}
              onChange={(e) => setTeacherId(e.target.value)}
              className="h-8 w-full rounded-md border border-input bg-background px-2.5 text-xs font-medium"
              required
            >
              {teachers.length === 0 && <option value="">No teachers</option>}
              {teachers.map((t) => {
                const currentLoad = teacherLoadMap[t.id] || 0;
                return (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.shortName || "-"}) — {currentLoad}/{t.maxPeriods}p
                  </option>
                );
              })}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Room (Optional)</Label>
            <select
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              className="h-8 w-full rounded-md border border-input bg-background px-2.5 text-xs font-medium"
            >
              <option value="">Default Classroom</option>
              {rooms.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} {r.isLab ? "(Lab)" : ""}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Periods / Week *</Label>
            <Input
              type="number"
              min={1}
              max={20}
              value={periods}
              onChange={(e) => setPeriods(parseInt(e.target.value, 10) || 1)}
              className="h-8 text-xs font-mono font-semibold"
              required
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-1 border-t">
          {editId && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCancel}
              className="h-8 text-xs px-3"
            >
              <X className="h-3.5 w-3.5 mr-1" />
              Cancel
            </Button>
          )}
          <Button
            type="submit"
            size="sm"
            disabled={isSubmitting || !classId || !subjectId || !teacherId}
            className="h-8 text-xs font-semibold px-4"
          >
            {editId ? (
              <>
                <Check className="h-3.5 w-3.5 mr-1.5" />
                Save Changes
              </>
            ) : (
              <>
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                Assign Workload
              </>
            )}
          </Button>
        </div>
      </form>

      {/* Filter & Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-card p-2.5 rounded-lg border shadow-xs text-xs">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          <div className="relative w-full sm:w-52">
            <Input
              type="text"
              placeholder="Search assignments..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 text-xs pl-3 pr-7 font-medium"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <select
            value={filterClass}
            onChange={(e) => setFilterClass(e.target.value)}
            className="h-8 rounded-md border border-input bg-background px-2.5 text-xs font-medium w-36"
          >
            <option value="all">All Classes</option>
            {sortedClasses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.className} - {c.section}
              </option>
            ))}
          </select>

          <select
            value={filterTeacher}
            onChange={(e) => setFilterTeacher(e.target.value)}
            className="h-8 rounded-md border border-input bg-background px-2.5 text-xs font-medium w-36"
          >
            <option value="all">All Teachers</option>
            {teachers.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>

          {(filterClass !== "all" || filterTeacher !== "all" || searchQuery) && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setFilterClass("all");
                setFilterTeacher("all");
                setSearchQuery("");
              }}
              className="h-8 text-xs px-2 text-muted-foreground hover:text-foreground"
            >
              Reset
            </Button>
          )}
        </div>

        <div className="font-mono text-muted-foreground text-xs">
          Showing <span className="font-bold text-foreground">{filteredAssignments.length}</span> assignments (
          <span className="font-bold text-primary">{totalFilteredPeriods}</span> p/wk)
        </div>
      </div>

      {/* Assignments Table Card */}
      <div className="bg-card border rounded-lg shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-muted/30 border-b text-muted-foreground font-semibold">
                <th className="py-2.5 px-4">Class Section</th>
                <th className="py-2.5 px-4">Subject</th>
                <th className="py-2.5 px-4">Teacher & Code</th>
                <th className="py-2.5 px-4">Assigned Facility</th>
                <th className="py-2.5 px-4">Periods / Wk</th>
                <th className="py-2.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredAssignments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-muted-foreground">
                    <Layers className="w-6 h-6 mx-auto mb-1 opacity-40" />
                    <span>No workload assignments found matching your filter criteria.</span>
                  </td>
                </tr>
              ) : (
                filteredAssignments.map((a) => {
                  const cls = classMap.get(a.classId);
                  const subj = subjectMap.get(a.subjectId);
                  const tch = teacherMap.get(a.teacherId);
                  const rm = a.roomId ? roomMap.get(a.roomId) : null;
                  const tchLoad = teacherLoadMap[a.teacherId] || 0;
                  const isTchOverloaded = tch && tchLoad > (tch.maxPeriods || 24);

                  return (
                    <tr key={a.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-2.5 px-4 font-semibold text-foreground">
                        {cls ? `${cls.className} - ${cls.section}` : "-"}
                      </td>
                      <td className="py-2.5 px-4">
                        <div className="flex items-center gap-1.5">
                          <span className="font-medium text-foreground">{subj?.name || "-"}</span>
                          {subj?.isLab && (
                            <Badge variant="secondary" className="text-[9px] px-1 py-0 bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-200 gap-0.5">
                              <FlaskConical className="w-2.5 h-2.5 text-blue-600" />
                              Lab
                            </Badge>
                          )}
                          {subj?.isHard && (
                            <Badge variant="outline" className="text-[9px] px-1 py-0 bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-300">
                              Priority
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 px-4">
                        <div className="flex items-center gap-1.5">
                          <span className="text-foreground font-medium">{tch?.name || "-"}</span>
                          {tch?.shortName && (
                            <Badge variant="outline" className="font-mono text-[10px] font-bold">
                              {tch.shortName}
                            </Badge>
                          )}
                          {isTchOverloaded && (
                            <Badge variant="destructive" className="text-[9px] px-1 py-0">
                              Overloaded
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 px-4">
                        {rm ? (
                          <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-300 font-medium">
                            {rm.name}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-[11px]">Classroom</span>
                        )}
                      </td>
                      <td className="py-2.5 px-4">
                        <Badge variant="secondary" className="font-mono text-[11px] font-bold">
                          {a.periodsPerWeek} p/wk
                        </Badge>
                      </td>
                      <td className="py-2.5 px-4 text-right space-x-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(a)}
                          aria-label={`Edit assignment for ${cls ? `${cls.className} - ${cls.section}` : "class"} ${subj?.name || ""}`}
                          title={`Edit assignment`}
                          className="h-7 w-7 p-0"
                        >
                          <Edit2 className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onDeleteAssignment(a.id)}
                          aria-label={`Delete assignment for ${cls ? `${cls.className} - ${cls.section}` : "class"} ${subj?.name || ""}`}
                          title={`Delete assignment`}
                          className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Workflow Navigation */}
      <div className="pt-4 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
        <Link href="/routine">
          <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
            ← Back to Setup Hub
          </Button>
        </Link>
        <Link href="/routine/generate">
          <Button variant="default" size="sm" className="h-8 gap-1.5 text-xs font-semibold">
            Next: Run Generator Engine
            <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        </Link>
      </div>
    </div>
  );
}

