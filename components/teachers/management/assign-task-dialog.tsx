"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, ClipboardList, Plus, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { CustomSelect } from "@/components/ui/custom-select";
import { Textarea } from "@/components/ui/textarea";
import { useSchoolConfigQuery } from "@/lib/utils/school-config-client";
import { getSavedClassPresets, type ClassPresetItem } from "@/lib/utils/marks-config";
import {
  CUSTOM_LABEL_MAX,
  TASK_TYPES,
  customTaskTypeId,
  getTaskTypeDef,
  isCustomTaskType,
} from "@/lib/teachers/task-types";
import type { TeacherManagementState } from "./use-teacher-management";

type PresetClass = ClassPresetItem & { status?: string; streamSections?: Record<string, string[]> };

function useClassPresets() {
  const { data: config } = useSchoolConfigQuery();
  return useMemo<PresetClass[]>(() => {
    const fromServer = config?.class_management;
    const list: PresetClass[] = Array.isArray(fromServer) && fromServer.length > 0 ? fromServer : getSavedClassPresets();
    return list.filter((c) => c?.code && c.status !== "Inactive");
  }, [config]);
}

function sectionsOf(cls?: PresetClass): string[] {
  if (!cls) return [];
  const all = new Set<string>(cls.sections || []);
  Object.values(cls.streamSections || {}).forEach((arr) => (arr || []).forEach((s) => all.add(s)));
  return Array.from(all);
}

export function AssignTaskDialog({ tm }: { tm: TeacherManagementState }) {
  const { createTaskModal, handleCreateTask, selectedTeacherIdsForTask, setCreateTaskModal, setSelectedTeacherIdsForTask, setTaskDescription, setTaskDueDate, setTaskTargetClass, setTaskTargetSection, setTaskTitle, setTaskType, submitting, taskDescription, taskDueDate, taskTargetClass, taskTargetSection, taskTitle, taskType, tasks, teachers } = tm;

  const classPresets = useClassPresets();
  const currentClass = classPresets.find((c) => c.code === taskTargetClass);
  const sectionOptions = useMemo(() => sectionsOf(currentClass), [currentClass]);

  // Keep class/section inside what Settings → Classes defines
  useEffect(() => {
    if (!createTaskModal || classPresets.length === 0) return;
    if (taskTargetClass && !classPresets.some((c) => c.code === taskTargetClass)) {
      setTaskTargetClass(classPresets[0].code);
      setTaskTargetSection("ALL");
    }
  }, [createTaskModal, classPresets, taskTargetClass, setTaskTargetClass, setTaskTargetSection]);

  useEffect(() => {
    if (taskTargetSection !== "ALL" && !sectionOptions.includes(taskTargetSection)) {
      setTaskTargetSection("ALL");
    }
  }, [sectionOptions, taskTargetSection, setTaskTargetSection]);

  // Custom types: ones used on earlier tasks plus ones added in this dialog
  const [addedCustom, setAddedCustom] = useState<string[]>([]);
  const [customOpen, setCustomOpen] = useState(false);
  const [customLabel, setCustomLabel] = useState("");
  const customTypes = useMemo(() => {
    const ids = new Set<string>();
    (tasks || []).forEach((t: { task_type?: string }) => {
      if (isCustomTaskType(t.task_type)) ids.add(t.task_type!);
    });
    addedCustom.forEach((id) => ids.add(id));
    if (isCustomTaskType(taskType)) ids.add(taskType);
    return Array.from(ids).map((id) => getTaskTypeDef(id));
  }, [tasks, addedCustom, taskType]);

  const addCustomType = () => {
    const label = customLabel.trim();
    if (!label) return;
    const id = customTaskTypeId(label);
    setAddedCustom((prev) => (prev.includes(id) ? prev : [...prev, id]));
    setTaskType(id);
    setCustomLabel("");
    setCustomOpen(false);
  };

  const typeDef = getTaskTypeDef(taskType);
  const [teacherSearch, setTeacherSearch] = useState("");
  const visibleTeachers = useMemo(() => {
    const q = teacherSearch.trim().toLowerCase();
    return q ? teachers.filter((t) => String(t.fullName || "").toLowerCase().includes(q)) : teachers;
  }, [teachers, teacherSearch]);

  return (
    <Dialog open={createTaskModal} onOpenChange={setCreateTaskModal}>
      <DialogContent className="rounded-3xl max-w-3xl p-0 overflow-hidden border-0">
        <div className="flex flex-col md:flex-row w-full h-[600px] max-h-[85vh]">
          {/* Left Panel - Form */}
          <div className="w-full md:w-2/3 flex flex-col bg-card">
            <div className="bg-gradient-to-r from-primary/10 to-violet-500/10 p-6 pb-4 rounded-tl-3xl">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-background/50 rounded-xl backdrop-blur-sm">
                  <ClipboardList className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <DialogTitle className="text-lg font-bold">
                    Delegate Task
                  </DialogTitle>
                  <DialogDescription className="sr-only">
                    Assign a task to one or more teachers.
                  </DialogDescription>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <form id="create-task-form" onSubmit={handleCreateTask} className="space-y-6">
                <div className="space-y-2">
                  <Label className="text-sm font-bold">Task Title</Label>
                  <Input
                    placeholder="e.g. Class V Section A re-admission"
                    value={taskTitle}
                    onChange={(e) => setTaskTitle(e.target.value)}
                    className="h-11 text-base font-medium rounded-2xl"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-bold">Task Type</Label>
                  <div className="flex flex-wrap gap-2">
                    {[...TASK_TYPES, ...customTypes].map((type) => {
                      const isSelected = taskType === type.id;
                      return (
                        <button
                          key={type.id}
                          type="button"
                          onClick={() => setTaskType(type.id)}
                          className={`px-4 py-2 rounded-full text-xs font-semibold transition-all ${type.color} ${
                            isSelected ? "ring-2 ring-primary ring-offset-1 ring-offset-background" : "opacity-70"
                          }`}
                        >
                          {type.label}
                        </button>
                      );
                    })}
                    {!customOpen && (
                      <button
                        type="button"
                        onClick={() => setCustomOpen(true)}
                        className="px-3 py-2 rounded-full text-xs font-semibold border border-dashed border-border text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors inline-flex items-center gap-1"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Custom
                      </button>
                    )}
                  </div>
                  {customOpen && (
                    <div className="flex items-center gap-2">
                      <Input
                        autoFocus
                        placeholder="Custom task type"
                        value={customLabel}
                        maxLength={CUSTOM_LABEL_MAX}
                        onChange={(e) => setCustomLabel(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            addCustomType();
                          } else if (e.key === "Escape") {
                            e.preventDefault();
                            e.stopPropagation();
                            setCustomOpen(false);
                          }
                        }}
                        className="h-9 rounded-xl text-sm"
                      />
                      <Button type="button" size="sm" className="rounded-xl h-9" onClick={addCustomType} disabled={!customLabel.trim()}>
                        Add
                      </Button>
                      <Button type="button" size="icon" variant="ghost" className="rounded-xl h-9 w-9 shrink-0" aria-label="Cancel custom type" onClick={() => { setCustomOpen(false); setCustomLabel(""); }}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>

                <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Label className="text-sm font-bold">Due Date</Label>
                    <Input
                      type="date"
                      value={taskDueDate}
                      onChange={(e) => setTaskDueDate(e.target.value)}
                      className="h-10 rounded-2xl"
                    />
                  </div>
                  {typeDef.usesClass && (
                    <>
                      <div className="space-y-2">
                        <Label className="text-sm font-bold">Target Class</Label>
                        <CustomSelect
                          value={taskTargetClass}
                          onChange={(val) => {
                            setTaskTargetClass(String(val ?? ""));
                            setTaskTargetSection("ALL");
                          }}
                          options={[
                            { value: "", label: "All Classes" },
                            ...classPresets.map((c) => ({ value: c.code, label: `Class ${c.code}` })),
                          ]}
                          className="h-10 rounded-2xl"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-bold">Section</Label>
                        <CustomSelect
                          value={taskTargetSection}
                          onChange={(val) => setTaskTargetSection(String(val || "ALL"))}
                          disabled={!taskTargetClass}
                          options={[
                            { value: "ALL", label: "All Sections" },
                            ...sectionOptions.map((s) => ({ value: s, label: `Section ${s}` })),
                          ]}
                          className="h-10 rounded-2xl"
                        />
                      </div>
                    </>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-bold">Instructions / Notes</Label>
                  <Textarea
                    placeholder="Instructions for assigned teachers..."
                    value={taskDescription}
                    onChange={(e) => setTaskDescription(e.target.value)}
                    className="rounded-2xl min-h-[80px] resize-none"
                  />
                </div>
              </form>
            </div>

            <div className="p-6 border-t border-border/40 bg-card">
              <div className="flex items-center justify-end gap-3">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setCreateTaskModal(false)}
                  className="rounded-xl"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  form="create-task-form"
                  disabled={submitting || selectedTeacherIdsForTask.length === 0}
                  className="font-bold rounded-xl px-6"
                >
                  {submitting ? "Assigning..." : "Assign Task"}
                </Button>
              </div>
            </div>
          </div>

          {/* Right Panel - Teacher Selection */}
          <div className="w-full md:w-1/3 bg-muted/50 flex flex-col border-l border-border/40">
            <div className="p-4 border-b border-border/40 bg-muted/30">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-sm">Assign Teachers</h3>
                {selectedTeacherIdsForTask.length > 0 && (
                  <span className="bg-primary/20 text-primary text-[10px] font-bold px-2 py-0.5 rounded-full">
                    {selectedTeacherIdsForTask.length} selected
                  </span>
                )}
              </div>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search teachers..."
                  className="pl-9 h-9 text-xs rounded-xl bg-background border-border/60"
                  value={teacherSearch}
                  onChange={(e) => setTeacherSearch(e.target.value)}
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {visibleTeachers.map((t) => {
                const isSelected = selectedTeacherIdsForTask.includes(t.id);
                const initials = String(t.fullName || "").split(" ").map((n: string) => n[0]).join("").substring(0, 2).toUpperCase();

                return (
                  <div
                    key={t.id}
                    className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all duration-150 border ${
                      isSelected
                        ? "bg-primary/10 border-primary/30"
                        : "bg-background border-transparent hover:border-border/60"
                    }`}
                    onClick={() => {
                      if (isSelected) {
                        setSelectedTeacherIdsForTask(
                          selectedTeacherIdsForTask.filter((id) => id !== t.id)
                        );
                      } else {
                        setSelectedTeacherIdsForTask([...selectedTeacherIdsForTask, t.id]);
                      }
                    }}
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className={`shrink-0 h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold ${isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted-foreground/20 text-muted-foreground'}`}>
                        {initials}
                      </div>
                      <div className="truncate">
                        <p className="text-sm font-semibold truncate">{t.fullName}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{t.designation || "Teacher"}</p>
                      </div>
                    </div>
                    {isSelected && (
                      <CheckCircle2 className="h-4 w-4 text-primary shrink-0 ml-2" />
                    )}
                  </div>
                );
              })}
            </div>

            {selectedTeacherIdsForTask.length > 0 && (
              <div className="p-3 border-t border-border/40 bg-muted/30">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="w-full text-xs h-8 text-muted-foreground hover:text-destructive"
                  onClick={() => setSelectedTeacherIdsForTask([])}
                >
                  Clear All
                </Button>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
